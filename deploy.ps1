# 변경사항을 GitHub에 푸시 → GitHub Pages가 자동 재빌드(~30초~2분)
# 사용법:  .\deploy.ps1            (자동 커밋 메시지)
#         .\deploy.ps1 "메시지"    (직접 메시지)

param([string]$Message)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

git add .
$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "변경사항 없음." -ForegroundColor Yellow
  exit 0
}

Write-Host "스테이징된 파일:" -ForegroundColor Cyan
$staged | ForEach-Object { Write-Host "  $_" }

if (-not $Message) {
  $Message = "Update: " + (Get-Date -Format 'yyyy-MM-dd HH:mm')
}

git commit -m $Message
git push

Write-Host ""
Write-Host "푸시 완료. https://moilswim0205.github.io/brawl-counter/ 에서 30초~2분 후 반영됩니다." -ForegroundColor Green
