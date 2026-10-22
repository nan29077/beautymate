"use client";

// 결제 목업 화면 — 가상계좌 입금 / 상품권 결제.
// ⚠️ 실제 PG·DB 와 연결되지 않는다. 모든 동작은 이 화면 안에서만 시뮬레이션되며 새로고침하면 초기화된다.
// 실서버의 실제 고객이 보는 화면이므로, 결과 화면·내역이 실제 처리된 것으로 오인되지 않도록
// 모든 결과에 '예시/미리보기'를 명시하고 실존 계좌처럼 보이는 값은 쓰지 않는다 (paymentMock.ts 의 MOCK_VBANK).

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Gift,
  Info,
  Landmark,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import {
  AMOUNT_PRESETS,
  MOCK_BRANCH,
  MOCK_SERVICES,
  PAYMENT_STATUS_LABEL,
  PIN_LENGTH,
  SAMPLE_PAYMENT_HISTORY,
  SAMPLE_VOUCHER_HISTORY,
  VOUCHER_PURCHASE_MAX,
  VOUCHER_STATUS_LABEL,
  VOUCHER_TYPES,
  addAmount,
  createMockVirtualAccount,
  formatKst,
  formatPin,
  formatWon,
  isPinComplete,
  maskPin,
  sumSelectedServices,
  summarizeServices,
  toggleService,
  type MockVirtualAccount,
  type PaymentHistoryRow,
  type PaymentStatus,
  type VoucherHistoryRow,
  type VoucherTypeId,
} from "@/lib/paymentMock";

type Tab = "vbank" | "voucher";
type VoucherMode = "buy" | "pin";
type HistoryTab = "payments" | "vouchers";

type ModalState =
  | { kind: "vbank"; account: MockVirtualAccount; items: string }
  | { kind: "buy"; voucher: string; amount: number }
  | { kind: "pin"; voucher: string; pinMasked: string; amount: number; items: string }
  | null;

const voucherLabel = (id: VoucherTypeId) => VOUCHER_TYPES.find((v) => v.id === id)?.label ?? "상품권";

const STATUS_STYLE: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-gray-100 text-gray-600",
};

const PRIMARY_BUTTON =
  "flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-950 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400";

