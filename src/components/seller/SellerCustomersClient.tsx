"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface CustomerRow {
  customerId: string;
  name: string;
  phone: string;
  birthDate: string | null;
  gender: string | null;
  totalReservations: number;
  completedCount: number;
  totalPaid: number;
  lastReservationDate: string | null;
  firstReservationDate: string | null;
  /** 이 뷰티샵으로 가입 귀속된 고객 (예약 이력 없이도 노출) */
  isReferred?: boolean;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 검색 비교용: 공백·하이픈 제거 후 소문자 */
function normalize(v: string) {
  return v.replace(/[\s-]/g, "").toLowerCase();
}

export default function SellerCustomersClient({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return customers;
    return customers.filter(
      (c) => normalize(c.name).includes(q) || normalize(c.phone).includes(q)
    );
  }, [customers, query]);

  const totalPaidAll = customers.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalCompleted = customers.reduce((sum, c) => sum + c.completedCount, 0);

  return (
    <div className="animate-fade-in space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={20} strokeWidth={1.6} className="text-gray-500" /> 고객 관리
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">상담을 진행한 고객의 이력과 결제 내역을 확인합니다.</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "총 고객", value: `${customers.length.toLocaleString()}명` },
          { label: "완료 상담", value: `${totalCompleted.toLocaleString()}건` },
          { label: "누적 결제", value: formatPrice(totalPaidAll) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <p className="text-[10px] text-gray-400 font-medium mb-1">{s.label}</p>
            <p className="text-sm sm:text-base font-bold text-gray-900 break-all">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="고객 이름 또는 연락처로 검색"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Users size={32} strokeWidth={1.4} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">
            {customers.length === 0 ? "아직 상담한 고객이 없습니다." : "검색 결과가 없습니다."}
          </p>
        </div>
      ) : (
        <>
          {/* 데스크톱: 테이블 */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[11px] text-gray-400 font-medium">
                  <th className="text-left px-4 py-2.5">고객명</th>
                  <th className="text-left px-4 py-2.5">연락처</th>
                  <th className="text-right px-4 py-2.5">총 상담</th>
                  <th className="text-right px-4 py-2.5">총 결제금액</th>
                  <th className="text-right px-4 py-2.5">마지막 상담일</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.customerId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/seller/customers/${c.customerId}`} className="font-semibold text-gray-900 hover:underline">
                        {c.name}
                      </Link>
                      {c.isReferred && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-medium align-middle">
                          귀속
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {c.completedCount}회
                      <span className="text-[11px] text-gray-300"> / 예약 {c.totalReservations}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(c.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatDate(c.lastReservationDate)}</td>
                    <td className="px-2">
                      <Link href={`/seller/customers/${c.customerId}`} className="text-gray-300 hover:text-gray-600">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 */}
          <div className="sm:hidden space-y-2">
            {filtered.map((c) => (
              <Link
                key={c.customerId}
                href={`/seller/customers/${c.customerId}`}
                className="block bg-white rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {c.name}
                      {c.isReferred && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-medium">
                          귀속
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-500">
                  <span>상담 {c.completedCount}회</span>
                  <span className="text-gray-200">|</span>
                  <span className="font-semibold text-gray-800">{formatPrice(c.totalPaid)}</span>
                  <span className="text-gray-200">|</span>
                  <span>{formatDate(c.lastReservationDate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
