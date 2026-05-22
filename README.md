# Brawl Counter

브롤스타즈 브롤러 상성 · 맵별 추천 · 드래프트 도우미 정적 사이트.

**라이브:** https://moilswim0205.github.io/brawl-counter/

## 배포

```powershell
# 변경사항 자동 커밋 + 푸시 → GitHub Pages 자동 재빌드 (~30초~2분)
.\deploy.ps1

# 메시지 직접 지정
.\deploy.ps1 "데이터 갱신"
```

저장소: https://github.com/moilswim0205/brawl-counter

## 로컬에서 실행

```powershell
node C:\Users\user\Desktop\brawl-counter\scripts\serve.js
```

브라우저에서 http://localhost:8080 접속.

> npm 스크립트(`npm run serve`)는 PowerShell의 실행 정책 때문에 막힐 수 있어요.
> 그럴 땐 위처럼 `node`로 직접 실행하거나 `npm.cmd`를 쓰세요.

## 구조

```
brawl-counter/
├── index.html / matchup.html / maps.html / draft.html
├── css/style.css
├── js/
│   ├── common.js       # 데이터 로더, 헤더, 점수 계산 유틸
│   ├── matchup.js      # 상성표
│   ├── maps.js         # 맵별 티어
│   └── draft.js        # 드래프트 추천
├── data/
│   ├── brawlers.json   # 브롤러 목록 (API로 갱신 가능)
│   ├── matchups.json   # 브롤러간 상성 점수 (수동)
│   └── map-tier.json   # 맵별 티어 (수동)
└── scripts/
    ├── serve.js        # 의존성 없는 정적 서버
    └── fetch-data.js   # 공식 API에서 브롤러/맵 가져오기
```

## 데이터 편집

### 상성 — `data/matchups.json`
- 점수: `-2`(매우 불리), `-1`(불리), `0`(중립), `1`(유리), `2`(매우 유리)
- 한 쪽만 적어도 됨. 양쪽 다 있으면 평균.

### 맵 티어 — `data/map-tier.json`
- `modes → 모드 → 맵 → 티어(S/A/B/C/D) → 브롤러 slug 배열`

## 공식 API로 갱신

1. https://developer.brawlstars.com 에서 API 키 발급 (현재 IP 등록 필요)
2. `$env:BS_API_KEY = "여기에토큰"`
3. `node scripts/fetch-data.js`

## 점수 계산 (드래프트)

`상성 합산 + 맵 티어 점수 × 1.5`
- 맵 티어 점수: `S=3, A=2, B=1, C=0, D=-1`
- 가중치는 [js/draft.js](js/draft.js) 상단에서 조정
