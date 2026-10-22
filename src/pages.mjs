// مولّدات الصفحات. كل دالة تُرجع { path, html } أو مصفوفة منها.
import { layout, esc, ic, abs, divider, SITE, SITE_NAME } from './layout.mjs';
import * as wx from './assets/wx.js';

const PUBLISHER = { '@type': 'Organization', name: SITE_NAME, url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/assets/logo.png' } };

const REGIONS = {
  'Riyadh Region': 'منطقة الرياض', 'Mecca Region': 'منطقة مكة المكرمة', 'Medina Region': 'منطقة المدينة المنورة',
  'Eastern Province': 'المنطقة الشرقية', "'Asir Region": 'منطقة عسير', 'Tabuk Region': 'منطقة تبوك',
  'Al-Qassim Region': 'منطقة القصيم', "Ha'il Region": 'منطقة حائل', 'Jazan Region': 'منطقة جازان',
  'Najran Region': 'منطقة نجران', 'Al Jawf Region': 'منطقة الجوف', 'Northern Borders Region': 'منطقة الحدود الشمالية',
  'Al Bahah Region': 'منطقة الباحة',
};
const COASTAL = new Set(['jeddah', 'dammam', 'khobar', 'jazan', 'jubail', 'yanbu']);

const SW_HOME = 'https://www.saudiweather.net/';

// جملة الرابط إلى صفحة المدينة على saudiweather.net (data/saudiweather.json).
// نص الرابط: «طقس {المدينة}» للروابط العميقة، و«الطقس» أو «طقس السعودية» للصفحة الرئيسية.
function saudiWeatherSentence(c, sw) {
  if (!sw.path) {
    const a = `<a href="${SW_HOME}">${esc(sw.anchor)}</a>`;
    const where = sw.anchor === 'الطقس' ? `منصة ${a} السعودي` : `منصة ${a}`;
    return `ولمن يحب المقارنة بين أكثر من مصدر، تجد توقعات مدن المملكة أيضاً على ${where}.`;
  }
  const a = `<a href="${SW_HOME}${sw.path}">طقس ${esc(sw.name)}</a>`;
  if (sw.variant === 'a') return `ولمن يحب المقارنة بين أكثر من مصدر، راجع أيضاً ${a} على saudiweather.net.`;
  if (sw.variant === 'b') return `ويمكنك مقارنة هذه الأرقام مع صفحة ${a} على saudiweather.net.`;
  return `وتجد صفحة ${a} أيضاً على منصة طقس السعودية لمن يحب المقارنة بين أكثر من مصدر.`;
}

const fmtDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${wx.MONTHS[m - 1]} ${y}`; };
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// صورة من المعرض بصيغة WebP مع srcset
export function picture(img, { sizes = '(max-width: 860px) 100vw, 50vw', lazy = true, cls = '' } = {}) {
  return `<img${cls ? ` class="${cls}"` : ''} src="/media/${img.id}-960.webp" srcset="/media/${img.id}-480.webp 480w, /media/${img.id}-960.webp 960w" sizes="${sizes}" width="${img.w}" height="${img.h}" alt="${esc(img.alt)}"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}>`;
}

// ===== الرئيسية =====
export function home(ctx) {
  const { articles, gallery, cities, forecast } = ctx;
  const g = id => gallery.find(x => x.id === id);
  const [first, ...rest] = articles;
  const skyCities = ['riyadh', 'hail', 'buraydah', 'sakaka', 'arar', 'tabuk', 'alahsa', 'najran'];
  const sky = skyCities.map(slug => {
    const c = cities.find(x => x.slug === slug);
    const f = forecast[slug];
    return `<li><a href="/weather/${slug}/" data-city="${slug}"><b>${esc(c.ar)}</b> <span class="chip">${f ? wx.renderCityChip(f.current) : ''}</span></a></li>`;
  }).join('');

  const body = `
