"use client";

import { Icon } from '@/components/shared/Icon';
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { COMPANY, POLICY_EFFECTIVE_DATE } from "@/lib/companyInfo";
import { useRouter } from "next/navigation";
import { Hexagon } from 'lucide-react';
import { useState } from "react";

const FAQ_ITEMS = [
  { q: "상담은 어떻게 진행되나요?", a: "원하는 뷰티 전문가의 페이지에서 뷰티 서비스와 시간을 선택해 예약·결제하면 됩니다. 예약이 확정되면 마이페이지 > 예약내역에서 일정과 진행 상태를 확인할 수 있으며, 예약한 시간에 뷰티 전문가가 안내한 방식(라이브·전화 등)으로 상담이 진행됩니다. 상담 시작 전에 알림으로 다시 안내드려요." },
  { q: "예약 취소/환불은 어떻게 하나요?", a: "마이페이지 > 예약내역에서 해당 예약을 선택해 취소를 신청하거나 1대1 문의를 통해 접수해 주세요. 상담 시작 전 취소는 전액 환불되며, 상담 임박 시점이나 진행 이후에는 환불이 제한될 수 있습니다. 자세한 기준은 각 뷰티 서비스의 안내를 확인해 주세요. 환불은 접수 후 보통 3~5 영업일 이내에 결제 수단으로 처리됩니다." },
  { q: "뷰티 전문가가 되려면 어떻게 하나요?", a: "회원가입 시 '뷰티 전문가' 유형을 선택하거나, 일반 회원으로 가입한 뒤 마이페이지에서 뷰티 전문가 신청을 하면 됩니다. 운영 중인 SNS 채널(인스타그램·유튜브·틱톡 등) 정보를 함께 제출해 주시면 심사에 도움이 됩니다. 관리자 검토 후 1~3 영업일 이내에 승인 결과가 안내되며, 승인되면 나만의 뷰티샵 개설과 라이브 방송 기능이 활성화됩니다." },
  { q: "결제 수단은 무엇이 있나요?", a: "신용카드, 체크카드, 계좌이체, 간편계좌이체, 네이버페이, 카카오페이 등을 지원합니다. 결제 단계에서 원하는 수단을 선택할 수 있으며, 간편계좌이체를 이용하면 계좌번호 입력 없이 빠르게 결제할 수 있습니다. 결제 과정에서 오류가 발생하면 잠시 후 다시 시도하거나 1대1 문의로 알려 주세요." },
  { q: "비밀번호를 잊어버렸어요.", a: "로그인 페이지의 '비밀번호 찾기'를 이용해 주세요. 가입 시 사용한 이메일로 재설정 링크가 발송되며, 링크는 발송 후 일정 시간 동안만 유효합니다. 메일이 보이지 않으면 스팸함을 확인하시고, 그래도 받지 못하셨다면 1대1 문의로 알려 주시면 도와드리겠습니다." },
  { q: "라이브 방송을 보려면 어떻게 하나요?", a: "뷰티 전문가의 뷰티샵 페이지에서 LIVE 뱃지가 표시된 뷰티 전문가를 클릭하면 진행 중인 실시간 방송을 바로 시청할 수 있습니다. 방송 중에는 채팅으로 뷰티 전문가와 소통하거나 소개되는 뷰티 서비스를 그 자리에서 구매할 수 있습니다. 별도 앱 설치 없이 모바일 웹에서 시청 가능하며, 안정적인 시청을 위해 Wi-Fi 환경을 권장합니다." },
  { q: "서비스 후기는 어디서 작성하나요?", a: "마이페이지 > 예약내역에서 완료된 예약을 선택해 후기를 작성할 수 있습니다. 서비스 완료 후 일정 기간이 지나면 자동으로 확정 처리되며, 솔직한 후기를 남기면 다른 고객에게 큰 도움이 됩니다. 작성한 후기는 마이페이지에서 언제든 수정하거나 삭제할 수 있습니다." },
];

