#!/usr/bin/env python3
"""Build the metric-tile pictogram subset of Material Symbols Rounded (Apache 2.0).

Static instance at the LDS axes for this family (FILL 0, wght 300, GRAD 0, opsz 24),
subset to the pictogram glyphs below, written as WOFF2 next to the approved nav-7
subset (which stays byte-identical). The source variable font is not committed;
pass its path. Requires fonttools + brotli.

  python3 scripts/build-pictogram-font.py "MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf"

Pictogram roles (test exception approved by the owner 2026-10-22 for the CityMETER
demos, to be folded into LDS if it proves itself): area = map, province =
location_city, segment = category, venue = local_mall; Fitness 0.3.0 added ai =
auto_awesome, streetview, maps = location_on, building = apartment (owner
2026-10-29: show icons and symbols to keep the panel text short). Hotel 0.1.0
adds hotel (records), rooms = bed, rail = train, meeting = groups, price =
payments, chain = account_tree and compare = compare_arrows. No star glyph: a
star would read as a hotel rating. Outbound links keep the nav-7 open_in_new mark.
"""
import hashlib, json, sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

GLYPHS = {
    'area': ('map', 0xE55B),
    'province': ('location_city', 0xE7F1),
    'segment': ('category', 0xE72C),
    'venue': ('local_mall', 0xE54C),
    # Fitness 0.3.0 (owner 2026-10-29: icons and symbols instead of long text): contextual actions and the building view.
    'ai': ('auto_awesome', 0xE65F),
    'streetview': ('streetview', 0xE56E),
    'maps': ('location_on', 0xE0C8),
    'building': ('apartment', 0xEA40),
    # Hotel 0.1.0: the two measures and the context of a stay.
    'hotel': ('hotel', 0xE53A),
    'rooms': ('bed', 0xEFDF),
    'rail': ('train', 0xE570),
    'meeting': ('groups', 0xF233),
    'price': ('payments', 0xEF63),
    'chain': ('account_tree', 0xE97A),
    'compare': ('compare_arrows', 0xE915),
}
AXES = {'FILL': 0, 'wght': 300, 'GRAD': 0, 'opsz': 24}
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons' / 'material-pictogram-300.woff2'
MANIFEST = ROOT / 'assets' / 'icons' / 'material-pictogram-300.json'

def main(src):
    font = TTFont(src)
    static = instancer.instantiateVariableFont(font, AXES, inplace=False, updateFontNames=False)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = []  # codepoint access only (CSS content), no ligatures needed
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.drop_tables += ['GSUB', 'GPOS']
    sub = subset.Subsetter(options)
    sub.populate(unicodes=[cp for _, cp in GLYPHS.values()])
    sub.subset(static)
    static.flavor = 'woff2'
    OUT.parent.mkdir(parents=True, exist_ok=True)
    static.save(OUT)
    data = OUT.read_bytes()
    check = TTFont(OUT)
    cmap = check.getBestCmap()
    missing = [n for n, (_, cp) in GLYPHS.items() if cp not in cmap]
    if missing:
        raise SystemExit(f'missing glyphs: {missing}')
    manifest = {
        'family': 'LDS Material Symbols Rounded Pictogram',
        'file': OUT.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'source': 'google/material-design-icons variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf',
        'sourceSha256': hashlib.sha256(Path(src).read_bytes()).hexdigest(),
        'license': 'Apache-2.0 (assets/icons/material-symbols-Apache-2.0.txt)',
        'axes': AXES,
        'glyphs': {role: {'name': name, 'codepoint': f'U+{cp:04X}'} for role, (name, cp) in GLYPHS.items()},
        'status': 'test exception to LDS nav-7 (owner 2026-10-22; actions and building added 2026-10-29; hotel glyphs 2026-11-01); nav-7 subset unchanged',
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'wrote {OUT} ({len(data)} bytes, sha256 {manifest["sha256"]}) and {MANIFEST.name}')
    print('unicode-range:', ', '.join(f'U+{cp:04X}' for _, cp in GLYPHS.values()))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
