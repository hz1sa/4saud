// خادم محلي بسيط لـ dist/ يحاكي GitHub Pages: /x يُحوَّل إلى /x/، والمفقود يعرض 404.html
// الاستعمال: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(new URL('../dist', import.meta.url).pathname);
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.htm': 'text/html; charset=utf-8' };

const isFile = async p => { try { return (await stat(p)).isFile(); } catch { return false; } };
const isDir = async p => { try { return (await stat(p)).isDirectory(); } catch { return false; } };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const rel = decodeURIComponent(url.pathname);
  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) { res.writeHead(400).end(); return; }
  if (await isDir(file)) {
    if (!rel.endsWith('/')) { res.writeHead(301, { location: rel + '/' + url.search }).end(); return; }
    file = path.join(file, 'index.html');
  }
  if (!(await isFile(file))) {
    res.writeHead(404, { 'content-type': TYPES['.html'] }).end(await readFile(path.join(DIST, '404.html')));
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