export default function PaymentMockClient() {
  const [tab, setTab] = useState<Tab>("vbank");
  const [voucherMode, setVoucherMode] = useState<VoucherMode>("buy");
  const [selected, setSelected] = useState<string[]>([]);

  const [buyType, setBuyType] = useState<VoucherTypeId>("lotte");
  const [buyAmount, setBuyAmount] = useState(0);
  const [limitHit, setLimitHit] = useState(false);

  const [pinType, setPinType] = useState<VoucherTypeId>("lotte");
  const [pin, setPin] = useState("");

  const [modal, setModal] = useState<ModalState>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("payments");
  const [payments, setPayments] = useState<PaymentHistoryRow[]>(SAMPLE_PAYMENT_HISTORY);
  const [vouchers, setVouchers] = useState<VoucherHistoryRow[]>(SAMPLE_VOUCHER_HISTORY);

  const seq = useRef(0);
  const nextId = () => `m${Date.now()}-${++seq.current}`;

  const total = sumSelectedServices(selected);
  const itemsSummary = summarizeServices(selected);
  const pinReady = isPinComplete(pin);
  // 상품권 '구매'는 선택한 서비스와 무관하므로 그 모드에서는 서비스 선택을 숨긴다(무엇을 결제하는지 헷갈림 방지)
  const isBuyMode = tab === "voucher" && voucherMode === "buy";

  // 모달을 닫으면 결과가 추가된 내역 탭으로 포커스를 옮긴다.
  // (모달을 연 버튼은 선택 초기화로 비활성화되어 포커스를 돌려줄 수 없다)
  const closeModal = useCallback(() => {
    setModal(null);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('[data-history-tab][aria-pressed="true"]')?.focus();
    });
  }, []);

  // ── 액션 ────────────────────────────────────

  const issueVirtualAccount = () => {
    if (total <= 0) return;
    const account = createMockVirtualAccount(total);
    setPayments((prev) => [
      { id: nextId(), at: formatKst(new Date()), method: "VBANK", item: itemsSummary, amount: total, status: "PENDING", note: `${account.bank} ${account.accountNumber} · ${account.dueAt}까지` },
      ...prev,
    ]);
    setModal({ kind: "vbank", account, items: itemsSummary });
    setSelected([]);
    setHistoryTab("payments");
  };

  const pressAmount = (add: number) => {
    const [next, rejected] = addAmount(buyAmount, add);
    setBuyAmount(next);
    setLimitHit(rejected);
  };

  const resetAmount = () => {
    setBuyAmount(0);
    setLimitHit(false);
  };

  const purchaseVoucher = () => {
    if (buyAmount <= 0) return;
    const voucher = voucherLabel(buyType);
    setVouchers((prev) => [
      { id: nextId(), at: formatKst(new Date()), voucher, pinMasked: "-", amount: buyAmount, status: "PURCHASED" },
      ...prev,
    ]);
    setModal({ kind: "buy", voucher, amount: buyAmount });
    resetAmount();
    setHistoryTab("vouchers");
  };

  const payWithVoucherPin = () => {
    if (total <= 0 || !pinReady) return;
    const voucher = voucherLabel(pinType);
    const pinMasked = maskPin(pin);
    const at = formatKst(new Date());
    setVouchers((prev) => [{ id: nextId(), at, voucher, pinMasked, amount: total, status: "REGISTERED" }, ...prev]);
    setPayments((prev) => [
      { id: nextId(), at, method: "VOUCHER", item: itemsSummary, amount: total, status: "PAID", note: `${voucher} (PIN ${pinMasked})` },
      ...prev,
    ]);
    setModal({ kind: "pin", voucher, pinMasked, amount: total, items: itemsSummary });
    setPin("");
    setSelected([]);
    setHistoryTab("payments");
  };

  return (
    <div className="animate-fade-in pb-6">
      {/* 지점 헤더 */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between">
        <div>
          <p className="text-[15px] font-extrabold tracking-tight text-gray-900">{MOCK_BRANCH.brand}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{MOCK_BRANCH.name} · 예약 결제</p>
        </div>
        <ReceiptText size={18} className="text-gray-400 mt-1" aria-hidden />
      </div>

      {/* 목업 안내 */}
      <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5" role="note">
        <Info size={14} className="mt-0.5 flex-shrink-0 text-amber-600" aria-hidden />
        <p className="text-[11px] leading-relaxed text-amber-800">
          <b>미리보기 화면입니다.</b> 실제 결제·가상계좌 발급·상품권 검증은 이루어지지 않습니다. 내역의 <b>예시</b>·<b>미리보기</b> 항목은 실제 결제 기록이 아닙니다.
        </p>
      </div>

      <div className="px-4 pt-5">
        <h1 className="text-lg font-bold text-gray-900">예약 결제</h1>
        <p className="text-xs text-gray-500 mt-1">결제 수단을 고르고 이용하실 서비스를 선택해 주세요.</p>
      </div>

      {/* 결제 수단 */}
      <div className="mx-4 mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200" role="group" aria-label="결제 수단">
        <TabButton active={tab === "vbank"} onClick={() => setTab("vbank")} icon={<Landmark size={18} />} title="가상계좌 입금" desc="계좌를 발급받아 입금" />
        <TabButton active={tab === "voucher"} onClick={() => setTab("voucher")} icon={<Gift size={18} />} title="상품권 결제" desc="구매하거나 PIN으로 결제" />
      </div>

      {/* 상품권 결제 방식 — 서비스 선택보다 먼저 고르게 해, 모드 전환 시 누른 버튼 위치가 밀리지 않게 한다 */}
      {tab === "voucher" && (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-2" role="group" aria-label="상품권 결제 방식">
          <ModeButton active={voucherMode === "buy"} onClick={() => setVoucherMode("buy")} icon={<ShoppingBag size={18} />} title="상품권 구매" desc="구매 후 PIN 발급" />
          <ModeButton active={voucherMode === "pin"} onClick={() => setVoucherMode("pin")} icon={<Ticket size={18} />} title="보유 상품권" desc="PIN으로 결제" />
        </div>
      )}

      {/* ① 서비스 선택 — 가상계좌 입금 / 보유 상품권 결제에서만 */}
      {!isBuyMode && (
        <Section step={1} title="서비스 선택" desc="이용하실 서비스를 선택하세요. (복수 선택 가능)">
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100" aria-label="서비스 목록">
            {MOCK_SERVICES.map((s) => {
              const disabled = s.price === null;
              const checked = selected.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelected((prev) => toggleService(prev, s.id))}
                    aria-pressed={checked}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                      disabled ? "cursor-not-allowed opacity-60" : checked ? "bg-brand-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                        checked ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white"
                      }`}
                      aria-hidden
                    >
                      {checked && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-gray-900">{s.name}</span>
                      <span className="block truncate text-[11px] text-gray-500">{s.desc}</span>
                    </span>
                    <span className="flex-shrink-0 text-right">
                      <span className="block text-[13px] font-bold text-gray-900">{s.price === null ? "협의 필요" : formatWon(s.price)}</span>
                      <span className="block text-[10px] text-gray-500">{s.unit}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">총 결제 금액</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500">{selected.length > 0 ? itemsSummary : "선택된 서비스 없음"}</p>
            </div>
            <p className="flex-shrink-0 text-xl font-extrabold text-gray-900" aria-live="polite">{formatWon(total)}</p>
          </div>
        </Section>
      )}

      {tab === "vbank" && (
        <div className="px-4 pt-4">
          <button type="button" onClick={issueVirtualAccount} disabled={total <= 0} className={PRIMARY_BUTTON}>
            가상계좌 발급하기 <ChevronRight size={16} aria-hidden />
          </button>
          {total <= 0 && <p className="mt-2 text-center text-[11px] text-gray-500">서비스를 먼저 선택해 주세요.</p>}
          <ul className="mt-3 space-y-1 text-[11px] text-gray-500">
            <li>· 실제 서비스에서는 발급된 가상계좌로 24시간 안에 입금하면 예약이 자동으로 확정됩니다.</li>
            <li>· 입금 기한이 지나면 계좌가 만료되어 다시 발급받아야 합니다.</li>
            <li>· 지금은 미리보기라 실제 계좌가 발급되지 않습니다.</li>
          </ul>
        </div>
      )}

      {isBuyMode && (
        <Section step={1} title="상품권 구매" desc="구매하실 상품권 종류와 금액을 선택하세요.">
          <VoucherTypePicker name="buy-type" value={buyType} onChange={setBuyType} />
          <p className="mt-4 mb-2 text-xs font-bold text-gray-700">구매 금액 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {AMOUNT_PRESETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => pressAmount(a)}
                className="rounded-full border border-gray-200 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98]"
              >
                + {formatWon(a)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            금액 버튼을 누를 때마다 합산됩니다. (1회 최대 {formatWon(VOUCHER_PURCHASE_MAX)})
          </p>
          {limitHit && (
            <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
              1회 구매 한도({formatWon(VOUCHER_PURCHASE_MAX)})를 초과할 수 없습니다.
            </p>
          )}

          <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">총 구매 금액</span>
              <button type="button" onClick={resetAmount} className="flex items-center gap-1 rounded-md px-1 text-[11px] text-gray-600 hover:text-gray-900">
                <RotateCcw size={12} aria-hidden /> 초기화
              </button>
            </div>
            <p className="mt-1 text-right text-xl font-extrabold text-gray-900" aria-live="polite">{formatWon(buyAmount)}</p>
          </div>

          <button type="button" onClick={purchaseVoucher} disabled={buyAmount <= 0} className={`mt-3 ${PRIMARY_BUTTON}`}>
            상품권 구매하기 <ChevronRight size={16} aria-hidden />
          </button>
        </Section>
      )}

      {tab === "voucher" && voucherMode === "pin" && (
        <Section step={2} title="상품권 사용하기" desc="보유한 상품권의 PIN 번호로 선택한 서비스를 결제합니다.">
          <VoucherTypePicker name="pin-type" value={pinType} onChange={setPinType} />
          <label htmlFor="voucher-pin" className="mt-4 mb-2 block text-xs font-bold text-gray-700">
            보유 상품권 PIN 번호
          </label>
          {/* text-base(16px): iOS Safari 는 16px 미만 입력창에 포커스하면 화면을 확대한다.
              maxLength 를 두지 않는다 — 공백·하이픈 섞인 PIN 을 붙여넣으면 정리 전에 잘려 버리기 때문(formatPin 이 16자로 자름) */}
          <input
            id="voucher-pin"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={pin}
            onChange={(e) => setPin(formatPin(e.target.value))}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            aria-describedby="voucher-pin-help"
            className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-base tracking-wider text-gray-900 placeholder:tracking-normal placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <ul id="voucher-pin-help" className="mt-2 space-y-0.5 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] text-gray-500">
            <li>· 상품권 PIN 번호는 대소문자를 구분하지 않습니다.</li>
            <li>· 사용 가능한 상품권만 결제가 이루어집니다.</li>
            <li>· 사용 완료된 상품권은 재사용이 불가능합니다.</li>
          </ul>

          <button type="button" onClick={payWithVoucherPin} disabled={total <= 0 || !pinReady} className={`mt-3 ${PRIMARY_BUTTON}`}>
            상품권 사용하기 <ChevronRight size={16} aria-hidden />
          </button>
          {(total <= 0 || !pinReady) && (
            <p className="mt-2 text-center text-[11px] text-gray-500">
              {total <= 0 ? "서비스를 먼저 선택해 주세요." : `PIN ${PIN_LENGTH}자리를 모두 입력해 주세요.`}
            </p>
          )}
        </Section>
      )}

      <p className="mt-4 flex items-center justify-center gap-1 px-4 text-center text-[11px] text-gray-500">
        <ShieldCheck size={12} className="flex-shrink-0" aria-hidden /> 실제 서비스에서는 결제·상품권 검증 후 예약이 확정됩니다.
      </p>

      {/* 내역 */}
      <div className="mx-4 mt-6">
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200" role="group" aria-label="내역 종류">
          {(["payments", "vouchers"] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-history-tab={t}
              aria-pressed={historyTab === t}
              onClick={() => setHistoryTab(t)}
              className={`py-2.5 text-xs font-bold transition-colors ${historyTab === t ? "bg-brand-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "payments" ? "결제 내역" : "상품권 등록 내역"}
            </button>
          ))}
        </div>

        <ul className="mt-3 space-y-2" aria-label={historyTab === "payments" ? "결제 내역" : "상품권 등록 내역"}>
          {historyTab === "payments"
            ? payments.map((r) => (
                <li key={r.id} className="rounded-xl border border-gray-100 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge className={r.method === "VBANK" ? "bg-sky-50 text-sky-700" : "bg-pink-50 text-pink-700"}>
                        {r.method === "VBANK" ? "가상계좌" : "상품권"}
                      </Badge>
                      <OriginBadge sample={r.sample} />
                    </div>
                    <Badge className={STATUS_STYLE[r.status]}>{PAYMENT_STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-gray-900">{r.item}</p>
                      <p className="text-[10px] text-gray-500">{r.at}</p>
                    </div>
                    <p className="flex-shrink-0 text-sm font-bold text-gray-900">{formatWon(r.amount)}</p>
                  </div>
                  {r.note !== "-" && <p className="mt-1.5 truncate text-[10px] text-gray-500">{r.note}</p>}
                </li>
              ))
            : vouchers.map((r) => (
                <li key={r.id} className="rounded-xl border border-gray-100 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-pink-50 text-pink-700">{r.voucher}</Badge>
                      <OriginBadge sample={r.sample} />
                    </div>
                    <Badge className={r.status === "REGISTERED" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}>
                      {VOUCHER_STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-gray-700">{r.pinMasked === "-" ? "온라인 구매" : `PIN ${r.pinMasked}`}</p>
                      <p className="text-[10px] text-gray-500">{r.at}</p>
                    </div>
                    <p className="flex-shrink-0 text-sm font-bold text-gray-900">{formatWon(r.amount)}</p>
                  </div>
                </li>
              ))}
        </ul>
      </div>

      {modal && <ResultModal modal={modal} onClose={closeModal} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// 하위 컴포넌트
// ─────────────────────────────────────────────

function TabButton({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-3.5 text-left transition-colors ${active ? "bg-brand-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
    >
      <span className={active ? "text-white" : "text-gray-500"} aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold">{title}</span>
        <span className={`block truncate text-[10px] ${active ? "text-white/80" : "text-gray-500"}`}>{desc}</span>
      </span>
    </button>
  );
}

function ModeButton({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors ${
        active ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="text-[13px] font-bold">{title}</span>
      <span className="text-[10px] text-gray-500">{desc}</span>
    </button>
  );
}

function Section({ step, title, desc, children }: { step: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="px-4 pt-6">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-900 text-[11px] font-bold text-white" aria-hidden>
          {step}
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          <p className="text-[11px] text-gray-500">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function VoucherTypePicker({ name, value, onChange }: { name: string; value: VoucherTypeId; onChange: (v: VoucherTypeId) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold text-gray-700">상품권 종류 선택</legend>
      <div className="space-y-1.5">
        {VOUCHER_TYPES.map((v) => (
          <label key={v.id} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px] text-gray-800">
            {/* globals.css 의 input[type=radio] accent-color(보라) 보다 우선하도록 ! 사용 */}
            <input
              type="radio"
              name={name}
              value={v.id}
              checked={value === v.id}
              onChange={() => onChange(v.id)}
              className="h-4 w-4 !accent-brand-900"
            />
            {v.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>{children}</span>;
}

/** 모든 내역 행에 출처를 표시한다 — 샘플은 '예시', 이 화면에서 만든 행은 '미리보기' */
function OriginBadge({ sample }: { sample?: boolean }) {
  return sample ? (
    <Badge className="bg-gray-100 text-gray-600">예시</Badge>
  ) : (
    <Badge className="bg-amber-50 text-amber-700">미리보기</Badge>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function ResultModal({ modal, onClose }: { modal: NonNullable<ModalState>; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // onClose 가 바뀌어도 아래 effect 가 다시 돌지 않도록 ref 로 보관
  // (재실행되면 스크롤 잠금의 '이전 값'이 hidden 으로 덮여 닫은 뒤에도 스크롤이 잠기는 버그가 생긴다)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    confirmRef.current?.focus();
    // 모달이 열린 동안 배경 스크롤 잠금
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      // Tab 포커스를 모달 안에서만 순환
      if (e.key === "Tab" && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!dialogRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const title = modal.kind === "vbank" ? "가상계좌 발급 예시" : modal.kind === "buy" ? "상품권 구매 예시" : "상품권 결제 예시";
  const warning =
    modal.kind === "vbank"
      ? "실제 계좌가 아닙니다. 이 계좌로 입금하지 마세요."
      : modal.kind === "buy"
        ? "실제로 구매·결제되지 않았습니다."
        : "실제로 상품권이 사용되거나 결제되지 않았습니다.";

  // document.body 로 포털 렌더링한다. 공개 레이아웃의 앱 프레임(.beautymate-app-frame)이 `relative z-10` 으로
  // 쌓임 맥락을 만들기 때문에, 프레임 안에서 그리면 z-[80] 이어도 프레임 밖 하단 메뉴(z-[60])에 가려
  // 모바일에서 '확인' 버튼이 눌리지 않는다. (모달은 사용자 동작 이후에만 열리므로 SSR 시점엔 렌더되지 않음)
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-mock-modal-title"
        aria-describedby="payment-mock-modal-warning"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <h3 id="payment-mock-modal-title" className="text-base font-bold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="-mr-1 -mt-1 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <X size={18} aria-hidden />
          </button>
        </div>

        <p
          id="payment-mock-modal-warning"
          className="mt-3 flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold leading-snug text-red-700"
        >
          <AlertTriangle size={14} className="mt-px flex-shrink-0" aria-hidden />
          <span>미리보기 화면입니다. {warning}</span>
        </p>

        <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-[13px]">
          {modal.kind === "vbank" && (
            <dl className="space-y-2.5">
              <Row label="결제 항목" value={modal.items} />
              <Row label="입금 은행" value={modal.account.bank} />
              <Row label="계좌번호" value={modal.account.accountNumber} />
              <Row label="예금주" value={modal.account.holder} />
              <Row label="입금 금액" value={formatWon(modal.account.amount)} strong />
              <Row label="입금 기한" value={`${modal.account.dueAt}까지`} />
            </dl>
          )}

          {modal.kind === "buy" && (
            <>
              <dl className="space-y-2.5">
                <Row label="상품권 종류" value={modal.voucher} />
                <Row label="구매 금액" value={formatWon(modal.amount)} strong />
              </dl>
              <p className="mt-2.5 text-[11px] leading-relaxed text-gray-500">실제 서비스에서는 PG 결제 화면으로 이동하며, 결제 완료 후 상품권 PIN이 발급됩니다.</p>
            </>
          )}

          {modal.kind === "pin" && (
            <>
              <dl className="space-y-2.5">
                <Row label="결제 항목" value={modal.items} />
                <Row label="상품권" value={modal.voucher} />
                <Row label="PIN" value={modal.pinMasked} />
                <Row label="결제 금액" value={formatWon(modal.amount)} strong />
              </dl>
              <p className="mt-2.5 text-[11px] leading-relaxed text-gray-500">실제 서비스에서는 발행사 검증을 거쳐 사용 가능한 상품권만 결제됩니다.</p>
            </>
          )}
        </div>

        <button ref={confirmRef} type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-brand-900 py-3 text-sm font-bold text-white hover:bg-brand-950">
          확인
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex-shrink-0 text-gray-500">{label}</dt>
      <dd className={`min-w-0 truncate text-right ${strong ? "text-base font-extrabold text-brand-800" : "font-semibold text-gray-900"}`}>{value}</dd>
    </div>
  );
}
