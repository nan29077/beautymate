// 의존성 없는 HTML 이스케이프 유틸.
// 서버 컴포넌트에서 후기 목록 같은 HTML 문자열을 직접 조립할 때 사용한다.
// sanitizeHtml 과 파일을 분리해 둔 이유: sanitize-html 은 서버 번들에 파서를
// 끌어오므로, 단순 이스케이프만 필요한 페이지가 그 비용을 지지 않게 한다.

/** HTML 문자열에 사용자 입력을 끼워 넣기 전에 반드시 통과시킨다. */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
