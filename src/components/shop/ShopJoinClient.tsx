"use client";

// 점집 독립 회원가입 — 신규 계정 생성 또는 (로그인 상태) 원클릭 회원 연결
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { UserPlus, CheckCircle2 } from "lucide-react";
import ShopAuthShell from "./ShopAuthShell";

interface Shop {
  id: string;
  slug: string;
  shopName: string;
  shopLogo: string | null;
}

export default function ShopJoinClient({ shop }: { shop: Shop }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const shopHome = `/shop/${shop.slug}`;

  // 로그인 상태: 원클릭 회원 연결
  const handleLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shop/${shop.slug}/join`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "회원 연결에 실패했습니다.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push(shopHome), 1200);
    } catch {
      setError("회원 연결 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 비로그인: 신규 가입 → 자동 로그인 → 점집 복귀
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shop/${shop.slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "가입에 실패했습니다.");
        return;
      }
      // 가입 직후 자동 로그인
      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      setDone(true);
      setTimeout(
        () => {
          router.push(login?.error ? `/shop/${shop.slug}/login` : shopHome);
          router.refresh();
        },
        1200,
      );
    } catch {
      setError("가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <ShopAuthShell shop={shop} title="가입 완료">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">
            {shop.shopName} 회원이 되었습니다!
          </p>
          <p className="text-xs text-gray-400 mt-1">점집 홈으로 이동합니다...</p>
        </div>
      </ShopAuthShell>
    );
  }

  return (
    <ShopAuthShell
      shop={shop}
      title="점집 회원가입"
      subtitle={`${shop.shopName}의 독립 회원으로 가입합니다`}
    >
      {status === "authenticated" && session?.user ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            <b>{session.user.name || session.user.email}</b> 계정으로 로그인되어 있습니다.
            <br />이 계정을 {shop.shopName} 회원으로 연결할까요?
          </p>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            onClick={handleLink}
            disabled={loading}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <UserPlus size={15} />
            {loading ? "연결 중..." : `${shop.shopName} 회원으로 가입`}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">이름</label>
            <input
              type="text"
              className="input-field text-sm py-2.5"
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">이메일</label>
            <input
              type="email"
              className="input-field text-sm py-2.5"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              비밀번호 <span className="font-normal text-gray-400">(8자 이상)</span>
            </label>
            <input
              type="password"
              className="input-field text-sm py-2.5"
              placeholder="비밀번호"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              휴대전화 <span className="font-normal text-gray-400">(선택)</span>
            </label>
            <input
              type="tel"
              className="input-field text-sm py-2.5"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              autoComplete="tel"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>
          <p className="text-center text-xs text-gray-400">
            이미 회원이신가요?{" "}
            <Link href={`/shop/${shop.slug}/login`} className="text-amber-600 font-semibold hover:underline">
              점집 로그인
            </Link>
          </p>
        </form>
      )}
    </ShopAuthShell>
  );
}
