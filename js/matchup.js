import {
  renderHeader, getBrawlers, getMatchups,
  fillBrawlerSelect, matchupScore, enhanceSelect, makeRangeFilter
} from './common.js';

renderHeader('matchup');

const selectEl = document.getElementById('brawler');
const resultEl = document.getElementById('result');
const titleEl = document.getElementById('result-title');
const emptyEl = document.getElementById('empty');
const filterEl = document.getElementById('range-filter');

const [brawlers, matchups] = await Promise.all([getBrawlers(), getMatchups()]);
fillBrawlerSelect(selectEl, brawlers);
enhanceSelect(selectEl, { search: '브롤러 검색...' });

const rangeFilter = makeRangeFilter(filterEl, () => render(selectEl.value));

selectEl.addEventListener('change', () => render(selectEl.value));

function render(slug) {
  if (!slug) {
    resultEl.innerHTML = '';
    titleEl.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }
  emptyEl.style.display = 'none';
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
    .sort((a, b) => b.score - a.score);

  resultEl.innerHTML = rows.map(r => `
    <div class="matchup-cell">
      <span class="name">${r.name}</span>
      <span class="score score-${r.score}">${formatScore(r.score)}</span>
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
