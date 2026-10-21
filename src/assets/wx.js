// وحدة الطقس المشتركة: تُستعمل في سكربت البناء (Node) وفي المتصفح للتحديث المباشر.
// كل الأوقات القادمة من Open-Meteo بتوقيت Asia/Riyadh كنصوص محلية، فلا نحوّل مناطق زمنية هنا.

export const API = 'https://api.open-meteo.com/v1/forecast';

export const CURRENT_VARS = 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day';
export const HOURLY_VARS = 'temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_direction_10m,is_day';
export const DAILY_VARS = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset';

// رابط طلب واحد لمدينة أو أكثر (Open-Meteo يقبل قوائم إحداثيات مفصولة بفواصل)
export function forecastUrl(points, { full = true } = {}) {
  const q = new URLSearchParams({
    latitude: points.map(p => p.lat).join(','),
    longitude: points.map(p => p.lon).join(','),
    current: CURRENT_VARS,
    timezone: 'Asia/Riyadh',
  });
  if (full) {
    q.set('hourly', HOURLY_VARS);
    q.set('forecast_hours', '48');
    q.set('daily', DAILY_VARS);
    q.set('forecast_days', '7');
  }
  return `${API}?${q}`;
}

// رموز WMO كما يوثّقها Open-Meteo، بأوصاف عربية
const WMO = {
  0: ['سماء صافية', 'clear'],
  1: ['صحو غالباً', 'clear'],
  2: ['غائم جزئياً', 'partly'],
  3: ['غائم', 'cloud'],
  45: ['ضباب', 'fog'],
  48: ['ضباب مع صقيع', 'fog'],
  51: ['رذاذ خفيف', 'drizzle'],
  53: ['رذاذ معتدل', 'drizzle'],
  55: ['رذاذ كثيف', 'drizzle'],
  56: ['رذاذ متجمّد خفيف', 'drizzle'],
  57: ['رذاذ متجمّد كثيف', 'drizzle'],
  61: ['مطر خفيف', 'rain'],
  63: ['مطر معتدل', 'rain'],
  65: ['مطر غزير', 'rain'],
  66: ['مطر متجمّد خفيف', 'rain'],
  67: ['مطر متجمّد غزير', 'rain'],
  71: ['ثلج خفيف', 'snow'],
  73: ['ثلج معتدل', 'snow'],
  75: ['ثلج كثيف', 'snow'],
  77: ['حبيبات ثلجية', 'snow'],
  80: ['زخات مطر خفيفة', 'rain'],
  81: ['زخات مطر معتدلة', 'rain'],
  82: ['زخات مطر عنيفة', 'rain'],
  85: ['زخات ثلج خفيفة', 'snow'],
  86: ['زخات ثلج كثيفة', 'snow'],
  95: ['عاصفة رعدية', 'storm'],
  96: ['عاصفة رعدية مع بَرَد خفيف', 'storm'],
  99: ['عاصفة رعدية مع بَرَد كثيف', 'storm'],
};

export function describe(code, isDay = 1) {
  const [text, icon] = WMO[code] || ['حالة غير معروفة', 'cloud'];
  if (!isDay && (code === 0 || code === 1)) return { text: code === 0 ? 'سماء صافية ليلاً' : 'صحو غالباً ليلاً', icon: 'night' };
  return { text, icon };
}

// اتجاه الرياح: الاتجاه الذي تهبّ منه الرياح
const DIRS = ['شمالية', 'شمالية شرقية', 'شرقية', 'جنوبية شرقية', 'جنوبية', 'جنوبية غربية', 'غربية', 'شمالية غربية'];
export function windDir(deg) {
  if (deg == null) return '';
  return DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export { MONTHS };

function parts(local) {
  const [d, t = '00:00'] = local.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  return { y, m, day, h, min, dow: new Date(Date.UTC(y, m - 1, day)).getUTCDay() };
}
export function hourLabel(local) {
  const { h } = parts(local);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? 'ص' : 'م'}`;
}
export function timeLabel(local) {
  const { h, min } = parts(local);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
}
export function dayLabel(local) { return DAYS[parts(local).dow]; }
export function dateLabel(local) { const p = parts(local); return `${p.day} ${MONTHS[p.m - 1]}`; }
export function stampLabel(local) { const p = parts(local); return `${DAYS[p.dow]} ${p.day} ${MONTHS[p.m - 1]} ${p.y}، ${timeLabel(local)}`; }

const r = n => (n == null ? '–' : Math.round(n));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function icon(name, cls = 'wx-ic') {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#wx-${name}"></use></svg>`;
}

