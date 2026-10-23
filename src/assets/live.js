// تحديث مباشر فوق المحتوى الثابت: يجلب أحدث بيانات Open-Meteo ويعيد رسم أجزاء الطقس فقط.
// سكربت البناء يدمج wx.js في هذا الملف (سطر import أدناه يُحذف عند الدمج) حتى لا تتسلسل الطلبات.
import { forecastUrl, renderNow, renderHourly, renderDaily, renderCityChip } from './wx.js';

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

// يبدأ التوقع الساعي من الساعة الحالية بتوقيت الرياض
function riyadhHourISO() {
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return now.toISOString().slice(0, 13) + ':00';
}

async function cityPage(el) {
  const lat = +el.dataset.lat, lon = +el.dataset.lon;
  const data = await getJSON(forecastUrl([{ lat, lon }]));
  // النسخة الثابتة من البناء ما زالت حديثة: لا داعي لإعادة رسم الجداول
  const shown = document.querySelector('#now time')?.getAttribute('datetime');
  if (shown && shown === data.current.time) return;
  const h = data.hourly;
  const from = Math.max(0, h.time.indexOf(riyadhHourISO()));
  const slice = {};
  for (const k of Object.keys(h)) slice[k] = h[k].slice(from, from + 48);
  document.getElementById('now').innerHTML = renderNow(data.current);
  document.querySelector('#hourly').innerHTML = renderHourly(slice);
  document.querySelector('#daily').innerHTML = renderDaily(data.daily);
}

async function chips() {
  const links = [...document.querySelectorAll('a[data-city]')];
  if (!links.length) return;
  const coords = JSON.parse(document.getElementById('wx-points')?.textContent || '{}');
  const pts = links.map(a => coords[a.dataset.city]).filter(Boolean);
  if (pts.length !== links.length) return;
  let data = await getJSON(forecastUrl(pts, { full: false }));
  if (!Array.isArray(data)) data = [data];
  links.forEach((a, i) => {
    const chip = a.querySelector('.chip');
    if (chip && data[i]?.current) chip.innerHTML = renderCityChip(data[i].current);
  });
}

function start() {
  const city = document.getElementById('wx-city');
  (city ? cityPage(city) : chips()).catch(() => { /* نبقي المحتوى الثابت كما هو */ });
}

// الصفحة فيها نسخة ثابتة من البيانات، فنؤجّل الجلب إلى ما بعد التحميل وفراغ المتصفح
const idle = window.requestIdleCallback || (fn => setTimeout(fn, 200));
if (document.readyState === 'complete') idle(start);
else addEventListener('load', () => idle(start), { once: true });
