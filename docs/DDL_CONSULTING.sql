-- ─────────────────────────────────────────────────────────────
-- 뷰티메이트 상담 예약 테이블 DDL
--
-- 운영 DB(RDS)에 직접 실행하기 위한 파일.
-- prisma migrate / prisma db push 는 사용하지 말 것 (다른 테이블까지 건드림).
--
-- 실행 방법 (예):
--   mysql -h <host> -u <user> -p <database> < docs/DDL_CONSULTING.sql
--
-- 모두 CREATE TABLE IF NOT EXISTS 라 여러 번 실행해도 안전하며,
-- 기존 데이터/테이블에는 전혀 영향을 주지 않는다.
--
-- ── 2026-08-13 운영 DB 대조 결과 (읽기 전용 prisma migrate diff) ──
--   npx prisma migrate diff --from-url "$DATABASE_URL" \
--       --to-schema-datamodel prisma/schema.prisma --script
--
--   운영 DB 에 아직 없는 것 = 정확히 아래 3가지뿐이었다.
--     1) Reservation 테이블 (통째로 없음)
--     2) TimeSlot 테이블 (통째로 없음)
--     3) direct_products.consultType / durationMinutes 컬럼
--   → 이 파일만 실행하면 schema.prisma 와 운영 DB 가 완전히 일치한다.
--     (나머지 테이블은 이미 스키마와 동기화되어 있음을 확인)
--
--   ⚠️ Reservation 테이블이 아직 없으므로, 아래 CREATE TABLE 을 먼저 실행하면
--      orderId/paidAt 컬럼이 함께 생성된다. 그 뒤 "추가 마이그레이션 ①" ALTER 는
--      "Duplicate column name" 오류가 나며, 그 경우 무시하면 된다.
--
-- Prisma 스키마(prisma/schema.prisma)의 Reservation / TimeSlot 모델과 1:1로 대응.
-- FK 제약은 일부러 걸지 않는다 (운영 데이터 정리/삭제 시 잠금 최소화,
-- 관계 join 은 애플리케이션 레벨에서 조합).
-- ─────────────────────────────────────────────────────────────