function PageBanner({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-400 to-brand-300 px-5 py-8 text-center">
      {/* 뷰티 장식 */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20%" cy="25%" r="3" fill="white"/>
        <circle cx="75%" cy="15%" r="2" fill="white"/>
        <circle cx="50%" cy="80%" r="1.5" fill="white"/>
        <circle cx="85%" cy="60%" r="2.5" fill="white"/>
        <circle cx="10%" cy="65%" r="1.5" fill="white"/>
      </svg>
      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/25 rounded-2xl mb-3 backdrop-blur-sm">
          <span className="text-white">{icon}</span>
        </div>
        <h2 className="text-lg font-extrabold text-white drop-shadow-sm">{title}</h2>
        <p className="text-brand-100 text-xs mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-brand-700 mb-2 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-4 bg-brand-400 rounded-full" />
      {children}
    </h3>
  );
}

function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-brand-100 rounded-xl overflow-hidden bg-white shadow-sm">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-brand-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-[13px] font-semibold text-gray-900 pr-4">{item.q}</span>
            {open === i
              ? <Icon name="ChevronDown" size={16} className="text-brand-400 flex-shrink-0 rotate-180" />
              : <Icon name="ChevronDown" size={16} className="text-brand-300 flex-shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 pb-4 pt-1 bg-brand-50 border-t border-brand-100">
              <p className="text-[13px] text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("문의가 접수되었습니다. 영업일 기준 1~2일 내에 답변드리겠습니다.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-brand-700 mb-1.5">이름</label>
        <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
          placeholder="이름을 입력하세요"
          className="w-full border border-brand-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-brand-50/50" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-brand-700 mb-1.5">이메일</label>
        <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
          placeholder="email@example.com"
          className="w-full border border-brand-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-brand-50/50" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-brand-700 mb-1.5">문의 내용</label>
        <textarea required value={form.message} onChange={e => setForm({...form, message: e.target.value})}
          placeholder="문의 내용을 입력하세요"
          rows={6}
          className="w-full border border-brand-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-brand-50/50 resize-none" />
      </div>
      <button type="submit"
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-200">
        <Icon name="Message" size={15} strokeWidth={1.5} />
        문의 접수하기
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// 이용약관 / 개인정보처리방침 본문
//
// ⚠️ 법률 자문을 대체하지 않습니다. 실제 서비스 오픈 전 법률 검토를 권장합니다.
// 전자상거래 등에서의 소비자보호에 관한 법률(통신판매중개자 지위 고지),
// 개인정보 보호법 제30조(개인정보처리방침 수립·공개) 기준으로 작성했습니다.
// ─────────────────────────────────────────────

type LegalSection = { heading: string; body: string };

function LegalDoc({ sections, effectiveDate }: { sections: LegalSection[]; effectiveDate: string }) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <Card key={s.heading}>
          <SectionHeading>{s.heading}</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
        </Card>
      ))}
      <p className="text-gray-400 text-xs text-center pt-1">
        본 문서는 {effectiveDate}부터 시행됩니다.
      </p>
    </div>
  );
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "제1조 (목적)",
    body: `이 약관은 ${COMPANY.name}(이하 "회사")가 운영하는 ${COMPANY.serviceName} 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항, 서비스 이용 조건과 절차를 규정함을 목적으로 합니다.`,
  },
  {
    heading: "제2조 (정의)",
    body: `① "서비스"란 회사가 뷰티 전문가와 고객을 연결하여 뷰티 상담의 예약·결제·진행을 지원하는 온라인 플랫폼 및 관련 부가 서비스를 말합니다.
② "회원"이란 이 약관에 동의하고 회사와 이용계약을 체결한 자로, 고객 회원과 뷰티 전문가 회원으로 구분합니다.
③ "고객"이란 뷰티 전문가가 제공하는 상담 서비스를 예약·이용하는 회원을 말합니다.
④ "뷰티 전문가"란 회사의 승인을 받아 자신의 뷰티샵(개인 페이지)을 개설하고 상담 서비스를 등록·제공하는 회원을 말합니다.
⑤ "뷰티샵"이란 뷰티 전문가가 서비스 내에 개설한 개인 페이지를 말합니다.
⑥ "상담 서비스"란 뷰티 전문가가 등록하여 고객에게 제공하는 유료 상담(라이브·영상·전화·방문 등)을 말합니다.
⑦ "라이브"란 뷰티 전문가가 서비스 내에서 진행하는 실시간 방송을 말합니다.`,
  },
  {
    heading: "제3조 (약관의 명시와 개정)",
    body: `① 회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면 또는 연결 화면에 게시합니다.
② 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
③ 약관을 개정할 경우 적용일자와 개정 사유를 명시하여 적용일자 7일 전부터 공지합니다. 다만 회원에게 불리한 내용으로 개정하는 경우에는 30일 전부터 공지하고, 회원이 알 수 있도록 전자적 방법으로 개별 통지합니다.
④ 회원이 개정 약관의 적용에 동의하지 않는 경우 이용계약을 해지할 수 있습니다. 공지 기간 내에 거부 의사를 표시하지 않으면 개정 약관에 동의한 것으로 봅니다.`,
  },
  {
    heading: "제4조 (이용계약의 체결)",
    body: `① 이용계약은 가입 신청자가 이 약관에 동의하고 회사가 이를 승낙함으로써 체결됩니다.
② 회사는 다음 각 호에 해당하는 신청에 대하여 승낙을 거부하거나 사후에 이용계약을 해지할 수 있습니다.
  1. 타인의 명의를 도용하거나 허위 정보를 기재한 경우
  2. 만 14세 미만인 경우
  3. 이전에 이용약관 위반으로 이용계약이 해지된 이력이 있는 경우
  4. 서비스의 정상적인 운영을 방해할 목적으로 신청한 경우
③ 뷰티 전문가 회원으로 활동하려는 경우 회사가 정한 별도의 심사 절차를 거쳐야 하며, 회사는 자격·경력·활동 채널 등을 확인한 후 승인 여부를 결정합니다.`,
  },
  {
    heading: "제5조 (회원 정보의 관리)",
    body: `① 회원은 가입 시 제공한 정보에 변경이 있는 경우 즉시 수정하여야 하며, 수정하지 않아 발생한 불이익에 대해 회사는 책임지지 않습니다.
② 회원은 자신의 계정과 비밀번호를 직접 관리해야 하며 제3자에게 이용을 허락해서는 안 됩니다.
③ 계정이 도용되거나 제3자가 사용하고 있음을 인지한 경우 즉시 회사에 통지하고 회사의 안내에 따라야 합니다.`,
  },
  {
    heading: "제6조 (회사의 지위 — 통신판매중개자)",
    body: `① 회사는 뷰티 전문가와 고객 간 거래를 중개하는 통신판매중개자이며, 통신판매의 당사자가 아닙니다.
② 상담 서비스의 내용, 품질, 진행 방식, 일정 준수 등 거래에 관한 의무와 책임은 해당 상담 서비스를 등록·제공하는 뷰티 전문가에게 있습니다.
③ 회사는 거래 시스템(플랫폼)과 결제·정산 지원 기능을 제공할 뿐이며, 개별 거래 및 그로 인해 발생한 분쟁에 대하여는 관련 법령이 정한 범위를 넘어서는 책임을 부담하지 않습니다.
④ 다만 회사는 이용자 보호를 위하여 분쟁 발생 시 사실 확인과 조정을 지원하며, 반복적으로 문제가 확인된 뷰티 전문가에 대해 노출 제한·이용 정지 등의 조치를 취할 수 있습니다.`,
  },
  {
    heading: "제7조 (서비스의 제공 및 변경)",
    body: `① 서비스는 연중무휴 1일 24시간 제공을 원칙으로 합니다.
② 회사는 시스템 점검·교체, 설비 장애, 통신 두절 등 운영상·기술상 필요가 있는 경우 서비스의 전부 또는 일부를 일시 중단할 수 있으며, 사전에 공지합니다. 다만 예측할 수 없는 사유로 인한 경우에는 사후에 공지할 수 있습니다.
③ 회사는 서비스의 내용, 운영상·기술상 사양을 변경할 수 있으며, 변경 사항이 회원에게 중대한 영향을 미치는 경우 사전에 공지합니다.`,
  },
  {
    heading: "제8조 (예약 및 결제)",
    body: `① 고객은 뷰티 전문가가 등록한 상담 서비스와 일정을 선택하여 예약을 신청하고, 회사가 제공하는 결제 수단을 통해 결제합니다.
② 예약은 결제가 완료된 시점에 접수되며, 뷰티 전문가의 확정 또는 회사가 정한 자동 확정 절차에 따라 최종 확정됩니다.
③ 결제 수단은 신용·체크카드, 계좌이체, 간편결제 등 회사가 제공하는 방법에 따르며, 결제 처리는 회사가 제휴한 전자결제대행(PG) 사업자를 통해 이루어집니다.
④ 상담료는 뷰티 전문가가 정한 금액을 기준으로 하며, 할인·쿠폰·추천 코드 등이 적용될 수 있습니다. 최종 결제 금액은 결제 화면에서 확인할 수 있습니다.`,
  },
  {
    heading: "제9조 (취소·환불)",
    body: `① 고객은 상담 시작 전까지 마이페이지 또는 고객센터를 통해 예약을 취소할 수 있습니다.
② 취소 시점에 따른 환불 기준은 다음과 같으며, 개별 상담 서비스에 별도 기준이 명시된 경우 그 기준을 우선합니다.
  1. 상담 시작 24시간 이전 취소: 전액 환불
  2. 상담 시작 24시간 이내 취소: 상담 서비스에 명시된 기준에 따라 일부 금액이 공제될 수 있음
  3. 상담 시작 이후 또는 무단 불참: 환불이 제한될 수 있음
③ 뷰티 전문가의 사정으로 상담이 진행되지 못한 경우 전액 환불되며, 고객은 일정 변경을 선택할 수 있습니다.
④ 통신 장애 등 회사 또는 뷰티 전문가의 귀책으로 상담이 정상 진행되지 못한 경우 전액 환불 또는 재진행 중 고객이 선택할 수 있습니다.
⑤ 환불은 접수일로부터 영업일 기준 3~5일 이내에 원결제 수단으로 처리되며, 결제 수단에 따라 처리 기간이 달라질 수 있습니다.`,
  },
  {
    heading: "제10조 (뷰티 전문가의 의무)",
    body: `① 뷰티 전문가는 등록한 상담 서비스의 내용을 사실과 다르게 표시하거나 과장하여서는 안 됩니다.
② 뷰티 전문가는 확정된 예약 일정을 준수해야 하며, 부득이한 사유로 변경이 필요한 경우 즉시 고객과 회사에 통지해야 합니다.
③ 뷰티 전문가는 상담 과정에서 알게 된 고객의 개인정보 및 상담 내용을 상담 목적 외로 이용하거나 제3자에게 제공해서는 안 됩니다.
④ 뷰티 전문가는 의료행위에 해당하는 진단·처치·시술을 하거나 의학적 효과를 보증하는 표현을 사용해서는 안 되며, 관련 법령(의료법, 약사법, 표시·광고의 공정화에 관한 법률 등)을 준수해야 합니다.
⑤ 뷰티 전문가는 자신이 제공하는 서비스와 관련하여 필요한 자격·인허가·신고 의무가 있는 경우 이를 스스로 이행해야 합니다.`,
  },
  {
    heading: "제11조 (정산)",
    body: `① 회사는 고객이 결제한 상담료에서 이 약관 및 별도 정책에 따른 플랫폼 수수료를 공제한 금액을 뷰티 전문가에게 정산합니다.
② 정산은 상담 완료 및 환불 가능 기간 경과 후 회사가 정한 정산 주기에 따라 지급되며, 구체적인 수수료율과 정산 일정은 서비스 내 정산 화면에서 확인할 수 있습니다.
③ 부정 거래, 환불 분쟁, 법령 위반이 의심되는 거래에 대해서는 사실 확인이 완료될 때까지 정산이 보류될 수 있습니다.
④ 정산 대금 지급 시 관련 법령에 따른 원천징수 등 세무 처리가 이루어질 수 있으며, 뷰티 전문가는 정확한 정산 정보를 제공할 의무가 있습니다.`,
  },
  {
    heading: "제12조 (회원의 의무 및 금지행위)",
    body: `회원은 다음 각 호의 행위를 하여서는 안 됩니다.
  1. 타인의 개인정보·계정·결제수단을 도용하는 행위
  2. 허위 사실을 게시하거나 타인의 명예를 훼손하는 행위
  3. 음란물, 폭력적 표현 등 공서양속에 반하는 정보를 게시·전송하는 행위
  4. 회사의 동의 없이 서비스를 영리 목적으로 이용하거나 자동화된 수단으로 데이터를 수집하는 행위
  5. 서비스의 안정적 운영을 방해하거나 시스템에 무단 접근하는 행위
  6. 상담 외의 목적으로 연락처를 요구하거나 서비스 밖에서 직접 거래를 유도하는 행위
  7. 대가를 조건으로 후기를 작성하게 하거나 사실과 다른 후기를 작성하는 행위
  8. 기타 관련 법령 및 이 약관을 위반하는 행위`,
  },
  {
    heading: "제13조 (게시물 및 저작권)",
    body: `① 회원이 서비스에 게시한 후기·사진·라이브 방송 등 게시물의 저작권은 해당 회원에게 있습니다.
② 회원은 회사가 서비스의 운영·홍보·개선을 위하여 게시물을 서비스 내 및 회사가 운영하는 채널에 노출·복제·편집할 수 있도록 무상의 이용권을 부여합니다. 회원이 게시물을 삭제하거나 이용계약을 해지하면 회사는 합리적인 기간 내에 노출을 중단합니다.
③ 회사는 게시물이 제12조의 금지행위에 해당하거나 타인의 권리를 침해한다고 판단되는 경우 사전 통지 없이 삭제·비공개 처리할 수 있습니다.
④ 서비스에 포함된 상표·디자인·프로그램 등에 대한 지식재산권은 회사에 귀속되며, 회원은 회사의 사전 동의 없이 이를 복제·배포·2차 가공할 수 없습니다.`,
  },
  {
    heading: "제14조 (이용 제한 및 계약 해지)",
    body: `① 회원은 언제든지 서비스 내 메뉴 또는 고객센터를 통해 이용계약 해지(회원 탈퇴)를 신청할 수 있습니다.
② 회사는 회원이 이 약관을 위반한 경우 경고, 게시물 삭제, 일시 이용 정지, 영구 이용 정지 등 단계적 조치를 취할 수 있으며, 위반 정도가 중대한 경우 즉시 이용계약을 해지할 수 있습니다.
③ 이용 제한 조치에 이의가 있는 회원은 고객센터를 통해 소명할 수 있으며, 회사는 소명이 타당한 경우 즉시 이용 제한을 해제합니다.
④ 이용계약이 해지되더라도 진행 중인 예약과 정산에 관한 권리·의무는 그 처리가 완료될 때까지 유효합니다.`,
  },
  {
    heading: "제15조 (개인정보의 보호)",
    body: `회사는 관련 법령에 따라 회원의 개인정보를 보호하며, 개인정보의 수집·이용·보관·파기에 관한 사항은 별도의 개인정보처리방침에 따릅니다.`,
  },
  {
    heading: "제16조 (책임의 제한)",
    body: `① 회사는 천재지변, 정전, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
② 회사는 회원의 귀책사유로 발생한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
③ 회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대하여 개입할 의무가 없으며, 그로 인한 손해를 배상할 책임이 없습니다. 다만 회사의 고의 또는 중대한 과실이 있는 경우에는 그러하지 아니합니다.`,
  },
  {
    heading: "제17조 (분쟁 해결 및 관할)",
    body: `① 회사는 회원이 제기하는 정당한 의견이나 불만을 반영하기 위하여 고객센터를 운영합니다.
② 회사와 회원 간 발생한 분쟁은 상호 협의하여 해결함을 원칙으로 하며, 협의가 이루어지지 않을 경우 「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 소비자분쟁조정기구의 조정을 신청할 수 있습니다.
③ 이 약관은 대한민국 법령에 따라 해석되며, 소송이 제기될 경우 「민사소송법」에 따른 관할 법원에 제기합니다.`,
  },
  {
    heading: "부칙 — 사업자 정보 및 문의",
    body: `법인명 ${COMPANY.name}
사업자등록 ${COMPANY.bizNum}
대표자 ${COMPANY.ceo}
메일 ${COMPANY.email}
고객센터 ${COMPANY.phone}`,
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "총칙",
    body: `${COMPANY.name}(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.`,
  },
  {
    heading: "1. 수집하는 개인정보 항목",
    body: `가. 회원가입 (필수)
  · 고객 회원: 이름, 이메일, 비밀번호
  · 뷰티 전문가 회원: 이름, 이메일, 비밀번호, 휴대전화번호, 활동 채널 정보
나. 회원가입 (선택): 성별, 생년월일, 프로필 이미지, 주소
다. 소셜 로그인 이용 시: 해당 서비스(카카오·네이버·구글)가 제공하는 식별자, 이름, 이메일, 프로필 이미지
라. 예약·결제 시: 예약 내역, 결제 수단 정보, 결제 승인 내역, 취소·환불 내역
  ※ 카드번호 등 결제 인증 정보는 전자결제대행사가 처리하며 회사는 저장하지 않습니다.
마. 정산 시(뷰티 전문가): 예금주명, 은행명, 계좌번호, 사업자등록번호 또는 주민등록번호(원천징수 목적)
바. 상담·문의 과정에서: 상담 내용, 문의 내용, 후기, 라이브 채팅 기록
사. 자동 수집: IP 주소, 쿠키, 접속 일시, 서비스 이용 기록, 기기·브라우저 정보`,
  },
  {
    heading: "2. 개인정보의 수집·이용 목적",
    body: `가. 회원 관리: 본인 확인, 가입 의사 확인, 부정 이용 방지, 고지사항 전달
나. 서비스 제공: 상담 예약 중개, 일정 안내, 라이브 방송 및 영상 상담 제공, 후기 관리
다. 결제 및 정산: 상담료 결제, 취소·환불 처리, 뷰티 전문가 정산 및 세무 신고
라. 고객 지원: 문의 접수 및 처리, 분쟁 조정에 필요한 기록 보존
마. 서비스 개선: 이용 통계 분석, 신규 기능 개발, 접속 빈도 파악
바. 마케팅(선택 동의 시): 이벤트·혜택 정보 안내. 동의하지 않아도 서비스 이용에 제한이 없으며 언제든 철회할 수 있습니다.`,
  },
  {
    heading: "3. 개인정보의 보유 및 이용 기간",
    body: `회사는 원칙적으로 회원 탈퇴 시 개인정보를 지체 없이 파기합니다. 다만 다음의 경우 명시한 기간 동안 보관합니다.
가. 관련 법령에 따른 보존
  · 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)
  · 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)
  · 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)
  · 표시·광고에 관한 기록: 6개월 (전자상거래법)
  · 세금계산서 등 거래 증빙: 5년 (국세기본법)
  · 서비스 접속 기록: 3개월 (통신비밀보호법)
나. 부정 이용 방지를 위한 보존: 부정 이용 기록은 탈퇴 후 1년간 보관 후 파기합니다.`,
  },
  {
    heading: "4. 개인정보의 제3자 제공",
    body: `회사는 정보주체의 개인정보를 제2조에 명시한 범위 내에서만 처리하며, 정보주체의 동의 또는 법령의 특별한 규정이 있는 경우에만 제3자에게 제공합니다.
가. 예약 성립 시 뷰티 전문가에게 제공
  · 제공받는 자: 고객이 예약한 뷰티 전문가
  · 제공 항목: 고객 이름(또는 닉네임), 연락처, 예약 일시, 상담 신청 내용
  · 제공 목적: 예약된 상담의 진행 및 일정 안내
  · 보유 기간: 상담 완료 후 관련 법령이 정한 기간
나. 그 외에는 법령에 따른 수사기관의 적법한 요청이 있는 경우를 제외하고 제3자에게 제공하지 않습니다.`,
  },
  {
    heading: "5. 개인정보 처리의 위탁",
    body: `회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.
  · 전자결제대행(PG) 사업자: 결제 처리 및 결제 도용 방지
  · 알림 발송 대행사: 예약·상담 안내 알림톡 및 문자 발송
  · 클라우드 인프라 사업자: 서비스 데이터의 저장 및 운영
  · 영상 상담 솔루션 사업자: 실시간 영상 상담 연결
회사는 위탁계약 체결 시 개인정보의 안전한 관리에 관한 사항을 명확히 규정하고, 수탁자가 이를 준수하는지 감독합니다. 위탁 업무의 내용이나 수탁자가 변경될 경우 본 방침을 통해 공개합니다.`,
  },
  {
    heading: "6. 정보주체의 권리와 행사 방법",
    body: `① 정보주체는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.
② 권리 행사는 서비스 내 마이페이지에서 직접 하거나, 아래 개인정보 보호책임자에게 서면·전화·이메일로 요청할 수 있습니다. 회사는 지체 없이 조치합니다.
③ 만 14세 미만 아동의 개인정보는 수집하지 않으며, 법정대리인의 동의 없이 가입한 사실이 확인되면 즉시 해당 계정을 삭제합니다.
④ 정보주체가 개인정보의 오류에 대한 정정을 요청한 경우, 정정을 완료할 때까지 해당 개인정보를 이용하거나 제공하지 않습니다.`,
  },
  {
    heading: "7. 개인정보의 파기 절차 및 방법",
    body: `① 회사는 보유 기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이(사유 발생일로부터 5일 이내) 파기합니다.
② 파기 방법
  · 전자적 파일: 복구할 수 없는 기술적 방법으로 영구 삭제
  · 종이 문서: 분쇄하거나 소각
③ 법령에 따라 보존해야 하는 개인정보는 별도의 데이터베이스로 분리하여 보관하며, 보존 목적 외의 용도로 이용하지 않습니다.`,
  },
  {
    heading: "8. 개인정보의 안전성 확보 조치",
    body: `가. 관리적 조치: 내부관리계획 수립·시행, 개인정보 취급자 최소화 및 정기 교육
나. 기술적 조치: 비밀번호의 일방향 암호화 저장, 접근권한 관리, 접속기록 보관, 보안 프로그램 운영
다. 물리적 조치: 데이터 보관 시스템에 대한 접근 통제
라. 전송 구간 암호화: 서비스 전 구간에 HTTPS(SSL/TLS)를 적용합니다.`,
  },
  {
    heading: "9. 쿠키(Cookie)의 운영",
    body: `① 회사는 로그인 상태 유지와 이용 통계 분석을 위해 쿠키를 사용합니다.
② 정보주체는 웹 브라우저의 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만 쿠키 저장을 거부하면 로그인이 필요한 일부 서비스의 이용이 제한될 수 있습니다.`,
  },
  {
    heading: "10. 개인정보 보호책임자",
    body: `회사는 개인정보 처리에 관한 업무를 총괄하고 정보주체의 불만 처리 및 피해 구제를 담당하는 개인정보 보호책임자를 다음과 같이 지정하고 있습니다.
  · 개인정보 보호책임자: ${COMPANY.ceo} (대표)
  · 소속: ${COMPANY.name}
  · 이메일: ${COMPANY.email}
  · 전화: ${COMPANY.phone}
정보주체는 서비스 이용 중 발생한 모든 개인정보 보호 관련 문의를 위 연락처로 문의할 수 있으며, 회사는 지체 없이 답변합니다.`,
  },
  {
    heading: "11. 권익침해 구제 방법",
    body: `개인정보 침해로 인한 상담 및 피해 구제가 필요한 경우 아래 기관에 문의할 수 있습니다.
  · 개인정보 분쟁조정위원회: 1833-6972 (www.kopico.go.kr)
  · 개인정보 침해신고센터: 118 (privacy.kisa.or.kr)
  · 대검찰청 사이버수사과: 1301 (www.spo.go.kr)
  · 경찰청 사이버수사국: 182 (ecrm.police.go.kr)`,
  },
  {
    heading: "12. 개인정보처리방침의 변경",
    body: `이 개인정보처리방침은 시행일로부터 적용되며, 법령·정책 또는 보안 기술의 변경에 따라 내용이 추가·삭제·수정될 경우 변경 사항의 시행 7일 전부터 서비스 공지사항을 통해 고지합니다. 정보주체의 권리에 중대한 변경이 있는 경우에는 30일 전에 고지합니다.`,
  },
];

