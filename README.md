# 4saud.net

موقع ثابت (HTML وCSS وJavaScript) يُبنى بسكربت Node.js بسيط، ويُنشر على GitHub Pages.

## الأوامر

```bash
npm ci                 # تثبيت (sharp لتحويل الصور إلى WebP وقت البناء فقط)
npm run build          # يجلب الطقس من Open-Meteo ويولّد الموقع في dist/
npm run build:offline  # يبني ببيانات الطقس المحفوظة في .cache/
npm run check          # h1 واحد، الروابط الداخلية، العناوين والأوصاف، JSON-LD، قواعد الروابط
npm run check:external # نفسه مع فحص الروابط الخارجية
npm run serve          # http://localhost:8080 يحاكي GitHub Pages
```

## البنية

| المسار | المحتوى |
|---|---|
| `src/content/articles/*.html` | المقالات: بيانات JSON في تعليق أعلى الملف، ثم النص |
| `src/pages.mjs` و`src/layout.mjs` | قوالب الصفحات |
| `src/assets/` | CSS، والأيقونات، و`wx.js` (عرض الطقس، مشترك بين البناء والمتصفح)، و`live.js` (التحديث المباشر) |
| `scripts/link-audit.mjs` | مدقّق روابط saudiweather.net (لا يضيف روابط؛ يتحقق ويطبع التوزيع) |
| `data/saudiweather.json` | روابط المدن المتحقق منها على saudiweather.net ونوع نص الرابط لكل مدينة |
| `data/cities.json` | إحداثيات المدن من Open-Meteo Geocoding (`npm run geocode`) |
| `data/climate.json` | متوسطات 2016–2025 من أرشيف ERA5 (`npm run climate`) |
| `data/gallery.json` | صور المعرض وأوصافها |
| `src/assets/fonts/` | خطوط woff2 مستضافة ذاتياً ومقصوصة على العربية القياسية. تُعاد بـ `scripts/fonts.py` بعد `npm run build` (يحتاج fonttools 4.38 وbrotli، والأوامر في رأس الملف). أعِد تشغيله إذا أضفت نصاً جديداً بخط Reem Kufi |
| `src/assets/brand/` | الشعار الأصلي (VTracer)، ونسخه المحسّنة في `brand-opt/` عبر `npx svgo --config svgo.config.cjs`. البناء يولّد منها favicon وأيقونات التطبيق |
| `legacy/` | الموقع القديم كما هو. صوره تُنسخ إلى `/images/`، وصفحاته تُحوَّل إلى الروابط الجديدة |
| `VERIFY.md` | معلومات تحتاج مراجعة |

## النشر

يعمل `.github/workflows/deploy.yml` في ثلاث حالات: عند الدفع إلى `main`، وكل 3 ساعات، ويدوياً.

قبل أول نشر:

1. في إعدادات المستودع: **Settings ← Pages ← Source** اختر **GitHub Actions**.
2. تأكد أن النطاق المخصّص `www.4saud.net` مضبوط في الصفحة نفسها.

ملاحظة: GitHub يوقف الجداول الزمنية في المستودعات العامة بعد 60 يوماً بلا نشاط في المستودع. إن توقّف تحديث الطقس، شغّل الـ workflow يدوياً أو ادفع أي تعديل.
