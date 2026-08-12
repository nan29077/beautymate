// 상담사 상담상품 신청의 "승인 주체"를 판단하는 공용 로직.
//
// 2자 구조(상담사 ↔ 고객)로 개편되면서 브랜드/중간관리자 단계가 사라졌다.
// 상담상품 신청의 승인 주체는 언제나 최고관리자다.
export type ApproverType = "SUPER_ADMIN";

export function resolveApprover(): { approverType: ApproverType; approverId: string | null } {
  return { approverType: "SUPER_ADMIN", approverId: null };
}