<section class="hero">
  <div>
    <p class="kicker">${ic('star')} الصقارة · المقناص · أحوال البر</p>
    <h1>دفتر صقّار: <em>الحبارى</em> والمقناص وأحوال الجو في البرّ</h1>
    <p class="hero-lede">هنا أكتب ما تعلّمته من سنوات في البر مع الصقور: تاريخ الصقارة، ومواسم الحبارى، وأنظمة الصيد، وأحوال الجو في مدن المقناص. كل معلومة موثّقة بمصدرها، وكل رأي يُقال إنه رأي.</p>
    <a class="more" href="/articles/">اقرأ المقالات ${ic('arrow')}</a>
  </div>
  <figure class="hero-photo">
    ${picture(g('396'), { lazy: false, sizes: '(max-width: 860px) 100vw, 40vw' })}
    <figcaption>من أرشيف 4saud: صقّار بين صقوره على وكورها في أرض رملية</figcaption>
  </figure>
</section>

<section class="notes" aria-labelledby="about-h">
  <aside>«الصقر يعلّمك ما لا يعلّمه الكتاب: أن تنتظر، وأن تقرأ الريح، وأن ترضى بما يأتي.»</aside>
  <div>
    <h2 id="about-h" style="margin-top:0">عن هذا الدفتر</h2>
    <p>بدأ 4saud.net قبل سنوات طويلة صفحات بسيطة فيها صور من رحلات المقناص: صقور على وكورها، وغبار يغطّي الأفق، وبرد أبيض في الوادي. واليوم أعدت بناءه ليكون مكاناً أجمع فيه ما أعرفه، وما تحققت منه، عن الصقارة والحبارى.</p>
    <p>ولأن <a href="${SW_HOME}">الطقس</a> يقرر نصف المقناص، أضفت صفحات لأكبر مدن المملكة تعرض الحالة الآن وتوقعات الساعات والأيام القادمة.</p>
  </div>
</section>

${divider('falcon')}

<section aria-labelledby="latest-h">
  <h2 id="latest-h" style="margin-top:0">من الدفتر</h2>
  <article class="feature">
    <figure>${picture(g(first.image))}</figure>
    <div>
      <p class="kicker">${ic('tent')} مقال طويل</p>
      <h3><a href="/articles/${first.slug}/">${esc(first.title)}</a></h3>
      <p>${esc(first.lede)}</p>
      <a class="more" href="/articles/${first.slug}/">أكمل القراءة ${ic('arrow')}</a>
    </div>
  </article>
  <ol class="ledger">
    ${rest.map(a => `<li><h3><a href="/articles/${a.slug}/">${esc(a.title)}</a></h3><p>${esc(a.description)} <span class="meta">· ${a.readMinutes} دقيقة قراءة</span></p></li>`).join('')}
  </ol>
</section>

<section class="sky" aria-labelledby="sky-h" id="sky">
  <h2 id="sky-h">الجو في مدن المقناص الآن</h2>
  <ul class="sky-list">${sky}</ul>
  <p style="margin:0"><a href="/weather/">كل المدن وتوقعات الأيام السبعة</a></p>
</section>

<section aria-labelledby="gal-h">
  <h2 id="gal-h">من صور البرّ</h2>
  <div class="strip">
    ${['619', '645', '897', '1126', '446'].map(id => `<a href="/gallery/#p-${id}">${picture(g(id), { sizes: '(max-width: 860px) 50vw, 33vw' })}</a>`).join('')}
  </div>
  <a class="more" href="/gallery/">المعرض كاملاً ${ic('arrow')}</a>
</section>`;

  return {
    path: '/',
    html: layout({
      ...ctx.pageBase,
      path: '/',
      title: 'دفتر صقّار: صيد الحبارى بالصقور وطقس مدن السعودية | 4saud.net',
      description: 'مقالات موثّقة عن الصقارة وصيد الحبارى ومواسمه وأنظمته في السعودية، وصفحات تعرض الطقس الحالي وتوقعات 7 أيام لأكبر المدن، بقلم صقّار من البر.',
      image: `/media/396-960.webp`,
      imageAlt: g('396').alt,
      body,
      jsonld: [{
        '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, alternateName: 'فور سعود', url: SITE + '/', inLanguage: 'ar', publisher: PUBLISHER,
      }],
      scripts: [`<script type="module" src="/assets/live.js?v=${ctx.pageBase.assetVersion}"></script>`],
    }),
  };
}

// ===== المقالات =====
export function articlesIndex(ctx) {
  const { articles, gallery } = ctx;
  const body = `
