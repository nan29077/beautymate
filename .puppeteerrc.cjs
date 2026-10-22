/**
 * puppeteer 설치 설정.
 *
 * npm ci / npm install 시 puppeteer 가 Chrome(약 500MB)을 내려받는데,
 * 실서버에서는 이 다운로드가 디스크를 채워 설치 자체를 실패시킨 적이 있다(2026-08-31).
 * 소개서 PDF 는 로컬에서 미리 생성해 public/ 에 커밋하므로 서버에는 브라우저가 필요 없다.
 *
 * 로컬에서 generate-pdfs.js 를 돌려야 할 때는 이 설정을 잠시 끄거나
 * PUPPETEER_SKIP_DOWNLOAD=false npm install 로 브라우저를 받으면 된다.
 */
module.exports = {
  skipDownload: true,
};
