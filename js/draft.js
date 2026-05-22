import {
  renderHeader, getBrawlers, getMatchups, getMapTier,
  fillBrawlerSelect, matchupScore, brawlerNameBySlug, enhanceSelect, makeRangeFilter
} from './common.js';

renderHeader('draft');

const modeEl = document.getElementById('mode');
const mapEl = document.getElementById('map');
const enemySelects = ['enemy-0', 'enemy-1', 'enemy-2'].map(id => document.getElementById(id));
const allySelects  = ['ally-0',  'ally-1'].map(id => document.getElementById(id));
const recommendEl = document.getElementById('recommend');
const emptyEl = document.getElementById('empty');
const filterEl = document.getElementById('range-filter');

const [brawlers, matchups, mapTier] = await Promise.all([
  getBrawlers(), getMatchups(), getMapTier()
]);
const rangeFilter = makeRangeFilter(filterEl, () => recompute());

[...enemySelects, ...allySelects].forEach(sel => {
  fillBrawlerSelect(sel, brawlers, '— 미정 —');
  enhanceSelect(sel, { search: '브롤러 검색...' });
  sel.addEventListener('change', recompute);
});

const modes = Object.keys(mapTier);
modeEl.innerHTML =
  '<option value="">모드 선택</option>' +
  modes.map(m => `<option value="${m}">${m}</option>`).join('');
enhanceSelect(modeEl, { search: '모드 검색...' });
enhanceSelect(mapEl, { search: '맵 검색...' });

modeEl.addEventListener('change', () => {
  const mode = modeEl.value;
  if (!mode) {
    mapEl.disabled = true;
    mapEl.innerHTML = '';
  } else {
    const maps = Object.keys(mapTier[mode] || {});
    mapEl.disabled = false;
    mapEl.innerHTML =
      '<option value="">맵 선택</option>' +
      maps.map(m => `<option value="${m}">${m}</option>`).join('');
  }
  recompute();
});
mapEl.addEventListener('change', recompute);

const TIER_SCORE = { S: 3, A: 2, B: 1, C: 0, D: -1 };

function mapScoreFor(slug, mode, map) {
  if (!mode || !map) return 0;
  const tiers = mapTier[mode]?.[map] || {};
  for (const t of Object.keys(tiers)) {
    if ((tiers[t] || []).includes(slug)) return TIER_SCORE[t] ?? 0;
  }
  return 0;
}

function recompute() {
  const enemyPicks = enemySelects.map(s => s.value).filter(Boolean);
  const allyPicks  = allySelects.map(s => s.value).filter(Boolean);
  const taken = new Set([...enemyPicks, ...allyPicks]);
  const mode = modeEl.value;
  const map = mapEl.value;

  const hasAnyInput = enemyPicks.length > 0 || (mode && map);
  if (!hasAnyInput) {
    recommendEl.innerHTML = '';
    emptyEl.style.display = '';
    return;
  }
  emptyEl.style.display = 'none';

  const scored = brawlers
    .filter(b => !taken.has(b.slug))
    .filter(b => rangeFilter.matches(b))
    .map(b => {
      let counter = 0;
      for (const e of enemyPicks) counter += matchupScore(matchups, b.slug, e);
      const mapPart = mapScoreFor(b.slug, mode, map);
      const total = counter + mapPart * 1.5;
      return { slug: b.slug, name: b.name, total, counter, mapPart };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  recommendEl.innerHTML = scored.map(s => `
    <li>
      <span>${s.name}
        <small style="color:var(--text-dim); margin-left:8px">
          상성 ${formatSigned(s.counter)} · 맵 ${formatSigned(s.mapPart)}
        </small>
      </span>
      <span class="score-pill">${s.total.toFixed(1)}</span>
    </li>
  `).join('');
}

function formatSigned(n) {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? `+${r}` : `${r}`;
}