<header class="article-head">
  <h1>مقالات عن الصقارة والحبارى والمقناص</h1>
  <p class="lede">مقالات طويلة كتبتها من تجربتي في البر، وتحققت من كل معلومة فيها من مصادر رسمية وعلمية تجدها في آخر كل مقال.</p>
</header>
<ol class="ledger">
  ${articles.map(a => `<li><h2><a href="/articles/${a.slug}/">${esc(a.title)}</a></h2><p>${esc(a.description)}<br><span class="meta">${fmtDate(a.date)} · ${a.readMinutes} دقيقة قراءة</span></p></li>`).join('')}
</ol>`;
  return {
    path: '/articles/',
    html: layout({
      ...ctx.pageBase,
      path: '/articles/',
      title: 'مقالات الصقارة وصيد الحبارى في السعودية | 4saud.net',
      description: 'كل مقالات 4saud.net: تاريخ الصقارة، ومواسم صيد الحبارى الشتوية، والمربعانية، وأثر الطقس على المقناص، وأنظمة الصيد وتراخيصه في المملكة.',
      crumbs: [['/', 'الرئيسية'], ['/articles/', 'المقالات']],
      image: `/media/${articles[0].image}-960.webp`,
      body,
      jsonld: [{
        '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'مقالات 4saud.net', url: abs('/articles/'), inLanguage: 'ar',
        hasPart: articles.map(a => ({ '@type': 'Article', headline: a.title, url: abs(`/articles/${a.slug}/`) })),
      }],
    }),
  };
}

export function article(ctx, a) {
  const { articles, gallery, cities } = ctx;
  const img = gallery.find(x => x.id === a.image);
  const toc = a.headings.map(h => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('');
  const related = a.related.map(s => articles.find(x => x.slug === s)).filter(Boolean)
    .map(r => `<li><a href="/articles/${r.slug}/">${esc(r.title)}</a></li>`).join('');
  const cityLinks = a.cities.map(s => cities.find(c => c.slug === s)).filter(Boolean)
    .map(c => `<li><a href="/weather/${c.slug}/">${esc(c.ar)}</a></li>`).join('');
  const sources = a.sources.map(s => `<li>${esc(s.publisher)}: <a href="${esc(s.url)}" rel="nofollow noopener">${esc(s.title)}</a></li>`).join('');

  const body = `
<article>
  <header class="article-head">
    <p class="kicker">${ic('falcon')} من دفتر الصقّار</p>
    <h1>${esc(a.title)}</h1>
    <p class="lede">${esc(a.lede)}</p>
    <p class="byline"><span>نُشر في <time datetime="${a.date}">${fmtDate(a.date)}</time></span><span>${a.readMinutes} دقيقة قراءة</span><span>${a.sources.length} مصدراً</span></p>
  </header>
  <div class="layout">
    <div class="prose">
      <figure>${picture(img, { lazy: false, sizes: '(max-width: 860px) 100vw, 680px' })}<figcaption>${esc(img.caption)}، من أرشيف 4saud</figcaption></figure>
      ${a.html}
      <section class="sources" aria-labelledby="sources-h" data-nolink>
        <h2 id="sources-h">المصادر</h2>
        <ol>${sources}</ol>
        <p class="muted">راجعت المصادر في ${fmtDate(a.date)}. الأنظمة والمواسم تتغيّر، فارجع إلى الجهة الرسمية قبل أي قرار.</p>
      </section>
    </div>
    <aside class="side" aria-label="روابط المقال">
      <nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">في هذا المقال</h2><ol>${toc}</ol></nav>
      <h2>اقرأ أيضاً</h2><ul>${related}</ul>
      <h2>أحوال الجو في</h2><ul>${cityLinks}</ul>
    </aside>
  </div>