const PAGE_META: Record<string, { subtitle: string; icon: React.ReactNode }> = {
  contact:      { subtitle: "빠르게 답변드릴게요", icon: <Icon name="Message" size={24} strokeWidth={1.5} /> },
  faq:          { subtitle: "궁금한 점을 찾아보세요", icon: <Icon name="Help" size={24} strokeWidth={1.5} /> },
  shipping:     { subtitle: "예약·취소·환불 안내", icon: <Icon name="Calendar" size={24} strokeWidth={1.5} /> },
  terms:        { subtitle: "서비스 이용 약관", icon: <Icon name="File" size={24} strokeWidth={1.5} /> },
  privacy:      { subtitle: "개인정보 보호 정책", icon: <Icon name="Certified" size={24} strokeWidth={1.5} /> },
  "seller-guide": { subtitle: "뷰티 전문가로 시작하는 방법", icon: <Icon name="Sparkles" size={24} strokeWidth={1.5} /> },
};

const CONTENT: Record<string, { title: string; body: () => React.ReactNode }> = {
  contact: { title: "1대1 문의", body: () => <ContactPage /> },
  faq:     { title: "자주 묻는 질문", body: () => <FaqPage /> },
  shipping: {
    title: "예약·취소·환불 안내",
    body: () => (
      <div className="space-y-3">
        <Card>
          <SectionHeading>예약 확정</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">결제 완료 즉시 예약이 접수되며, 뷰티 전문가가 확정하면 마이페이지 &gt; 예약내역에서 확인할 수 있습니다. 확정 알림은 앱/이메일로 발송됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>예약 취소</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">마이페이지 &gt; 예약내역에서 직접 취소하거나 1대1 문의로 접수해 주세요. 상담 시작 전에는 전액 환불이 원칙이며, 상담 임박 시점(24시간 이내)에는 환불이 제한될 수 있습니다.</p>
        </Card>
        <Card>
          <SectionHeading>그룹 뷰티 클래스 캠페인 환불</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">그룹 뷰티 클래스 캠페인 종료 후 목표 달성 실패 시 전액 자동 환불됩니다. 목표 달성 후에는 개별 뷰티 서비스의 취소·환불 정책이 적용됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>환불 처리 기간</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">취소·환불 접수 후 보통 3~5 영업일 이내에 결제 수단으로 처리됩니다. 카드사 사정에 따라 다소 늦어질 수 있습니다.</p>
        </Card>
      </div>
    ),
  },
  terms: {
    title: "이용약관",
    body: () => <LegalDoc sections={TERMS_SECTIONS} effectiveDate={POLICY_EFFECTIVE_DATE} />,
  },
  privacy: {
    title: "개인정보처리방침",
    body: () => <LegalDoc sections={PRIVACY_SECTIONS} effectiveDate={POLICY_EFFECTIVE_DATE} />,
  },
  "seller-guide": {
    title: "뷰티 전문가 신청 안내",
    body: () => (
      <div className="space-y-3">
        <Card>
          <SectionHeading>뷰티 전문가란?</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">뷰티 전문가는 뷰티·퍼스널 컬러·뷰티 트렌드 등 자신만의 상담 서비스를 나만의 뷰티샵에 등록하고 고객에게 제공하는 전문가입니다. 예약·결제·라이브 방송 기능을 모두 플랫폼에서 지원합니다.</p>
        </Card>
        <Card>
          <SectionHeading>신청 자격</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">뷰티·퍼스널 컬러·뷰티 트렌드·심리상담 등 뷰티·상담 분야에서 활동 중이거나 준비 중인 누구나 신청 가능합니다. SNS 채널이 있으면 심사에 도움이 됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>신청 방법</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">회원가입 시 &apos;뷰티 전문가&apos;를 선택하거나, 일반 회원으로 가입 후 마이페이지에서 뷰티 전문가 신청을 할 수 있습니다. 관리자 검토 후 1~3 영업일 내 결과가 안내됩니다.</p>
        </Card>
        <Card>
          <SectionHeading>상담료 수익</SectionHeading>
          <p className="text-[13px] text-gray-600 leading-relaxed">고객이 상담을 예약·결제할 때마다 설정된 상담료에서 플랫폼 수수료를 제한 금액이 수익으로 발생합니다. 캠페인 종료 후 확정 시점에 정산됩니다.</p>
        </Card>
        <a href="/seller-apply"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-200 mt-2">
          <Icon name="Sparkles" size={15} strokeWidth={1.5} />
          뷰티 전문가 신청하기
        </a>
      </div>
    ),
  },
};

