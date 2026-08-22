"use client";

// 관리자 뷰티샵 회원 관리 — 전체 조회·뷰티샵 필터·회원 등록/해제
import { useCallback, useEffect, useState } from "react";
import { Search, Users, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

interface ShopOption {
  id: string;
  shopName: string;
  slug: string;
}

interface MembershipRow {
  id: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
  shop: ShopOption;
}

export default function AdminMembershipsClient() {
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [shopFilter, setShopFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (shopFilter) qs.set("shopId", shopFilter);
      if (search) qs.set("search", search);
      const res = await fetch(`/api/admin/memberships?${qs.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setRows(body.memberships);
        setShops(body.shops);
        setTotal(body.total);
        setTotalPages(body.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, shopFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (row: MembershipRow) => {
    if (!window.confirm(`${row.user.name || row.user.email}님을 ${row.shop.shopName} 회원에서 해제할까요?`)) return;
    setRemovingId(row.id);
    try {
      const res = await fetch(`/api/admin/memberships?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        alert(body.error || "해제에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Users size={20} className="text-indigo-500" /> 뷰티샵 회원 관리
        <span className="text-sm font-normal text-gray-400">총 {total}명</span>
      </h1>

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
          <button type="submit" className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium">
            검색
          </button>
        </form>
        <select
          value={shopFilter}
          onChange={(e) => {
            setPage(1);
            setShopFilter(e.target.value);
          }}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-600"
        >
          <option value="">전체 뷰티샵</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.shopName}
            </option>
          ))}
        </select>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          뷰티샵 회원이 없습니다. (DB 스키마 미반영 환경에서는 빈 목록이 표시됩니다)
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">회원</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">소속 뷰티샵</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.user.name || "-"}</p>
                    <p className="text-[10px] text-gray-400">{row.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.user.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                      {row.shop.shopName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(row.joinedAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(row)}
                      disabled={removingId === row.id}
                      className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={11} />
                      {removingId === row.id ? "해제 중" : "회원 해제"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
