// يحسب متوسطات مناخية شهرية لكل مدينة من أرشيف Open-Meteo (ERA5) للسنوات 2016–2025
// ويحفظها في data/climate.json. يُشغَّل يدوياً: node scripts/climate.mjs
import { readFile, writeFile } from 'node:fs/promises';

const cities = JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url)));
const START = '2016-01-01', END = '2025-12-31';
let out = { period: `${START}..${END}`, source: 'Open-Meteo Historical Weather API (ERA5)', cities: {} };

try { const prev = JSON.parse(await readFile(new URL('../data/climate.json', import.meta.url))); if (prev.period === out.period) out = prev; } catch {}

for (const c of cities) {
  if (out.cities[c.slug]) continue;
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${c.lat}&longitude=${c.lon}&start_date=${START}&end_date=${END}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=Asia%2FRiyadh`;
  let json;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url);
    if (res.ok) { json = await res.json(); break; }
    await new Promise(r => setTimeout(r, 20000 * (i + 1)));
  }
  if (!json) throw new Error('فشل جلب ' + c.slug);
  const d = json.daily;
  const m = Array.from({ length: 12 }, () => ({ tmax: [], tmin: [], rh: [], wind: [], precip: {} }));
  // فترة المربعانية التقليدية تقريباً: 7 ديسمبر إلى 15 يناير
  const mur = { tmin: [], tmax: [] }, rest = { tmin: [] };
  d.time.forEach((t, i) => {
    const [y, mo, day] = t.split('-').map(Number);
    const b = m[mo - 1];
    b.tmax.push(d.temperature_2m_max[i]); b.tmin.push(d.temperature_2m_min[i]);
    b.rh.push(d.relative_humidity_2m_mean[i]); b.wind.push(d.wind_speed_10m_max[i]);
    b.precip[y] = (b.precip[y] || 0) + (d.precipitation_sum[i] || 0);
    const inMur = (mo === 12 && day >= 7) || (mo === 1 && day <= 15);
    if (inMur) { mur.tmin.push(d.temperature_2m_min[i]); mur.tmax.push(d.temperature_2m_max[i]); }
  });
  const avg = a => { const v = a.filter(x => x != null); return +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(1); };
  const months = m.map(b => ({ tmax: avg(b.tmax), tmin: avg(b.tmin), rh: avg(b.rh), windMax: avg(b.wind), precip: avg(Object.values(b.precip)), absMax: Math.max(...b.tmax.filter(x => x != null)), absMin: Math.min(...b.tmin.filter(x => x != null)) }));
  const annualPrecip = +months.reduce((s, x) => s + x.precip, 0).toFixed(0);
  out.cities[c.slug] = { months, annualPrecip, murabbaniyah: { tmin: avg(mur.tmin), tmax: avg(mur.tmax) } };
  const hot = months.reduce((a, x, i) => x.tmax > months[a].tmax ? i : a, 0);
  const cold = months.reduce((a, x, i) => x.tmin < months[a].tmin ? i : a, 0);
  console.log(c.slug.padEnd(9), 'hot', hot + 1, months[hot].tmax, 'cold', cold + 1, months[cold].tmin, 'rain', annualPrecip, 'mur', out.cities[c.slug].murabbaniyah);
  await writeFile(new URL('../data/climate.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
  await new Promise(r => setTimeout(r, 3000));
}
