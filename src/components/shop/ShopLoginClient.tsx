"use client";

// 점집 독립 로그인 — 로그인 성공 시 해당 점집으로 복귀
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import ShopAuthShell from "./ShopAuthShell";

interface Shop {
  id: string;
  slug: string;
  shopName: string;
  shopLogo: string | null;
}

export default function ShopLoginClient({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      router.push(`/shop/${shop.slug}`);
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopAuthShell
      shop={shop}
      title="점집 로그인"
      subtitle={`로그인 후 ${shop.shopName}으로 돌아갑니다`}
    >
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">이메일</label>
          <input
            type="email"
            className="input-field text-sm py-2.5"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">비밀번호</label>
          <input
            type="password"
            className="input-field text-sm py-2.5"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
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
          {loading ? "로그인 중..." : "로그인"}
        </button>
        <p className="text-center text-xs text-gray-400">
          아직 회원이 아니신가요?{" "}
          <Link href={`/shop/${shop.slug}/join`} className="text-amber-600 font-semibold hover:underline">
            점집 회원가입
          </Link>
        </p>
      </form>
    </ShopAuthShell>
  );
}
