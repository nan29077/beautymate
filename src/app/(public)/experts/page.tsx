import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, Sparkles } from "lucide-react";
import { getHomeStories } from "@/lib/siteContent";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "추천 뷰티 전문가 | 뷰티메이트",
  description: "뷰티메이트가 추천하는 분야별 뷰티 전문가를 만나보세요.",
};

const SPECIALTIES = ["스킨케어 · 피부 컨디션", "퍼스널 컬러 · 메이크업", "헤어 · 스타일링"];

export default async function ExpertsPage() {
  const stories = await getHomeStories();

  return (
    <div className="beautymate-pc-page bg-white">
      <section className="bg-[#fff7f8] px-5 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <p className="text-xs font-extrabold tracking-[0.22em] text-[#b44b68]">CURATED EXPERTS</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 lg:text-5xl">추천 뷰티 전문가</h1>
              <p className="mt-4 text-sm text-gray-500 lg:text-base">분야별 전문성과 고객 경험을 바탕으로 소개하는 뷰티 파트너입니다.</p>
            </div>
            <Link href="/sellers" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#6d2945] px-6 py-3 text-sm font-bold text-white">
              <Search size={16} /> 조건별 전문가 찾기
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.slice(0, 3).map((story, index) => (
              <article key={story.name} className="group overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-[0_14px_40px_rgba(61,20,39,0.08)] transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-72 overflow-hidden bg-rose-50">
                  <img src={story.avatar || "/avatars/beautymate/default.svg"} alt={story.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-5 left-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#8f3652]">{SPECIALTIES[index]}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2"><h2 className="text-xl font-extrabold text-gray-950">{story.name}</h2><BadgeCheck size={20} className="text-[#b44b68]" /></div>
                  <p className="mt-3 text-sm leading-6 text-gray-500">“{story.quote}”</p>
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5">
                    <span className="text-sm font-bold text-[#b44b68]">{story.metric}</span>
                    <Link href="/sellers" className="inline-flex items-center gap-1 text-sm font-bold text-gray-700">전문가 찾기 <ArrowRight size={15} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 rounded-[2rem] bg-gradient-to-r from-[#3d1427] to-[#8f3652] px-7 py-10 text-white lg:flex lg:items-center lg:justify-between lg:px-12">
            <div><p className="flex items-center gap-2 text-sm font-bold text-rose-200"><Sparkles size={16} /> 더 많은 전문가</p><h2 className="mt-2 text-2xl font-extrabold">분야와 스타일에 맞춰 직접 찾아보세요</h2></div>
            <Link href="/sellers" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#6d2945] lg:mt-0">전문가 검색하기 <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
