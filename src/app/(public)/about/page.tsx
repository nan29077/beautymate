import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, Heart, Radio, ShieldCheck, Sparkles, Users } from "lucide-react";

export const metadata = {
  title: "뷰티메이트 소개 | 나에게 맞는 뷰티 전문가",
  description: "뷰티 전문가의 콘텐츠와 라이브를 확인하고 예약까지 연결하는 뷰티 플랫폼, 뷰티메이트를 소개합니다.",
};

const VALUES = [
  { icon: BadgeCheck, title: "확인하고 선택하는 뷰티", desc: "콘텐츠와 라이브를 통해 전문가의 실력과 분위기를 먼저 확인할 수 있어요." },
  { icon: CalendarCheck, title: "문의 없이 간편한 예약", desc: "전화나 메시지를 주고받지 않아도 서비스와 시간을 골라 바로 예약할 수 있어요." },
  { icon: Heart, title: "다시 만나는 단골 관계", desc: "마음에 드는 전문가를 단골로 설정하고 라이브와 새로운 소식을 놓치지 마세요." },
  { icon: ShieldCheck, title: "안심할 수 있는 거래", desc: "예약, 결제, 취소와 정산 과정을 한곳에서 투명하게 관리합니다." },
];

export default function AboutPage() {
  return (
    <div className="beautymate-pc-page bg-white">
      <section className="relative overflow-hidden bg-[#fff4f6] px-5 py-14 lg:px-8 lg:py-24">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div><p className="text-xs font-extrabold tracking-[0.22em] text-[#b44b68]">ABOUT BEAUTYMATE</p><h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-gray-950 lg:text-5xl lg:leading-[1.15]">나에게 맞는 아름다움을<br />전문가와 함께 발견하세요</h1><p className="mt-5 max-w-xl text-sm leading-7 text-gray-600 lg:text-base lg:leading-8">뷰티메이트는 스킨케어, 메이크업, 헤어, 네일, 퍼스널 컬러 전문가의 콘텐츠와 라이브를 살펴보고 원하는 서비스를 편리하게 예약하는 플랫폼입니다.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/sellers" className="inline-flex items-center gap-2 rounded-full bg-[#6d2945] px-6 py-3 text-sm font-bold text-white">전문가 만나보기 <ArrowRight size={16} /></Link><Link href="/guide" className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-bold text-[#6d2945]">이용방법 보기</Link></div></div>
          <div className="relative overflow-hidden rounded-[2rem] shadow-[0_25px_70px_rgba(109,41,69,0.18)]"><img src="/banners/beautymate/hero-color-v3.png" alt="퍼스널 뷰티 컨설팅" className="aspect-[4/3] h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#3d1427]/55 to-transparent" /><div className="absolute bottom-7 left-7 text-white"><Sparkles size={22} /><p className="mt-3 text-xl font-extrabold">BEAUTY, MADE PERSONAL</p></div></div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24"><div className="mx-auto max-w-[1320px]"><div className="text-center"><p className="text-xs font-extrabold tracking-[0.2em] text-[#b44b68]">OUR VALUES</p><h2 className="mt-3 text-2xl font-extrabold text-gray-950 lg:text-4xl">뷰티메이트가 만드는 경험</h2></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-6">{VALUES.map(({ icon: Icon, title, desc }) => <article key={title} className="rounded-[1.5rem] border border-rose-100 bg-white p-6 shadow-sm lg:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#b44b68]"><Icon size={22} /></span><h3 className="mt-5 text-base font-extrabold text-gray-950 lg:text-lg">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p></article>)}</div></div></section>

      <section className="bg-[#3d1427] px-5 py-16 text-white lg:px-8 lg:py-20"><div className="mx-auto grid max-w-[1100px] grid-cols-3 gap-4 text-center"><div><Users className="mx-auto text-rose-200" /><strong className="mt-3 block text-xl font-extrabold lg:text-3xl">전문가</strong><span className="mt-1 block text-xs text-white/60 lg:text-sm">분야별 뷰티 파트너</span></div><div><Radio className="mx-auto text-rose-200" /><strong className="mt-3 block text-xl font-extrabold lg:text-3xl">라이브</strong><span className="mt-1 block text-xs text-white/60 lg:text-sm">실시간 노하우와 소통</span></div><div><ShieldCheck className="mx-auto text-rose-200" /><strong className="mt-3 block text-xl font-extrabold lg:text-3xl">안심 예약</strong><span className="mt-1 block text-xs text-white/60 lg:text-sm">간편 결제와 예약 관리</span></div></div></section>
    </div>
  );
}
