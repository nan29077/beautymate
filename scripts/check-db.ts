/**
 * 로컬 DB 연결 진단 스크립트.
 *
 *   npx tsx scripts/check-db.ts
 *
 * .env 의 DATABASE_URL 로 실제 쿼리를 한 번 던져보고, 실패하면 원인별 처방을 출력한다.
 * 읽기 전용 — SELECT 만 수행하며 어떤 데이터도 변경하지 않는다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma";

function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      const match = text.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match?.[1]) return match[1].trim();
    } catch {
      /* 파일 없음 → 다음 후보 */
    }
  }
  throw new Error("DATABASE_URL 을 찾을 수 없습니다 (.env / .env.local 확인).");
}

const rawUrl = readDatabaseUrl();
const url = new URL(rawUrl);
const dbUser = decodeURIComponent(url.username);
const dbPassword = decodeURIComponent(url.password);
const dbHost = url.hostname;
const dbPort = url.port || "3306";
const dbName = url.pathname.replace(/^\//, "");

function sqlQuote(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function printFixSql() {
  const pw = sqlQuote(dbPassword);
  console.log(`
────────────────────────────────────────────────────────────
 처방 — DB 관리자(root)로 아래 SQL 을 실행하세요.
 (phpMyAdmin / HeidiSQL / mysql CLI 어디서든 동일)
────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS \`${dbName}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- MariaDB (XAMPP 포함)
CREATE OR REPLACE USER '${dbUser}'@'localhost'
  IDENTIFIED VIA mysql_native_password USING PASSWORD(${pw});
CREATE OR REPLACE USER '${dbUser}'@'127.0.0.1'
  IDENTIFIED VIA mysql_native_password USING PASSWORD(${pw});

-- MySQL 8 이라면 위 두 줄 대신 아래를 사용
-- CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED WITH mysql_native_password BY ${pw};
-- CREATE USER IF NOT EXISTS '${dbUser}'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY ${pw};

GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost';
GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'127.0.0.1';
FLUSH PRIVILEGES;
────────────────────────────────────────────────────────────
 이후 순서:
   npx tsx scripts/check-db.ts     # 다시 진단 (OK 떠야 함)
   npx prisma db push              # 스키마 반영 (로컬 빈 DB 이므로 안전)
   npm run dev                     # 로그인 화면에서 테스트 로그인 버튼 사용
────────────────────────────────────────────────────────────
`);
}

async function main() {
  console.log(`대상: ${dbUser}@${dbHost}:${dbPort}/${dbName}\n`);

  const prisma = new PrismaClient({ log: ["error"] });
  try {
    const rows = await prisma.$queryRawUnsafe<
      { version: string; user: string; db: string }[]
    >("SELECT VERSION() AS version, CURRENT_USER() AS user, DATABASE() AS db");
    const info = rows[0];
    console.log("✅ DB 연결 성공");
    console.log(`   서버   : ${info.version}`);
    console.log(`   접속자 : ${info.user}`);
    console.log(`   DB     : ${info.db}`);

    const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    );
    console.log(`   테이블 : ${Number(count)}개`);
    if (Number(count) === 0) {
      console.log("\n⚠️  테이블이 하나도 없습니다. `npx prisma db push` 로 스키마를 반영하세요.");
      return;
    }

    const users = await prisma.$queryRawUnsafe<{ email: string; role: string }[]>(
      "SELECT email, role FROM users WHERE email IN (?, ?)",
      "test-admin@beautymate.com",
      "test-consultant@beautymate.com",
    );
    console.log(
      `   테스트 계정 : ${
        users.length ? users.map((u) => `${u.email}(${u.role})`).join(", ") : "없음"
      }`,
    );
    if (!users.length) {
      console.log(
        "\n   → 없어도 됩니다. 로그인 화면의 테스트 버튼이 /api/dev/ensure-test-account 로 자동 생성합니다.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ DB 연결 실패\n");
    console.error(message.split("\n").slice(0, 6).join("\n"));

    if (message.includes("auth_gssapi_client") || message.includes("Unknown authentication plugin")) {
      console.log(`
원인: MariaDB/MySQL 이 Prisma 가 지원하지 않는 인증 플러그인을 요구하고 있습니다.
      '${dbUser}' 계정이 없거나(존재하지 않는 사용자에게 서버가 gssapi 를 제시),
      mysql_native_password 가 아닌 플러그인으로 만들어진 경우입니다.`);
      printFixSql();
    } else if (message.includes("Access denied")) {
      console.log(`\n원인: '${dbUser}' 계정의 비밀번호 또는 권한이 맞지 않습니다.`);
      printFixSql();
    } else if (message.includes("Unknown database")) {
      console.log(`\n원인: '${dbName}' 데이터베이스가 없습니다.`);
      printFixSql();
    } else if (message.includes("ECONNREFUSED") || message.includes("Can't reach database server")) {
      console.log(
        `\n원인: ${dbHost}:${dbPort} 에 DB 서버가 떠 있지 않습니다. MySQL/MariaDB 서비스(XAMPP 라면 MySQL Start)를 먼저 실행하세요.`,
      );
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