</article>`;

  return {
    path: `/articles/${a.slug}/`,
    html: layout({
      ...ctx.pageBase,
      path: `/articles/${a.slug}/`,
      section: '/articles/',
      title: a.seoTitle,
      description: a.description,
      ogType: 'article',
      image: `/media/${img.id}-960.webp`,
      imageAlt: img.alt,
      crumbs: [['/', 'الرئيسية'], ['/articles/', 'المقالات'], [`/articles/${a.slug}/`, a.title]],
      head: `<meta property="article:published_time" content="${a.date}">`,
      body,
      jsonld: [{
        '@context': 'https://schema.org', '@type': 'Article',
        headline: a.title, description: a.description, inLanguage: 'ar',
        image: [abs(`/media/${img.id}-960.webp`)],
        datePublished: a.date, dateModified: a.updated || a.date,
        author: { '@type': 'Organization', name: SITE_NAME, url: SITE + '/' },
        publisher: PUBLISHER,
        mainEntityOfPage: abs(`/articles/${a.slug}/`),
        wordCount: a.words,
        citation: a.sources.map(s => s.url),
      }],
    }),
  };
}

// ===== الطقس =====
export function weatherIndex(ctx) {
  const { cities, forecast, generatedAt } = ctx;
  const items = cities.map(c => {
    const f = forecast[c.slug];
    return `<li><a href="/weather/${c.slug}/" data-city="${c.slug}"><span class="city-name">${esc(c.ar)}</span><span class="chip">${f ? wx.renderCityChip(f.current) : ''}</span></a></li>`;
  }).join('');
  const body = `
<header class="article-head">
  <h1>طقس السعودية اليوم في المدن الكبرى</h1>
  <p class="lede">الحالة الجوية الآن في ${cities.length} مدينة سعودية، مع صفحة لكل مدينة فيها توقعات الساعات الثماني والأربعين القادمة والأيام السبعة.</p>
