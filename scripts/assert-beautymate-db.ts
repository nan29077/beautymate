import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();

  const envText = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  const match = envText.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (!match?.[1]) throw new Error("DATABASE_URL을 찾을 수 없습니다.");
  return match[1].trim();
}

const rawUrl = readDatabaseUrl();
const databaseUrl = new URL(rawUrl);
const host = databaseUrl.hostname.toLowerCase();
const database = databaseUrl.pathname.replace(/^\//, "").toLowerCase();
const blockedHostFragments = ["sajunara", "reset.czuyyqg40lmv", "cpqwwasuyu7l"];
const isBlockedHost = blockedHostFragments.some((fragment) => host.includes(fragment));
const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
const remoteConfirmed = process.env.BEAUTYMATE_DB_CONFIRM === "beautymate";

if (database !== "beautymate") {
  throw new Error(`DB 작업 차단: 데이터베이스 이름이 beautymate가 아닙니다. (현재: ${database || "없음"})`);
}

if (isBlockedHost) {
  throw new Error("DB 작업 차단: 기존 사주나라 운영 DB 호스트가 감지되었습니다.");
}

if (!isLocal && !remoteConfirmed) {
  throw new Error("원격 뷰티메이트 DB 작업은 BEAUTYMATE_DB_CONFIRM=beautymate 확인값이 필요합니다.");
}

console.log(`DB 안전 확인 완료: ${host}/${database}`);
