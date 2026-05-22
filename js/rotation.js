import { renderHeader, loadJSON, getMapTier } from './common.js';

renderHeader('rotation');

const MODE_KO = {
  gemGrab:        '젬 그랩',
  showdown:       '쇼다운',
  soloShowdown:   '솔로 쇼다운',
  duoShowdown:    '듀오 쇼다운',
  trioShowdown:   '트리오 쇼다운',
  brawlBall:      '브롤 볼',
  heist:          '하이스트',
  bounty:         '바운티',
  hotZone:        '핫 존',
  knockout:       '녹아웃',
  duels:          '듀얼',
  wipeout:        '와이프아웃',
  brawlArena:     '브롤 아레나',
  basketBrawl:    '바스켓 브롤',
  airHockey:      '브롤 하키',
  deathmatch5v5:  '5대5 데스매치',
  paintBrawl:     '페인트 브롤',
  trophyEscape:   '트로피 탈출',
  brawlBall5V5:   '5대5 브롤 볼'
};

// camelCase API mode → map-tier.json 의 한글 모드 키
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
  brawlBall:    '#2196f3',
  heist:        '#ff9800',
  bounty:       '#ffd23f',
  hotZone:      '#f44336',
  knockout:     '#e91e63',
  brawlArena:   '#673ab7',
  basketBrawl:  '#ff5722',
  airHockey:    '#03a9f4',
  deathmatch5v5:'#795548',
  basketBall:   '#ff5722'
};

const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');

const rotation = await loadJSON('data/maps-rotation.json');
const mapTier  = await getMapTier();

// 종료 시각이 빠른 순(곧 끝나는 것부터)으로 정렬
rotation.sort((a, b) => parseBSTime(a.endTime) - parseBSTime(b.endTime));

const now = new Date();
const stillActive = rotation.filter(e => parseBSTime(e.endTime) > now);
const ended = rotation.length - stillActive.length;

statusEl.textContent = ended > 0
  ? `${stillActive.length}개 활성 · ${ended}개는 이미 종료됨 (데이터 갱신 필요)`
  : `${stillActive.length}개 활성`;

grid.innerHTML = rotation.map(renderCard).join('');

function renderCard(ev) {
  const modeKey  = ev.mode;
  const modeName = MODE_KO[modeKey] || modeKey;
  const color    = MODE_COLOR[modeKey] || '#6b7390';
  const tierMode = MODE_TO_TIER[modeKey];
  const hasTier  = tierMode && mapTier[tierMode]?.[ev.map];

  const end = parseBSTime(ev.endTime);
  const isEnded = end <= now;
  const remain = isEnded ? '종료됨' : formatRemaining(end - now);

  return `
    <div class="rotation-card ${isEnded ? 'is-ended' : ''}">
      <div class="rotation-mode" style="background:${color}">${modeName}</div>
      <div class="rotation-map">${escapeHtml(ev.map)}</div>
      <div class="rotation-time">${isEnded ? '⏹' : '⏱'} ${remain}</div>
      ${hasTier ? `<a class="rotation-link" href="maps.html#mode=${encodeURIComponent(tierMode)}&map=${encodeURIComponent(ev.map)}">티어 보기 →</a>` : `<span class="rotation-link muted">티어 데이터 없음</span>`}
    </div>
  `;
}

function parseBSTime(s) {
  // "20260522T080000.000Z" → ISO
  const iso = s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6');
  return new Date(iso);
}

function formatRemaining(ms) {
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}일 ${hours}시간 후 종료`;
  if (hours > 0) return `${hours}시간 ${mins}분 후 종료`;
  return `${mins}분 후 종료`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
