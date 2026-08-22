# 뷰티메이트 로컬 DB 자동 설정 스크립트
#
#   app\__setup_db.bat 더블클릭 (또는)
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-local-db.ps1
#
# 하는 일 (전부 로컬 DB 대상, 기존 데이터 삭제 없음):
#   1. mysql.exe 위치 탐색
#   2. .env 의 DATABASE_URL 파싱 (사용자/비밀번호/DB명)
#   3. root 로 접속해 DB 와 앱 계정 생성 + mysql_native_password 로 설정
#   4. 앱 계정으로 접속 확인
#   5. npx prisma db push 로 스키마 반영
#
# ⚠️ DROP DATABASE / DROP TABLE 류는 절대 실행하지 않는다.

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 스크립트는 scripts\ 안에 있으므로 앱 루트는 한 단계 위
$AppRoot = Split-Path -Parent $PSScriptRoot
Set-Location $AppRoot

function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ❌ $msg" -ForegroundColor Red }

# ─────────────────────────────────────────────
# 1. mysql.exe 찾기
# ─────────────────────────────────────────────
Write-Step "mysql 클라이언트 탐색"

$candidates = @()
$cmd = Get-Command mysql.exe -ErrorAction SilentlyContinue
if ($cmd) { $candidates += $cmd.Source }
$candidates += @(
  "C:\xampp\mysql\bin\mysql.exe",
  "C:\Bitnami\wampstack\mariadb\bin\mysql.exe"
)
$globs = @(
  "C:\Program Files\MariaDB*\bin\mysql.exe",
  "C:\Program Files\MySQL\MySQL Server*\bin\mysql.exe",
  "C:\wamp64\bin\mariadb\*\bin\mysql.exe",
  "C:\wamp64\bin\mysql\*\bin\mysql.exe",
  "C:\ProgramData\MySQL\MySQL Server*\bin\mysql.exe"
)
foreach ($g in $globs) {
  $candidates += (Get-ChildItem -Path $g -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
}

$MysqlExe = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $MysqlExe) {
  Write-Err "mysql.exe 를 찾지 못했습니다."
  Write-Host "    MySQL/MariaDB 설치 경로의 bin 폴더를 PATH 에 추가하거나,"
  Write-Host "    phpMyAdmin 등에서 아래 SQL 을 직접 실행하세요:"
  Write-Host "      npx tsx scripts\check-db.ts   ← 실행하면 필요한 SQL 이 출력됩니다"
  Read-Host "`nEnter 를 누르면 종료합니다"
  exit 1
}
Write-Ok "찾음: $MysqlExe"

# ─────────────────────────────────────────────
# 2. .env 파싱
# ─────────────────────────────────────────────
Write-Step ".env 의 DATABASE_URL 확인"

if (-not (Test-Path ".env")) { Write-Err ".env 파일이 없습니다. ($AppRoot)"; exit 1 }
$envText = Get-Content ".env" -Raw -Encoding UTF8
$m = [regex]::Match($envText, '(?m)^\s*DATABASE_URL\s*=\s*["'']?([^"''\r\n]+)["'']?')
if (-not $m.Success) { Write-Err ".env 에서 DATABASE_URL 을 찾지 못했습니다."; exit 1 }

$uri      = [uri]$m.Groups[1].Value
$parts    = $uri.UserInfo -split ':', 2
$DbUser   = [uri]::UnescapeDataString($parts[0])
$DbPass   = if ($parts.Count -gt 1) { [uri]::UnescapeDataString($parts[1]) } else { "" }
$DbHost   = $uri.Host
$DbPort   = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
$DbName   = $uri.AbsolutePath.TrimStart('/')

Write-Ok "대상: $DbUser@${DbHost}:$DbPort/$DbName"

if ($DbHost -ne "127.0.0.1" -and $DbHost -ne "localhost" -and $DbHost -ne "::1") {
  Write-Err "로컬 DB 전용 스크립트입니다. DATABASE_URL 이 원격($DbHost)을 가리키고 있어 중단합니다."
  exit 1
}

# ─────────────────────────────────────────────
# 3. root 접속
# ─────────────────────────────────────────────
Write-Step "DB 관리자(root) 접속"

function Invoke-MysqlRoot {
  param([string]$RootPassword, [string]$Sql, [string]$SqlFile)
  $prev = $env:MYSQL_PWD
  $env:MYSQL_PWD = $RootPassword
  try {
    if ($SqlFile) {
      $out = & $MysqlExe "-h" $DbHost "-P" $DbPort "-u" "root" "--default-character-set=utf8mb4" "-e" "source $SqlFile" 2>&1
    } else {
      $out = & $MysqlExe "-h" $DbHost "-P" $DbPort "-u" "root" "--default-character-set=utf8mb4" "-N" "-B" "-e" $Sql 2>&1
    }
    return @{ ok = ($LASTEXITCODE -eq 0); out = ($out -join "`n") }
  } finally {
    $env:MYSQL_PWD = $prev
  }
}

