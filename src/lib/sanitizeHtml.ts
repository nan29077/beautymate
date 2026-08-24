import sanitize from "sanitize-html";

// 저장형 XSS 방지 — 사용자가 입력한 HTML(뷰티 서비스 상세설명 detailContent,
// 고객지원 문서 본문 등)을 dangerouslySetInnerHTML 로 렌더링하기 전에 반드시 통과시킨다.
//
// 이 값들은 관리자/뷰티 전문가가 작성하지만, 대시보드 계정이 하나만 털려도
// 상세설명에 심어둔 <script>/onerror 가 그 뷰티 서비스를 여는 모든 고객 브라우저에서
// 실행된다.
//
// 구현체로 sanitize-html 을 쓰는 이유: 호출부가 전부 "use client" 컴포넌트라
// 서버(SSR)와 브라우저 양쪽에서 동작해야 하는데, DOM 기반 새니타이저는 서버에서
// jsdom 을 통째로 로드해(콜드 스타트 수십 초) 페이지 렌더와 빌드를 지연시킨다.
// sanitize-html 은 순수 파서 기반이라 양쪽에서 동일하게, 가볍게 동작한다.

// 상세설명 편집기가 실제로 쓰는 태그 + 이미지/링크/표 정도만 허용한다.
const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "caption", "code", "col", "colgroup",
  "div", "em", "figure", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "mark", "ol", "p", "pre", "s", "small", "span",
  "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
  "tr", "u", "ul", "video", "source",
];

const COMMON_ATTRS = ["class", "style", "title", "align"];

export interface SanitizeOptions {
  /** 이미지·비디오까지 제거한 순수 텍스트 마크업만 허용할 때 */
  textOnly?: boolean;
}

/**
 * 신뢰할 수 없는 HTML 문자열을 안전한 HTML 로 정제한다.
 * null/undefined 는 빈 문자열로 정규화한다.
 */
export function sanitizeHtml(
  dirty: string | null | undefined,
  options: SanitizeOptions = {},
): string {
  if (!dirty) return "";
  const mediaTags = ["img", "video", "source"];
  const allowedTags = options.textOnly
    ? ALLOWED_TAGS.filter((t) => !mediaTags.includes(t))
    : ALLOWED_TAGS;

  return sanitize(dirty, {
    allowedTags,
    allowedAttributes: {
      "*": COMMON_ATTRS,
      a: [...COMMON_ATTRS, "href", "target", "rel"],
      img: [...COMMON_ATTRS, "src", "srcset", "sizes", "alt", "width", "height", "loading"],
      video: [...COMMON_ATTRS, "src", "poster", "controls", "width", "height"],
      source: [...COMMON_ATTRS, "src", "type"],
      td: [...COMMON_ATTRS, "colspan", "rowspan"],
      th: [...COMMON_ATTRS, "colspan", "rowspan"],
    },
    // javascript:, data:text/html 등 스크립트 실행 가능한 스킴 차단
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowedSchemesAppliedToAttributes: ["href", "src", "cite", "action"],
    // 프로토콜 없는 상대 경로(/uploads/...) 허용
    allowProtocolRelative: false,
    // 허용되지 않은 태그는 내용만 남기고 태그를 제거하되, 스크립트류는 내용까지 버린다.
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe"],
    // 외부 링크는 새 탭 + 참조 차단
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.href?.startsWith("http")
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : attribs,
      }),
    },
  });
}
