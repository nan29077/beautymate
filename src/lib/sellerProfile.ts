import { prisma } from "@/lib/prisma";

// 뷰티 전문가(CONSULTANT) 계정인데 SellerProfile 이 없는 경우 최소 프로필을 자동 생성한다.
// 정상 가입 흐름(register API)은 가입 시 프로필을 함께 만들므로, 여기 해당하는 건
// 레거시 SELLER 계정·스크립트로 만든 테스트 계정뿐이다. INSERT 만 수행한다.
// isApproved 는 true 로 둔다 — false 면 authorize() 의 미승인 차단에 걸려
// 해당 계정이 즉시 로그인 불가가 되기 때문 (레거시 계정은 이미 활동하던 계정).

function slugify(source: string): string {
  const base = source
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "consultant";
}

export async function ensureSellerProfile(user: {
  id: string;
  email: string | null;
  name: string | null;
}): Promise<{ slug: string }> {
  const existing = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
    select: { slug: true },
  });
  if (existing) return existing;

  const base = slugify(user.email || user.id);
  let slug = base;
  // slug 는 unique — 충돌 시 짧은 무작위 접미사를 붙여 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await prisma.sellerProfile.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const created = await prisma.sellerProfile.create({
    data: {
      userId: user.id,
      slug,
      shopName: `${user.name || "뷰티 전문가"}의 뷰티샵`,
      isApproved: true,
    },
    select: { slug: true },
  });
  return created;
}
