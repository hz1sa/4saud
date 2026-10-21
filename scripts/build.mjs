// بناء الموقع الثابت في dist/
// الاستعمال: node scripts/build.mjs [--offline]
//   --offline: يستعمل آخر بيانات طقس محفوظة في .cache/forecast.json بدل الجلب من Open-Meteo
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { forecastUrl } from '../src/assets/wx.js';
import * as P from '../src/pages.mjs';
import { SITE } from '../src/layout.mjs';
import { auditLinks, printReport } from './link-audit.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache');
const LEGACY = path.join(ROOT, 'legacy');
const OFFLINE = process.argv.includes('--offline');

const ARTICLE_ORDER = ['houbara-falconry-history', 'houbara-winter-season', 'murabbaniyah-falconry', 'weather-hunting-grounds', 'hunting-regulations'];
const MIN_WORDS = 1500;

const readJSON = async p => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));
const out = async (rel, content) => {
  const file = path.join(DIST, rel.endsWith('/') ? rel + 'index.html' : rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
};
const countWords = html => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;

// ---------- المقالات ----------
async function loadArticles() {
  const list = [];
  for (const slug of ARTICLE_ORDER) {
    const raw = await readFile(path.join(ROOT, 'src/content/articles', slug + '.html'), 'utf8');
    const m = raw.match(/^<!--([\s\S]*?)-->\s*([\s\S]*)$/);
    if (!m) throw new Error('بيانات المقال مفقودة: ' + slug);
    const meta = JSON.parse(m[1]);
    const html = m[2].trim();
    const headings = [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(x => ({ id: x[1], text: x[2].replace(/<[^>]+>/g, '') }));
    const words = countWords(html);
    list.push({ slug, ...meta, html, headings, words, readMinutes: Math.max(1, Math.round(words / 180)) });
  }
  return list;
}

// ---------- الطقس ----------
async function loadForecast(cities) {
  const cacheFile = path.join(CACHE, 'forecast.json');
  if (!OFFLINE) {
    try {
      let data;
      for (let i = 0; i < 3 && !data; i++) {
        const res = await fetch(forecastUrl(cities));
        if (res.ok) data = await res.json();
        else { console.warn(`Open-Meteo: ${res.status}، إعادة المحاولة…`); await new Promise(r => setTimeout(r, 5000 * (i + 1))); }
      }
      if (!data) throw new Error('فشل الجلب');
      const arr = Array.isArray(data) ? data : [data];
      const map = Object.fromEntries(cities.map((c, i) => [c.slug, arr[i]]));
      await mkdir(CACHE, { recursive: true });
      await writeFile(cacheFile, JSON.stringify({ fetchedAt: new Date().toISOString(), map }));
      console.log(`✓ جُلبت بيانات الطقس لـ${cities.length} مدينة من Open-Meteo`);
      return map;
    } catch (e) {
      console.warn('تعذّر جلب الطقس:', e.message);
      if (process.env.CI) throw e; // في GitHub Actions لا ننشر بيانات قديمة بصمت
    }
  }
  if (!existsSync(cacheFile)) throw new Error('لا توجد بيانات طقس محفوظة. شغّل البناء مع اتصال بالإنترنت أولاً.');
  console.warn('⚠ استُعملت بيانات الطقس المحفوظة');
  return JSON.parse(await readFile(cacheFile, 'utf8')).map;
}

function haversine(a, b) {
  const R = 6371, rad = x => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- الصور ----------
async function buildMedia(gallery) {
  const mediaCache = path.join(CACHE, 'media');
  await mkdir(mediaCache, { recursive: true });
  await mkdir(path.join(DIST, 'media'), { recursive: true });
  for (const img of gallery) {
    const src = path.join(LEGACY, img.src);
    const srcStat = await stat(src);
    for (const w of [480, 960]) {
      const name = `${img.id}-${w}.webp`;
      const cached = path.join(mediaCache, name);
      if (!existsSync(cached) || (await stat(cached)).mtimeMs < srcStat.mtimeMs) {
        await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(cached);
      }
      await cp(cached, path.join(DIST, 'media', name));
    }
    const meta = await sharp(path.join(mediaCache, `${img.id}-960.webp`)).metadata();
    img.w = meta.width; img.h = meta.height;
  }
}

async function buildBrandImages() {
  const assets = path.join(DIST, 'assets');
  // بلاطة ملمس الرمل: نقاط بنية شفافة عشوائية (بذرة ثابتة حتى يبقى الملف نفسه بين البناءات)
  const S = 128, px = Buffer.alloc(S * S * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < S * S; i++) {
    const v = rnd();
    px.set([115 + Math.round(rnd() * 30), 77 + Math.round(rnd() * 20), 38, v > 0.55 ? Math.round((v - 0.55) * 60) : 0], i * 4);
  }
  await sharp(px, { raw: { width: S, height: S, channels: 4 } }).png({ palette: true, colors: 8, compressionLevel: 9 }).toFile(path.join(assets, 'sand.png'));
  await sharp(path.join(LEGACY, 'images/gDSC00396.jpg')).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 78 }).toFile(path.join(assets, 'og.jpg'));
  await sharp(path.join(ROOT, 'src/assets/favicon.svg')).resize(512, 512).png().toFile(path.join(assets, 'logo.png'));
  await sharp(path.join(ROOT, 'src/assets/favicon.svg')).resize(180, 180).png().toFile(path.join(DIST, 'apple-touch-icon.png'));
}

// ---------- التحويلات من الروابط القديمة ----------
async function legacyRedirects() {
  const map = {
    '/gallery_1.htm': '/gallery/',
    '/gallery_2.htm': '/gallery/',
    '/gallery_3.htm': '/gallery/',
    '/links_page.htm': '/links/',
    '/form.htm': '/contact/',
    '/form_confirmation.htm': '/contact/',
    '/photogallery/falconry_ar.htm': '/articles/',
    '/photogallery/klphoto_ar.htm': '/gallery/#p-k773',
  };
  for (const f of await readdir(path.join(LEGACY, 'photogallery'))) {
    if (!f.endsWith('.htm')) continue;
    const key = '/photogallery/' + f;
    if (!map[key]) map[key] = `/gallery/#p-${f.replace('.htm', '')}`;
  }
  return map;
}

// ---------- البناء ----------
async function main() {
  const t0 = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, 'assets'), { recursive: true });

  const [cities, climate, gallery, articles, saudiweather] = await Promise.all([
    readJSON('data/cities.json'), readJSON('data/climate.json'), readJSON('data/gallery.json'), loadArticles(), readJSON('data/saudiweather.json'),
  ]);
  const forecast = await loadForecast(cities);
  const generatedAt = forecast[cities[0].slug].current.time;

  await buildMedia(gallery);
  await buildBrandImages();

  // الأصول الثابتة
  const assetFiles = ['style.css', 'wx.js', 'live.js', 'icons.svg', 'favicon.svg'];
  const hash = createHash('sha1');
  for (const f of assetFiles) {
    const buf = await readFile(path.join(ROOT, 'src/assets', f));
    hash.update(buf);
    await writeFile(path.join(DIST, 'assets', f), buf);
  }
  const assetVersion = hash.digest('hex').slice(0, 8);
  await out('weather/cities.json', JSON.stringify(Object.fromEntries(cities.map(c => [c.slug, { lat: c.lat, lon: c.lon }]))));

  const nearby = Object.fromEntries(cities.map(c => [c.slug,
    cities.filter(o => o !== c).sort((a, b) => haversine(c, a) - haversine(c, b)).slice(0, 3).map(o => o.slug)]));
  const cityArticles = slug => {
    const hit = articles.filter(a => a.cities.includes(slug));
    return hit.length ? hit : articles.filter(a => ['weather-hunting-grounds', 'houbara-winter-season'].includes(a.slug));
  };

  const ctx = { cities, climate, gallery, articles, saudiweather, forecast, generatedAt, nearby, cityArticles, pageBase: { assetVersion } };

  const pages = [
    P.home(ctx),
    P.articlesIndex(ctx),
    ...articles.map(a => P.article(ctx, a)),
    P.weatherIndex(ctx),
    ...cities.map(c => P.weatherCity(ctx, c)),
    P.galleryPage(ctx),
    P.linksPage(ctx),
    P.contactPage(ctx),
    P.notFound(ctx),
  ];

  // الروابط مكتوبة في المحتوى نفسه؛ هنا نتحقق منها فقط
  const linkResults = [];
  for (const p of pages) {
    await out(p.path, p.html);
    linkResults.push({ path: p.path, ...auditLinks(p.html, p.path) });
  }

  // التحويلات
  const redirects = await legacyRedirects();
  for (const [from, to] of Object.entries(redirects)) await out(from, P.redirect(from, to).html);

  // ملفات من الموقع القديم يجب أن تبقى في مكانها
  await cp(path.join(ROOT, 'CNAME'), path.join(DIST, 'CNAME'));
  await cp(path.join(ROOT, 'googled5b56868e1104538.html'), path.join(DIST, 'googled5b56868e1104538.html'));
  await cp(path.join(LEGACY, 'images'), path.join(DIST, 'images'), { recursive: true });
  await writeFile(path.join(DIST, '.nojekyll'), '');

  // خريطة الموقع وrobots
  const today = generatedAt.slice(0, 10);
  const urls = pages.filter(p => p.path !== '/404.html').map(p => {
    const a = articles.find(x => p.path === `/articles/${x.slug}/`);
    const isWeather = p.path.startsWith('/weather/');
    return `  <url><loc>${SITE}${p.path}</loc><lastmod>${a ? a.updated || a.date : today}</lastmod>${isWeather ? '<changefreq>hourly</changefreq>' : ''}</url>`;
  });
  await out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  await out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

  // التقرير
  printReport(linkResults);
  const bad = linkResults.filter(r => r.errors.length);
  if (bad.length) { console.error(`\n✗ ${bad.length} صفحة تخالف قواعد روابط saudiweather.net`); process.exitCode = 1; }

  console.log('\nعدد كلمات المقالات:');
  for (const a of articles) console.log(`  ${a.words >= MIN_WORDS ? '✓' : '✗'} ${String(a.words).padStart(5)}  ${a.slug}`);
  if (articles.some(a => a.words < MIN_WORDS)) { console.error(`✗ مقال أقل من ${MIN_WORDS} كلمة`); process.exitCode = 1; }

  console.log(`\n✓ ${pages.length} صفحة + ${Object.keys(redirects).length} تحويل، في ${((Date.now() - t0) / 1000).toFixed(1)} ث`);
}

main().catch(e => { console.error(e); process.exit(1); });
