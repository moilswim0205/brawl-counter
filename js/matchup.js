import {
  renderHeader, getBrawlers, getMatchups, getMapTier,
  fillBrawlerSelect, matchupScore, enhanceSelect, makeRangeFilter
} from './common.js';

renderHeader('matchup');

const selectEl    = document.getElementById('brawler');
const resultEl    = document.getElementById('result');
const titleEl     = document.getElementById('result-title');
const mapResultEl = document.getElementById('map-result');
const mapTitleEl  = document.getElementById('map-title');
const emptyEl     = document.getElementById('empty');
const filterEl    = document.getElementById('range-filter');

const [brawlers, matchups, mapTier] = await Promise.all([
  getBrawlers(), getMatchups(), getMapTier()
]);
fillBrawlerSelect(selectEl, brawlers);
enhanceSelect(selectEl, { search: '브롤러 검색...' });

const rangeFilter = makeRangeFilter(filterEl, () => render(selectEl.value));

selectEl.addEventListener('change', () => render(selectEl.value));

function render(slug) {
  if (!slug) {
    resultEl.innerHTML = '';
    mapResultEl.innerHTML = '';
    titleEl.style.display = 'none';
    mapTitleEl.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }
  emptyEl.style.display = 'none';
  renderMatchups(slug);
  renderFavorableMaps(slug);
}

function renderMatchups(slug) {
  titleEl.style.display = '';
  titleEl.textContent = `${brawlerNameOf(slug)} 기준 상성`;

  const rows = brawlers
    .filter(b => b.slug !== slug)
    .filter(b => rangeFilter.matches(b))
    .map(b => {
      const raw = matchupScore(matchups, slug, b.slug);
      const score = Math.round(raw);
      return { slug: b.slug, name: b.name, score };
    })
    .filter(r => r.score !== 0)        // ← 0점(중립) 숨김
    .sort((a, b) => b.score - a.score);

  if (rows.length === 0) {
    resultEl.innerHTML = '<p class="empty-hint">표시할 상성이 없습니다 (필터에 걸렸거나 데이터 부족).</p>';
    return;
  }

  resultEl.innerHTML = rows.map(r => `
    <div class="matchup-cell">
      <span class="name">${r.name}</span>
      <span class="score score-${r.score}">${formatScore(r.score)}</span>
    </div>
  `).join('');
}

function renderFavorableMaps(slug) {
  // 모든 모드/맵을 훑어서 이 브롤러가 S 또는 A 티어인 곳 수집
  const found = [];
  for (const mode of Object.keys(mapTier)) {
    for (const map of Object.keys(mapTier[mode])) {
      const tiers = mapTier[mode][map];
      if (tiers.S?.includes(slug))      found.push({ mode, map, tier: 'S' });
      else if (tiers.A?.includes(slug)) found.push({ mode, map, tier: 'A' });
    }
  }

  // 티어 S → A 순, 같은 티어 안에서는 모드 순서대로 (JSON 순)
  const tierRank = { S: 0, A: 1 };
  found.sort((a, b) => tierRank[a.tier] - tierRank[b.tier]);

  mapTitleEl.style.display = '';
  mapTitleEl.textContent = `${brawlerNameOf(slug)}가 유리한 맵 (${found.length}개)`;

  if (found.length === 0) {
    mapResultEl.innerHTML = '<p class="empty-hint">맵 티어 데이터에 등록된 곳이 없습니다.</p>';
    return;
  }

  mapResultEl.innerHTML = found.map(f => `
    <div class="map-list-row">
      <span class="tier-badge tier-badge-${f.tier}">${f.tier}</span>
      <span class="mode-badge">${f.mode}</span>
      <span class="map-name">${escapeHtml(f.map)}</span>
    </div>
  `).join('');
}

function brawlerNameOf(slug) {
  const b = brawlers.find(x => x.slug === slug);
  return b ? b.name : slug;
}
function formatScore(n) {
  if (n > 0) return `+${n}`;
  return `${n}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
