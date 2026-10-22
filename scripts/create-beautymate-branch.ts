/**
 * "뷰티메이트" 지점(테스트 뷰티 전문가) 생성 스크립트 — 실서버용.
 *
 *   npx tsx scripts/create-beautymate-branch.ts            # 점검만(dry-run, 기본값) — DB 변경 없음
 *   npx tsx scripts/create-beautymate-branch.ts --apply    # 실제 생성
 *
 *   비밀번호를 지정하려면:  BRANCH_PASSWORD='원하는비번' npx tsx scripts/create-beautymate-branch.ts --apply
 *   (지정하지 않으면 무작위 비밀번호를 생성해 한 번만 출력한다)
 *
 * 안전 원칙
 *   - INSERT 위주. 기존 레코드는 지우거나 덮어쓰지 않는다. 모든 쓰기는 하나의 트랜잭션(전부 성공 또는 전부 취소).
 *     예외: 이 스크립트가 만드는 지점 계정(BRANCH_EMAIL)의 SellerProfile 이 미승인이면 승인(isApproved=1)으로만 바꾼다.
 *   - 같은 이메일·slug 가 이미 있으면 건너뛴다(여러 번 실행해도 안전).
 *   - slug 가 다른 계정에 이미 쓰이고 있으면 아무것도 하지 않고 중단한다.
 *   - 실서버 DB 는 Prisma 스키마와 enum/컬럼이 어긋나 있을 수 있어(스키마 드리프트) Prisma 모델 API 대신
 *     information_schema 로 실제 컬럼을 확인한 뒤 raw SQL 로 조회·삽입한다.
 *
 * 전문가 찾기(/sellers) 노출 조건: users.role = CONSULTANT(레거시 SELLER 는 목록에서 제외됨) + seller_profiles.isApproved = 1
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma";

const BRANCH_EMAIL = "branch@kbeautymate.kr";
const BRANCH_NAME = "뷰티메이트";
const BRANCH_SLUG = "beautymate";
const BRANCH_SHOP_NAME = "뷰티메이트";
const BRANCH_DESCRIPTION = "뷰티메이트 직영 지점 · 퍼스널 컬러, 메이크업, 스킨케어 상담";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

type ColumnInfo = { COLUMN_NAME: string; IS_NULLABLE: string; COLUMN_DEFAULT: string | null; EXTRA: string; COLUMN_TYPE: string };

function makeId(): string {
  // cuid 와 충돌하지 않는 고유 문자열 (c + 24자)
  return `c${Date.now().toString(36)}${randomBytes(9).toString("hex")}`.slice(0, 25);
}

function randomPassword(): string {
  return randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 14) + "!7";
}

async function columns(table: string): Promise<Map<string, ColumnInfo>> {
  const rows = await prisma.$queryRawUnsafe<ColumnInfo[]>(
    `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return new Map(rows.map((r) => [r.COLUMN_NAME, r]));
}

/** NOT NULL 이면서 기본값·자동값이 없는 컬럼 중, 우리가 값을 주지 않는 것 → 삽입 불가 */
function missingRequired(cols: Map<string, ColumnInfo>, provided: string[]): string[] {
  const given = new Set(provided);
  return [...cols.values()]
    .filter((c) => c.IS_NULLABLE === "NO" && c.COLUMN_DEFAULT === null && !/auto_increment|DEFAULT_GENERATED/i.test(c.EXTRA))
    .map((c) => c.COLUMN_NAME)
    .filter((name) => !given.has(name));
}

function log(msg: string) {
  console.log(`${APPLY ? "" : "[dry-run] "}${msg}`);
}

