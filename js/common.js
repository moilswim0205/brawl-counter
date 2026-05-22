// 데이터 로딩 + 공통 헤더 렌더링 + 검색 가능한 커스텀 select.

const cache = {};

export async function loadJSON(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} 로드 실패: ${res.status}`);
  cache[path] = await res.json();
  return cache[path];
}

export async function getBrawlers() {
  const list = await loadJSON('data/brawlers.json');
  return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function getMatchups() {
  const j = await loadJSON('data/matchups.json');
  return j.matchups || {};
}

export async function getMapTier() {
  const j = await loadJSON('data/map-tier.json');
  return j.modes || {};
}

export function brawlerNameBySlug(brawlers, slug) {
  const b = brawlers.find(x => x.slug === slug);
  return b ? b.name : slug;
}

export function matchupScore(matchups, attackerSlug, defenderSlug) {
  if (attackerSlug === defenderSlug) return 0;
  const aToD = matchups[attackerSlug]?.[defenderSlug];
  const dToA = matchups[defenderSlug]?.[attackerSlug];
  if (aToD == null && dToA == null) return 0;
  if (aToD == null) return -dToA;
  if (dToA == null) return aToD;
  return (aToD + (-dToA)) / 2;
}

export function renderHeader(activePage) {
  const links = [
    { href: 'index.html',   label: '홈',         key: 'home' },
    { href: 'matchup.html', label: '상성표',     key: 'matchup' },
    { href: 'maps.html',    label: '맵별 추천',  key: 'maps' },
    { href: 'draft.html',   label: '드래프트',   key: 'draft' }
  ];
  const html = `
    <span class="brand">Brawl Counter</span>
    <nav>
      ${links.map(l => `<a href="${l.href}" class="${l.key === activePage ? 'active' : ''}">${l.label}</a>`).join('')}
    </nav>
  `;
  const el = document.querySelector('header.site');
  if (el) el.innerHTML = html;
}

export function fillBrawlerSelect(selectEl, brawlers, placeholder = '브롤러 선택') {
  selectEl.innerHTML =
    `<option value="">${placeholder}</option>` +
    brawlers.map(b => `<option value="${b.slug}">${b.name}</option>`).join('');
  if (selectEl._combobox) selectEl._combobox.refresh();
}

// ---- 검색 가능한 커스텀 드롭다운 ------------------------------------------
// 기존 <select>를 숨기고 같은 자리에 검색창 + 옵션 리스트를 띄움.
// <select>는 상태 저장 + change 이벤트 발생용으로 유지되므로 기존 코드 호환.
//
// 사용법:
//   const sel = document.getElementById('brawler');
//   enhanceSelect(sel, { search: '브롤러 검색...' });
//
// 옵션이 나중에 바뀌면 MutationObserver가 자동 감지 + 다시 그림.

export function enhanceSelect(selectEl, opts = {}) {
  if (selectEl._combobox) return selectEl._combobox;

  const searchPlaceholder = opts.search || '검색...';

  const wrapper = document.createElement('div');
  wrapper.className = 'combobox';
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);
  selectEl.classList.add('combobox-source');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'combobox-button';
  button.innerHTML = `<span class="combobox-label"></span><span class="combobox-caret">▾</span>`;
  wrapper.appendChild(button);
  const labelEl = button.querySelector('.combobox-label');

  const panel = document.createElement('div');
  panel.className = 'combobox-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <input type="text" class="combobox-search" placeholder="${escapeHtml(searchPlaceholder)}" />
    <ul class="combobox-options" role="listbox"></ul>
  `;
  wrapper.appendChild(panel);

  const searchInput = panel.querySelector('.combobox-search');
  const optionsList = panel.querySelector('.combobox-options');

  let highlightIndex = -1;
  let filteredItems = [];

  function getOptions() {
    return Array.from(selectEl.options).map(o => ({
      value: o.value,
      label: o.textContent,
      isPlaceholder: o.value === ''
    }));
  }

  function selectedOption() {
    const i = selectEl.selectedIndex;
    if (i < 0) return null;
    const o = selectEl.options[i];
    return o ? { value: o.value, label: o.textContent, isPlaceholder: o.value === '' } : null;
  }

  function syncButton() {
    const sel = selectedOption();
    if (!sel || sel.isPlaceholder) {
      labelEl.textContent = sel?.label || '선택';
      button.classList.add('is-empty');
    } else {
      labelEl.textContent = sel.label;
      button.classList.remove('is-empty');
    }
    button.disabled = selectEl.disabled;
  }

  function renderOptions() {
    const q = searchInput.value.trim().toLowerCase();
    filteredItems = getOptions().filter(o => {
      if (o.isPlaceholder) return false; // 플레이스홀더는 리스트에 안 보임
      if (!q) return true;
      return o.label.toLowerCase().includes(q);
    });
    const currentValue = selectEl.value;
    if (filteredItems.length === 0) {
      optionsList.innerHTML = '<li class="combobox-empty">결과 없음</li>';
      highlightIndex = -1;
      return;
    }
    optionsList.innerHTML = filteredItems.map((o, i) => `
      <li class="combobox-option ${o.value === currentValue ? 'is-selected' : ''}"
          role="option" data-index="${i}" data-value="${escapeAttr(o.value)}">
        ${escapeHtml(o.label)}
      </li>
    `).join('');
    // 첫 항목 또는 현재값에 하이라이트
    const curIdx = filteredItems.findIndex(o => o.value === currentValue);
    highlightIndex = curIdx >= 0 ? curIdx : 0;
    updateHighlight();
  }

  function updateHighlight() {
    const items = optionsList.querySelectorAll('.combobox-option');
    items.forEach((el, i) => el.classList.toggle('is-highlight', i === highlightIndex));
    if (highlightIndex >= 0 && items[highlightIndex]) {
      items[highlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function open() {
    if (selectEl.disabled) return;
    panel.hidden = false;
    searchInput.value = '';
    renderOptions();
    // 포커스를 약간 지연 (display 반영 후)
    requestAnimationFrame(() => searchInput.focus());
  }

  function close() {
    panel.hidden = true;
  }

  function commit(value) {
    selectEl.value = value;
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    syncButton();
    close();
    button.focus();
  }

  // -- 이벤트 ---------------------------------------------------------------
  button.addEventListener('click', () => panel.hidden ? open() : close());

  searchInput.addEventListener('input', renderOptions);

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIndex = Math.min(filteredItems.length - 1, highlightIndex + 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(0, highlightIndex - 1);
      updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filteredItems[highlightIndex]) {
        commit(filteredItems[highlightIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
      button.focus();
    }
  });

  optionsList.addEventListener('click', e => {
    const li = e.target.closest('.combobox-option');
    if (li) commit(li.dataset.value);
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) close();
  });

  // <select> 옵션/속성 변경 감지 → 버튼 라벨 갱신
  const observer = new MutationObserver(() => {
    syncButton();
    if (!panel.hidden) renderOptions();
  });
  observer.observe(selectEl, {
    childList: true,
    attributes: true,
    attributeFilter: ['disabled', 'value']
  });

  // 초기 표시
  syncButton();

  const api = { refresh: () => { syncButton(); if (!panel.hidden) renderOptions(); } };
  selectEl._combobox = api;
  return api;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// ---- 사거리 필터 ----------------------------------------------------------
// container 안에 4개 토글 칩(근/중/장/기타)을 렌더.
// 기본은 모두 활성. onChange는 칩 클릭 시 호출됨.
// 반환된 객체의 matches(brawler)로 필터 통과 여부 확인.
const RANGE_FILTER_OPTIONS = [
  { key: 'short',  label: '근거리' },
  { key: 'medium', label: '중거리' },
  { key: 'long',   label: '장거리' },
  { key: '',       label: '기타' }   // range가 null/undefined인 새 브롤러
];

export function makeRangeFilter(container, onChange) {
  const active = new Set(RANGE_FILTER_OPTIONS.map(o => o.key));

  container.classList.add('range-filter');
  container.innerHTML = `
    <span class="range-filter-label">사거리</span>
    ${RANGE_FILTER_OPTIONS.map(o => `
      <button type="button" class="range-chip is-active" data-range="${escapeAttr(o.key)}">
        ${escapeHtml(o.label)}
      </button>
    `).join('')}
    <button type="button" class="range-chip range-chip--reset" data-action="reset">전체</button>
  `;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.range-chip');
    if (!btn) return;
    if (btn.dataset.action === 'reset') {
      // 모두 활성으로 되돌리기
      active.clear();
      RANGE_FILTER_OPTIONS.forEach(o => active.add(o.key));
    } else {
      const key = btn.dataset.range;
      if (active.has(key)) {
        // 마지막 하나 남았으면 끄지 않음 (전부 꺼지면 결과가 빈다)
        if (active.size <= 1) return;
        active.delete(key);
      } else {
        active.add(key);
      }
    }
    syncChips();
    onChange?.();
  });

  function syncChips() {
    container.querySelectorAll('.range-chip').forEach(el => {
      if (el.dataset.action === 'reset') return;
      el.classList.toggle('is-active', active.has(el.dataset.range));
    });
  }

  syncChips();

  return {
    matches: (brawler) => active.has(brawler?.range || ''),
    getActive: () => new Set(active)
  };
}