/** DB에 저장된 자유 형식(HTML/텍스트) 콘텐츠를 테마 카드로 렌더링 */
function parseSections(raw: string): { heading: string; body: string }[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === "sections" && Array.isArray(parsed.sections)) {
      return parsed.sections;
    }
  } catch {
    /* JSON이 아니면 무시 */
  }
  return null;
}

function DbContentBody({ content }: { content: string }) {
  const sections = parseSections(content);
  if (sections) {
    return (
      <div className="space-y-3">
        {sections.map((s, i) => (
          <Card key={i}>
            <SectionHeading>{s.heading}</SectionHeading>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
          </Card>
        ))}
      </div>
    );
  }
  // HTML/일반 텍스트 fallback — 카드 안에 표시
  return (
    <Card>
      <div
        className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line prose-sm"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    </Card>
  );
}

export interface DbContent {
  slug: string;
  title: string;
  content: string;
}

export default function SupportContent({
  slug,
  dbContent,
}: {
  slug: string;
  dbContent?: DbContent | null;
}) {
  const router = useRouter();
  const hardcoded = CONTENT[slug];
  const meta = PAGE_META[slug];

  // DB에 저장된 콘텐츠가 있으면 우선 사용 (관리자 편집/추가 내용 반영)
  const hasDb = !!(dbContent && dbContent.content && dbContent.content.trim().length > 0);

  if (!hardcoded && !hasDb) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4">
        <Hexagon size={48} strokeWidth={1} className="fill-brand-100 text-brand-400 mb-4" />
        <p className="text-brand-700 text-sm font-medium">페이지를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const title = dbContent?.title || hardcoded?.title || "고객센터";
  const subtitle = meta?.subtitle ?? "뷰티메이트 고객센터";
  const icon = meta?.icon ?? <Icon name="File" size={24} strokeWidth={1.5} />;

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-brand-50 pb-20">
      {/* 상단 네비게이션 바 */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-brand-100 px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-brand-600 hover:text-brand-800 transition-colors"
          aria-label="뒤로가기"
        >
          <Icon name="ArrowRight" size={20} strokeWidth={1.5} className="rotate-180" />
        </button>
        <h1 className="text-[15px] font-bold text-gray-900">{title}</h1>
      </div>

      {/* 배너 */}
      <PageBanner title={title} subtitle={subtitle} icon={icon} />

      {/* 본문 */}
      <div className="px-4 pt-5">
        {hasDb ? (
          <DbContentBody content={dbContent!.content} />
        ) : slug === "faq" || slug === "contact" ? (
          <Card>{hardcoded.body()}</Card>
        ) : (
          hardcoded.body()
        )}
      </div>
    </div>
  );
}
