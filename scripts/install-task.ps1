# Windows 작업 스케줄러에 'BrawlCounterUpdate' 작업 등록.
# 매일 새벽 4시 자동 실행. PC가 꺼져 있었으면 다음 부팅 후 즉시 보완 실행.
#
# 등록:   .\scripts\install-task.ps1
# 시간 지정:  .\scripts\install-task.ps1 -At "06:30"
# 제거:   .\scripts\install-task.ps1 -Uninstall

param(
  [string]$At = '04:00',
  [string]$TaskName = 'BrawlCounterUpdate',
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

if ($Uninstall) {
  try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[OK] 작업 '$TaskName' 제거됨." -ForegroundColor Green
  } catch {
    Write-Host "[INFO] 작업 '$TaskName' 이 등록되어 있지 않음." -ForegroundColor Yellow
  }
  return
}

$scriptPath = Join-Path $PSScriptRoot 'auto-update.ps1'
if (-not (Test-Path $scriptPath)) {
  throw "auto-update.ps1 를 찾을 수 없습니다: $scriptPath"
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At $At

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description '브롤스타즈 로테이션 자동 갱신' `
  -Force | Out-Null

Write-Host "[OK] 작업 '$TaskName' 등록됨." -ForegroundColor Green
Write-Host "  실행 주기: 매일 $At"
Write-Host "  PC 꺼진 시간은 다음 부팅 후 자동 보완 실행"
Write-Host ""
Write-Host "수동 실행 (지금 한 번 돌려보기):"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "상태 확인:"
Write-Host "  Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "로그 확인:"
Write-Host "  Get-Content (Join-Path '$((Split-Path -Parent $PSScriptRoot))' 'auto-update.log') -Tail 50"
Write-Host ""
Write-Host "제거:  .\scripts\install-task.ps1 -Uninstall"
