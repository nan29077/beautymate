"use client";

// 뷰티 전문가 뷰티샵 회원 목록 — 자기 뷰티샵 회원만 조회
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users, ChevronRight } from "lucide-react";

interface MemberRow {
  id: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
  reservationCount: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function SellerMembersClient() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/seller/members${qs}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.members);
        setTotal(body.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={20} strokeWidth={1.6} className="text-gray-500" /> 뷰티샵 회원
          <span className="text-sm font-normal text-gray-400">{total}명</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          내 뷰티샵 전용 화면으로 가입한 독립 회원 목록입니다.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
        }}
        className="relative"
      >
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="이름·이메일·연락처로 검색 후 Enter"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
        />
      </form>

      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Users size={32} strokeWidth={1.4} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">
            아직 뷰티샵 회원이 없습니다. 뷰티샵 페이지의 회원가입으로 가입한 고객이 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[11px] text-gray-400 font-medium">
                <th className="text-left px-4 py-2.5">회원</th>
                <th className="text-left px-4 py-2.5">연락처</th>
                <th className="text-right px-4 py-2.5">예약 수</th>
                <th className="text-right px-4 py-2.5">가입일</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/seller/customers/${m.user.id}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {m.user.name || "-"}
                    </Link>
                    <p className="text-[10px] text-gray-400">{m.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.user.phone || "-"}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{m.reservationCount}건</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatDate(m.joinedAt)}</td>
                  <td className="px-2">
                    <Link
                      href={`/seller/customers/${m.user.id}`}
                      className="text-gray-300 hover:text-gray-600"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