$RootPw = ""
$probe = Invoke-MysqlRoot -RootPassword $RootPw -Sql "SELECT VERSION();"
if (-not $probe.ok) {
  Write-Warn "root 비밀번호 없이 접속 실패 — 비밀번호를 입력하세요."
  $secure = Read-Host "  root 비밀번호 (없으면 그냥 Enter)" -AsSecureString
  $RootPw = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  $probe = Invoke-MysqlRoot -RootPassword $RootPw -Sql "SELECT VERSION();"
  if (-not $probe.ok) {
    Write-Err "root 접속 실패:"
    Write-Host $probe.out
    Read-Host "`nEnter 를 누르면 종료합니다"
    exit 1
  }
}

$ServerVersion = $probe.out.Trim()
$IsMariaDb = $ServerVersion -match "MariaDB"
Write-Ok "접속 성공 — 서버: $ServerVersion ($(if ($IsMariaDb) { 'MariaDB' } else { 'MySQL' }))"

# ─────────────────────────────────────────────
# 4. DB + 계정 생성
# ─────────────────────────────────────────────
Write-Step "데이터베이스와 앱 계정 준비"

function SqlLiteral([string]$s) { "'" + ($s -replace "\\", "\\\\" -replace "'", "''") + "'" }
$pwLit = SqlLiteral $DbPass

$sqlLines = @(
  "CREATE DATABASE IF NOT EXISTS ``$DbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)
foreach ($h in @("localhost", "127.0.0.1")) {
  if ($IsMariaDb) {
    $sqlLines += "CREATE USER IF NOT EXISTS '$DbUser'@'$h' IDENTIFIED VIA mysql_native_password USING PASSWORD($pwLit);"
    $sqlLines += "ALTER USER '$DbUser'@'$h' IDENTIFIED VIA mysql_native_password USING PASSWORD($pwLit);"
  } else {
    $sqlLines += "CREATE USER IF NOT EXISTS '$DbUser'@'$h' IDENTIFIED WITH mysql_native_password BY $pwLit;"
    $sqlLines += "ALTER USER '$DbUser'@'$h' IDENTIFIED WITH mysql_native_password BY $pwLit;"
  }
  $sqlLines += "GRANT ALL PRIVILEGES ON ``$DbName``.* TO '$DbUser'@'$h';"
}
$sqlLines += "FLUSH PRIVILEGES;"

$tmpSql = Join-Path $env:TEMP "beautymate-setup-db.sql"
# BOM 없는 UTF8 로 저장 (mysql 클라이언트가 BOM 을 구문 오류로 읽는 것 방지)
[IO.File]::WriteAllText($tmpSql, ($sqlLines -join "`r`n"), (New-Object Text.UTF8Encoding($false)))

$apply = Invoke-MysqlRoot -RootPassword $RootPw -SqlFile ($tmpSql -replace '\\', '/')
Remove-Item $tmpSql -ErrorAction SilentlyContinue
if (-not $apply.ok) {
  Write-Err "SQL 실행 실패:"
  Write-Host $apply.out
  Read-Host "`nEnter 를 누르면 종료합니다"
  exit 1
}
Write-Ok "데이터베이스 '$DbName' 와 계정 '$DbUser' 준비 완료"

# ─────────────────────────────────────────────
# 5. 앱 계정으로 접속 확인
# ─────────────────────────────────────────────
Write-Step "앱 계정으로 접속 확인"

$prev = $env:MYSQL_PWD
$env:MYSQL_PWD = $DbPass
$verify = & $MysqlExe "-h" $DbHost "-P" $DbPort "-u" $DbUser "-D" $DbName "-N" "-B" "-e" "SELECT 'ok';" 2>&1
$verifyOk = ($LASTEXITCODE -eq 0)
$env:MYSQL_PWD = $prev

if (-not $verifyOk) {
  Write-Err "앱 계정 접속 실패:"
  Write-Host ($verify -join "`n")
  Read-Host "`nEnter 를 누르면 종료합니다"
  exit 1
}
Write-Ok "'$DbUser' 계정으로 '$DbName' 접속 성공"

# ─────────────────────────────────────────────
# 6. 스키마 반영
# ─────────────────────────────────────────────
Write-Step "Prisma 스키마 반영 (npx prisma db push)"
Write-Host "  ※ 새로 만든 빈 DB 이므로 데이터 손실 위험이 없습니다." -ForegroundColor DarkGray

& npx prisma db push
if ($LASTEXITCODE -ne 0) {
  Write-Err "prisma db push 실패 — 위 메시지를 확인하세요."
  Read-Host "`nEnter 를 누르면 종료합니다"
  exit 1
}
Write-Ok "스키마 반영 완료"

Write-Step "최종 진단"
& npx tsx scripts/check-db.ts

Write-Host "`n────────────────────────────────────────────" -ForegroundColor Green
Write-Host " 완료! 개발 서버를 재시작한 뒤" -ForegroundColor Green
Write-Host " /auth/login 에서 테스트 로그인 버튼을 눌러보세요." -ForegroundColor Green
Write-Host "────────────────────────────────────────────" -ForegroundColor Green
Read-Host "`nEnter 를 누르면 창을 닫습니다"
