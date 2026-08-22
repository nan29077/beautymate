import { PrismaClient, Role, PaymentStatus, ReservationStatus } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 뷰티메이트 시드 — 2자 구조(뷰티 전문가 ↔ 고객) 기준 최소 데이터셋.
// scripts/assert-beautymate-db.ts 검사를 통과한 뷰티메이트 전용 DB에서만 실행한다.

const CONSULTING_TYPES = ["스킨케어", "메이크업", "헤어", "네일", "퍼스널 컬러", "바디케어", "왁싱", "이미지 컨설팅"] as const;
const CONSULTING_METHODS = ["방문", "영상상담", "채팅상담"] as const;

async function main() {
  console.log("🌱 뷰티메이트 시드 데이터 생성 시작...");

  const pw = await bcrypt.hash("password123", 12);

  // ─── 뷰티 서비스 카테고리 ───
  const categories = [];
  for (let i = 0; i < CONSULTING_TYPES.length; i++) {
    const name = CONSULTING_TYPES[i];
    const c = await prisma.category.create({
      data: {
        name,
        slug: `beauty-${i + 1}`,
        icon: "Sparkles",
        description: `${name} 전문가와 서비스를 만나보세요`,
        sortOrder: i + 1,
      },
    });
    categories.push(c);
  }

  // ─── 최고관리자 ───
  await prisma.user.create({
    data: {
      email: "admin@beautymate.com",
      name: "관리자",
      password: pw,
      role: Role.SUPER_ADMIN,
    },
  });

  // ─── 뷰티 전문가 3명 ───
  const consultantsData = [
    {
      email: "expert1@beautymate.kr",
      name: "윤서연",
      slug: "glow-atelier",
      shopName: "글로우 아틀리에",
      shopDescription: "피부 컨디션과 라이프스타일을 함께 살피는 맞춤 스킨케어 스튜디오입니다.",
      category: "스킨케어",
    },
    {
      email: "expert2@beautymate.kr",
      name: "김민지",
      slug: "tone-and-color",
      shopName: "톤앤컬러 스튜디오",
      shopDescription: "퍼스널 컬러 진단부터 메이크업 컬러 추천까지 일상에 바로 쓰이는 솔루션을 제안합니다.",
      category: "퍼스널 컬러",
    },
    {
      email: "expert3@beautymate.kr",
      name: "박하린",
      slug: "muse-hair-makeup",
      shopName: "뮤즈 헤어앤메이크업",
      shopDescription: "얼굴형과 분위기에 어울리는 헤어·메이크업 스타일을 함께 디자인합니다.",
      category: "헤어",
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

  // ─── 뷰티 서비스 ───
  // 전문가별 대표 서비스와 예약 가능 수량을 등록한다.
  const productsData = [
    { consultant: 0, type: "스킨케어", method: "방문", minutes: 60, price: 79000, slots: 5 },
    { consultant: 0, type: "스킨케어", method: "영상상담", minutes: 30, price: 39000, slots: 8 },
    { consultant: 0, type: "바디케어", method: "방문", minutes: 90, price: 129000, slots: 3 },
    { consultant: 1, type: "퍼스널 컬러", method: "방문", minutes: 90, price: 119000, slots: 4 },
    { consultant: 1, type: "메이크업", method: "영상상담", minutes: 45, price: 59000, slots: 6 },
    { consultant: 1, type: "이미지 컨설팅", method: "채팅상담", minutes: 30, price: 35000, slots: 8 },
    { consultant: 2, type: "헤어", method: "방문", minutes: 90, price: 99000, slots: 4 },
    { consultant: 2, type: "메이크업", method: "방문", minutes: 60, price: 89000, slots: 5 },
    { consultant: 2, type: "이미지 컨설팅", method: "영상상담", minutes: 60, price: 79000, slots: 4 },
  ];

  const products = [];
  for (let i = 0; i < productsData.length; i++) {
    const p = productsData[i];
    const consultant = consultants[p.consultant];
    const category = categories.find((c) => c.name === p.type) ?? categories[0];
    const product = await prisma.product.create({
      data: {
        name: `${p.type} 맞춤 서비스 ${p.minutes}분 (${p.method})`,
        slug: `beauty-service-${i + 1}-${p.minutes}m`,
        description: `${p.type} 전문가가 ${p.method}(으)로 ${p.minutes}분간 맞춤 서비스를 제공합니다.`,
        detailContent: `<h2>${p.type} 맞춤 서비스</h2><p>진행 방식: ${p.method}</p><p>소요 시간: ${p.minutes}분</p>`,
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

    // 뷰티 전문가 샵에 노출
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

  // ─── 시간 슬롯 (각 뷰티 전문가 앞으로 7일치, 10:00~16:00 매시) ───
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
        birthDate: null,
        birthTime: null,
        gender: null,
        consultingContent: "현재 고민과 원하는 스타일을 바탕으로 맞춤 추천을 받고 싶습니다.",
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
        title: "오늘의 추천 뷰티 전문가",
        subtitle: "검증된 뷰티 전문가와 라이브로 만나보세요",
        imageUrl: "/banners/beautymate/hero-live-v3.png",
        linkUrl: "/search",
        position: "hero",
        sortOrder: 0,
        isActive: true,
      },
      {
        title: "뷰티 전문가 입점 안내",
        subtitle: "나만의 뷰티샵을 열고 고객과 만나보세요",
        imageUrl: "/banners/beautymate/expert-cta-v3.png",
        linkUrl: "/auth/register",
        position: "hero",
        sortOrder: 1,
        isActive: true,
      },
    ],
  });

  console.log("✅ 시드 완료");
  console.log(`   카테고리 ${categories.length}개 / 뷰티 전문가 ${consultants.length}명 / 뷰티 서비스 ${products.length}개 / 고객 ${customers.length}명`);
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
