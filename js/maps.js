import { renderHeader, getBrawlers, getMapTier, brawlerNameBySlug, enhanceSelect, makeRangeFilter } from './common.js';

renderHeader('maps');

const modeEl = document.getElementById('mode');
const mapEl = document.getElementById('map');
const resultEl = document.getElementById('result');
const emptyEl = document.getElementById('empty');
const filterEl = document.getElementById('range-filter');

const [brawlers, mapTier] = await Promise.all([getBrawlers(), getMapTier()]);
const brawlerBySlug = new Map(brawlers.map(b => [b.slug, b]));
const rangeFilter = makeRangeFilter(filterEl, () => render(modeEl.value, mapEl.value));

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
    render(null, null);
    return;
  }
  const maps = Object.keys(mapTier[mode] || {});
  mapEl.disabled = false;
  mapEl.innerHTML =
    '<option value="">맵 선택</option>' +
    maps.map(m => `<option value="${m}">${m}</option>`).join('');
  render(null, null);
});

mapEl.addEventListener('change', () => render(modeEl.value, mapEl.value));

const TIERS = ['S', 'A', 'B', 'C', 'D'];

function render(mode, map) {
  if (!mode || !map) {
    resultEl.innerHTML = '';
    emptyEl.style.display = '';
    return;
  }
  const tiers = mapTier[mode]?.[map] || {};
  emptyEl.style.display = 'none';

  resultEl.innerHTML = TIERS.map(t => {
    const list = (tiers[t] || []).filter(slug => {
      const b = brawlerBySlug.get(slug);
      return b ? rangeFilter.matches(b) : true;
    });
    if (list.length === 0) return '';
    const chips = list.map(slug =>
      `<span class="brawler-chip">${brawlerNameBySlug(brawlers, slug)}</span>`
    ).join('');
    return `
      <div class="tier-row tier-${t}">
        <div class="tier-label">${t}</div>
        <div class="tier-brawlers">${chips}</div>
      </div>
    `;
  }).join('');
}
