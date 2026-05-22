// 공식 Brawl Stars API에서 브롤러/맵 정보를 가져와 data/*.json에 머지.
// - 기존 brawlers.json의 한글 이름/class/range는 보존
// - 새 브롤러만 추가 (영문 이름, class/range는 null로 — 직접 채우세요)
// - id 순으로 정렬
//
// 사용법:
//   1. https://developer.brawlstars.com 에서 API 키 발급 (현재 IP 등록 필요)
//   2. PowerShell:  $env:BS_API_KEY = "여기에토큰"
//   3. node scripts/fetch-data.js

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const BRAWLERS_PATH = join(DATA_DIR, 'brawlers.json');

const API_BASE = 'https://api.brawlstars.com/v1';
const KEY = process.env.BS_API_KEY;

if (!KEY) {
  console.error('환경변수 BS_API_KEY 가 비어 있습니다.');
  console.error('PowerShell:  $env:BS_API_KEY = "여기에토큰"');
  process.exit(1);
}

// 공식 영문 이름 → 우리가 쓰는 slug 의 예외 매핑.
// (API 영문명에서 자동 생성한 slug와 다르게 쓰고 싶을 때만 등록)
const SLUG_OVERRIDES = {
  'Colonel Ruffs': 'ruffs'
};

function nameToSlug(name) {
  if (SLUG_OVERRIDES[name]) return SLUG_OVERRIDES[name];
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function api(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json' }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} 실패: ${res.status} ${body}`);
  }
  return res.json();
}

async function loadExisting() {
  try {
    await access(BRAWLERS_PATH);
    const txt = await readFile(BRAWLERS_PATH, 'utf8');
    return JSON.parse(txt);
  } catch {
    return [];
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  console.log('기존 brawlers.json 로드...');
  const existing = await loadExisting();
  const bySlug = new Map(existing.map(b => [b.slug, b]));
  console.log(`  기존 ${existing.length}명`);

  console.log('공식 API에서 브롤러 목록 가져오는 중...');
  const apiResp = await api('/brawlers');
  const apiItems = apiResp.items || [];
  console.log(`  API ${apiItems.length}명`);

  const added = [];
  for (const apiB of apiItems) {
    const slug = nameToSlug(apiB.name);
    if (bySlug.has(slug)) {
      // 기존 항목: id만 업데이트하고 한글 이름/class/range는 보존
      const cur = bySlug.get(slug);
      cur.id = apiB.id;
    } else {
      // 새 브롤러: 영문 이름 그대로, class/range는 null
      const fresh = {
        id: apiB.id,
        name: apiB.name,
        slug,
        class: null,
        range: null
      };
      bySlug.set(slug, fresh);
      added.push(fresh);
    }
  }

  // id 순으로 정렬 (id가 없으면 뒤로)
  const merged = Array.from(bySlug.values()).sort((a, b) => {
    if (a.id == null) return 1;
    if (b.id == null) return -1;
    return a.id - b.id;
  });

  await writeFile(BRAWLERS_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  console.log('');
  console.log(`총 ${merged.length}명 저장 (기존 ${existing.length} + 새로 ${added.length})`);
  if (added.length > 0) {
    console.log('새로 추가된 브롤러:');
    for (const b of added) {
      console.log(`  - ${b.name}  (slug: ${b.slug})  ← 한글 이름/class/range 직접 채워주세요`);
    }
  }

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