-- 상담 예약
CREATE TABLE IF NOT EXISTS `Reservation` (
  `id` VARCHAR(191) NOT NULL,
  `buyerId` VARCHAR(191) NOT NULL,        -- User.id (고객)
  `sellerId` VARCHAR(191) NOT NULL,       -- User.id (뷰티 전문가)
  `productId` VARCHAR(191) NOT NULL,      -- DirectProduct.id
  `status` ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `consultType` ENUM('VIDEO','PHONE','VISIT') NOT NULL,
  `scheduledAt` DATETIME(3) NULL,         -- 상담 예약 시간
  `confirmedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `dailyRoomName` VARCHAR(191) NULL,      -- Daily.co 방 이름
  `dailyRoomUrl` VARCHAR(191) NULL,       -- Daily.co 방 URL
  `dailySellerToken` TEXT NULL,           -- 뷰티 전문가 토큰
  `dailyBuyerToken` TEXT NULL,            -- 고객 토큰
  `orderId` VARCHAR(191) NULL,            -- Order.id (결제 연결)
  `paidAt` DATETIME(3) NULL,              -- 결제 완료 시각 (NULL = 미결제 → 30분 뒤 크론이 취소)
  `price` DECIMAL(10,2) NOT NULL,
  `memo` TEXT NULL,                       -- 뷰티 전문가 메모
  `aiSummary` TEXT NULL,                  -- AI 요약
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Reservation_buyerId_idx` (`buyerId`),
  KEY `Reservation_sellerId_idx` (`sellerId`),
  KEY `Reservation_orderId_idx` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 뷰티 전문가 가능 시간 (뷰티 전문가당 요일별 1행 · isActive=false 면 그 요일은 휴무)
CREATE TABLE IF NOT EXISTS `TimeSlot` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,       -- User.id (뷰티 전문가)
  `dayOfWeek` INT NOT NULL,               -- 0=일, 1=월 ... 6=토
  `startHour` INT NOT NULL,               -- 시작 시 (0-23)
  `startMinute` INT NOT NULL,             -- 시작 분
  `endHour` INT NOT NULL,
  `endMinute` INT NOT NULL,
  `slotMinutes` INT NOT NULL DEFAULT 60,  -- 상담 단위 시간 (30/60/90/120)
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `TimeSlot_sellerId_dayOfWeek_key` (`sellerId`, `dayOfWeek`),
  KEY `TimeSlot_sellerId_idx` (`sellerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- [마이그레이션] 이 파일의 예전 버전으로 TimeSlot 을 이미 만들었다면
-- 아래 두 문을 한 번만 실행해 `slotMinutes` 컬럼과 유니크 키를 추가하세요.
-- (CREATE TABLE IF NOT EXISTS 는 기존 테이블을 고치지 않습니다)
--
-- 컬럼이 이미 있으면 "Duplicate column name" 오류가 나며, 그 경우 무시하면 됩니다.
--   ALTER TABLE `TimeSlot` ADD COLUMN `slotMinutes` INT NOT NULL DEFAULT 60 AFTER `endMinute`;
--   ALTER TABLE `TimeSlot` ADD UNIQUE KEY `TimeSlot_sellerId_dayOfWeek_key` (`sellerId`, `dayOfWeek`);
--
-- 현재 상태 확인:
--   SHOW COLUMNS FROM `TimeSlot` LIKE 'slotMinutes';
--   SHOW INDEX FROM `TimeSlot` WHERE Key_name = 'TimeSlot_sellerId_dayOfWeek_key';
-- ─────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════
-- [추가 마이그레이션 · 2026-08-13] 결제 연결 + 상담 상품 메타
--
-- 아래 ALTER 문들은 **이미 만들어진 테이블**에 컬럼을 더한다.
-- 위 CREATE TABLE 을 지금 처음 실행한 것이라면 `Reservation` 쪽은 이미
-- 반영되어 있으므로 "Duplicate column name" 오류가 난다 — 그 경우 무시하면 된다.
--
-- 실행 전 현재 상태 확인:
--   SHOW COLUMNS FROM `Reservation` LIKE 'orderId';
--   SHOW COLUMNS FROM `direct_products` LIKE 'consultType';
-- ═════════════════════════════════════════════════════════════

-- ① 예약 ↔ 결제 연결 (과제 ④)
--    orderId : 이 예약의 결제 주문(Order.id). FK 는 걸지 않는다.
--    paidAt  : 결제 완료 시각. NULL 인 PENDING 예약은 30분 뒤 크론이 CANCELLED 로 바꾼다.
ALTER TABLE `Reservation`
  ADD COLUMN `orderId` VARCHAR(191) NULL AFTER `dailyBuyerToken`,
  ADD COLUMN `paidAt` DATETIME(3) NULL AFTER `orderId`,
  ADD KEY `Reservation_orderId_idx` (`orderId`);

-- ② 상담 상품에 상담 방식·소요시간 (과제 ⑨)
--    지금까지는 상품명("[화상] 사주 60분")과 description JSON 에서 추론했다
--    (app/src/lib/consulting.ts 의 inferConsultType / parseConsultMeta).
--    컬럼이 채워지면 그 값을 우선 사용하고, NULL 이면 기존 추론 로직으로 폴백한다.
--
--    ⚠️ 테이블명 주의: Prisma 모델은 `DirectProduct` 이지만 실제 테이블은
--       @@map 으로 `direct_products` 이다. `DirectProduct` 로 실행하면
--       "Table doesn't exist" 오류가 난다.
ALTER TABLE `direct_products`
  ADD COLUMN `consultType` ENUM('VIDEO','PHONE','VISIT') NULL AFTER `description`,
  ADD COLUMN `durationMinutes` INT NULL AFTER `consultType`;

-- ─────────────────────────────────────────────────────────────
-- 필요 환경변수 (app/.env)
--
--   DAILY_API_KEY=your_daily_api_key_here      # Daily.co 대시보드 > developers
--   DAILY_DOMAIN=your-subdomain.daily.co       # 선택 (방 URL 폴백 생성용)
--
-- OpenAI 키는 .env 가 아니라 DB(settings 테이블)에 저장한다.
--   관리자 > 권한 설정 > AI 설정 탭에서 등록 (key = 'ai.openai_key')
-- ─────────────────────────────────────────────────────────────
