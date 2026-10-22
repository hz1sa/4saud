// مدقّق روابط saudiweather.net. لا يضيف أي رابط: الروابط تُكتب في المحتوى نفسه،
// وهذا الملف يتحقق من القواعد ويُرجع الأخطاء، ويطبع توزيع نصوص الروابط على مستوى الموقع.
//
// القواعد:
// - المقالات وصفحات /weather: رابط واحد على الأقل داخل نص <main> (لا التذييل ولا الشريط الجانبي).
// - كل الصفحات: 3 روابط كحد أقصى في الصفحة كلها، ورابط واحد في الفقرة (تكرار نص الرابط في الصفحة يُطبع تنبيهاً فقط).
// - نص الرابط أحد ثلاثة فقط: «الطقس» أو «طقس السعودية» إلى الصفحة الرئيسية، أو «طقس {المدينة}» إلى صفحة المدينة نفسها.
//   ولا يكون نص الرابط «saudiweather.net» أبداً.
// - لا روابط داخل العناوين، ولا عنوان saudiweather.net داخل title أو meta أو alt.
// - بلا rel="nofollow" أو rel="sponsored"، وبلا target (يفتح في نفس التبويب).
// - الروابط العميقة مقصورة على الصفحات المتحقق منها في data/saudiweather.json.

import { readFileSync } from 'node:fs';

export const SW_HOST = 'saudiweather.net';
const SW_HOME = 'https://www.saudiweather.net/';
const verified = JSON.parse(readFileSync(new URL('../data/saudiweather.json', import.meta.url), 'utf8'));
// رابط عميق → اسم المدينة المسموح في نصه
const DEEP = new Map(Object.values(verified.cities).filter(c => c.path).map(c => [`${SW_HOME}${c.path}`, c.name]));
export const ALLOWED = new Set([SW_HOME, ...DEEP.keys()]);
const HOME_ANCHORS = ['الطقس', 'طقس السعودية'];

// يُرجع سبب المخالفة، أو null إن كان النص مسموحاً
function anchorProblem(text, href) {
  if (/saudiweather/i.test(text)) return 'نص الرابط «saudiweather.net» ممنوع';
  if (href === SW_HOME) return HOME_ANCHORS.includes(text) ? null : 'رابط الصفحة الرئيسية نصه «الطقس» أو «طقس السعودية» فقط';
  const name = DEEP.get(href);
  if (name) return text === `طقس ${name}` ? null : `الرابط العميق نصه «طقس ${name}» فقط`;
  return null; // الرابط غير المتحقق منه له مخالفة مستقلة
}

const BLOCKS = new Set(['p', 'li', 'td', 'th', 'blockquote', 'dd', 'figcaption', 'caption']);
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'use', 'path', 'circle', 'col', 'area', 'base', 'embed', 'track']);

export const inScope = path => /^\/articles\/[^/]+\/$/.test(path) || path.startsWith('/weather/');

// تصنيف نص الرابط لتقرير التوزيع
export function category(text) {
  if (text === 'الطقس') return '«الطقس»';
  if (text === 'طقس السعودية') return '«طقس السعودية»';
  return '«طقس [مدينة]»';
}

