/**
 * 개발용 테스트 로그인 계정 생성 스크립트.
 *
 *   npx tsx scripts/create-test-accounts.ts
 *
 * ⚠️ DATABASE_URL 은 운영 RDS 를 가리킨다. 이 스크립트는 다음 원칙을 지킨다.
 *   - INSERT 만 수행. UPDATE / DELETE / DDL 을 절대 실행하지 않는다.
 *   - 같은 이메일이 이미 있으면 손대지 않고 건너뛴다 (idempotent).
 *   - DB 의 role enum 에 없는 값은 삽입을 시도하지 않고 건너뛴다.
 *
 * 스키마 드리프트 대응: 현재 운영 DB 의 users.role enum 은 Prisma 스키마(Role)와
 * 일치하지 않는다(DB: SELLER/BUYER…, 스키마: CONSULTANT/CUSTOMER). Prisma Client 는
 * 스키마에 없는 enum 값을 만나면 읽기조차 실패하므로, 이 스크립트는 Prisma 모델 API
 * 대신 raw SQL 로 조회·삽입한다.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

interface TestAccount {
  email: string;
  name: string;
  password: string;
  /** 우선순위 순서. DB enum 에 존재하는 첫 값을 사용한다. */
  rolePreference: string[];
}

const ACCOUNTS: TestAccount[] = [
  {
    email: "test-admin@sajumate.com",
    name: "테스트 관리자",
    password: "TestAdmin123!",
    rolePreference: ["SUPER_ADMIN"],
  },
  {
    email: "test-consultant@sajumate.com",
    name: "테스트 상담사",
    password: "TestConsult123!",
    // 앱 코드는 CONSULTANT 를 기대하지만 현재 DB enum 에는 SELLER 만 있다.
    // enum 이 확장되면 CONSULTANT 가 자동으로 선택된다.
    rolePreference: ["CONSULTANT", "SELLER"],
  },
];

/** users.role 컬럼이 실제로 허용하는 enum 값 목록. */
async function readRoleEnum(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_TYPE: string }[]>(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
  );
  if (!rows.length) throw new Error("users.role 컬럼을 찾을 수 없습니다.");
  // "enum('SUPER_ADMIN','SELLER',...)" → ["SUPER_ADMIN","SELLER",...]
  return Array.from(rows[0].COLUMN_TYPE.matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

/** cuid 를 쓸 수 없으므로 기존 id 형식과 충돌하지 않는 고유 문자열을 만든다. */
function makeId(): string {
  return `tstacc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  const allowedRoles = await readRoleEnum();
  console.log(`DB users.role enum: ${allowedRoles.join(", ")}\n`);

  for (const account of ACCOUNTS) {
    const existing = await prisma.$queryRawUnsafe<{ id: string; role: string }[]>(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1",
      account.email
    );

    if (existing.length > 0) {
      console.log(`⏭  ${account.email} — 이미 존재 (role=${existing[0].role}). 건드리지 않음.`);
      continue;
    }

    const role = account.rolePreference.find((r) => allowedRoles.includes(r));
    if (!role) {
      console.log(
        `⚠️  ${account.email} — 건너뜀. DB role enum 에 ${account.rolePreference.join("/")} 가 없습니다.`
      );
      continue;
    }
    if (role !== account.rolePreference[0]) {
      console.log(
        `   ↳ ${account.rolePreference[0]} 가 DB enum 에 없어 ${role} 로 대체합니다.`
      );
    }

    const hashed = await bcrypt.hash(account.password, 12);
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, name, password, role, isActive, mustResetPassword, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, 0, NOW(3), NOW(3))`,
      makeId(),
      account.email,
      account.name,
      hashed,
      role
    );
    console.log(`✅ ${account.email} 생성 완료 (role=${role})`);
  }

  console.log("\n완료. 기존 레코드는 변경하지 않았습니다.");
}

main()
  .catch((e) => {
    console.error("스크립트 실패:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
