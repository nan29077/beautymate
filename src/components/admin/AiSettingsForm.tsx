"use client";

import { useState } from "react";
import { Save, Loader2, KeyRound, PlugZap, Eye, EyeOff, CheckCircle2, AlertCircle, Video } from "lucide-react";
import { useAppDialog } from "@/components/shared/AppDialog";

/**
 * 관리자 > 권한 설정 > AI 설정 탭.
 * OpenAI API 키와 Daily.co API 키를 DB(settings)에 저장한다.
 * 저장된 키는 서버가 마스킹(앞 8자 + ***)해서만 내려주며 원문은 노출하지 않는다.
 */
export default function AiSettingsForm({
  initialHasKey,
  initialMaskedKey,
  initialDailyHasKey,
  initialDailyMaskedKey,
}: {
  initialHasKey: boolean;
  initialMaskedKey: string | null;
  initialDailyHasKey: boolean;
  initialDailyMaskedKey: string | null;
}) {
  const { appAlert } = useAppDialog();

  // ── OpenAI 상태 ──────────────────────────────────────────────────
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [maskedKey, setMaskedKey] = useState<string | null>(initialMaskedKey);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Daily.co 상태 ────────────────────────────────────────────────
  const [dailyHasKey, setDailyHasKey] = useState(initialDailyHasKey);
  const [dailyMaskedKey, setDailyMaskedKey] = useState<string | null>(initialDailyMaskedKey);
  const [dailyKeyInput, setDailyKeyInput] = useState("");
  const [showDailyKey, setShowDailyKey] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [dailyTesting, setDailyTesting] = useState(false);
  const [dailyTestResult, setDailyTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Daily.co 핸들러 ─────────────────────────────────────────────
  const handleDailySave = async () => {
    const value = dailyKeyInput.trim();
    if (!value) {
      await appAlert("저장할 Daily.co API 키를 입력해주세요.");
      return;
    }
    setDailySaving(true);
    setDailyTestResult(null);
    try {
      const res = await fetch("/api/admin/daily-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyApiKey: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "저장 실패");
      setDailyHasKey(Boolean(data.hasKey));
      setDailyMaskedKey(data.maskedKey ?? null);
      setDailyKeyInput("");
      await appAlert({ message: "Daily.co API 키를 저장했습니다.", type: "success" });
    } catch (e: any) {
      await appAlert({ message: e?.message || "저장에 실패했습니다.", type: "error" });
    } finally {
      setDailySaving(false);
    }
  };

  const handleDailyRemove = async () => {
    setDailySaving(true);
    setDailyTestResult(null);
    try {
      const res = await fetch("/api/admin/daily-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyApiKey: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "삭제 실패");
      setDailyHasKey(false);
      setDailyMaskedKey(null);
      await appAlert({ message: "저장된 Daily.co 키를 삭제했습니다.", type: "success" });
    } catch (e: any) {
      await appAlert({ message: e?.message || "키 삭제에 실패했습니다.", type: "error" });
    } finally {
      setDailySaving(false);
    }
  };

  const handleDailyTest = async () => {
    setDailyTesting(true);
    setDailyTestResult(null);
    try {
      const res = await fetch("/api/admin/daily-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dailyKeyInput.trim() ? { dailyApiKey: dailyKeyInput.trim() } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        setDailyTestResult({ ok: true, message: data.message || "연결 성공" });
      } else {
        setDailyTestResult({ ok: false, message: data?.error || "연결에 실패했습니다" });
      }
    } catch {
      setDailyTestResult({ ok: false, message: "연결 테스트 중 오류가 발생했습니다" });
    } finally {
      setDailyTesting(false);
    }
  };

  // ── OpenAI 핸들러 ────────────────────────────────────────────────
  const handleSave = async () => {
    const value = keyInput.trim();
    if (!value) {
      await appAlert("저장할 OpenAI 키를 입력해주세요.");
      return;
    }
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiKey: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "저장 실패");
      setHasKey(Boolean(data.hasKey));
      setMaskedKey(data.maskedKey ?? null);
      setKeyInput("");
      await appAlert({ message: "OpenAI 키를 저장했습니다.", type: "success" });
    } catch (e: any) {
      await appAlert({ message: e?.message || "AI 설정 저장에 실패했습니다.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiKey: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "삭제 실패");
      setHasKey(false);
      setMaskedKey(null);
      await appAlert({ message: "저장된 키를 삭제했습니다.", type: "success" });
    } catch (e: any) {
      await appAlert({ message: e?.message || "키 삭제에 실패했습니다.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keyInput.trim() ? { openaiKey: keyInput.trim() } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        setTestResult({ ok: true, message: data.message || "연결 성공" });
      } else {
        setTestResult({ ok: false, message: data?.error || "연결에 실패했습니다" });
      }
    } catch {
      setTestResult({ ok: false, message: "연결 테스트 중 오류가 발생했습니다" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Daily.co API 키 ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Video size={17} strokeWidth={1.5} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Daily.co API 키</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              화상·전화 상담방 생성에 사용됩니다. DB 설정이 환경변수(DAILY_API_KEY)보다 우선 적용됩니다.
            </p>
          </div>
        </div>

        {/* 현재 상태 */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
          {dailyHasKey ? (
            <>
              <CheckCircle2 size={15} strokeWidth={1.5} className="text-emerald-500 flex-shrink-0" />
              <span className="text-[12px] text-gray-600">
                등록됨 · <span className="font-mono text-gray-900">{dailyMaskedKey}</span>
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={15} strokeWidth={1.5} className="text-amber-500 flex-shrink-0" />
              <span className="text-[12px] text-gray-500">
                DB 등록 키 없음 · 환경변수 DAILY_API_KEY{" "}
                {process.env.NEXT_PUBLIC_DAILY_CONFIGURED === "true" ? "설정됨" : "미설정"}
              </span>
            </>
          )}
        </div>

        {/* 키 입력 */}
        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
          {dailyHasKey ? "새 키로 교체" : "키 등록"}
        </label>
        <div className="relative">
          <input
            type={showDailyKey ? "text" : "password"}
            value={dailyKeyInput}
            onChange={(e) => {
              setDailyKeyInput(e.target.value);
              setDailyTestResult(null);
            }}
            placeholder="daily_api_key_..."
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2.5 pr-10 text-[13px] font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
          />
          <button
            type="button"
            onClick={() => setShowDailyKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
            aria-label={showDailyKey ? "키 숨기기" : "키 보기"}
          >
            {showDailyKey ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
          </button>
        </div>

        {/* 테스트 결과 */}
        {dailyTestResult && (
          <div
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border ${
              dailyTestResult.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {dailyTestResult.ok ? (
              <CheckCircle2 size={14} strokeWidth={1.5} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0" />
            )}
            {dailyTestResult.message}
          </div>
        )}

        {/* 액션 */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleDailySave}
            disabled={dailySaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-[13px] font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {dailySaving ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : <Save size={15} strokeWidth={1.75} />}
            저장
          </button>
          <button
            type="button"
            onClick={handleDailyTest}
            disabled={dailyTesting || (!dailyHasKey && !dailyKeyInput.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {dailyTesting ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : <PlugZap size={15} strokeWidth={1.75} />}
            연결 테스트
          </button>
          {dailyHasKey && (
            <button
              type="button"
              onClick={handleDailyRemove}
              disabled={dailySaving}
              className="ml-auto px-3 py-2 rounded-lg text-[12px] text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            >
              저장된 키 삭제
            </button>
          )}
        </div>
      </div>

      {/* ── OpenAI API 키 ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <KeyRound size={17} strokeWidth={1.5} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">OpenAI API 키</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              상담 종료 시 AI 요약(gpt-4o)에 사용됩니다. 키는 서버에만 저장되고 화면에는 마스킹되어 표시됩니다.
            </p>
          </div>
        </div>

        {/* 현재 상태 */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
          {hasKey ? (
            <>
              <CheckCircle2 size={15} strokeWidth={1.5} className="text-emerald-500 flex-shrink-0" />
              <span className="text-[12px] text-gray-600">
                등록됨 · <span className="font-mono text-gray-900">{maskedKey}</span>
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={15} strokeWidth={1.5} className="text-amber-500 flex-shrink-0" />
              <span className="text-[12px] text-gray-500">아직 등록된 키가 없습니다. AI 요약 기능이 비활성 상태입니다.</span>
            </>
          )}
        </div>

        {/* 키 입력 */}
        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
          {hasKey ? "새 키로 교체" : "키 등록"}
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setTestResult(null);
            }}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2.5 pr-10 text-[13px] font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
            aria-label={showKey ? "키 숨기기" : "키 보기"}
          >
            {showKey ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
          </button>
        </div>

        {/* 연결 테스트 결과 */}
        {testResult && (
          <div
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border ${
              testResult.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 size={14} strokeWidth={1.5} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0" />
            )}
            {testResult.message}
          </div>
        )}

        {/* 액션 */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 text-black text-[13px] font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : <Save size={15} strokeWidth={1.75} />}
            저장
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || (!hasKey && !keyInput.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : <PlugZap size={15} strokeWidth={1.75} />}
            연결 테스트
          </button>
          {hasKey && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="ml-auto px-3 py-2 rounded-lg text-[12px] text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            >
              저장된 키 삭제
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-2">사용 위치</h3>
        <ul className="text-[12px] text-gray-500 space-y-1.5 list-disc pl-4">
          <li>상담사 상담 화면 → 상담 종료 → 메모 입력 후 &ldquo;AI 요약&rdquo; 버튼</li>
          <li>요약 결과는 예약의 AI 요약으로 저장되어 고객 이력·CRM에서 조회됩니다</li>
          <li>키가 없으면 요약 버튼이 &ldquo;관리자 설정에서 OpenAI 키를 등록해주세요&rdquo; 안내를 표시합니다</li>
        </ul>
      </div>
    </div>
  );
}
