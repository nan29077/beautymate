@echo off
chcp 65001 >nul
setlocal

echo ============================================
echo   사주메이트 개발 서버 재시작
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] 포트 3022 점유 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3022" ^| findstr "LISTENING"') do (
    echo    - PID %%a 종료
    taskkill /PID %%a /F >nul 2>&1
)

rem 개발 서버가 남긴 Next.js 워커도 함께 정리 (같은 .next 를 공유하면 컴파일이 멈춘다)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3023" ^| findstr "LISTENING"') do (
    echo    - PID %%a 종료 ^(3023^)
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/3] 빌드 캐시 상태 확인...
rem .next 를 여러 프로세스가 동시에 쓰면 "Starting..." 에서 멈춘다.
rem --clean 인자를 주면 캐시를 지우고 새로 빌드한다. (첫 컴파일이 느려짐)
if /i "%~1"=="--clean" (
    if exist ".next" (
        echo    - .next 삭제 중...
        rmdir /s /q ".next" >nul 2>&1
    )
) else (
    echo    - 캐시 유지 ^(초기화하려면: restart_dev.bat --clean^)
)

echo [3/3] 개발 서버 시작 중... http://localhost:3022
echo.
call npm run dev

endlocal
