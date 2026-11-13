// 의존성 없는 로컬 개발 서버: node scripts/serve.mjs [port]
// 정적 파일은 public/ 에서, /api/* 와 /c/* 는 실제 Worker(worker/index.js)를 메모리 KV로 실행한다.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

// Cloudflare KV 흉내(만료 시간 포함)
const store = new Map();
const memoryKV = {
  async put(key, value, opts = {}) {
    store.set(key, { value, metadata: opts.metadata ?? null, exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : Infinity });
  },
  async getWithMetadata(key) {
    const e = store.get(key);
    if (!e || e.exp < Date.now()) return { value: null, metadata: null };
    return { value: e.value, metadata: e.metadata };
  },
  async get(key) { return (await this.getWithMetadata(key)).value; },
};

async function serveStatic(pathname) {
  const path = normalize(decodeURIComponent(pathname)).replace(/^[\\/]+/, '');
  if (path.includes('..')) return new Response('bad request', { status: 400 });
  let file = join(root, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { return new Response('not found', { status: 404 }); }
  try {
    return new Response(await readFile(file), { headers: { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' } });
  } catch { return new Response('not found', { status: 404 }); }
}

const env = {
  CARDS: process.env.NO_KV ? undefined : memoryKV,
  ASSETS: { fetch: (req) => serveStatic(new URL(req.url).pathname) },
};

createServer(async (req, res) => {
  const url = `http://localhost:${port}${req.url}`;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  const r = await worker.fetch(request, env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log(`Zodigram → http://localhost:${port}${env.CARDS ? '' : ' (KV 없음)'}`));
