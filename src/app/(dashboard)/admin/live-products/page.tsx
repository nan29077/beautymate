"use client";

import { Icon } from '@/components/shared/Icon';
import { useState, useEffect, useCallback } from "react";
import { NO_IMAGE } from "@/lib/defaults";
import { Video, Eye, X, Loader2, Tag } from 'lucide-react';
import SafeImage from "@/components/shared/SafeImage";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { DashboardEmptyState, DashboardFilterPill, DashboardPageHeader } from "@/components/shared/DashboardUI";

interface ProductItem {
  id: string;
  name: string;
  thumbnail: string | null;
  basePrice: number;
  brandName: string | null;
  categoryName: string | null;
  allowGroupBuy: boolean;
  allowLiveCommerce: boolean;
}

export default function AdminLiveProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "groupbuy">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products/register?mode=admin-manage");
      const data = await res.json();
      if (data.products) {
        setProducts(data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          thumbnail: p.thumbnail,
          basePrice: Number(p.basePrice),
          brandName: p.brand?.brandName || p.brandName || null,
          categoryName: p.category?.name || p.categoryName || null,
          allowGroupBuy: p.allowGroupBuy ?? true,
          allowLiveCommerce: p.allowLiveCommerce ?? false,
        })));
      }
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleFlag = async (productId: string, action: string) => {
    setActionLoading(productId + action);
    try {
      const res = await fetch("/api/products/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action }),
      });
      if (res.ok) {
        // Update local state
        setProducts(prev => prev.map(p => {
          if (p.id !== productId) return p;
          if (action === "enableLiveCommerce") return { ...p, allowLiveCommerce: true };
          if (action === "disableLiveCommerce") return { ...p, allowLiveCommerce: false };
          if (action === "enableGroupBuy") return { ...p, allowGroupBuy: true };
          if (action === "disableGroupBuy") return { ...p, allowGroupBuy: false };
          return p;
        }));
      }
    } catch { }
    finally { setActionLoading(null); }
  };

  const filtered = products.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.brandName || "").toLowerCase().includes(q)) return false;
    }
    if (filter === "live") return p.allowLiveCommerce;
    if (filter === "groupbuy") return p.allowGroupBuy;
    return true;
  });

  const { pageItems, page, setPage, totalPages } = usePagination(filtered, 20);

  const liveCount = products.filter(p => p.allowLiveCommerce).length;
  const groupBuyCount = products.filter(p => p.allowGroupBuy).length;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        iconName="LiveProduct"
        title="라이브·단체 뷰티 서비스 관리"
        description="뷰티 서비스별 공동 프로모션과 라이브 뷰티 판매 허용 여부를 설정합니다."
        className="mb-6"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 min-[430px]:grid-cols-3 gap-2 sm:gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
          <Icon name="Gem" size={16} className="text-gray-400 mb-1" />
          <p className="text-lg font-bold">{products.length}</p>
          <p className="text-[10px] text-gray-400">전체 뷰티 서비스</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-3 sm:p-4">
          <Icon name="LiveConsulting" size={16} className="text-brand-500 mb-1" />
          <p className="text-lg font-bold text-brand-700">{liveCount}</p>
          <p className="text-[10px] text-gray-400">라이브 뷰티 등록</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-3 sm:p-4">
          <Icon name="Cart" size={16} className="text-emerald-500 mb-1" />
          <p className="text-lg font-bold text-emerald-600">{groupBuyCount}</p>
          <p className="text-[10px] text-gray-400">공동 프로모션 등록</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="뷰티 서비스명 또는 브랜드 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "all" as const, label: "전체" },
            { id: "live" as const, label: "라이브" },
            { id: "groupbuy" as const, label: "공동 프로모션" },
          ].map(f => (
            <DashboardFilterPill
              key={f.id}
              onClick={() => setFilter(f.id)}
              active={filter === f.id}
              className="rounded-xl px-3 py-2"
            >
              {f.label}
            </DashboardFilterPill>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {pageItems.map(product => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
              <SafeImage src={product.thumbnail} placeholder={NO_IMAGE} alt={product.name} width={56} height={56} fallbackText={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {product.brandName && <span className="text-[10px] text-gray-400">{product.brandName}</span>}
                <span className="text-[11px] font-medium text-gray-600">{product.basePrice.toLocaleString()}원</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto flex-shrink-0">
              {/* 공동 프로모션 토글 */}
              <button
                onClick={() => toggleFlag(product.id, product.allowGroupBuy ? "disableGroupBuy" : "enableGroupBuy")}
                disabled={actionLoading === product.id + (product.allowGroupBuy ? "disableGroupBuy" : "enableGroupBuy")}
                className={`flex flex-1 sm:flex-none items-center justify-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                  product.allowGroupBuy
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {actionLoading?.startsWith(product.id) && actionLoading.includes("GroupBuy") ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : product.allowGroupBuy ? (
                  <Icon name="Check" size={10} />
                ) : (
                  <X size={10} />
                )}
                공동 프로모션
              </button>
              {/* 라이브 뷰티 토글 */}
              <button
                onClick={() => toggleFlag(product.id, product.allowLiveCommerce ? "disableLiveCommerce" : "enableLiveCommerce")}
                disabled={actionLoading === product.id + (product.allowLiveCommerce ? "disableLiveCommerce" : "enableLiveCommerce")}
                className={`flex flex-1 sm:flex-none items-center justify-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                  product.allowLiveCommerce
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {actionLoading?.startsWith(product.id) && actionLoading.includes("LiveCommerce") ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : product.allowLiveCommerce ? (
                  <Icon name="LiveConsulting" size={10} />
                ) : (
                  <X size={10} />
                )}
                라이브
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <DashboardEmptyState iconName="LiveProduct" title="조건에 맞는 뷰티 서비스가 없습니다" description="검색어나 판매 유형 필터를 변경해 보세요." />
        )}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
