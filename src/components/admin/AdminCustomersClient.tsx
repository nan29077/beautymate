"use client";

// 관리자 고객 귀속 관리 — 전체 고객의 귀속 뷰티 전문가 조회·변경
import { useCallback, useEffect, useState } from "react";
import { Search, UserRoundCheck, ChevronLeft, ChevronRight } from "lucide-react";

interface SellerOption {
  id: string;
  shopName: string;
  slug: string;
}

interface CustomerRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  referredBySeller: SellerOption | null;
}

export default function AdminCustomersClient() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (search) qs.set("search", search);
      if (sellerFilter) qs.set("sellerId", sellerFilter);
      const res = await fetch(`/api/admin/customers?${qs.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.customers);
        setSellers(body.sellers);
        setTotal(body.total);
        setTotalPages(body.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, sellerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChangeSeller = async (userId: string, sellerId: string) => {
    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sellerId: sellerId || null }),
      });
      const body = await res.json();
      if (!res.ok) {
        alert(body.error || "귀속 변경에 실패했습니다.");
        return;
      }
      setRows((rs) =>
        rs.map((r) =>
          r.id === userId ? { ...r, referredBySeller: body.referredBySeller } : r,
        ),
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <UserRoundCheck size={20} className="text-indigo-500" /> 고객 귀속 관리
        <span className="text-sm font-normal text-gray-400">총 {total}명</span>
      </h1>

      {/* 검색·필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
          className="flex items-center gap-1.5"
        >
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이름·이메일·전화 검색"
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs w-56"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium"
          >
            검색
          </button>
        </form>
        <select
          value={sellerFilter}
          onChange={(e) => {
            setPage(1);
            setSellerFilter(e.target.value);
          }}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-600"
        >
          <option value="">전체 귀속</option>
          <option value="none">미귀속</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.shopName}
            </option>
          ))}
        </select>
      </div>

      {/* 목록 */}
      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">고객이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">고객</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">귀속 뷰티 전문가</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.name || "-"}</p>
                    <p className="text-[10px] text-gray-400">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.phone || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(row.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.referredBySeller?.id || ""}
                      disabled={savingId === row.id}
                      onChange={(e) => handleChangeSeller(row.id, e.target.value)}
                      className={`border rounded-lg px-2 py-1.5 text-xs max-w-[200px] ${
                        row.referredBySeller
                          ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                          : "border-gray-200 text-gray-400"
                      } ${savingId === row.id ? "opacity-50" : ""}`}
                    >
                      <option value="">미귀속</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shopName}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
