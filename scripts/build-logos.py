#!/usr/bin/env python3
"""Build the public brand-logo registry: assets/brand-logos/ + data/brand-logos.json.

  python3 -I scripts/build-logos.py --package <unzipped Hotel_Chain_Logos_Web folder>
                                    --tab <48_LOGO_LIBRARY.csv of the same research master export>
                                    --data data/hotels.json --out <repo root>

Inputs (internal, never committed): the research team's chain-brand logo library (manifest.json + assets/, every file
hashed) and the sheet tab 48_LOGO_LIBRARY (one row per brand identity, sha256 of the web asset). The build stops when a
file, the manifest and the tab disagree on a SHA-256, when an SVG carries script, event handlers, foreignObject or
external references, or when an artwork has no source page (an official page served over plain http is recorded but not linked).

Scope: the brands this release shows (data/hotels.json → brands[] with an `identity` of the library). A brand whose
identity has no accepted artwork (the library lists them as not found) has no logo and shows its name only.

Output, per brand (hotels.json brand id): one display file named by the brand id.
  - SVG: the original bytes (an SVG namespace is added when an inline-extracted file lacks one; drawing unchanged);
  - raster ≤ 512 px and ≤ 64 KB: the original bytes;
  - larger raster: a uniform downscale to 384 px longest side (WebP lossless with alpha, else quality 90), after an
    empty transparent margin is trimmed to the artwork + 6 % when the artwork fills under 60 % of the canvas.
Never copied: Drive links, researcher notes, the library's internal file names.
The backing is theme-invariant (the same in light and dark): the library's recommended surface.
"""
import argparse, csv, hashlib, io, json, os, re, shutil, sys

from PIL import Image

MAX_EDGE, MAX_BYTES, TARGET_EDGE = 512, 64 * 1024, 384
SURFACE = {'light': '#FFFFFF', 'dark': '#182327', 'light_or_dark': '#FFFFFF'}  # surface.raised@light · text.primary@light
SURFACE_KEY = {'light': 'light', 'dark': 'dark', 'light_or_dark': 'light'}
OPAQUE = {'opaque_white_source_canvas', 'solid original canvas', 'solid source background'}
MIME_EXT = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg'}
PRIVATE_HOST = re.compile(r'(^|\.)(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com|googleusercontent\.com|goo\.gl)$')
SVG_RISK = re.compile(rb'<script|<foreignObject|\son[a-z]+\s*=|(xlink:)?href\s*=\s*["\'](?!#|data:image/)', re.I)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def public_url(value):
    v = (value or '').split('\n')[0].strip()
    if not v.startswith('https://'):
        return ''
    host = re.sub(r'^https://([^/:?#]+).*$', r'\1', v).lower()
    return '' if PRIVATE_HOST.search(host) or '.' not in host else v


