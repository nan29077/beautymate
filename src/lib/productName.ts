/**
 * 상담사 화면용 상담상품명 포맷.
 *
 * 상담상품명 끝에 "(브랜드명 + 중간관리자이름)" 형태가 붙어 있는 경우
 * - 중간관리자 상담상품(middleAdminId 있음): "(중간관리자이름)" 만 남긴다
 * - 브랜드 직접 등록 상담상품(middleAdminId 없음): "(브랜드명)" 만 남긴다
 * 패턴에 해당하지 않으면 원본 그대로 반환한다.
 */
export function formatProductNameForSeller(name: string, middleAdminId: string | null): string {
  const match = name.match(/^(.*?)\s*\(([^+)]+?)\s*\+\s*([^)]+?)\s*\)\s*$/);
  if (match) {
    const baseName = match[1].trimEnd();
    const brandPart = match[2].trim();
    const middlePart = match[3].trim();
    return middleAdminId
      ? `${baseName} (${middlePart})`
      : `${baseName} (${brandPart})`;
  }
  return name;
}
