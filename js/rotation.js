import { renderHeader, loadJSON, getMapTier, getBrawlers, brawlerNameBySlug } from './common.js';

renderHeader('rotation');

const MODE_KO = {
  gemGrab:        '젬 그랩',
  soloShowdown:   '쇼다운 (솔로)',
  duoShowdown:    '쇼다운 (듀오)',
  trioShowdown:   '쇼다운 (트리오)',
  showdown:       '쇼다운',
  brawlBall:      '브롤 볼',
  brawlBall5V5:   '5대5 브롤 볼',
  heist:          '하이스트',
  bounty:         '바운티',
  hotZone:        '핫 존',
  knockout:       '녹아웃',
  duels:          '듀얼',
  wipeout:        '와이프아웃',
  brawlArena:     '브롤 아레나',
  basketBrawl:    '바스켓 브롤',
  airHockey:      '브롤 하키',
  deathmatch:     '데스매치',
  deathmatch5v5:  '5대5 데스매치',
  tagTeam:        '태그 팀',
  paintBrawl:     '페인트 브롤',
  trophyEscape:   '트로피 탈출'
};

// camelCase API mode → map-tier.json 모드 키
const MODE_TO_TIER = {
  gemGrab:      '젬 그랩',
  soloShowdown: '쇼다운',
  duoShowdown:  '쇼다운',
  trioShowdown: '쇼다운',
  showdown:     '쇼다운',
  brawlBall:    '브롤 볼',
  heist:        '하이스트',
  bounty:       '바운티',
  hotZone:      '핫 존',
  knockout:     '녹아웃'
};

const MODE_COLOR = {
  gemGrab:      '#9c27b0',
  soloShowdown: '#4caf50',
  duoShowdown:  '#4caf50',
  trioShowdown: '#4caf50',
  showdown:     '#4caf50',
  brawlBall:    '#2196f3',
  brawlBall5V5: '#2196f3',
  heist:        '#ff9800',
  bounty:       '#ffd23f',
  hotZone:      '#f44336',
  knockout:     '#e91e63',
  brawlArena:   '#673ab7',
  basketBrawl:  '#ff5722',
  airHockey:    '#03a9f4',
  deathmatch:   '#607d8b',
  deathmatch5v5:'#607d8b',
  tagTeam:      '#795548',
  paintBrawl:   '#8bc34a',
  duels:        '#3f51b5',
  wipeout:      '#ff1744'
};

const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');

const [rotation, mapTier, brawlers] = await Promise.all([
  loadJSON('data/maps-rotation.json'),
  getMapTier(),
  getBrawlers()
]);

// 종료 시각 빠른 순으로 정렬
rotation.sort((a, b) => parseBSTime(a.endTime) - parseBSTime(b.endTime));

// 같은 (모드그룹, 맵) 쌍이 중복되면(쇼다운 솔로/듀오/트리오가 같은 맵일 때) 첫 번째만 유지
const seen = new Set();
const events = [];
const now = new Date();
let activeCount = 0, expiredCount = 0;

for (const ev of rotation) {
  const tierMode = MODE_TO_TIER[ev.mode];
  const dedupKey = (tierMode || ev.mode) + '|' + ev.map;
  if (seen.has(dedupKey)) continue;
  seen.add(dedupKey);

  const end = parseBSTime(ev.endTime);
  const isExpired = end <= now;
  if (isExpired) expiredCount++; else activeCount++;

  events.push({ ev, end, isExpired, tierMode });
}

statusEl.textContent =
  `활성 ${activeCount}개` +
  (expiredCount > 0 ? ` · 종료 ${expiredCount}개 (데이터 갱신 필요)` : '');

grid.innerHTML = events.map(renderCard).join('');

function renderCard({ ev, end, isExpired, tierMode }) {
  const modeKey  = ev.mode;
  const modeName = MODE_KO[modeKey] || modeKey;
  const color    = MODE_COLOR[modeKey] || '#6b7390';

  // 맵 이름: 우리 티어 데이터에 등록된 키(한글 (영문))가 있으면 그걸 우선
  const matchedKey = findMatchingTierKey(tierMode, ev.map);
  const mapDisplay = matchedKey || ev.map;

  // 추천 브롤러 (S, A 티어)
  let tierHtml;
  if (!tierMode) {
    tierHtml = '<div class="rotation-empty">티어 시스템 외 모드</div>';
  } else if (!matchedKey) {
    tierHtml = '<div class="rotation-empty">맵 티어 데이터 미등록</div>';
  } else {
    const tiers = mapTier[tierMode][matchedKey];
    const sList = (tiers.S || []).map(s => brawlerNameBySlug(brawlers, s));
    const aList = (tiers.A || []).map(s => brawlerNameBySlug(brawlers, s));
    if (sList.length === 0 && aList.length === 0) {
      tierHtml = '<div class="rotation-empty">티어 데이터 미입력</div>';
    } else {
      tierHtml = `
        ${sList.length ? `<div class="rotation-tier"><span class="tier-badge tier-badge-S">S</span><span>${sList.join(', ')}</span></div>` : ''}
        ${aList.length ? `<div class="rotation-tier"><span class="tier-badge tier-badge-A">A</span><span>${aList.join(', ')}</span></div>` : ''}
      `;
    }
  }

  const remain = isExpired ? '종료됨' : formatRemaining(end - now);

  return `
    <div class="rotation-card ${isExpired ? 'is-ended' : ''}">
      <div class="rotation-mode" style="background:${color}">${escapeHtml(modeName)}</div>
      <div class="rotation-map">${escapeHtml(mapDisplay)}</div>
      <div class="rotation-time">${isExpired ? '⏹' : '⏱'} ${remain}</div>
      ${tierHtml}
    </div>
  `;
}

function findMatchingTierKey(tierMode, englishMapName) {
  if (!tierMode) return null;
  const modeMaps = mapTier[tierMode];
  if (!modeMaps) return null;
  // 1) 키가 "한글 (영문)" 형식 → 영문 부분 비교
  for (const key of Object.keys(modeMaps)) {
    const m = key.match(/\(([^)]+)\)\s*$/);
    if (m && m[1].toLowerCase() === englishMapName.toLowerCase()) return key;
  }
  // 2) 영문 이름이 키 그 자체와 같을 수도 (영문만 있는 경우)
  if (modeMaps[englishMapName]) return englishMapName;
  return null;
}

function parseBSTime(s) {
  // "20260525T080000.000Z" → Date
  const iso = s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6');
  return new Date(iso);
}

function formatRemaining(ms) {
  const totalMin = Math.floor(ms / 60000);
  const days  = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins  = totalMin % 60;
  if (days > 0)  return `${days}일 ${hours}시간 후 종료`;
  if (hours > 0) return `${hours}시간 ${mins}분 후 종료`;
  return `${mins}분 후 종료`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
