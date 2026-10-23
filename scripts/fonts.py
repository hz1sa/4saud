"""قصّ الخطوط وتحويلها إلى woff2 في src/assets/fonts/.

يُشغَّل يدوياً عند تغيير الخطوط أو نصوص Reem Kufi (بعد npm run build، لأنه يقرأ dist/):
    python3 -m venv .venv && .venv/bin/pip install fonttools==4.38.0 brotli==1.0.9
    .venv/bin/python scripts/fonts.py

المصادر: ملفات TTF من مستودع Google Fonts (ترخيص OFL)، تُنزَّل إلى .cache/fonts/.
"""
import glob
import html
import os
import re
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, '.cache', 'fonts')
OUT = os.path.join(ROOT, 'src', 'assets', 'fonts')
GF = 'https://github.com/google/fonts/raw/main/ofl/'

SOURCES = {
    'Amiri-Bold.ttf': 'amiri/Amiri-Bold.ttf',
    'IBMPlexSansArabic-Regular.ttf': 'ibmplexsansarabic/IBMPlexSansArabic-Regular.ttf',
    'IBMPlexSansArabic-Medium.ttf': 'ibmplexsansarabic/IBMPlexSansArabic-Medium.ttf',
    'IBMPlexSansArabic-Bold.ttf': 'ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf',
    'ReemKufi[wght].ttf': 'reemkufi/ReemKufi%5Bwght%5D.ttf',
}

# العربية والأرقام واللاتينية الأساسية وعلامات الترقيم المستعملة في الموقع.
# يجب أن تطابق unicode-range في style.css
# العربية القياسية فقط: الحروف والحركات والأرقام وعلامات الترقيم العربية (بلا حروف الأردية والفارسية التي تضخّم Amiri)
TEXT_RANGES = ('U+0020-007E,U+00A0,U+00AB,U+00B0,U+00B7,U+00BB,U+060C,U+061B,U+061F,U+0621-063A,U+0640-0655,'
               'U+0660-066C,U+0670,U+200C-200F,U+2013-2014,U+2018-201D,U+2026,U+2039-203A')

# العناصر التي تستعمل Reem Kufi في style.css: نقصّه على حروف نصوصها فقط
MARK_SELECTORS = [
    r'<span class="brand-name">(.*?)</span>',
    r'<p class="kicker">(.*?)</p>',
    r'<aside class="side"[\s\S]*?</aside>',
    r'<footer class="site-foot">[\s\S]*?</footer>',
]


def fetch_sources():
    os.makedirs(CACHE, exist_ok=True)
    for name, path in SOURCES.items():
        dest = os.path.join(CACHE, name)
        if not os.path.exists(dest):
            urllib.request.urlretrieve(GF + path, dest)


def mark_text():
    chars = set(' ')
    for f in glob.glob(os.path.join(ROOT, 'dist', '**', '*.html'), recursive=True):
        page = open(f, encoding='utf-8').read()
        for sel in MARK_SELECTORS:
            for m in re.finditer(sel, page):
                block = m.group(0)
                if 'aside' in sel or 'footer' in sel:
                    block = ' '.join(re.findall(r'<h2[^>]*>(.*?)</h2>', block))
                chars |= set(html.unescape(re.sub(r'<[^>]+>', '', block)))
    if len(chars) < 5:
        raise SystemExit('لم أجد نصوص Reem Kufi في dist/. شغّل npm run build أولاً.')
    return ''.join(sorted(chars))


def make(src, out, unicodes=None, text=None, wght=None):
    font = TTFont(os.path.join(CACHE, src))
    if wght is not None:
        font = instancer.instantiateVariableFont(font, {'wght': wght})
    opts = subset.Options()
    opts.flavor = 'woff2'
    # الخصائص الافتراضية في fontTools تشمل كل ما يفعّله المتصفح تلقائياً (التشكيل العربي init/medi/fina/isol/rlig،
    # والربط liga/calt، والتشكيل mark/mkmk، والتقنين kern)، فلا يتغيّر شكل النص. نحذف فقط الخصائص الاختيارية مثل dlig وss01.
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    s = subset.Subsetter(opts)
    s.populate(unicodes=subset.parse_unicodes(unicodes) if unicodes else [], text=text or '')
    s.subset(font)
    path = os.path.join(OUT, out)
    font.flavor = 'woff2'
    font.save(path)
    return os.path.getsize(path)


def main():
    fetch_sources()
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ('IBMPlexSansArabic-Regular.ttf', 'plex-arabic-400.woff2', TEXT_RANGES, None, None),
        ('IBMPlexSansArabic-Medium.ttf', 'plex-arabic-500.woff2', TEXT_RANGES, None, None),
        ('IBMPlexSansArabic-Bold.ttf', 'plex-arabic-700.woff2', TEXT_RANGES, None, None),
        ('Amiri-Bold.ttf', 'amiri-700.woff2', TEXT_RANGES, None, None),
        ('ReemKufi[wght].ttf', 'reemkufi-500.woff2', None, mark_text(), 500),
    ]
    total = 0
    for src, out, uni, text, wght in jobs:
        size = make(src, out, uni, text, wght)
        total += size
        print(f'{out:28} {size / 1024:7.1f} KiB')
    print(f'{"المجموع":28} {total / 1024:7.1f} KiB')


if __name__ == '__main__':
    main()