export function auditLinks(html, path) {
  const errors = [];
  const warnings = [];
  const links = [];
  const mainStart = html.search(/<main[\s>]/);
  const mainEnd = html.lastIndexOf('</main>');

  // العنوان في title أو meta أو alt
  if (/<title>[^<]*saudiweather/i.test(html)) errors.push('عنوان saudiweather.net داخل <title>');
  for (const m of html.matchAll(/<meta\b[^>]*>/g)) if (m[0].includes(SW_HOST)) errors.push('عنوان saudiweather.net داخل meta');
  for (const m of html.matchAll(/\salt="([^"]*)"/g)) if (m[1].includes(SW_HOST)) errors.push('عنوان saudiweather.net داخل alt');

  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
  const stack = [];
  let pos = 0, blockSeq = 0, section = 'المقدمة', h2Text = null, current = null;
  for (const tok of tokens) {
    const at = pos; pos += tok.length;
    if (tok.startsWith('<!--')) continue;
    if (tok.startsWith('</')) {
      const name = tok.slice(2).replace(/[\s>].*$/s, '').toLowerCase();
      if (name === 'a' && current) { links.push(current); current = null; }
      if (name === 'h2' && h2Text !== null) { section = 'قسم: ' + h2Text.trim(); h2Text = null; }
      const i = stack.map(s => s.name).lastIndexOf(name);
      if (i !== -1) stack.length = i;
      continue;
    }
    if (tok.startsWith('<')) {
      const name = tok.slice(1).replace(/[\s/>].*$/s, '').toLowerCase();
      if (name === 'h2' && at > mainStart && at < mainEnd) h2Text = '';
      if (name === 'a' && tok.includes(SW_HOST)) {
        const href = tok.match(/href="([^"]+)"/)?.[1] || '';
        const inMain = at > mainStart && at < mainEnd;
        const names = stack.map(s => s.name);
        current = {
          href, text: '',
          block: [...stack].reverse().find(s => s.block)?.block ?? null,
          inBody: inMain && !names.includes('aside') && !names.includes('nav'),
          where: !inMain ? (at < mainStart ? 'الترويسة' : 'التذييل') : names.includes('aside') ? 'الشريط الجانبي' : section,
          heading: names.find(n => /^h[1-6]$/.test(n)) || null,
          nested: names.includes('a'),
          rel: tok.match(/\srel="([^"]*)"/)?.[1] || '',
          target: /\starget=/.test(tok),
        };
      }
      if (!VOID.has(name) && !tok.endsWith('/>')) stack.push({ name, block: BLOCKS.has(name) ? ++blockSeq : null });
      continue;
    }
    if (current) current.text += tok;
    if (h2Text !== null) h2Text += tok;
  }

  for (const l of links) l.text = l.text.replace(/\s+/g, ' ').trim();

  if (inScope(path) && !links.some(l => l.inBody)) errors.push('لا يوجد رابط إلى saudiweather.net داخل نص الصفحة');
  if (links.length > 3) errors.push(`${links.length} روابط (الحد الأقصى 3)`);
  const perBlock = new Map();
  for (const l of links) {
    if (l.block != null) perBlock.set(l.block, (perBlock.get(l.block) || 0) + 1);
    if (l.heading) errors.push(`رابط داخل ${l.heading}: «${l.text}»`);
    if (l.nested) errors.push(`رابط داخل رابط آخر: «${l.text}»`);
    if (/nofollow|sponsored/.test(l.rel)) errors.push(`rel="${l.rel}" على «${l.text}»`);
    if (l.target) errors.push(`target على «${l.text}» (يجب أن يفتح في نفس التبويب)`);
    if (!ALLOWED.has(l.href)) errors.push(`رابط غير متحقق منه: ${l.href}`);
    const bad = anchorProblem(l.text, l.href);
    if (bad) errors.push(`نص رابط مخالف «${l.text}» → ${l.href}: ${bad}`);
  }
  if ([...perBlock.values()].some(n => n > 1)) errors.push('أكثر من رابط في فقرة واحدة');
  const texts = links.map(l => l.text);
  const dup = texts.filter((t, i) => texts.indexOf(t) !== i);
  if (dup.length) warnings.push(`نص رابط مكرر في الصفحة: «${[...new Set(dup)].join('»، «')}»`);

  return { links, errors, warnings };
}

// تقرير على مستوى الموقع: الروابط في كل صفحة، ثم توزيع النصوص
export function printReport(results) {
  console.log('\nروابط saudiweather.net في كل صفحة:');
  for (const r of results) {
    const flag = r.errors.length ? '✗' : '✓';
    const list = r.links.map(l => `«${l.text}»${l.href === SW_HOME ? '' : ' ↗' + l.href.slice(SW_HOME.length)} [${l.where}]`).join('، ') || '—';
    console.log(`  ${flag} ${String(r.links.length)} | ${r.path} | ${list}`);
    for (const e of r.errors) console.log(`      ✗ ${e}`);
    for (const w of r.warnings || []) console.log(`      ⚠ ${w}`);
  }
  const scoped = results.filter(r => inScope(r.path)).flatMap(r => r.links);
  const all = results.flatMap(r => r.links);
  const dist = links => {
    const c = { '«الطقس»': 0, '«طقس السعودية»': 0, '«طقس [مدينة]»': 0 };
    for (const l of links) c[category(l.text)]++;
    return Object.entries(c).map(([k, v]) => `${k} ${v} (${Math.round((v / (links.length || 1)) * 100)}٪)`).join(' · ');
  };
  console.log(`\nتوزيع نصوص الروابط:`);
  console.log(`  المقالات وصفحات الطقس (${scoped.length} رابطاً): ${dist(scoped)}`);
  console.log(`  الموقع كله (${all.length} رابطاً): ${dist(all)}`);
  const freq = new Map();
  for (const l of all) freq.set(l.text, (freq.get(l.text) || 0) + 1);
  console.log('  تكرار كل نص: ' + [...freq].sort((a, b) => b[1] - a[1]).map(([t, n]) => `«${t}» ${n}`).join('، '));
  const deep = all.filter(l => l.href !== SW_HOME).length;
  console.log(`  روابط عميقة لصفحات المدن: ${deep} من ${all.length}`);
}