// ===== قوالب HTML (نفسها في البناء وفي المتصفح) =====

export function renderNow(cur) {
  const d = describe(cur.weather_code, cur.is_day);
  return `
    <div class="now-main">
      ${icon(d.icon, 'wx-ic wx-ic--big')}
      <p class="now-temp"><span data-v="t">${r(cur.temperature_2m)}</span><span class="unit">°م</span></p>
      <p class="now-state">${esc(d.text)}</p>
    </div>
    <dl class="now-facts">
      <div><dt>الإحساس</dt><dd>${r(cur.apparent_temperature)}°</dd></div>
      <div><dt>الرطوبة</dt><dd>${r(cur.relative_humidity_2m)}٪</dd></div>
      <div><dt>الرياح</dt><dd>${r(cur.wind_speed_10m)} كم/س <small>${esc(windDir(cur.wind_direction_10m))}</small></dd></div>
    </dl>
    <p class="now-stamp">آخر قراءة: <time datetime="${esc(cur.time)}">${esc(stampLabel(cur.time))}</time></p>`;
}

export function renderHourly(h) {
  const cells = h.time.map((t, i) => {
    const d = describe(h.weather_code[i], h.is_day[i]);
    const newDay = i > 0 && t.slice(0, 10) !== h.time[i - 1].slice(0, 10);
    return `<li class="hour${newDay ? ' hour--newday' : ''}">
      ${newDay ? `<span class="hour-day">${esc(dayLabel(t))}</span>` : ''}
      <span class="hour-time">${esc(hourLabel(t))}</span>
      ${icon(d.icon)}
      <span class="hour-temp">${r(h.temperature_2m[i])}°</span>
      <span class="hour-pop" title="احتمال الأمطار">${r(h.precipitation_probability[i])}٪</span>
      <span class="hour-wind">${r(h.wind_speed_10m[i])} <small>كم/س</small></span>
      <span class="sr">${esc(d.text)}</span>
    </li>`;
  }).join('');
  return `<ol class="hours">${cells}</ol>`;
}

export function renderDaily(dl) {
  const rows = dl.time.map((t, i) => {
    const d = describe(dl.weather_code[i], 1);
    return `<tr>
      <th scope="row"><span class="day-name">${i === 0 ? 'اليوم' : esc(dayLabel(t))}</span> <span class="day-date">${esc(dateLabel(t))}</span></th>
      <td class="day-state">${icon(d.icon)} <span>${esc(d.text)}</span></td>
      <td class="num">${r(dl.temperature_2m_max[i])}°</td>
      <td class="num muted">${r(dl.temperature_2m_min[i])}°</td>
      <td class="num">${r(dl.precipitation_probability_max[i])}٪</td>
      <td>${r(dl.wind_speed_10m_max[i])} كم/س <small>${esc(windDir(dl.wind_direction_10m_dominant[i]))}</small></td>
    </tr>`;
  }).join('');
  return `<table class="days">
    <thead><tr><th scope="col">اليوم</th><th scope="col">الحالة</th><th scope="col">العظمى</th><th scope="col">الصغرى</th><th scope="col">احتمال الأمطار</th><th scope="col">أقصى رياح</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function renderCityChip(cur) {
  const d = describe(cur.weather_code, cur.is_day);
  return `${icon(d.icon)}<span class="chip-temp">${r(cur.temperature_2m)}°</span><span class="chip-state">${esc(d.text)}</span>`;
}