</header>
<p>هذه الصفحة تُحدَّث تلقائياً كل ثلاث ساعات، ويحدّثها متصفحك مباشرة عند فتحها. وأستعملها أنا قبل كل مقناص لأعرف حالة الطقس في أقرب مدينة إلى المكان الذي أقصده، لا في المدينة التي أسكن فيها. آخر تحديث للنسخة الثابتة: <time datetime="${generatedAt}">${esc(wx.stampLabel(generatedAt))}</time>.</p>
<p>ولمن يحب المقارنة بين أكثر من مصدر، تجد توقعات مدن المملكة أيضاً على منصة <a href="${SW_HOME}">الطقس</a> السعودي.</p>
<h2>المدن</h2>
<ul class="city-grid" id="city-grid">${items}</ul>
<h2>قبل أن تخرج إلى البر</h2>
<p>التوقعات أداة للتخطيط، لا بديل عن تنبيهات المركز الوطني للأرصاد. وإن كنت تخطط لرحلة مقناص فاقرأ <a href="/articles/weather-hunting-grounds/">الطقس في مواقع الصيد</a> و<a href="/articles/murabbaniyah-falconry/">المربعانية وموسم الصقارة</a>، ففيهما أرقام عن البرد والريح في مدن الشمال والوسط.</p>
<p class="attrib" data-nolink>بيانات الطقس من <a href="https://open-meteo.com/">Open-Meteo.com</a> بترخيص <a href="https://creativecommons.org/licenses/by/4.0/deed.ar">CC BY 4.0</a>. الإحداثيات من واجهة Open-Meteo للبحث الجغرافي.</p>`;

  return {
    path: '/weather/',
    html: layout({
      ...ctx.pageBase,
      path: '/weather/',
      title: 'طقس السعودية اليوم: الحالة الآن وتوقعات 7 أيام لأكبر المدن | 4saud.net',
      description: `الطقس الآن في ${cities.length} مدينة سعودية: الحرارة والرياح والحالة الجوية، مع توقعات 48 ساعة و7 أيام لكل مدينة، تتحدّث كل 3 ساعات.`,
      crumbs: [['/', 'الرئيسية'], ['/weather/', 'الطقس']],
      body,
      scripts: [`<script type="module" src="/assets/live.js?v=${ctx.pageBase.assetVersion}"></script>`],
    }),
  };
}

function climateBlurb(c, cl) {
  const m = cl.months;
  const hot = m.reduce((a, x, i) => (x.tmax > m[a].tmax ? i : a), 0);
  const cold = m.reduce((a, x, i) => (x.tmin < m[a].tmin ? i : a), 0);
  const wet = m.reduce((a, x, i) => (x.precip > m[a].precip ? i : a), 0);
  const region = REGIONS[c.admin1] || '';
  const elev = Math.round(c.elevation);
  const lines = [];
  lines.push(`تقع ${c.ar} في ${region}${COASTAL.has(c.slug) ? ' على الساحل' : ''}، على ارتفاع نحو ${elev.toLocaleString('en-US')} متر فوق سطح البحر.`);
  lines.push(`وحين حسبنا متوسطات السنوات العشر من 2016 إلى 2025، كان ${wx.MONTHS[hot]} أحرّ شهورها بمتوسط عظمى ${fmt1(m[hot].tmax)}°م، و${wx.MONTHS[cold]} أبردها بمتوسط صغرى ${fmt1(m[cold].tmin)}°م.`);
  lines.push(`ويقدَّر مجموع الهطول السنوي فيها بنحو ${cl.annualPrecip} ملم في المتوسط، وأكثر الشهور مطراً ${wx.MONTHS[wet]}. ومتوسط الرطوبة النسبية في أغسطس نحو ${Math.round(m[7].rh)}٪، وفي يناير نحو ${Math.round(m[0].rh)}٪.`);
  return lines;
}

export function weatherCity(ctx, c) {
  const { forecast, climate, cities, articles } = ctx;
  const f = forecast[c.slug];
  const cl = climate.cities[c.slug];
  const m = cl.months;
  const blurb = climateBlurb(c, cl);
  const near = (ctx.nearby[c.slug] || []).map(s => cities.find(x => x.slug === s));
  const rel = ctx.cityArticles(c.slug).map(a => `<li><a href="/articles/${a.slug}/">${esc(a.title)}</a></li>`).join('');

  const table = `<div class="climate-table prose" style="max-width:none"><table>
    <caption>متوسطات شهرية محسوبة من بيانات إعادة التحليل ERA5 للفترة 2016–2025 (تقديرات شبكية قد تختلف عن قراءات المحطات)</caption>
    <thead><tr><th scope="col">الشهر</th>${wx.MONTHS.map(n => `<th scope="col">${n}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><th scope="row">العظمى °م</th>${m.map(x => `<td>${fmt1(x.tmax)}</td>`).join('')}</tr>
      <tr><th scope="row">الصغرى °م</th>${m.map(x => `<td>${fmt1(x.tmin)}</td>`).join('')}</tr>
      <tr><th scope="row">الهطول ملم</th>${m.map(x => `<td>${Math.round(x.precip)}</td>`).join('')}</tr>
    </tbody></table></div>`;

  const body = `
<header class="article-head">
  <h1>طقس ${esc(c.ar)} اليوم وتوقعات الأيام القادمة</h1>
  <p class="lede">الحالة الجوية الآن في ${esc(c.ar)}، وتوقعات الساعات الثماني والأربعين القادمة والأيام السبعة: الحرارة، والإحساس، والرطوبة، والرياح واتجاهها، واحتمال الأمطار.</p>
</header>
<p>هذه صفحة طقس ${esc(c.ar)}، تُحدَّث تلقائياً كل ثلاث ساعات، ويحدّثها متصفحك مباشرة عند فتح الصفحة. الأوقات كلها بتوقيت الرياض. ${saudiWeatherSentence(c, ctx.saudiweather.cities[c.slug])}</p>

<h2 id="now-h">الحالة الآن في ${esc(c.ar)}</h2>
<section class="now" id="now" aria-labelledby="now-h" aria-live="polite" data-nolink>
  ${wx.renderNow(f.current)}
</section>

<h2 id="hours-h">الساعات الـ48 القادمة</h2>
<p class="muted">لكل ساعة: الحرارة، واحتمال الأمطار، وسرعة الرياح. اسحب أفقياً لرؤية بقية الساعات.</p>
<div class="hours-wrap" id="hourly" data-nolink tabindex="0" aria-label="توقعات الساعات القادمة">
  ${wx.renderHourly(f.hourly)}
</div>

<h2 id="days-h">توقعات 7 أيام</h2>
<div class="days-wrap" id="daily" data-nolink>
  ${wx.renderDaily(f.daily)}
</div>

<h2 id="climate-h">مناخ ${esc(c.ar)} باختصار</h2>
${blurb.map(p => `<p>${p}</p>`).join('\n')}
<p>هذه الأرقام تقديرات من بيانات إعادة التحليل المناخي على شبكة إحداثيات، فقد تختلف قليلاً عن قراءات محطات الرصد في المدينة نفسها، لكنها تعطي صورة صادقة لتقلّب <a href="https://www.saudiweather.net/">الطقس</a> على مدار السنة.</p>
<h3 id="climate-table-h">المتوسطات الشهرية</h3>
${table}

<h2 id="more-h">اقرأ أيضاً</h2>
<ul>${rel}</ul>
<h3 id="near-h">مدن قريبة</h3>
<ul>${near.map(n => `<li><a href="/weather/${n.slug}/">طقس ${esc(n.ar)}</a></li>`).join('')}<li><a href="/weather/">كل المدن</a></li></ul>

<p class="attrib" data-nolink>بيانات الطقس من <a href="https://open-meteo.com/">Open-Meteo.com</a> بترخيص <a href="https://creativecommons.org/licenses/by/4.0/deed.ar">CC BY 4.0</a>، والمتوسطات المناخية من <a href="https://open-meteo.com/en/docs/historical-weather-api">واجهة البيانات التاريخية</a> (ERA5). إحداثيات المدينة: ${c.lat.toFixed(3)}، ${c.lon.toFixed(3)}. آخر تحديث للنسخة الثابتة: <time datetime="${ctx.generatedAt}">${esc(wx.stampLabel(ctx.generatedAt))}</time>.</p>`;

  return {
    path: `/weather/${c.slug}/`,
    html: layout({
      ...ctx.pageBase,
      path: `/weather/${c.slug}/`,
      section: '/weather/',
      title: `طقس ${c.ar} اليوم: الحالة الآن وتوقعات 48 ساعة و7 أيام | 4saud.net`,
      description: `طقس ${c.ar} الآن: الحرارة والإحساس والرطوبة والرياح، مع توقعات ساعة بساعة لـ48 ساعة وتوقعات 7 أيام، ونبذة عن مناخ ${c.ar} على مدار السنة.`,
      crumbs: [['/', 'الرئيسية'], ['/weather/', 'الطقس'], [`/weather/${c.slug}/`, c.ar]],
      head: `<meta name="geo.position" content="${c.lat};${c.lon}"><meta name="geo.placename" content="${esc(c.ar)}">`,
      body: `<div data-lat="${c.lat}" data-lon="${c.lon}" id="wx-city" hidden></div>${body}`,
      scripts: [`<script type="module" src="/assets/live.js?v=${ctx.pageBase.assetVersion}"></script>`],
    }),
  };
}

// ===== المعرض =====
export function galleryPage(ctx) {
  const { gallery } = ctx;
  const groups = [
    ['المقناص والصقور', 'في البر مع الصقور: الوكور مغروسة في الرمل، والصقر على اليد، والطريدة بين الشجيرات.', x => !x.id.startsWith('k') && !SKY.has(x.id)],
    ['سماء البر وتقلّبها', 'غروب يشتعل، وغبار يأكل الأفق، وبرد أبيض يغطّي الوادي، وسيل يجري بلون الطين.', x => SKY.has(x.id)],
    ['في المجلس: العناية بالصقور', 'صقّارون في المجلس يفحصون صقورهم ويعالجونها بأيديهم.', x => x.id.startsWith('k')],
  ];
  const fig = x => `<figure id="p-${x.id}">${picture(x, { sizes: '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw' })}<figcaption>${esc(x.caption)}</figcaption></figure>`;
  const body = `
<header class="article-head">
  <h1>صور المقناص والبرّ من أرشيف 4saud</h1>
  <p class="lede">صور التُقطت في رحلات المقناص والمجالس، كانت في النسخة القديمة من الموقع، وجمعتها هنا في مكان واحد.</p>
</header>
${groups.map(([h, p, fn]) => `<h2>${h}</h2><p>${p}</p><div class="gallery">${gallery.filter(fn).map(fig).join('')}</div>`).join('\n')}`;
  return {
    path: '/gallery/',
    html: layout({
      ...ctx.pageBase,
      path: '/gallery/',
      title: 'صور المقناص والصقور والبرّ | 4saud.net',
      description: `${gallery.length} صورة من أرشيف 4saud.net: صقور على وكورها، ومشاهد من المقناص، وغبار وبرد وسيول في البر، وصقّارون يعالجون صقورهم في المجلس.`,
      crumbs: [['/', 'الرئيسية'], ['/gallery/', 'المعرض']],
      image: '/media/396-960.webp',
      body,
      jsonld: [{
        '@context': 'https://schema.org', '@type': 'ImageGallery', name: 'صور المقناص من أرشيف 4saud', url: abs('/gallery/'), inLanguage: 'ar',
      }],
    }),
  };
}
const SKY = new Set(['446', '447', '645', '646', '804', '805', '819', '942', '1130', 'hail', 'hail2', 'sail2']);

// ===== روابط =====
export function linksPage(ctx) {
  const L = (href, title, note) => `<li><a href="${href}" rel="noopener">${title}</a><small>${note}</small></li>`;
  const body = `
<div class="page">
<header class="article-head">
  <h1>روابط مفيدة للصقّار ومحب البر</h1>
  <p class="lede">روابط جمعتها منذ النسخة الأولى من الموقع، وراجعتها في أكتوبر 2026: حذفت ما توقف، وحدّثت ما تغيّر عنوانه.</p>
</header>
<h2>الحياة الفطرية والصيد</h2>
<ul class="linklist">
  ${L('https://www.ncw.gov.sa/', 'المركز الوطني لتنمية الحياة الفطرية', 'الجهة المسؤولة عن تنظيم الصيد وحماية الحياة الفطرية في المملكة، وحلّ محل الموقع القديم ncwcd.gov.sa.')}
  ${L('https://eservices.ncw.gov.sa/', 'منصة فطري', 'تصاريح الصيد وجواز الصقر وشهادات الملكية.')}
  ${L('https://www.arabianwildlife.com/vol1.2/houb.htm', 'مشروع الحبارى في السعودية', 'مقال قديم في موسوعة الحياة الفطرية العربية عن بدايات إكثار الحبارى.')}
  ${L('https://www.arabianwildlife.com/vol3.2/sattrk.htm', 'تتبّع الحبارى بالأقمار الصناعية', 'من الموسوعة نفسها.')}
  ${L('https://ich.unesco.org/ar/RL/01708', 'الصقارة، تراث إنساني حي', 'صفحة إدراج الصقارة في قائمة اليونسكو للتراث غير المادي.')}
</ul>
<h2>الأرصاد وأحوال الجو</h2>
<ul class="linklist">
  ${L('https://ncm.gov.sa/', 'المركز الوطني للأرصاد', 'الجهة الرسمية للتنبيهات والإنذارات الجوية، وحلّ محل الموقع القديم pme.gov.sa.')}
  ${L('https://www.saudiweather.net/', 'طقس السعودية', 'توقعات الطقس لمدن المملكة (saudiweather.net).')}
</ul>
<h2>الأخبار</h2>
<ul class="linklist">
  ${L('https://www.spa.gov.sa/', 'وكالة الأنباء السعودية', 'المصدر الرسمي لإعلانات مواسم الصيد وأخبار الجهات الحكومية.')}
  ${L('https://www.alriyadh.com/', 'جريدة الرياض', '')}
  ${L('https://www.al-jazirah.com/', 'جريدة الجزيرة', '')}
  ${L('https://aawsat.com/', 'جريدة الشرق الأوسط', '')}
</ul>
<h2>روابط إسلامية</h2>
<ul class="linklist">
  ${L('https://binbaz.org.sa/', 'موقع الشيخ عبدالعزيز بن باز', '')}
  ${L('https://muslim.lna.io/', 'صحيح مسلم', '')}
</ul>
</div>`;
  return {
    path: '/links/',
    html: layout({
      ...ctx.pageBase,
      path: '/links/',
      title: 'روابط مفيدة: الحياة الفطرية والأرصاد والصقارة | 4saud.net',
      description: 'روابط مختارة ومحدّثة: المركز الوطني لتنمية الحياة الفطرية ومنصة فطري، والمركز الوطني للأرصاد، ومصادر عن الحبارى والصقارة، وأخبار المملكة.',
      crumbs: [['/', 'الرئيسية'], ['/links/', 'روابط']],
      body,
    }),
  };
}

// ===== تواصل =====
export function contactPage(ctx) {
  const body = `
<div class="page">
<header class="article-head">
  <h1>تواصل مع 4saud.net</h1>
  <p class="lede">عندك تصحيح لمعلومة، أو صورة من المقناص، أو سؤال عن الصقارة؟ يسعدني أن أسمع منك.</p>
</header>
<p>راسلني على البريد: <a href="mailto:info@4saud.net">info@4saud.net</a></p>
<h2>تصحيح المعلومات</h2>
<p>أحرص أن تكون كل معلومة في المقالات موثّقة بمصدر. فإن وجدت خطأً، أو تغيّر نظام أو موعد، فأرسل لي الرابط الرسمي الذي يوضح ذلك، وسأراجعه وأصحّحه.</p>
<h2>الصور القديمة</h2>
<p>إن كنت تعرف أسماء الأماكن أو الطيور في صور <a href="/gallery/">المعرض</a>، فقد ضاعت بعض أوصافها مع الزمن، ويسعدني أن تساعدني في استعادتها.</p>
</div>`;
  return {
    path: '/contact/',
    html: layout({
      ...ctx.pageBase,
      path: '/contact/',
      title: 'تواصل معنا | 4saud.net',
      description: 'تواصل مع موقع 4saud.net عبر البريد الإلكتروني لتصحيح معلومة أو إرسال صورة من المقناص أو السؤال عن الصقارة والحبارى.',
      crumbs: [['/', 'الرئيسية'], ['/contact/', 'تواصل']],
      body,
    }),
  };
}

// ===== 404 =====
export function notFound(ctx) {
  const body = `
<section class="lost">
  ${ic('falcon')}
  <div>
    <h1>الصقر ما رجع من هذا الطريق</h1>
    <p>الصفحة التي تبحث عنها غير موجودة، وربما تغيّر عنوانها حين أعدنا بناء الموقع.</p>
    <ul>
      <li><a href="/">الصفحة الرئيسية</a></li>
      <li><a href="/articles/">المقالات</a></li>
      <li><a href="/weather/">أحوال الجو في المدن</a></li>
      <li><a href="/gallery/">صور المقناص</a></li>
    </ul>
  </div>
</section>`;
  return {
    path: '/404.html',
    html: layout({ ...ctx.pageBase, path: '/404.html', title: 'الصفحة غير موجودة | 4saud.net', description: 'الصفحة غير موجودة في 4saud.net.', noindex: true, body }),
  };
}

// صفحة تحويل لرابط قديم
export function redirect(from, to) {
  const url = abs(to);
  return {
    path: from,
    html: `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>انتقلت الصفحة | 4saud.net</title>
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${esc(to)}">
<script>location.replace(${JSON.stringify(to)}${to.includes('#') ? '' : ' + location.hash'});</script>
</head>
<body style="background:#f3e8d2;color:#2b1d12;font-family:Tahoma,sans-serif;padding:2rem">
<p>انتقلت هذه الصفحة إلى <a href="${esc(to)}">${esc(url)}</a>.</p>
</body>
</html>
`,
  };
}
