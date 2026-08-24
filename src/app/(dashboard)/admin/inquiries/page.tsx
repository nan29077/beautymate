"use client";

import { Icon } from '@/components/shared/Icon';
import { useState, useMemo, useEffect } from "react";
import { X } from 'lucide-react';
import Pagination, { usePagination } from "@/components/shared/Pagination";

interface Inquiry {
  id: string; name: string; email: string; category: string;
  message: string; reply: string | null; status: "pending" | "replied";
  createdAt: string;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 실제 접수된 1:1 문의만 표시한다. (예전에는 샘플 더미 5건이 항상 섞여 나와
  //  관리자가 실제 문의 건수·미답변 수를 신뢰할 수 없었다)
  const loadInquiries = () => {
    setLoading(true);
    fetch("/api/public/inquiry")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Inquiry[]) => {
        setInquiries(Array.isArray(data) ? data : []);
      })
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false));
  };
  useEffect(loadInquiries, []);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all");

  const filtered = useMemo(() => {
    let result = inquiries;
    if (filter !== "all") result = result.filter(i => i.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q) || i.message.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return result;
  }, [inquiries, searchQuery, filter]);

  const { pageItems, page, setPage, totalPages } = usePagination(filtered, 20);

  const [savingId, setSavingId] = useState<string | null>(null);

  // 답변은 서버에 저장한 뒤에만 화면에 반영한다 (저장 실패 시 답변이 사라지지 않도록).
  const handleReply = async (id: string) => {
    const text = replyText[id]?.trim();
    if (!text) return;
    setSavingId(id);
    try {
      const res = await fetch("/api/public/inquiry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reply: text }),
      });
      if (!res.ok) {
        alert("답변 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, reply: text, status: "replied" as const } : i));
      setReplyText(prev => ({ ...prev, [id]: "" }));
    } catch {
      alert("답변 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = inquiries.filter(i => i.status === "pending").length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icon name="Message" size={20} className="text-brand-500" /> 문의 관리
          </h1>
          <p className="text-sm text-gray-500">총 {inquiries.length}건 · 미답변 {pendingCount}건</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 이메일, 내용 검색..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        <div className="flex gap-1 w-full sm:w-auto overflow-x-auto scrollbar-hide">
          {(["all", "pending", "replied"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {f === "all" ? "전체" : f === "pending" ? "미답변" : "답변완료"}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100">
            <Icon name="Message" size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{loading ? "문의를 불러오는 중입니다..." : searchQuery ? "검색 결과가 없습니다." : "문의 내역이 없습니다."}</p>
          </div>
        ) : pageItems.map((inquiry) => (
          <div key={inquiry.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inquiry.status === "pending" ? "bg-orange-500" : "bg-green-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{inquiry.category}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inquiry.status === "pending" ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"}`}>
                    {inquiry.status === "pending" ? "미답변" : "답변완료"}
                  </span>
                </div>
                <p className="text-sm text-gray-900 truncate">{inquiry.message}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-400">
                  <span className="flex items-center gap-0.5"><Icon name="MyPage" size={10} /> {inquiry.name}</span>
                  <span className="flex items-center gap-0.5"><Icon name="Mail" size={10} /> {inquiry.email}</span>
                  <span className="flex items-center gap-0.5"><Icon name="Clock" size={10} /> {new Date(inquiry.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
              </div>
              {expandedId === inquiry.id ? <Icon name="ChevronDown" size={16} className="text-gray-400 rotate-180" /> : <Icon name="ChevronDown" size={16} className="text-gray-400" />}
            </button>

            {expandedId === inquiry.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">문의 내용</p>
                  <p className="text-sm text-gray-800 bg-white rounded-lg p-3 border border-gray-100">{inquiry.message}</p>
                </div>
                {inquiry.reply && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1"><Icon name="Check" size={12} /> 답변</p>
                    <p className="text-sm text-gray-800 bg-green-50 rounded-lg p-3 border border-green-100">{inquiry.reply}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">{inquiry.reply ? "추가 답변" : "답변 작성"}</p>
                  <div className="flex gap-2">
                    <textarea value={replyText[inquiry.id] || ""} onChange={(e) => setReplyText(prev => ({ ...prev, [inquiry.id]: e.target.value }))}
                      placeholder="답변을 입력하세요..." className="flex-1 text-sm border border-gray-200 rounded-lg p-2.5 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <button onClick={() => handleReply(inquiry.id)} disabled={!replyText[inquiry.id]?.trim() || savingId === inquiry.id}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Icon name="Share" size={12} /> {savingId === inquiry.id ? "저장 중..." : "답변 전송"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