async function main() {
  const [{ db }] = await prisma.$queryRawUnsafe<{ db: string }[]>("SELECT DATABASE() AS db");
  console.log(`대상 DB: ${db}`);
  console.log(APPLY ? "모드: --apply (실제 생성)\n" : "모드: dry-run (DB 변경 없음 — 실제 생성은 --apply)\n");

  const userCols = await columns("users");
  const profileCols = await columns("seller_profiles");
  if (userCols.size === 0 || profileCols.size === 0) throw new Error("users 또는 seller_profiles 테이블을 찾을 수 없습니다.");

  // role enum 확인
  const roleType = userCols.get("role")?.COLUMN_TYPE ?? "";
  const allowedRoles = Array.from(roleType.matchAll(/'([^']+)'/g)).map((m) => m[1]);
  if (!allowedRoles.includes("CONSULTANT")) {
    throw new Error(
      `users.role enum 에 CONSULTANT 가 없습니다 (${allowedRoles.join(", ")}). ` +
        "전문가 찾기는 CONSULTANT 만 노출하므로 이 상태로는 지점을 만들어도 보이지 않습니다. 중단합니다.",
    );
  }

  // slug 선점 확인
  const slugOwner = await prisma.$queryRawUnsafe<{ id: string; userId: string }[]>(
    "SELECT id, userId FROM seller_profiles WHERE slug = ? LIMIT 1",
    BRANCH_SLUG,
  );

  // 지점 프로필에 넣을 값 + 필수 컬럼 검증을 "쓰기 전에" 끝낸다.
  // (계정만 만들어지고 프로필 생성에서 막히는 반쪽 상태를 방지)
  const profileFields: Record<string, unknown> = {
    id: makeId(),
    slug: BRANCH_SLUG,
    shopName: BRANCH_SHOP_NAME,
    isApproved: 1,
  };
  if (profileCols.has("shopDescription")) profileFields.shopDescription = BRANCH_DESCRIPTION;
  const profileTimeCols = ["createdAt", "updatedAt"].filter((c) => profileCols.has(c));
  const profileMissing = missingRequired(profileCols, ["userId", ...Object.keys(profileFields), ...profileTimeCols]);
  if (profileMissing.length) {
    throw new Error(`seller_profiles 에 값이 필요한 컬럼이 더 있습니다: ${profileMissing.join(", ")} — 아무것도 만들지 않고 중단합니다.`);
  }

  // 쓰기 작업은 모두 계획만 세운 뒤, --apply 일 때 하나의 트랜잭션으로 실행한다.
  // (계정 INSERT 후 프로필 INSERT 가 실패하면 계정까지 롤백 → 비밀번호를 모르는 계정이 남지 않는다)
  type Write = { sql: string; params: unknown[] };
  const writes: Write[] = [];

  // 1) 지점 계정
  const existingUser = await prisma.$queryRawUnsafe<{ id: string; role: string; isActive: number }[]>(
    "SELECT id, role, isActive FROM users WHERE email = ? LIMIT 1",
    BRANCH_EMAIL,
  );

  let userId: string;
  let createdPassword: string | null = null;
  const passwordGenerated = !process.env.BRANCH_PASSWORD?.trim();

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    // CONSULTANT 가 아닌 기존 계정(고객·관리자 등)에 승인된 지점을 붙이면 엉뚱한 계정이 전문가로 노출된다 → 중단
    if (existingUser[0].role !== "CONSULTANT") {
      throw new Error(
        `${BRANCH_EMAIL} 계정이 이미 role=${existingUser[0].role} 로 존재합니다. ` +
          "CONSULTANT 가 아닌 계정에는 지점을 만들지 않습니다. 계정을 확인한 뒤 다시 실행하세요. (아무것도 변경하지 않음)",
      );
    }
    log(`⏭  계정 ${BRANCH_EMAIL} 이미 존재 (role=CONSULTANT) — 그대로 사용`);
  } else {
    if (slugOwner.length > 0) {
      throw new Error(`slug '${BRANCH_SLUG}' 를 다른 계정(userId=${slugOwner[0].userId})이 이미 사용 중입니다. 중단합니다.`);
    }
    userId = makeId();
    const hasReset = userCols.has("mustResetPassword");
    const provided = ["id", "email", "name", "password", "role", "isActive", "createdAt", "updatedAt"];
    if (hasReset) provided.push("mustResetPassword");
    const missing = missingRequired(userCols, provided);
    if (missing.length) throw new Error(`users 에 값이 필요한 컬럼이 더 있습니다: ${missing.join(", ")} — 중단합니다.`);

    createdPassword = process.env.BRANCH_PASSWORD?.trim() || randomPassword();
    // 자동 생성한 비밀번호는 첫 로그인 때 바꾸도록 강제한다(콘솔에 한 번 노출되므로)
    const mustReset = passwordGenerated ? 1 : 0;
    writes.push({
      sql: `INSERT INTO users (id, email, name, password, role, isActive${hasReset ? ", mustResetPassword" : ""}, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'CONSULTANT', 1${hasReset ? ", ?" : ""}, NOW(3), NOW(3))`,
      params: [userId, BRANCH_EMAIL, BRANCH_NAME, APPLY ? await bcrypt.hash(createdPassword, 12) : "", ...(hasReset ? [mustReset] : [])],
    });
    log(`✅ 계정 생성: ${BRANCH_EMAIL} (role=CONSULTANT${passwordGenerated && hasReset ? ", 첫 로그인 시 비밀번호 변경" : ""})`);
  }

  // 2) 지점(SellerProfile)
  const existingProfile = await prisma.$queryRawUnsafe<{ id: string; slug: string; isApproved: number }[]>(
    "SELECT id, slug, isApproved FROM seller_profiles WHERE userId = ? LIMIT 1",
    userId,
  );

  if (existingProfile.length > 0) {
    const p = existingProfile[0];
    log(`⏭  지점 프로필 이미 존재 (slug=${p.slug}, 승인=${Number(p.isApproved) === 1 ? "예" : "아니오"})`);
    if (Number(p.isApproved) !== 1) {
      writes.push({ sql: "UPDATE seller_profiles SET isApproved = 1, updatedAt = NOW(3) WHERE id = ?", params: [p.id] });
      log("✅ 지점 승인 처리 (isApproved = 1)");
    }
  } else {
    if (slugOwner.length > 0 && slugOwner[0].userId !== userId) {
      throw new Error(`slug '${BRANCH_SLUG}' 를 다른 계정이 이미 사용 중입니다. 중단합니다.`);
    }
    const fields: Record<string, unknown> = { ...profileFields, userId };
    const names = [...Object.keys(fields), ...profileTimeCols];
    const placeholders = [...Object.keys(fields).map(() => "?"), ...profileTimeCols.map(() => "NOW(3)")];
    writes.push({
      sql: `INSERT INTO seller_profiles (${names.join(", ")}) VALUES (${placeholders.join(", ")})`,
      params: Object.values(fields),
    });
    log(`✅ 지점 생성: ${BRANCH_SHOP_NAME} (/shop/${BRANCH_SLUG}, 승인 완료)`);
  }

  if (APPLY && writes.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const w of writes) await tx.$executeRawUnsafe(w.sql, ...w.params);
    });
  }

  console.log("");
  if (createdPassword) {
    if (APPLY) {
      console.log("────────────────────────────────────────");
      console.log(` 지점 로그인 계정: ${BRANCH_EMAIL}`);
      console.log(` 비밀번호       : ${createdPassword}`);
      console.log(" ※ 이 비밀번호는 다시 출력되지 않습니다. 안전한 곳에 보관하세요.");
      console.log("────────────────────────────────────────");
    } else {
      console.log("dry-run 이라 계정·비밀번호는 만들지 않았습니다. 이상 없으면 --apply 로 다시 실행하세요.");
    }
  } else if (!APPLY) {
    console.log("dry-run 완료. 변경할 내용이 있으면 --apply 로 다시 실행하세요.");
  }
  console.log("확인: 전문가 찾기(/sellers) 에서 '뷰티메이트' 검색");
}

main()
  .catch((e) => {
    console.error("\n❌ 실패:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
