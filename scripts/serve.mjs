// 의존성 없는 로컬 개발 서버: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
  if (path.includes('..')) { res.writeHead(400).end(); return; }
  let file = join(root, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(root, 'index.html'); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`Zodigram → http://localhost:${port}`));
