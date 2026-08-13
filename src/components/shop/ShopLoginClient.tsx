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
      {/* 점집 전용 소셜 로그인 — 메인 /auth/login 과 완전히 분리된 컴포넌트 */}
      <div className="space-y-2.5 mb-4">
        {/* 카카오 간편 로그인 */}
        <button
          type="button"
          onClick={() => {
            // TODO: 카카오 OAuth 연동 예정
          }}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-gray-900 transition active:scale-[0.98]"
          style={{ backgroundColor: "#FEE500" }}
        >
          {/* 카카오 로고 */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9 1.5C4.86 1.5 1.5 4.136 1.5 7.38c0 2.088 1.326 3.918 3.33 4.986l-.846 3.132a.225.225 0 0 0 .336.252l3.684-2.43c.33.048.666.072 1.002.072 4.14 0 7.5-2.634 7.5-5.88C16.5 4.136 13.14 1.5 9 1.5z"
              fill="#3C1E1E"
            />
          </svg>
          카카오로 시작하기
        </button>

        {/* 네이버 간편 로그인 */}
        <button
          type="button"
          onClick={() => {
            // TODO: 네이버 OAuth 연동 예정
          }}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-white transition active:scale-[0.98]"
          style={{ backgroundColor: "#03C75A" }}
        >
          {/* 네이버 N 로고 */}
          <span className="text-base font-extrabold leading-none">N</span>
          네이버로 시작하기
        </button>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[11px] text-gray-400 font-medium">또는 이메일로 로그인</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

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
        {process.env.NODE_ENV === "development" && (
          <button
            type="button"
            onClick={() => {
              setEmail("customer1@example.com");
              setPassword("password123");
            }}
            className="w-full py-2 text-sm text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition"
          >
            테스트 계정으로 로그인 (customer1@example.com)
          </button>
        )}
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
