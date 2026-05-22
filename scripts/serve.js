// 의존성 없는 미니 정적 파일 서버. `node scripts/serve.js`로 실행.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon'
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    const filePath = join(ROOT, path);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); return res.end('forbidden');
    }
    const s = await stat(filePath);
    if (s.isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') { res.writeHead(404); return res.end('not found'); }
    console.error(err);
    res.writeHead(500); res.end('server error');
  }
});

server.listen(PORT, () => {
  console.log(`Brawl Counter http://localhost:${PORT}`);
});
