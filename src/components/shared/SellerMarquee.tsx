"use client";

// 활동중인 상담사를 가로로 자동 슬라이드(마퀴)로 보여주는 장식용 섹션.
// ※ 더미(데모) 상담사 — 실제 상담사 디렉토리 탐색이 아니라 "활동중" 분위기를 보여주는 용도(클릭 비활성).
// ※ 선녀·도령·무당·만신·선생·역술인 등 다양한 유형을 혼합해 표시.
const DUMMY = [
  { name: "월령 선생", mood: "사주명리 · 신년운세", status: "오늘 상담 가능", avatar: 1 },
  { name: "청아 선녀", mood: "천상계 사주 해석", status: "예약 가능", avatar: 3 },
  { name: "해월 무당", mood: "신내림 30년 · 신점", status: "라이브 상담", avatar: 8 },
  { name: "연화 만신", mood: "만신 · 굿 · 부적", status: "오늘의 추천", avatar: 14 },
  { name: "도윤 도령", mood: "도령신 · 직업·이직운", status: "예약 가능", avatar: 20 },
  { name: "별하 역술인", mood: "역술 · 가족·인간관계", status: "오늘 상담 가능", avatar: 25 },
  { name: "현명 선생", mood: "대운 · 종합운세", status: "라이브 상담", avatar: 27 },
  { name: "소담 선녀", mood: "천기누설 · 타로", status: "예약 가능", avatar: 30 },
];

function sajuAvatar(index: number): string {
  return `/avatars/saju/saju-avatar-${String(index).padStart(2, "0")}.png`;
}

function Card({ s }: { s: (typeof DUMMY)[number] }) {
  return (
    <div className="flex-shrink-0 w-40 mr-3 rounded-2xl border border-gray-100 bg-white p-3 flex items-center gap-2.5">
      <img src={sajuAvatar(s.avatar)} alt="" className="w-11 h-11 rounded-full ring-2 ring-brand-200 bg-brand-50 flex-shrink-0 object-cover" />
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
