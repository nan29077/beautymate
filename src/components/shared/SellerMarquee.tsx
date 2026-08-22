"use client";

// 활동중인 뷰티 전문가를 가로로 자동 슬라이드(마퀴)로 보여주는 장식용 섹션.
// ※ 더미(데모) 뷰티 전문가 — 실제 뷰티 전문가 디렉토리 탐색이 아니라 "활동중" 분위기를 보여주는 용도(클릭 비활성).
// ※ 다양한 뷰티 분야의 데모 전문가를 혼합해 표시.
const DUMMY = [
  { name: "서연 테라피스트", mood: "맞춤 스킨케어 · 피부 컨디션", status: "오늘 예약 가능", avatar: 1 },
  { name: "민지 컨설턴트", mood: "퍼스널 컬러 · 메이크업", status: "예약 가능", avatar: 3 },
  { name: "하린 디자이너", mood: "헤어 · 스타일링", status: "라이브 중", avatar: 8 },
  { name: "유나 아티스트", mood: "데일리 메이크업 · 브로우", status: "오늘의 추천", avatar: 14 },
  { name: "도윤 원장", mood: "네일 아트 · 케어", status: "예약 가능", avatar: 20 },
  { name: "별하 테라피스트", mood: "바디케어 · 웰니스", status: "오늘 예약 가능", avatar: 25 },
  { name: "현아 디자이너", mood: "헤어 컬러 · 두피 케어", status: "라이브 중", avatar: 27 },
  { name: "소담 컨설턴트", mood: "이미지 컨설팅 · 컬러", status: "예약 가능", avatar: 30 },
];

function beautymateAvatar(index: number): string {
  return "/avatars/beautymate/default.svg";
}

function Card({ s }: { s: (typeof DUMMY)[number] }) {
  return (
    <div className="flex-shrink-0 w-40 mr-3 rounded-2xl border border-gray-100 bg-white p-3 flex items-center gap-2.5">
      <img src={beautymateAvatar(s.avatar)} alt="" className="w-11 h-11 rounded-full ring-2 ring-brand-200 bg-brand-50 flex-shrink-0 object-cover" />
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-gray-900 truncate">{s.name}</p>
        <p className="text-[10px] text-gray-400 truncate">{s.mood}</p>
        <p className="text-[10px] text-brand-600 font-semibold mt-0.5">{s.status}</p>
      </div>
    </div>
  );
}

export default function SellerMarquee() {
  const row = [...DUMMY, ...DUMMY];
  return (
    <div className="relative overflow-hidden py-1">
      <div className="flex w-max sb-marquee">
        {row.map((s, i) => <Card key={i} s={s} />)}
      </div>
      {/* 좌우 페이드 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      <style>{`
        @keyframes sbMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .sb-marquee { animation: sbMarquee 28s linear infinite; }
        .sb-marquee:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
