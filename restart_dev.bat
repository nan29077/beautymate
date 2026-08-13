@echo off
rem ==================================================================
rem  ASCII-ONLY BOOTSTRAP -- do NOT put any non-ASCII byte above :RUN
rem
rem  This file is saved as UTF-8 (no BOM). Explorer double-click starts
rem  cmd.exe at the OEM codepage (949 on Korean Windows). If the Korean
rem  text below is parsed under 949, cmd miscounts bytes while seeking
rem  through the file and truncates command lines ("rem" -> "m",
rem  "echo ..." -> "..."), so the script dies long before it reaches
rem  "npm run dev" -- the window just flashes and closes.
rem
rem  Fix: switch the console to UTF-8 first, then re-parse this file
rem  from scratch under a codepage that matches its encoding.
rem ==================================================================
if defined SJ_DEV_UTF8 goto :RUN
chcp 65001 >nul
set "SJ_DEV_UTF8=1"
call "%~f0" %*
set "SJ_DEV_UTF8="
exit /b %ERRORLEVEL%

:RUN
setlocal
cd /d "%~dp0"

set "PORT=3022"
set "ALT_PORT=3023"
set "DO_CLEAN=0"
set "DO_OPEN=1"

rem ---- 인자 파싱: --clean (캐시 삭제), --no-open (브라우저 자동 열기 끄기) ----
:PARSE_ARGS
if "%~1"=="" goto :ARGS_DONE
if /i "%~1"=="--clean"   set "DO_CLEAN=1"
if /i "%~1"=="--no-open" set "DO_OPEN=0"
shift
goto :PARSE_ARGS
:ARGS_DONE

echo ============================================
echo   사주메이트 개발 서버 재시작
echo ============================================
echo.

echo [1/4] 포트 %PORT% / %ALT_PORT% 점유 프로세스 종료 중...
call :KILL_PORT %PORT%
call :KILL_PORT %ALT_PORT%

rem 포트가 실제로 비워질 때까지 대기. 남아 있으면 Next 가 3023 으로 밀려서
rem 브라우저로 열어둔 3022 에서는 아무것도 안 보인다.
call :WAIT_PORT_FREE %PORT%
if errorlevel 1 (
    echo.
    echo    [!] 포트 %PORT% 가 아직 사용 중입니다.
    echo        다른 사용자 권한으로 실행된 프로세스일 수 있습니다.
    echo        작업 관리자에서 node.exe 를 종료한 뒤 다시 실행하세요.
    goto :FAIL
)
echo    - 포트 정리 완료

echo [2/4] 실행 환경 확인...
where npm >nul 2>&1
if errorlevel 1 (
    echo    [!] npm 을 찾을 수 없습니다. Node.js 설치 상태와 PATH 를 확인하세요.
    goto :FAIL
)
if not exist "package.json" (
    echo    [!] package.json 이 없습니다. 이 파일은 app 폴더 안에 있어야 합니다.
    goto :FAIL
)
if not exist "node_modules" (
    echo    [!] node_modules 가 없습니다. 먼저 npm install 을 실행하세요.
    goto :FAIL
)
echo    - npm / package.json / node_modules 확인 완료

echo [3/4] 빌드 캐시 상태 확인...
rem .next 를 여러 프로세스가 동시에 쓰면 "Starting..." 에서 멈춘다.
if "%DO_CLEAN%"=="1" (
    if exist ".next" (
        echo    - .next 삭제 중...
        rmdir /s /q ".next" >nul 2>&1
    )
    echo    - 캐시 초기화 완료 ^(첫 컴파일이 느려집니다^)
) else (
    echo    - 캐시 유지 ^(초기화하려면: restart_dev.bat --clean^)
)

echo [4/4] 개발 서버 시작 중... http://localhost:%PORT%
if "%DO_OPEN%"=="1" (
    echo    - 준비되면 브라우저가 자동으로 열립니다 ^(끄려면: restart_dev.bat --no-open^)
    start "" /min cmd /c "ping -n 9 127.0.0.1 >nul & start http://localhost:%PORT%"
)
echo.

call npm run dev

echo.
echo [종료] 개발 서버가 종료되었습니다.
goto :END

rem ---- 지정 포트를 LISTENING 중인 프로세스를 트리째 종료 ----
rem findstr 은 공백을 OR 구분자로 해석하므로 반드시 /c: 로 리터럴 지정해야 한다.
rem ":3022" 만 쓰면 :30220 같은 포트까지 잡히고, ":3022 " 를 그냥 쓰면 빈 문자열
rem 패턴이 되어 모든 줄이 매칭된다.
:KILL_PORT
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":%~1 " ^| findstr /c:"LISTENING"') do (
    echo    - PID %%a 종료 ^(포트 %~1^)
    taskkill /PID %%a /T /F >nul 2>&1
)
exit /b 0

rem ---- 포트가 비워질 때까지 최대 약 15초 대기 (0=비었음, 1=여전히 점유) ----
rem taskkill 직후에도 소켓이 곧바로 닫히지 않는 경우가 있어 재시도가 필요하다.
:WAIT_PORT_FREE
for /l %%i in (1,1,15) do (
    netstat -aon | findstr /c:":%~1 " | findstr /c:"LISTENING" >nul 2>&1
    if errorlevel 1 exit /b 0
    ping -n 2 127.0.0.1 >nul 2>&1
)
exit /b 1

:FAIL
echo.
echo *** 개발 서버를 시작하지 못했습니다. ***

:END
echo.
echo 창을 닫으려면 아무 키나 누르세요...
pause >nul
endlocal
exit /b 0
