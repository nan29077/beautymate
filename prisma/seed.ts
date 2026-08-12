import { PrismaClient, Role, PaymentStatus, ReservationStatus } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 사주메이트 시드 — 2자 구조(상담사 ↔ 고객) 기준 최소 데이터셋.
// ⚠️ 운영 DB(app/.env DATABASE_URL)에 그대로 반영되므로 실행 전 반드시 대상 DB를 확인할 것.

const CONSULTING_TYPES = ["사주", "신점", "타로", "궁합", "작명", "사업운", "연애운", "택일"] as const;
const CONSULTING_METHODS = ["영상통화", "전화", "방문", "채팅"] as const;

async function main() {
  console.log("🌱 사주메이트 시드 데이터 생성 시작...");

  const pw = await bcrypt.hash("password123", 12);

  // ─── 카테고리 (상담 종류) ───
  const categories = [];
  for (let i = 0; i < CONSULTING_TYPES.length; i++) {
    const name = CONSULTING_TYPES[i];
    const c = await prisma.category.create({
      data: {
        name,
        slug: `consulting-${i + 1}`,
        icon: "Sparkles",
        description: `${name} 상담`,
        sortOrder: i + 1,
      },
    });
    categories.push(c);
  }

  // ─── 최고관리자 ───
  await prisma.user.create({
    data: {
      email: "admin@sajumate.com",
      name: "관리자",
      password: pw,
      role: Role.SUPER_ADMIN,
    },
  });

  // ─── 상담사 3명 ───
  const consultantsData = [
    {
      email: "consultant1@sajumate.com",
      name: "김하늘",
      slug: "haneul",
      shopName: "하늘 사주원",
      shopDescription: "30년 경력 사주·궁합 전문. 사주 원국을 바탕으로 흐름을 짚어드립니다.",
      category: "사주",
    },
    {
      email: "consultant2@sajumate.com",
      name: "이수아",
      slug: "sua",
      shopName: "수아 타로하우스",
      shopDescription: "타로와 신점을 함께 봅니다. 당면한 고민에 대한 구체적인 방향을 제시합니다.",
      category: "타로",
    },
    {
      email: "consultant3@sajumate.com",
      name: "박지은",
      slug: "jieun",
      shopName: "지은 작명연구소",
      shopDescription: "작명·개명과 택일 전문. 이름과 날짜로 운의 흐름을 다듬습니다.",
      category: "작명",
    },
  ];

  const consultants = [];
  for (const c of consultantsData) {
    const user = await prisma.user.create({
      data: {
        email: c.email,
        name: c.name,
        password: pw,
        role: Role.CONSULTANT,
        sellerProfile: {
          create: {
            slug: c.slug,
            shopName: c.shopName,
            shopDescription: c.shopDescription,
            category: c.category,
            isApproved: true,
            commissionRate: 5,
          },
        },
      },
      include: { sellerProfile: true },
    });
    consultants.push(user.sellerProfile!);
  }

  // ─── 상담 상품 ───
  // 상담사별로 (상담 종류 × 시간) 조합을 몇 개씩 등록한다.
  const productsData = [
    { consultant: 0, type: "사주", method: "영상통화", minutes: 30, price: 39000, slots: 6 },
    { consultant: 0, type: "사주", method: "방문", minutes: 60, price: 69000, slots: 4 },
    { consultant: 0, type: "궁합", method: "영상통화", minutes: 60, price: 79000, slots: 3 },
    { consultant: 1, type: "타로", method: "채팅", minutes: 30, price: 29000, slots: 8 },
    { consultant: 1, type: "신점", method: "전화", minutes: 60, price: 89000, slots: 4 },
    { consultant: 1, type: "연애운", method: "영상통화", minutes: 30, price: 35000, slots: 6 },
    { consultant: 2, type: "작명", method: "방문", minutes: 90, price: 150000, slots: 2 },
    { consultant: 2, type: "택일", method: "전화", minutes: 30, price: 45000, slots: 5 },
    { consultant: 2, type: "사업운", method: "영상통화", minutes: 120, price: 190000, slots: 2 },
  ];

  const products = [];
  for (let i = 0; i < productsData.length; i++) {
    const p = productsData[i];
    const consultant = consultants[p.consultant];
    const category = categories.find((c) => c.name === p.type) ?? categories[0];
    const product = await prisma.product.create({
      data: {
        name: `${p.type} 상담 ${p.minutes}분 (${p.method})`,
        slug: `consulting-${i + 1}-${p.minutes}m`,
        description: `${p.type} 상담을 ${p.method}(으)로 ${p.minutes}분간 진행합니다.`,
        detailContent: `<h2>${p.type} 상담</h2><p>상담 방식: ${p.method}</p><p>상담 시간: ${p.minutes}분</p>`,
        basePrice: p.price,
        supplyPrice: Math.round(p.price * 0.7),
        categoryId: category.id,
        sellerId: consultant.id,
        consultingType: p.type,
        consultingMethod: p.method,
        durationMinutes: p.minutes,
        maxDailySlots: p.slots,
        isActive: true,
        isApproved: true,
      },
    });
    products.push(product);

    // 상담사 샵에 노출
    await prisma.sellerShopProduct.create({
      data: {
        sellerId: consultant.id,
        productId: product.id,
        displayOrder: i,
        isActive: true,
        isApproved: true,
        approverType: "SUPER_ADMIN",
      },
    });
  }

  // ─── 고객 3명 ───
  const customerNames = ["최민준", "정서연", "강도윤"];
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const u = await prisma.user.create({
      data: {
        email: `customer${i + 1}@example.com`,
        name: customerNames[i],
        password: pw,
        role: Role.CUSTOMER,
        phone: `010-1000-100${i + 1}`,
        buyerProfile: { create: { primarySellerId: consultants[i % consultants.length].id } },
      },
    });
    customers.push(u);
  }

  // ─── 시간 슬롯 (각 상담사 앞으로 7일치, 10:00~16:00 매시) ───
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const c of consultantsData.keys()) {
    const consultantUser = await prisma.user.findUnique({ where: { email: consultantsData[c].email } });
    if (!consultantUser) continue;
    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      for (let h = 10; h < 16; h++) {
        await prisma.timeSlot.create({
          data: {
            consultantId: consultantUser.id,
            date,
            startTime: `${String(h).padStart(2, "0")}:00`,
            endTime: `${String(h + 1).padStart(2, "0")}:00`,
            isAvailable: true,
          },
        });
      }
    }
  }

  // ─── 예약 샘플 ───
  const reservationSeed = [
    { customer: 0, product: 0, dayOffset: 1, time: "10:00", status: ReservationStatus.CONFIRMED },
    { customer: 1, product: 3, dayOffset: 2, time: "14:00", status: ReservationStatus.PENDING },
    { customer: 2, product: 6, dayOffset: 3, time: "11:00", status: ReservationStatus.COMPLETED },
  ];

  for (let i = 0; i < reservationSeed.length; i++) {
    const r = reservationSeed[i];
    const product = products[r.product];
    const customer = customers[r.customer];
    const reservationDate = new Date(today);
    reservationDate.setDate(reservationDate.getDate() + r.dayOffset);
    const amount = Number(product.basePrice);

    await prisma.reservation.create({
      data: {
        reservationNumber: `RSV${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`,
        userId: customer.id,
        sellerId: product.sellerId!,
        status: r.status,
        paymentStatus:
          r.status === ReservationStatus.PENDING ? PaymentStatus.PENDING : PaymentStatus.COMPLETED,
        totalAmount: amount,
        finalAmount: amount,
        reservationDate,
        reservationTime: r.time,
        customerName: customer.name,
        customerPhone: customer.phone ?? "010-0000-0000",
        birthDate: "1993-05-14",
        birthTime: "09:30",
        gender: i % 2 === 0 ? "M" : "F",
        consultingContent: "올해 전반적인 운의 흐름과 이직 시기를 보고 싶습니다.",
        paidAt: r.status === ReservationStatus.PENDING ? null : new Date(),
        items: {
          create: [
            {
              itemType: "PRODUCT",
              productId: product.id,
              productName: product.name,
              price: amount,
              quantity: 1,
              totalPrice: amount,
              priceModelSnap: "SUPPLY",
              supplyPriceSnap: product.supplyPrice != null ? Number(product.supplyPrice) : null,
              sellerFeeRateSnap: 5,
              isSellerProductSnap: true,
              recipientRole: "CONSULTANT",
              recipientId: product.sellerId,
            },
          ],
        },
      },
    });
  }

  // ─── 배너 ───
  await prisma.banner.createMany({
    data: [
      {
        title: "오늘의 추천 상담사",
        subtitle: "검증된 상담사와 라이브로 만나보세요",
        imageUrl: "/banner/placeholder-1.png",
        linkUrl: "/search",
        position: "hero",
        sortOrder: 0,
        isActive: true,
      },
      {
        title: "상담사 입점 안내",
        subtitle: "나만의 점집을 열고 고객과 만나보세요",
        imageUrl: "/banner/placeholder-2.png",
        linkUrl: "/auth/register",
        position: "hero",
        sortOrder: 1,
        isActive: true,
      },
    ],
  });

  console.log("✅ 시드 완료");
  console.log(`   카테고리 ${categories.length}개 / 상담사 ${consultants.length}명 / 상담상품 ${products.length}개 / 고객 ${customers.length}명`);
  console.log("   계정 비밀번호: password123");
}

main()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { CONSULTING_TYPES, CONSULTING_METHODS };
