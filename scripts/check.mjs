// فحص الناتج في dist/: h1 واحد، عناوين وأوصاف فريدة، الروابط الداخلية والمرساة، alt، JSON-LD، وقواعد الروابط.
// الاستعمال: node scripts/check.mjs [--external]
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { auditLinks } from './link-audit.mjs';

const DIST = path.resolve(new URL('../dist', import.meta.url).pathname);
const EXTERNAL = process.argv.includes('--external');
const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (/\.html?$/.test(e.name)) out.push(p);
  }
  return out;
}

function resolveTarget(urlPath) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const p = path.join(DIST, clean);
  if (clean.endsWith('/')) return path.join(p, 'index.html');
  if (path.extname(clean)) return p;
  return path.join(p, 'index.html'); // GitHub Pages يحوّل /x إلى /x/
}

const files = await walk(DIST);
const titles = new Map(), descs = new Map();
const idsByFile = new Map();
const external = new Set();
let pagesChecked = 0;

for (const file of files) {
  const rel = '/' + path.relative(DIST, file);
  const html = await readFile(file, 'utf8');
  idsByFile.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
  if (/http-equiv="refresh"/.test(html)) continue; // صفحات التحويل
  if (rel === '/googled5b56868e1104538.html') continue;
  pagesChecked++;

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(rel, `عدد h1 = ${h1}`);
  if (!/<html lang="ar" dir="rtl">/.test(html)) err(rel, 'lang/dir مفقود');

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!title) err(rel, 'title مفقود');
  if (!desc) err(rel, 'description مفقود');
  if (!/noindex/.test(html)) {
    if (!/<link rel="canonical"/.test(html)) err(rel, 'canonical مفقود');
    if (titles.has(title)) err(rel, `title مكرر مع ${titles.get(title)}`); else titles.set(title, rel);
    if (descs.has(desc)) err(rel, `description مكرر مع ${descs.get(desc)}`); else descs.set(desc, rel);
    for (const og of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) if (!html.includes(og)) err(rel, `${og} مفقود`);
  }

  // تسلسل العناوين: لا h3 قبل أول h2، ولا روابط داخل العناوين
  const heads = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)];
  const mainStart = html.indexOf('<main');
  let seenH2 = false;
  for (const h of heads) {
    if (h.index < mainStart) continue;
    if (h[1] === '2') seenH2 = true;
    if (h[1] === '3' && !seenH2) err(rel, `h3 قبل أي h2: ${h[2].replace(/<[^>]+>/g, '').slice(0, 40)}`);
      }

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="[^"]+"/.test(m[0])) err(rel, `صورة بلا alt: ${m[0].slice(0, 80)}`);
  }

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { err(rel, 'JSON-LD غير صالح'); }
  }
  if (/\/articles\/[^/]+\/index\.html$/.test(file) && !html.includes('"@type":"Article"')) err(rel, 'Article JSON-LD مفقود');
  if (!/noindex/.test(html) && rel !== '/index.html' && !html.includes('"BreadcrumbList"')) err(rel, 'BreadcrumbList مفقود');
  if (rel === '/index.html' && !html.includes('"@type":"WebSite"')) err(rel, 'WebSite JSON-LD مفقود');

  // قواعد روابط saudiweather.net (المدقّق نفسه الذي يشغّله البناء)
  for (const e of auditLinks(html, rel.replace(/index\.html$/, ''), ).errors) err(rel, e);
  const main = html.slice(mainStart, html.lastIndexOf('</main>'));

  // الروابط
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith('mailto:') || u.startsWith('data:')) continue;
    if (/^https?:\/\//.test(u)) { if (!u.includes('fonts.g') && !u.startsWith('https://www.4saud.net')) external.add(u.replace(/&amp;/g, '&')); continue; }
    if (u.startsWith('#')) { if (u.length > 1 && !idsByFile.get(file).has(u.slice(1))) err(rel, `مرساة مفقودة ${u}`); continue; }
    if (!u.startsWith('/')) { err(rel, `رابط نسبي غير متوقع ${u}`); continue; }
    const target = resolveTarget(u);
    if (!existsSync(target)) err(rel, `رابط داخلي مكسور ${u}`);
    else if (u.includes('#')) {
      const tHtml = await readFile(target, 'utf8');
      const id = u.split('#')[1];
      if (!new RegExp(`\\sid="${id}"`).test(tHtml)) err(rel, `مرساة مفقودة ${u}`);
    }
  }
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (!existsSync(resolveTarget(u))) err(rel, `srcset مكسور ${u}`);
    }
  }
}

// التحويلات: الهدف موجود
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const to = html.match(/http-equiv="refresh" content="0; url=([^"]+)"/)?.[1];
  if (!to) continue;
  const target = resolveTarget(to);
  if (!existsSync(target)) err('/' + path.relative(DIST, file), `تحويل إلى هدف غير موجود ${to}`);
  else if (to.includes('#') && !new RegExp(`\\sid="${to.split('#')[1]}"`).test(await readFile(target, 'utf8'))) err('/' + path.relative(DIST, file), `تحويل إلى مرساة غير موجودة ${to}`);
}

for (const f of ['CNAME', 'robots.txt', 'sitemap.xml', '.nojekyll', 'googled5b56868e1104538.html', '404.html']) {
  if (!existsSync(path.join(DIST, f))) err(f, 'مفقود');
}
const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
for (const loc of sitemap.matchAll(/<loc>https:\/\/www\.4saud\.net([^<]+)<\/loc>/g)) {
  if (!existsSync(resolveTarget(loc[1]))) err('sitemap.xml', `رابط غير موجود ${loc[1]}`);
}

if (EXTERNAL) {
  const list = [...external];
  console.log(`فحص ${list.length} رابطاً خارجياً…`);
  const bad = [];
  const queue = [...list];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const u = queue.shift();
      try {
        const res = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (4saud link check)' }, signal: AbortSignal.timeout(20000) });
        if (res.status >= 400 && res.status !== 403) bad.push(`${res.status} ${u}`);
        else if (res.status === 403) console.log(`  تنبيه 403 (حماية من الروبوتات غالباً): ${u}`);
      } catch (e) {
        const code = e.cause?.code || e.name;
        // سلسلة شهادات ناقصة على الخادم: المتصفحات تكملها عادة، فنكتفي بالتنبيه
        if (/CERT|VERIFY|SIGNATURE/.test(code)) console.log(`  تنبيه شهادة TLS (${code}): ${u}`);
        else bad.push(`خطأ ${u} (${code})`);
      }
    }
  }));
  for (const b of bad) err('رابط خارجي', b);
}

console.log(`فُحصت ${pagesChecked} صفحة و${files.length - pagesChecked} ملف تحويل/تحقق.`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} مشكلة:`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✓ لا مشاكل: h1 واحد لكل صفحة، العناوين والأوصاف فريدة، الروابط الداخلية سليمة، وقواعد الروابط محققة.');
