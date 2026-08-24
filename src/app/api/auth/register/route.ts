import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isValidSellerSlug,
  linkReferralForNewBuyer,
} from "@/lib/referral";
import { randomAvatar, randomBeautyMateAvatar, pickRoleAvatar } from "@/lib/defaults";
import { getRegisterFieldSettings } from "@/lib/settings";
import { notifySignupWelcome } from "@/lib/alimtalkTriggers";

// 이메일 형식 검증 — 형식 확인 없이 저장하면 알림 메일/계정 복구가 불가능한
// 계정이 그대로 만들어지고, 로그인 시에만 뒤늦게 문제가 드러난다.
// (문의 접수 API /api/public/inquiry 와 동일한 패턴)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const {
      name, email, password, role, gender, birthday, phone,
      zipCode, address1, address2,
      sellerRef: sellerRefFromBody, referralCode,
    } = await request.json();

    // 뷰티 전문가 귀속은 URL ?ref= 에서 전달된 body 값만 신뢰한다.
    const sellerRef: string | null =
      typeof sellerRefFromBody === "string" && isValidSellerSlug(sellerRefFromBody)
        ? sellerRefFromBody
        : null;

    // 회원가입 항목 권한 설정(필수/선택/숨김)
    const fieldSettings = await getRegisterFieldSettings();

    const nameTrimmed = typeof name === "string" ? name.trim() : "";
    const emailTrimmed = typeof email === "string" ? email.trim() : "";
    const phoneDigits = typeof phone === "string" ? phone.replace(/[^0-9]/g, "") : "";
    const address1Trimmed = typeof address1 === "string" ? address1.trim() : "";
    if (!nameTrimmed) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    if (!emailTrimmed) return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    if (!EMAIL_RE.test(emailTrimmed) || emailTrimmed.length > 254) {
      return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    }
    if (typeof password !== "string" || !password) return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다" }, { status: 400 });
    if (fieldSettings.phone === "required" && !phoneDigits) return NextResponse.json({ error: "휴대전화번호를 입력해주세요." }, { status: 400 });
    if (fieldSettings.gender === "required" && gender !== "male" && gender !== "female") return NextResponse.json({ error: "성별을 선택해주세요." }, { status: 400 });
    if (fieldSettings.birthday === "required" && (typeof birthday !== "string" || !birthday.trim())) return NextResponse.json({ error: "생년월일을 입력해주세요." }, { status: 400 });
    if (fieldSettings.address === "required" && !address1Trimmed) return NextResponse.json({ error: "주소를 입력해주세요." }, { status: 400 });

    // 중복 이메일은 클라이언트가 구분할 수 있도록 409 Conflict 로 응답한다.
    const existing = await prisma.user.findUnique({ where: { email: emailTrimmed } });
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다.", code: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userRole = role === "CONSULTANT" ? "CONSULTANT" : "CUSTOMER";

    // 뷰티 전문가 slug — 이메일 앞부분 기반. 이미 사용 중이면 타임스탬프 suffix 로 충돌(P2002) 방지
    let consultantSlug: string | null = null;
    if (userRole === "CONSULTANT") {
      const baseSlug = emailTrimmed.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
      const slugTaken = await prisma.sellerProfile.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });
      consultantSlug = slugTaken ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
    }

    // 성별은 입력값이 있을 때만 저장한다. 예전에는 미입력 시 남/녀를 무작위로
    // 채워 넣어, 실제로 받은 적 없는 성별 정보가 회원 데이터·통계·아바타에
    // 그대로 반영됐다. 미입력은 null 로 남긴다.
    const genderPick: "male" | "female" | null =
      gender === "male" || gender === "female" ? gender : null;
    const phoneNormalized = typeof phone === "string" && phone.trim() ? phone.replace(/[^0-9]/g, "") : null;
    const birthdayValue = typeof birthday === "string" && birthday.trim() ? birthday.trim() : null;
    const zipCodeValue = typeof zipCode === "string" && zipCode.trim() ? zipCode.trim() : null;
    const address1Value = address1Trimmed || null;
    const address2Value = typeof address2 === "string" && address2.trim() ? address2.trim() : null;

    // 1) User 생성
    const user = await (prisma as any).user.create({
      data: {
        name: nameTrimmed,
        email: emailTrimmed,
        password: hashedPassword,
        role: userRole,
        isActive: true,
        gender: genderPick,
        phone: phoneNormalized,
        birthday: birthdayValue,
        zipCode: zipCodeValue,
        address1: address1Value,
        address2: address2Value,
        avatar: userRole === "CONSULTANT"
          ? pickRoleAvatar(emailTrimmed, "CONSULTANT")
          : sellerRef
            ? randomAvatar(genderPick)
            : randomBeautyMateAvatar(),
        ...(userRole === "CONSULTANT" && {
          sellerProfile: {
            create: {
              slug: consultantSlug!,
              shopName: `${nameTrimmed}의 뷰티샵`,
              isApproved: false,
            },
          },
        }),
      },
    });

    // 2) CUSTOMER 일 때만 고객 추천인 매핑
    if (userRole === "CUSTOMER") {
      await linkReferralForNewBuyer(prisma, {
        userId: user.id,
        sellerRef,
        referralCode: typeof referralCode === "string" ? referralCode : null,
      });
      // 회원가입 환영 알림톡 — 카카오 승인 조건상 가입 즉시 1회만. 실패해도 가입 흐름에 영향 없음.
      await notifySignupWelcome({ name: nameTrimmed, phone: phoneNormalized, sellerRef }).catch((e) =>
        console.error("[register] 환영 알림톡 오류:", e),
      );
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      role: userRole,
      message: userRole === "CONSULTANT"
        ? "뷰티 전문가 가입이 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다."
        : "회원가입이 완료되었습니다. 바로 로그인하실 수 있습니다.",
      needsApproval: userRole === "CONSULTANT",
    });
  } catch (error: any) {
    // 동시 가입 요청으로 중복 검사와 INSERT 사이에서 유니크 제약이 깨지는 경우
    // (P2002) 도 500 이 아니라 409 로 돌려준다.
    if (error?.code === "P2002") {
      const target = Array.isArray(error?.meta?.target)
        ? (error.meta.target as string[]).join(",")
        : String(error?.meta?.target ?? "");
      if (target.includes("email")) {
        return NextResponse.json(
          { error: "이미 사용 중인 이메일입니다.", code: "EMAIL_TAKEN" },
          { status: 409 },
        );
      }
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
