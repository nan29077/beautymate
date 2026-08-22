import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, CreditCard, Heart, Radio, Search, Sparkles } from "lucide-react";

export const metadata = { title: "이용방법 | 뷰티메이트", description: "뷰티메이트에서 전문가를 찾고 라이브를 확인한 뒤 예약하는 방법을 안내합니다." };

const CUSTOMER_STEPS = [
  { icon: Search, title: "전문가 찾기", desc: "관심 분야와 이름으로 뷰티 전문가를 검색하고 스타일을 비교하세요." },
  { icon: Heart, title: "단골 설정", desc: "마음에 드는 전문가를 단골로 설정해 라이브와 새로운 소식을 받아보세요." },
  { icon: Radio, title: "콘텐츠·라이브 확인", desc: "예약 전에 전문가의 실력과 서비스 분위기를 충분히 확인할 수 있어요." },
  { icon: CalendarCheck, title: "예약·결제", desc: "원하는 서비스와 시간을 골라 안전하고 간편하게 예약을 완료하세요." },
];

const EXPERT_STEPS = ["전문가 회원가입과 승인", "나만의 뷰티샵 꾸미기", "서비스와 예약 가능 시간 등록", "라이브·콘텐츠로 고객 만나기", "예약 관리와 정산"];

export default function GuidePage() {
  return <div className="beautymate-pc-page bg-white">
    <section className="bg-gradient-to-br from-[#3d1427] via-[#6d2945] to-[#b44b68] px-5 py-16 text-white lg:px-8 lg:py-24"><div className="mx-auto max-w-[1100px] text-center"><p className="text-xs font-extrabold tracking-[0.22em] text-rose-200">HOW TO USE</p><h1 className="mt-4 text-3xl font-extrabold lg:text-5xl">뷰티메이트, 이렇게 이용하세요</h1><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/70 lg:text-base">전문가를 발견하는 순간부터 예약과 결제까지 복잡한 과정 없이 자연스럽게 이어집니다.</p></div></section>
    <section className="px-5 py-16 lg:px-8 lg:py-24"><div className="mx-auto max-w-[1320px]"><div className="flex items-end justify-between"><div><p className="text-xs font-extrabold tracking-[0.2em] text-[#b44b68]">FOR CUSTOMERS</p><h2 className="mt-3 text-2xl font-extrabold text-gray-950 lg:text-4xl">고객 이용방법</h2></div></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-6">{CUSTOMER_STEPS.map(({ icon: Icon, title, desc }, index) => <article key={title} className="relative rounded-[1.5rem] border border-gray-100 p-6 lg:p-8"><span className="absolute right-6 top-6 text-xs font-extrabold text-rose-200">0{index + 1}</span><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#b44b68]"><Icon size={22} /></span><h3 className="mt-5 text-lg font-extrabold text-gray-950">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p></article>)}</div><Link href="/sellers" className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-full bg-[#6d2945] px-7 py-3.5 text-sm font-bold text-white">전문가 찾아보기 <ArrowRight size={16} /></Link></div></section>
    <section className="bg-[#fff7f8] px-5 py-16 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-20"><div className="overflow-hidden rounded-[2rem]"><img src="/banners/beautymate/hero-live-v3.png" alt="뷰티 전문가 라이브" className="aspect-[4/3] w-full object-cover" /></div><div><p className="text-xs font-extrabold tracking-[0.2em] text-[#b44b68]">FOR EXPERTS</p><h2 className="mt-3 text-3xl font-extrabold text-gray-950 lg:text-4xl">뷰티 전문가 이용방법</h2><div className="mt-7 space-y-4">{EXPERT_STEPS.map((step, index) => <div key={step} className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6d2945] text-xs font-bold text-white">{index + 1}</span><span className="font-bold text-gray-800">{step}</span><Check size={17} className="ml-auto text-[#b44b68]" /></div>)}</div><Link href="/become-seller" className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#6d2945] px-7 py-3.5 text-sm font-bold text-[#6d2945]">전문가 입점 안내 <ArrowRight size={16} /></Link></div></div></section>
    <section className="px-5 py-14 lg:px-8 lg:py-20"><div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-6 rounded-[2rem] bg-[#3d1427] px-7 py-10 text-center text-white lg:flex-row lg:px-12 lg:text-left"><div><p className="flex items-center justify-center gap-2 text-sm font-bold text-rose-200 lg:justify-start"><Sparkles size={16} /> 준비되셨나요?</p><h2 className="mt-2 text-2xl font-extrabold">나에게 맞는 뷰티를 지금 시작하세요</h2></div><div className="flex gap-3"><Link href="/live" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#6d2945]">라이브 보기</Link><Link href="/sellers" className="rounded-full bg-white/10 px-6 py-3 text-sm font-bold ring-1 ring-white/25">전문가 찾기</Link></div></div></section>
  </div>;
}