def source_tier_ok(x):
    return x.get('source_tier') == 'official'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--package', required=True)
    ap.add_argument('--tab', required=True, help='48_LOGO_LIBRARY.csv')
    ap.add_argument('--data', required=True, help='data/hotels.json (brands with identity)')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    man = json.load(open(os.path.join(a.package, 'manifest.json'), encoding='utf-8'))
    assets = {x['asset_id']: x for x in man['assets']}
    maps = {m.get('mapping_id') or m.get('scope_identity_id'): m for m in man['mappings']}
    tab = {r['logo_mapping_id'].strip(): r for r in csv.DictReader(open(a.tab, encoding='utf-8-sig')) if r.get('logo_mapping_id', '').strip()}
    data = json.load(open(a.data, encoding='utf-8'))
    out_dir = os.path.join(a.out, 'assets', 'brand-logos')
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)

    records, problems, without = [], [], []
    for b in data['brands']:
        mid = b.get('identity')
        if not mid:
            without.append([b['id'], b['name'], 'no library identity'])
            continue
        m = maps.get(mid)
        if not m:
            problems.append(f"{b['id']}: identity {mid} not in the library manifest"); continue
        if m.get('asset_status') != 'collected' or not m.get('asset_id'):
            without.append([b['id'], b['name'], m.get('asset_status') or 'not collected'])
            continue
        x = assets[m['asset_id']]
        raw = open(os.path.join(a.package, x['filename']), 'rb').read()
        h = sha(raw)
        row = tab.get(mid)
        if h != x['sha256'] or len(raw) != x['bytes']:
            problems.append(f"{b['id']}: file differs from the manifest"); continue
        if not row or row.get('sha256', '').strip().lower() != h or row.get('web_asset_path', '').strip() != x['filename']:
            problems.append(f"{b['id']}: 48_LOGO_LIBRARY row missing or sha256/path differs"); continue
        mime = x['mime_type']
        if mime not in MIME_EXT:
            problems.append(f"{b['id']}: unsupported mime {mime}"); continue
        source_page, asset_url = public_url(x.get('source_page_url')), public_url(x.get('source_asset_url'))
        source_note = ''
        if not source_page:
            if (x.get('source_page_url') or '').startswith('http://') and source_tier_ok(x):
                source_note = 'official page served over plain http — recorded in the library, not linked from the site'
            else:
                problems.append(f"{b['id']}: no public source page"); continue
        transformations = []
        data_bytes, out_mime, width, height = raw, mime, x.get('width'), x.get('height')
        if mime == 'image/svg+xml':
            if SVG_RISK.search(raw):
                problems.append(f"{b['id']}: SVG carries script, handlers, foreignObject or external references"); continue
            head = raw[:800].decode('utf-8', 'replace')
            if re.search(r'<svg\b', head) and 'xmlns="http://www.w3.org/2000/svg"' not in head:
                data_bytes = re.sub(rb'<svg\b', b'<svg xmlns="http://www.w3.org/2000/svg"', raw, count=1)
                transformations.append({'operation': 'add_svg_namespace', 'source_sha256': h,
                                        'reason': 'inline-extracted SVG lacks xmlns; added so the file renders as an image. Paths, colours and viewBox unchanged.'})
        else:
            im = Image.open(io.BytesIO(raw)); im.load()
            width, height = im.size
            alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
            trim = None
            if alpha:
                box = im.convert('RGBA').getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
                if box:
                    bw, bh = box[2] - box[0], box[3] - box[1]
                    if bw * bh < 0.6 * im.size[0] * im.size[1]:
                        pad = max(2, round(0.06 * max(bw, bh)))
                        trim = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.size[0], box[2] + pad), min(im.size[1], box[3] + pad))
            if trim or max(width, height) > MAX_EDGE or len(raw) > MAX_BYTES:
                im = im.convert('RGBA' if alpha else 'RGB')
                if trim:
                    im = im.crop(trim)
                    transformations.append({'operation': 'trim_transparent_margin', 'source_sha256': h, 'source_size': [width, height], 'kept_box': list(trim),
                                            'rule': 'alpha bounding box (alpha > 8) + 6 % of its long side; transparent pixels only, artwork unchanged'})
                scale = min(1.0, TARGET_EDGE / max(im.size))
                size = (max(1, round(im.size[0] * scale)), max(1, round(im.size[1] * scale)))
                if size != im.size:
                    im = im.resize(size, Image.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, 'WEBP', lossless=alpha, quality=100 if alpha else 90, method=6)
                data_bytes, out_mime = buf.getvalue(), 'image/webp'
                transformations.append({'operation': 'display_downscale' if size != (width, height) else 'display_encode', 'source_sha256': h, 'source_size': [width, height],
                                        'output_size': list(im.size), 'method': f'Pillow LANCZOS to at most {TARGET_EDGE} px longest side; WebP ' + ('lossless' if alpha else 'quality 90'),
                                        'colour_and_geometry': 'unchanged (uniform scale only)'})
                width, height = im.size
        name = f"{b['id'].lower()}.{MIME_EXT[out_mime]}"
        open(os.path.join(out_dir, name), 'wb').write(data_bytes)
        surface = x.get('recommended_surface', 'light')
        if surface not in SURFACE:
            problems.append(f"{b['id']}: unknown surface {surface}"); continue
        records.append({
            'brand': b['id'], 'name': b['name'], 'file': f'assets/brand-logos/{name}', 'mime': out_mime, 'bytes': len(data_bytes), 'sha256': sha(data_bytes),
            'width': round(width) if width else None, 'height': round(height) if height else None,
            'original': {'sha256': h, 'mime': mime, 'bytes': len(raw), 'width': x.get('width'), 'height': x.get('height')},
            'surface': SURFACE_KEY[surface], 'backing': SURFACE[surface], 'opaque': x.get('background') in OPAQUE,
            'role': m.get('logo_role') or 'brand_primary', 'tier': x.get('source_tier', ''), 'sourcePage': source_page, 'assetURL': asset_url,
            **({'sourceNote': source_note} if source_note else {}),
            'checkedOn': man.get('checked_on', ''), 'rights': (x.get('rights') or {}).get('notice', '') if isinstance(x.get('rights'), dict) else str(x.get('rights') or ''),
            'transformations': transformations,
        })
    if problems:
        sys.exit('logo registry not built:\n  ' + '\n  '.join(problems))
    records.sort(key=lambda r: r['brand'])
    meta = {
        'asOf': man.get('checked_on', ''), 'count': len(records), 'brands': len(data['brands']), 'withoutLogo': without,
        'source': 'Research master tab 48_LOGO_LIBRARY and the research team chain-brand logo library Hotel_Chain_Logos_Web (every file SHA-256 checked against the manifest and the tab)',
        'publicationBasis': 'owner_requested_brand_identity_display',
        'identityRole': 'Identify the brand next to its name in labels, cards, lists and panels; the brand and hotel names stay the record of identity',
        'display': f'SVG and display-sized rasters (≤ {MAX_EDGE} px, ≤ {MAX_BYTES // 1024} KB) keep their bytes; larger rasters are scaled uniformly to {TARGET_EDGE} px (WebP) — no recolouring, ink cropping, tracing or upscaling',
        'backing': 'theme-invariant backing from the library recommended surface: light #FFFFFF, dark #182327; opaque files cover their own backing',
        'roles': {'brand_primary': 'โลโก้ของแบรนด์', 'shared_chain_banner': 'โลโก้ร่วมของเครือ (ไม่ใช่โลโก้เฉพาะแบรนด์ย่อย)'},
        'rights': 'เครื่องหมายเป็นของเจ้าของแต่ละราย การแสดงเพื่อระบุแบรนด์ในเดโมนี้ไม่ใช่การรับรองหรือใบอนุญาตเครื่องหมายการค้า',
        'sha256': '',
    }
    meta['sha256'] = sha(json.dumps(records, ensure_ascii=False, sort_keys=True).encode())
    os.makedirs(os.path.join(a.out, 'data'), exist_ok=True)
    with open(os.path.join(a.out, 'data', 'brand-logos.json'), 'w', encoding='utf-8') as fh:
        json.dump({'meta': meta, 'logos': records}, fh, ensure_ascii=False, separators=(',', ':'))
    total = sum(r['bytes'] for r in records)
    print(f'brand logos: {len(records)} of {len(data["brands"])} brands, {total / 1024:.0f} KB; without {len(without)}: {without}')


if __name__ == '__main__':
    main()
