# 매일 자동 실행: 최신 로테이션 가져와서 변경사항 있으면 commit + push.
# 호출은 install-task.ps1 이 등록한 Windows 작업 스케줄러에서 함.
# 로그: 프로젝트 루트의 auto-update.log

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $root 'auto-update.log'

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $logPath -Value $line -Encoding UTF8
}

try {
  Set-Location $root
  Log '=== auto-update 시작 ==='

  # PATH 새로고침 (gh, node)
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

  # API 키 (User scope에 저장된 값을 process scope으로 로드)
  if (-not $env:BS_API_KEY) {
    $env:BS_API_KEY = [Environment]::GetEnvironmentVariable('BS_API_KEY', 'User')
  }
  if (-not $env:BS_API_KEY) {
    Log 'ERROR: BS_API_KEY 환경변수 없음 (User scope)'
    exit 1
  }

  # native 명령(git, node)의 stderr를 PowerShell이 에러로 오인하지 않도록 일시 완화
  $prevPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'

  # 1) API에서 가져오기
  Log 'fetch-data.js 실행...'
  $out = & node 'scripts/fetch-data.js' *>&1 | Out-String
  Log "  output:`n$out"
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: fetch-data.js 실패 (exit $LASTEXITCODE)"
    $ErrorActionPreference = $prevPref
    exit $LASTEXITCODE
  }

  # 2) 로테이션 변경분만 스테이징
  & git add 'data/maps-rotation.json'
  $staged = & git diff --cached --name-only
  if (-not $staged) {
    Log '변경 없음. 종료.'
    $ErrorActionPreference = $prevPref
    exit 0
  }
  Log "변경 감지: $staged"

  # 3) 커밋
  $msg = 'Auto-update rotation ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
  $commitOut = & git commit -m $msg *>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: commit 실패 (exit $LASTEXITCODE)`n$commitOut"
    $ErrorActionPreference = $prevPref
    exit $LASTEXITCODE
  }
  Log "커밋: $msg"

  # 4) 푸시 (git은 진행상황을 stderr로 출력하므로 *>&1 로 합쳐서 로그만 남기고 exit code로 판단)
  $pushOut = & git push *>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: push 실패 (exit $LASTEXITCODE)`n$pushOut"
    $ErrorActionPreference = $prevPref
    exit $LASTEXITCODE
  }
  Log "푸시 완료:`n$pushOut"

  $ErrorActionPreference = $prevPref
  Log '=== 완료 ==='
} catch {
  Log "EXCEPTION: $($_.Exception.Message)"
  Log "Stack: $($_.ScriptStackTrace)"
  exit 1
}
