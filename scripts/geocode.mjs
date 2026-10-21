// يجلب إحداثيات المدن من Open-Meteo Geocoding API ويحفظها في data/cities.json
// يُشغَّل يدوياً عند إضافة مدينة: node scripts/geocode.mjs
import { writeFile } from 'node:fs/promises';

const CITIES = [
  ['riyadh', 'الرياض', 'Riyadh'],
  ['jeddah', 'جدة', 'Jeddah'],
  ['makkah', 'مكة المكرمة', 'Mecca'],
  ['madinah', 'المدينة المنورة', 'Medina'],
  ['dammam', 'الدمام', 'Dammam'],
  ['khobar', 'الخبر', 'Al Khobar'],
  ['taif', 'الطائف', 'Taif'],
  ['abha', 'أبها', 'Abha'],
  ['tabuk', 'تبوك', 'Tabuk'],
  ['buraydah', 'بريدة', 'Buraydah'],
  ['hail', 'حائل', "Ha'il"],
  ['jazan', 'جازان', 'Jizan'],
  ['najran', 'نجران', 'Najran'],
  ['alahsa', 'الأحساء', 'Hofuf'],
  ['jubail', 'الجبيل', 'Jubail'],
  ['yanbu', 'ينبع', 'Yanbu'],
  ['sakaka', 'سكاكا', 'Sakakah'],
  ['arar', 'عرعر', 'Arar'],
  ['albaha', 'الباحة', 'Al Bahah'],
];

const out = [];
for (const [slug, ar, query] of CITIES) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json&countryCode=SA`;
  const res = await fetch(url);
  const json = await res.json();
  const hit = (json.results || []).sort((a, b) => (b.population || 0) - (a.population || 0))[0];
  if (!hit) { console.error('لا نتيجة:', slug, query); process.exitCode = 1; continue; }
  out.push({ slug, ar, en: hit.name, lat: hit.latitude, lon: hit.longitude, elevation: hit.elevation, admin1: hit.admin1, population: hit.population, geonameId: hit.id });
  console.log(slug.padEnd(10), hit.name.padEnd(20), hit.latitude, hit.longitude, hit.elevation, hit.admin1, hit.population);
}
await writeFile(new URL('../data/cities.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
