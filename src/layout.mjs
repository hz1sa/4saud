// قوالب الصفحة المشتركة: الرأس والترويسة والتذييل ومسار التنقل والبيانات المنظمة

export const SITE = 'https://www.4saud.net';
export const SITE_NAME = '4saud.net';
export const SITE_TAG = 'دفتر صقّار من البرّ';
export const DEFAULT_IMAGE = '/assets/og.jpg';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const abs = path => (/^https?:/.test(path) ? path : SITE + path);
export const ic = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#${id}"></use></svg>`;

const NAV = [
  ['/', 'الرئيسية'],
  ['/articles/', 'المقالات'],
  ['/weather/', 'الطقس'],
  ['/gallery/', 'المعرض'],
  ['/links/', 'روابط'],
  ['/contact/', 'تواصل'],
];

const DUNES = `<svg class="dunes" viewBox="0 0 1200 34" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 34V18c90-14 170-15 260-4s160 12 250-2 190-15 290 0 170 13 250 1 100-8 150-3v24z"/><path d="M0 34V26c120-9 210-8 320 0s200 7 300-3 210-9 320 1 170 8 260 2v8z"/></svg>`;

function crumbsJsonLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([path, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
  };
}

function crumbsHtml(crumbs) {
  if (crumbs.length < 2) return '';
  const items = crumbs.map(([path, name], i) =>
    i === crumbs.length - 1 ? `<li><span aria-current="page">${esc(name)}</span></li>` : `<li><a href="${path}">${esc(name)}</a></li>`).join('');
  return `<nav class="crumbs" aria-label="مسار التنقل"><ol>${items}</ol></nav>`;
}

/**
 * page: { path, title, description, crumbs:[[path,name]...], body, jsonld:[], ogType, image, imageAlt, head, scripts, noindex, section }
 */
export function layout(page) {
  const url = abs(page.path);
  const image = abs(page.image || DEFAULT_IMAGE);
  const jsonld = [...(page.jsonld || [])];
  if (page.crumbs) jsonld.push(crumbsJsonLd(page.crumbs));
  const current = page.section || page.path;
  const nav = NAV.map(([href, label]) => {
    const on = href === '/' ? current === '/' : current.startsWith(href);
    return `<li><a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(url)}">`}
<meta name="theme-color" content="#18202f">
<meta property="og:locale" content="ar_SA">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(page.imageAlt || 'صقر على يد صقّار في البر')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Reem+Kufi:wght@500&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${page.assetVersion || ''}">
${page.head || ''}
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header class="site-head">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${SITE_NAME}: الصفحة الرئيسية"><span class="brand-mark"><img src="/assets/falcon_color.svg" alt="شعار 4saud" width="40" height="41"></span><span><span class="brand-name">4saud</span><span class="brand-tag">${SITE_TAG}</span></span></a>
    <nav class="nav" aria-label="القائمة الرئيسية"><ul>${nav}</ul></nav>
  </div>
  ${DUNES}
</header>
<div class="wrap">
${page.crumbs ? crumbsHtml(page.crumbs) : ''}
<main id="main">
${page.body}
</main>
</div>
<footer class="site-foot">
  ${DUNES}
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h2>عن الموقع</h2>
        <p>4saud.net دفتر قديم لصقّار سعودي، بدأ صوراً من رحلات المقناص، واليوم يجمع مقالات عن الصقارة والحبارى، وصفحات لأحوال الجو في مدن المملكة.</p>
      </div>
      <div>
        <h2>اقرأ</h2>
        <ul>
          <li><a href="/articles/">كل المقالات</a></li>
          <li><a href="/gallery/">صور المقناص</a></li>
          <li><a href="/links/">روابط مفيدة</a></li>
        </ul>
      </div>
      <div>
        <h2>المدن</h2>
        <ul>
          <li><a href="/weather/riyadh/">الرياض</a></li>
          <li><a href="/weather/hail/">حائل</a></li>
          <li><a href="/weather/tabuk/">تبوك</a></li>
          <li><a href="/weather/">كل المدن</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-base">
      <span>${ic('star')} 4saud.net منذ 2005</span>
      <span><a href="/contact/">تواصل</a> · <a href="/sitemap.xml">خريطة الموقع</a></span>
    </div>
  </div>
</footer>
${(page.scripts || []).join('\n')}
</body>
</html>
`;
}

export function divider(icon = 'star') {
  return `<div class="divider" aria-hidden="true">${ic(icon)}</div>`;
}
