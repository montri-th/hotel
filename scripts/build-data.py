#!/usr/bin/env python3
"""Build data/hotels.json from the hotel research master, CityMETER production base info and the CityMETER
datasets this product reads beside it (Transit, Shopping centers).

Inputs (internal, never committed):
  --sheet    .xlsx export of “CityMETER Hotel — Venue, Branch & Building Research Master 2026-10-24”
             (the internal Google Sheets research master, registry id research.TH.hotel); tabs read: 01_VENUES,
             13_BUILDING_LINKS, 16_BRANCH_SPATIAL_CANDIDATES, 17_BRANDS, 19_AFFILIATIONS, 23_TYPE_ASSIGNMENTS,
             37_IDENTITY_ALIASES. --csv DIR reads the same tabs from <tab>.csv files instead (a faster rebuild of the
             same export; the export SHA-256 is still required).
  --api      production base info responses with receipts (scripts/fetch-base.py: base-lv0.json, base-{uuid}.json)
Public inputs:
  --index    data/area-index.json, --frames data/frames/ (district outlines, display geometry)
  --transit  a checkout of montri-th/transit (data/transit.json: rail stations of CityMETER · Transit)
  --shopping a checkout of montri-th/shoppingcenter (data/venues.json: CityMETER Shopping centers & retail venues)

Output: data/hotels.json — columnar rows + dictionaries + provenance; data/build-report.json — counts and checks.

ONE ROW = one row of 01_VENUES (a source-listed accommodation record, as the sheet defines it: not a field-verified
census of operating hotels). Nothing is merged, split, moved or re-labelled. The alias row of 37_IDENTITY_ALIASES
(an earlier record of the same current property) is kept out of every figure, as the sheet says (“Metrics use R
canonical only”), and named in meta.aliases.

ROOMS = rooms_selected — the room count the sheet selected from its sources (blank = unknown, never 0; 41 raw zeros
the sheet left unselected stay unknown). It is recorded stock, not rooms available per night, occupancy or demand.

PRICES = min/max/avg_price_raw_thb of the CityMETER Hotel V3 source (THB; price_period unknown): published as the
source recorded them, labelled as recorded prices of unknown period — never a current rate, an ADR or revenue
(owner decision 2026-11-01: publish per hotel, including the recorded prices).

DISTRICT (ADMIN METHODS, the first that applies)
  source    CityMETER Hotel V3 rows: the production DISTRICT the source API listed the row under
            (source_url …/hotel/info/beeSwarm/DISTRICT/{uuid} → production district code)
  name      the row's own district name (sheet field `district`) is a production district of the row's province
  point     the row's selected point lies in a production district of the row's province (display outline)
  province  province only
  conflict  the row's point lies in another province than its own: placed nowhere, reported (meta.conflicts)
A source district that disagrees with the row's point is kept (the production listing is the membership) and
counted in the report (checks.sourcePointDisagree) for the research team.

CONTEXT FROM OTHER CITYMETER DATASETS (straight-line distances from the row's selected point; never a travel time,
a walking route or a catchment; computed at build time, a row without a point has none)
  rail      nearest operating rail station of CityMETER · Transit (status `operating` = on the operator's published
            roster), and the nearest station under construction (a project, not a service), within RAIL_MAX_M
  retail    nearest CityMETER Shopping centers venue (countable, located; groups mall · community · outlet ·
            component · hoststore), within RETAIL_MAX_M
  in-building  16_BRANCH_SPATIAL_CANDIDATES rows qualified `spatial_candidate_requires_identity_review`: a branch of
            another CityMETER research dataset whose source point falls in the same research building mass as the
            hotel's point (not a tenancy, floor or located-in claim)

CURRENT NAME (owner question 2026-11-02 “ทำไม novotel กะรน ใช้ logo Holiday Inn?”): the sheet links a record to the
brand that operates the property now, with evidence, and keeps the record's own name (a TAT register name can predate a
rebrand: Novotel Phuket Karon Beach Resort and Spa → Holiday Inn Resort Phuket Karon Beach). When a branded record's
Latin name carries no label of its linked brand, and the brand's own listing of the property (19_AFFILIATIONS, an
accepted listing row of that brand: `source_property_name`, `source_url`, `retrieved_on`) names it differently, that
listed name is published as the current name (data.currentNames[row] = [name, url index, retrieved on]; a listing in
capitals only reads in title case); the record's own names stay in the row (`name`, `nameEn`), shown as “ชื่อที่บันทึก”
and searchable. A Thai-only record name, or a brand listing the property under several names, keeps the record's name.
Nothing else of the row changes.

SITE (owner 2026-11-03 “พี่เลือกโฉนดให้เลย มาสร้างขอบเขตอาคาร ร่วมกับ site layout ของโรงแรม/รีสอท”): a stay spread over
several buildings whose 49_SITE_BOUNDARY_CHECK row is `checked` publishes its buildings — `buildings_in_boundary`, the
interior points of the drawn buildings (CityMETER Building V4 or OpenStreetMap) inside the research site boundary, as
"lon,lat;lon,lat" — so the map can show them as one site (data.siteGroups[row] = {pts, n, on, src, url}). The boundary
itself (`boundary_geojson`, drawn from Department of Lands parcel outlines and the stay's own site layout, or since
2026-11-06 an OpenStreetMap area of the stay checked with its layout — owner “approve” to osm_polygon+site_layout), the
deed numbers and the researcher's notes stay in the sheet: no parcel shape, deed number or owner is published. A point more
than SITE_MAX_M from the stay's own point stops the build. The tab is read from the export, or from --sites (a CSV of the
live tab — its header and checked rows suffice; its SHA-256 is recorded). The check dates of the sites date the data set.

Not copied (meta.excludedFields): addresses, phone numbers, raw coordinates, researcher notes, internal sheet URLs,
licence or operator fields, source record ids, quality flags, the names of branches of other datasets. Source links are public https pages (TAT data catalogue, owner and group websites); CityMETER Hotel V3 rows
link to the same district on CityMETER production (?d=hotel).
"""
import argparse, collections, csv, datetime, hashlib, json, math, os, re, sys, unicodedata

RAIL_MAX_M = 2000
RETAIL_MAX_M = 1500
ALIAS_TAB = '37_IDENTITY_ALIASES'
TABS = ['01_VENUES', '13_BUILDING_LINKS', '16_BRANCH_SPATIAL_CANDIDATES', '17_BRANDS', '19_AFFILIATIONS', '23_TYPE_ASSIGNMENTS', ALIAS_TAB]
LOGO_TAB = '48_LOGO_LIBRARY'  # optional: the research team's logo library tab (read for brand identity only)
ROOM_TAB = '47_ROOM_RESOLUTION'  # optional: room-count re-checks; rows written back to 01_VENUES date the check
SITE_TAB = '49_SITE_BOUNDARY_CHECK'  # optional: research site boundaries of multi-building stays (buildings published)
OPTIONAL_TABS = (LOGO_TAB, ROOM_TAB, SITE_TAB)
SITE_STATUS = ('checked',)
SITE_MAX_M = 600  # a site building this far from the stay's own point is a sheet error, not a site
SITE_SOURCES = {  # boundary_source codes of 49_SITE_BOUNDARY_CHECK → the words the provenance line uses
    'dol_parcels+site_layout': 'รูปแปลงกรมที่ดิน + ผังที่พัก',
    'osm_polygon+site_layout': 'กรอบ OpenStreetMap + ผังที่พัก',  # owner 2026-11-06 “approve”: the tab's third source
    'site_layout': 'ผังที่พัก',
    'dol_parcels': 'รูปแปลงกรมที่ดิน',
}

# Accommodation groups: venue_type of 01_VENUES (the sheet's 07_TAXONOMY mapping of the source type) → product group.
GROUPS = [
    ('hotel', 'โรงแรม', 'Hotel', ['hotel']),
    ('resort', 'รีสอร์ท', 'Resort', ['resort']),
    ('apartment', 'อพาร์ตเมนต์และเซอร์วิสอพาร์ตเมนต์', 'Apartment & serviced apartment', ['serviced_apartment', 'apartment_accommodation']),
    ('guesthouse', 'เกสต์เฮาส์และโฮสเทล', 'Guesthouse & youth lodging', ['guesthouse', 'youth_lodging']),
    ('bungalow', 'บังกะโล', 'Bungalow', ['bungalow']),
    ('homestay', 'โฮมสเตย์', 'Homestay', ['homestay']),
    ('other', 'ที่พักอื่น', 'Other lodging', ['motel', 'floating_accommodation', 'park_or_government_lodging', 'guest_residence',
                                               'accommodation_other', 'accommodation_unclassified']),
]
TYPE_GROUP = {t: i for i, g in enumerate(GROUPS) for t in g[3]}
TYPE_TH = {
    'hotel': 'โรงแรม', 'resort': 'รีสอร์ท', 'serviced_apartment': 'เซอร์วิสอพาร์ตเมนต์', 'apartment_accommodation': 'อพาร์ตเมนต์/แมนชั่น',
    'guesthouse': 'เกสต์เฮาส์', 'youth_lodging': 'บ้านพักเยาวชน', 'bungalow': 'บังกะโล', 'homestay': 'โฮมสเตย์/เรือนพักแรม',
    'motel': 'โมเต็ล', 'floating_accommodation': 'แพ', 'park_or_government_lodging': 'บ้านพักอุทยาน/ที่พักหน่วยราชการ',
    'guest_residence': 'บ้านพักรับรอง', 'accommodation_other': 'ที่พักประเภทอื่น', 'accommodation_unclassified': 'ยังจำแนกประเภทไม่ได้',
}
# Room-count bands (rooms_selected). Unknown rooms stay out of every band.
SIZES = [('s1', 'ไม่ถึง 20 ห้อง', 1, 19), ('s2', '20–49 ห้อง', 20, 49), ('s3', '50–99 ห้อง', 50, 99),
         ('s4', '100–199 ห้อง', 100, 199), ('s5', '200–299 ห้อง', 200, 299), ('s6', '300 ห้องขึ้นไป', 300, 10 ** 6)]
ADMIN = ['source', 'name', 'point', 'province', 'conflict', 'none']
COORD = {  # coordinate_status of 01_VENUES → what the point is (kept with the row; never upgraded)
    'valid_source_point_accuracy_unspecified': 'จุดจากแหล่งข้อมูล ไม่ระบุความแม่นยำ',
    'candidate_position': 'จุดอ้างอิงจากแหล่ง ยังไม่ใช่ตำแหน่งสำรวจ',
    'official_property_source_point_not_surveyed': 'จุดจากหน้าทางการของที่พัก ไม่ใช่การสำรวจ',
    'official_address_with_source_point': 'จุดจากแหล่งพร้อมที่อยู่ทางการ',
}
MASS = ['identity', 'spatial', 'conflict', 'none_in_area', 'not_acquired', 'not_checked']
RETAIL_GROUPS = {'mall': 'ศูนย์การค้า', 'community': 'คอมมูนิตีมอลล์', 'outlet': 'เอาต์เล็ต', 'component': 'ส่วนค้าปลีกในโครงการ',
                 'hoststore': 'ห้างและซูเปอร์มาร์เก็ต'}
INDUSTRY_TH = {'restaurants': 'ร้านอาหาร', 'luxury': 'แบรนด์หรู', 'grocery': 'ร้านค้าปลีกอาหาร', 'bank': 'ธนาคาร', 'pharmacy': 'ร้านยา',
               'optical': 'ร้านแว่น', 'camera': 'ร้านกล้อง', 'gold': 'ร้านทอง'}
SOURCE_KIND = [  # source_dataset_id prefix → readable source (Thai), public landing page
    ('hotel_v3', 'CityMETER Hotel (ชุดข้อมูลโรงแรมของ CityMETER production)', 'https://landometer.com/v3/citymeter?d=hotel'),
    ('TAT-ACCOMMODATION', 'ทะเบียนที่พัก ททท. (TAT Data Catalog)', 'https://datacatalog.tat.or.th/'),
    ('CHAIN-', 'รายชื่อโรงแรมบนเว็บไซต์ทางการของเครือ', ''),
    ('TH-PROV-', 'รายชื่อที่พักที่หน่วยงานจังหวัด/กทม. เผยแพร่', ''),
    ('HOTEL-IDENTITY-', 'หน้าทางการของที่พัก (รอบตรวจตัวตน)', ''),
    ('HOTEL-UHG-', 'แค็ตตาล็อกทางการของ Urban Hospitality Group', ''),
    ('HOTEL-UMBRELLA-', 'หน้าทางการของเครือ (รอบตรวจเครือแม่)', ''),
    ('OTA-PRIMARY', 'หน้าทางการของที่พัก (เริ่มจากรายชื่อบน OTA)', ''),
    ('hotel_research', 'หน้าทางการของโรงแรม (งานวิจัย 3D)', ''),
]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def read_tabs(sheet, csv_dir):
    if csv_dir:
        out = {}
        for t in TABS + list(OPTIONAL_TABS):
            path = os.path.join(csv_dir, t + '.csv')
            if t in OPTIONAL_TABS and not os.path.exists(path):
                continue
            with open(path, encoding='utf-8') as fh:
                out[t] = list(csv.DictReader(fh))
        return out
    import openpyxl  # noqa: PLC0415 — only for the xlsx path
    wb = openpyxl.load_workbook(sheet, read_only=True, data_only=True)
    out = {}
    for t in TABS + list(OPTIONAL_TABS):
        if t in OPTIONAL_TABS and t not in wb.sheetnames:
            continue
        it = wb[t].iter_rows(values_only=True)
        head = [str(h or '').strip() for h in next(it)]
        rows = []
        for vals in it:
            rows.append({h: ('' if v is None else (v.isoformat() if hasattr(v, 'isoformat') else str(v))) for h, v in zip(head, vals)})
        out[t] = rows
    return out


def fnum(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def th_norm(s):
    s = unicodedata.normalize('NFC', str(s or '')).replace('​', '').replace('\xa0', ' ').replace('ํา', 'ำ').strip()
    s = re.sub(r'^(?:กิ่งอำเภอ|อำเภอ|เขต|อ\.)\s*', '', s)
    return re.sub(r'\s+', '', s)


def haversine(lat1, lon1, lat2, lon2):
    r = 6371008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


class Grid:
    """Points bucketed in ~0.02° cells for nearest-within-radius queries."""
    def __init__(self, items, cell=0.02):
        self.cell, self.cells = cell, collections.defaultdict(list)
        for it in items:
            self.cells[(int(it['lat'] // cell), int(it['lon'] // cell))].append(it)

    def nearest(self, lat, lon, max_m):
        reach = int(math.ceil((max_m / 111320) / self.cell)) + 1
        ci, cj = int(lat // self.cell), int(lon // self.cell)
        best, best_d = None, max_m + 1e-9
        for i in range(ci - reach, ci + reach + 1):
            for j in range(cj - reach, cj + reach + 1):
                for it in self.cells.get((i, j), ()):
                    d = haversine(lat, lon, it['lat'], it['lon'])
                    if d < best_d:
                        best, best_d = it, d
        return (best, best_d) if best else (None, None)


def ring_contains(ring, x, y):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


class Locator:
    """District outlines of data/frames, by province; display geometry (used for the `point` method and checks)."""
    def __init__(self, frames_dir, provinces):
        self.by_province = collections.defaultdict(list)
        for code in provinces:
            frame = json.load(open(os.path.join(frames_dir, f'{code}.json'), encoding='utf-8'))
            for f in frame['areas']['features']:
                g = f['geometry']
                polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
                polys = [[[tuple(p) for p in ring] for ring in poly] for poly in polys]
                xs = [p[0] for poly in polys for p in poly[0]]
                ys = [p[1] for poly in polys for p in poly[0]]
                self.by_province[code].append((str(f['id']), polys, min(xs), min(ys), max(xs), max(ys)))

    def find(self, lon, lat, provinces):
        for code in provinces:
            for did, polys, w, s, e, n in self.by_province.get(code, ()):
                if lon < w or lon > e or lat < s or lat > n:
                    continue
                for poly in polys:
                    if ring_contains(poly[0], lon, lat) and not any(ring_contains(h, lon, lat) for h in poly[1:]):
                        return code, did
        return None, None


NAME_STATUSES = ('official_source_affiliation', 'resolved_source_claim', 'source_membership_claim')


def latin_key(s):
    """' holiday inn resort ' — accents, case, HTML entities and punctuation folded; padded for whole-word tests."""
    s = unicodedata.normalize('NFKD', (s or '').replace('&amp;', '&'))
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).casefold().replace('&', ' and ')
    return ' %s ' % ' '.join(re.findall(r'[0-9a-z]+', s))


SMALL_WORDS = {'a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'the', 'to'}


def display_case(name):
    """A listing written in capitals only reads in title case (“THE NAKA ISLAND, A LUXURY …” → “The Naka Island, a
    Luxury …”); any other spelling is kept as listed."""
    if re.search(r'[a-z]', name) or not re.search(r'[A-Z]{2}', name):
        return name
    words = name.split(' ')
    cap = lambda m: m.group(0)[0].upper() + m.group(0)[1:].lower()
    return ' '.join(w.lower() if k and w.strip(',.;:()').lower() in SMALL_WORDS else re.sub(r"[A-Za-z][A-Za-z']*", cap, w)
                    for k, w in enumerate(words))


def current_name(name, name_en, labels, listed):
    """The brand's listed name of the property when the record's Latin name carries none of the brand's labels and
    differs from it; else None. `listed` = the accepted listing rows of the linked brand ({name, url, on})."""
    if len({x['name'] for x in listed}) != 1:
        return None  # none, or the brand lists the property under several names: keep the record's name
    record = name_en or (name if re.search(r'[A-Za-z]', name or '') else '')
    if not record:
        return None  # a Thai-only record name is read as written (no Latin to compare)
    key = latin_key(record)
    if any(len(latin_key(l).strip()) >= 2 and latin_key(l) in key for l in labels):
        return None  # the record already carries its brand
    return listed[0] if latin_key(listed[0]['name']) != key else None


def site_points(text):
    """buildings_in_boundary of 49_SITE_BOUNDARY_CHECK: "lon,lat;lon,lat" (WGS 84, Thailand) → [[lon, lat], …] (6 decimals)."""
    pts = []
    for part in re.split(r'[;\s]+', (text or '').strip()):
        if not part:
            continue
        m = re.fullmatch(r'(\d{2,3}\.\d+),(\d{1,2}\.\d+)', part)
        if not m:
            sys.exit(f'{SITE_TAB}: buildings_in_boundary entry {part!r} is not "lon,lat"')
        lon, lat = float(m[1]), float(m[2])
        if not (97 <= lon <= 106 and 5 <= lat <= 21):
            sys.exit(f'{SITE_TAB}: buildings_in_boundary entry {part!r} lies outside Thailand')
        pts.append([round(lon, 6), round(lat, 6)])
    return pts


def public_url(u):
    u = (u or '').strip()
    if not u.startswith('https://'):
        return ''
    if re.search(r'docs\.google\.com|drive\.google\.com|landometer\.com/api/|/papi/api/|localhost|\.local/', u):
        return ''
    return u


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--sheet', required=True, help='xlsx export of the research master (its SHA-256 is recorded)')
    ap.add_argument('--csv', default='', help='directory of <tab>.csv converted from the same export (faster)')
    ap.add_argument('--api', required=True)
    ap.add_argument('--index', required=True)
    ap.add_argument('--frames', required=True)
    ap.add_argument('--transit', required=True)
    ap.add_argument('--shopping', required=True)
    ap.add_argument('--checked-on', default='2026-10-25', help='latest checked_on date of the sheet rows read')
    ap.add_argument('--logos', default='', help="unzipped logo library of the research team (Hotel_Chain_Logos_Web: manifest.json) — brand identities")
    ap.add_argument('--sites', default='', help='CSV of the live 49_SITE_BOUNDARY_CHECK tab (its header and checked rows suffice), when the export predates them; its SHA-256 is recorded')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    export_sha = sha256_file(a.sheet)
    tabs = read_tabs(a.sheet, a.csv)
    sites_file = None
    if a.sites:
        with open(a.sites, encoding='utf-8') as fh:
            tabs[SITE_TAB] = list(csv.DictReader(fh))
        sites_file = {'sha256': sha256_file(a.sites), 'bytes': os.path.getsize(a.sites)}
    venues = tabs['01_VENUES']
    aliases = {r['alias_venue_id']: r for r in tabs[ALIAS_TAB] if r.get('alias_venue_id')}

    # ---------- gazetteer (production base info) ----------
    lv0 = json.load(open(os.path.join(a.api, 'base-lv0.json'), encoding='utf-8'))['value']['provinceInfos']
    prov_by_th = {th_norm(p['nameTh']): p['abbrEn'] for p in lv0}
    district_by_uuid, district_by_name, district_prov = {}, {}, {}
    for p in lv0:
        base = json.load(open(os.path.join(a.api, f"base-{p['id']}.json"), encoding='utf-8'))['value']
        for d in base['districtInfos']:
            district_by_uuid[d['id']] = (p['abbrEn'], d['code'])
            district_by_name[(p['abbrEn'], th_norm(d['nameTh']))] = d['code']
            district_prov[d['code']] = p['abbrEn']
    receipts = {f: json.load(open(os.path.join(a.api, f), encoding='utf-8')) for f in sorted(os.listdir(a.api)) if f.endswith('.meta.json')}
    receipts_sha = hashlib.sha256(json.dumps(receipts, sort_keys=True).encode()).hexdigest()
    index = json.load(open(a.index, encoding='utf-8'))
    index_ids = set(index['areas']['id'])
    locator = Locator(a.frames, [p['id'] for p in index['provinces']])

    # ---------- other CityMETER datasets ----------
    def repo_commit(path):
        head = open(os.path.join(path, '.git', 'HEAD')).read().strip()
        if head.startswith('ref:'):
            ref = head.split(' ', 1)[1]
            p = os.path.join(path, '.git', ref)
            if os.path.exists(p):
                return open(p).read().strip()
            for line in open(os.path.join(path, '.git', 'packed-refs')):
                if line.strip().endswith(ref):
                    return line.split()[0]
        return head
    transit_path = os.path.join(a.transit, 'data', 'transit.json')
    transit = json.load(open(transit_path, encoding='utf-8'))
    lines = {l['id']: l for l in transit['lines']}
    stations = []
    for s in transit['stations']:
        if not (isinstance(s.get('lat'), (int, float)) and isinstance(s.get('lng'), (int, float))):
            continue
        if s.get('status') not in ('operating', 'construction'):
            continue
        stations.append({'id': s['id'], 'name': s['name'], 'nameEn': s.get('nameEn') or '', 'lat': s['lat'], 'lon': s['lng'], 'status': s['status'],
                         'lines': [lines[l]['short'] or lines[l]['name'] for l in s.get('lineIds', []) if l in lines],
                         'lineIds': s.get('lineIds', [])})
    stations.sort(key=lambda s: s['id'])
    for i, s in enumerate(stations):
        s['i'] = i
    grid_op = Grid([s for s in stations if s['status'] == 'operating'])
    grid_cx = Grid([s for s in stations if s['status'] == 'construction'])
    shop_path = os.path.join(a.shopping, 'data', 'venues.json')
    shop = json.load(open(shop_path, encoding='utf-8'))
    retail = [{'id': v['id'], 'scId': v.get('scId') or '', 'name': v['name'], 'nameEn': v.get('nameEn') or '', 'group': v['group'], 'lat': v['lat'], 'lon': v['lon']}
              for v in shop['rows'] if v.get('countable') and v.get('located') and v.get('group') in RETAIL_GROUPS and v.get('status') == 'supply'
              and isinstance(v.get('lat'), (int, float)) and isinstance(v.get('lon'), (int, float))]
    retail.sort(key=lambda v: v['id'])
    for i, v in enumerate(retail):
        v['i'] = i
    grid_retail = Grid(retail)

    # ---------- brands (01_VENUES.brand_name → 17_BRANDS) ----------
    brand_rows = {}
    for b in tabs['17_BRANDS']:
        k = b['brand_name'].casefold().strip()
        if k and (k not in brand_rows or (not brand_rows[k]['group_entity_id'] and b['group_entity_id'])):
            brand_rows[k] = b
    group_names = {}
    for b in tabs['17_BRANDS']:
        gid = b['group_entity_id']
        if gid and b['brand_group']:
            # Shortest stated group name is the display name (e.g. “Marriott” over “Marriott International / …”).
            cur = group_names.get(gid)
            if cur is None or len(b['brand_group']) < len(cur):
                group_names[gid] = b['brand_group']
    GROUP_FIX = {'HGRP-ihg': 'IHG Hotels & Resorts', 'HGRP-marriott': 'Marriott International', 'HGRP-accor': 'Accor'}
    group_names.update({k: v for k, v in GROUP_FIX.items() if k in group_names})
    # Brand identities of the research team's logo library: one identity per brand, with every label the master uses
    # for it (e.g. "MGallery" and "MGallery Collection", "Renaissance" and "Renaissance Hotels") and its 17_BRANDS ids.
    # Used to read a label that has no exact 17_BRANDS name, and to count spelling variants as one brand.
    brand_by_id = {b['brand_id']: b for b in tabs['17_BRANDS'] if b.get('brand_id')}
    identity_by_label, logo_lib = {}, {'file': '', 'sha256': '', 'checkedOn': '', 'identities': 0}
    if a.logos:
        man_path = os.path.join(a.logos, 'manifest.json')
        man = json.load(open(man_path, encoding='utf-8'))
        tab_rows = {r.get('logo_mapping_id', ''): r for r in tabs.get(LOGO_TAB, [])}
        for mp in man['mappings']:
            if tab_rows and mp.get('mapping_id') not in tab_rows:
                sys.exit(f"logo library mapping {mp.get('mapping_id')} is not in {LOGO_TAB}")
            for lab in (mp.get('raw_master_labels') or []) + (mp.get('raw_registry_labels') or []):
                identity_by_label.setdefault(lab.casefold().strip(), mp)
        logo_lib = {'file': 'Hotel_Chain_Logos_Web/manifest.json', 'sha256': sha256_file(man_path), 'checkedOn': man.get('checked_on', ''),
                    'identities': len(man['mappings']), 'tab': LOGO_TAB if tab_rows else ''}
    brand_resolution = collections.Counter()

    # ---------- per-venue context from other tabs ----------
    mass = {}
    for r in tabs['13_BUILDING_LINKS']:
        vid = r.get('venue_id')
        if not vid:
            continue
        st, ident = r.get('spatial_status', ''), r.get('identity_status', '')
        if r.get('identity_accepted') == 'True':
            code = 'identity'
        elif ident == 'identity_coordinate_conflict_review':
            code = 'conflict'
        elif st == 'source_point_inside_3d_mass':
            code = 'spatial'
        elif st == 'no_mass_part_at_point_in_acquired_area':
            code = 'none_in_area'
        elif st == 'parts_not_acquired_for_area':
            code = 'not_acquired'
        else:
            code = 'not_checked'
        mass[vid] = code
    meeting = {}
    for r in tabs['23_TYPE_ASSIGNMENTS']:
        if r.get('type_code') == 'CAP_MEETING_ROOM':
            n = fnum(r.get('source_meeting_room_count'))
            if n and n > 0:
                meeting[r['venue_id']] = max(int(n), meeting.get(r['venue_id'], 0))
    inside = collections.defaultdict(list)
    for r in tabs['16_BRANCH_SPATIAL_CANDIDATES']:
        if r.get('candidate_qualification') != 'spatial_candidate_requires_identity_review':
            continue
        # Published: the industry and the public brand only (the panel shows counts per industry; no branch names).
        inside[r['venue_id']].append([INDUSTRY_TH.get(r['industry'], r['industry']), (r.get('brand_name') or '').strip()])
    collections_by_venue = collections.defaultdict(set)
    listed_names = collections.defaultdict(list)  # venue → accepted brand listings that name the property (CURRENT NAME)
    for r in tabs['19_AFFILIATIONS']:
        role = r.get('relationship_role', '')
        if r.get('venue_id') and (r.get('source_property_name') or '').strip() and r.get('affiliation_status') in NAME_STATUSES \
                and ('listing' in role or role == 'official_property_brand'):
            listed_names[r['venue_id']].append({'brand': (r.get('brand_id') or '').strip(), 'group': (r.get('group_entity_id') or '').strip(),
                                                'name': r['source_property_name'].strip(), 'url': public_url(r.get('source_url')),
                                                'on': (r.get('retrieved_on') or '')[:10]})
    for r in tabs['19_AFFILIATIONS']:
        if r.get('venue_id') and r.get('relationship_role', '').startswith('collection_member') or r.get('relationship_role') in ('collection_membership', 'collection_membership_self_reported'):
            if r.get('affiliation_status') in ('resolved_source_claim', 'official_source_affiliation', 'source_membership_claim') and r.get('affiliation_name'):
                collections_by_venue[r['venue_id']].add(r['affiliation_name'])

    # ---------- rows ----------
    raw_types, urls, sources, brands, chains = [], [], [], [], []
    raw_index, url_index, source_index, brand_index, chain_index = {}, {}, {}, {}, {}
    provinces_list, districts_list, prov_i, dist_i = [], [], {}, {}

    def intern(lst, idx, value):
        if value not in idx:
            idx[value] = len(lst)
            lst.append(value)
        return idx[value]

    def source_of(dsid):
        for prefix, th, url in SOURCE_KIND:
            if dsid.startswith(prefix):
                return intern(sources, source_index, (prefix, th, url))
        return intern(sources, source_index, ('other', 'แหล่งข้อมูลอื่นที่ชีตวิจัยระบุ', ''))

    cols = {k: [] for k in ('key', 'name', 'nameEn', 'group', 'raw', 'rooms', 'pmin', 'pmax', 'pavg', 'brand', 'province', 'district',
                            'admin', 'lat', 'lon', 'coord', 'src', 'url', 'meet', 'mass', 'rail', 'railM', 'rail2', 'rail2M', 'shop', 'shopM')}
    counts = collections.Counter()
    conflicts, disagree, inside_rows, colls, current, listed_rows = [], [], {}, {}, {}, []
    uuid_re = re.compile(r'/hotel/info/beeSwarm/DISTRICT/([0-9a-f-]{36})')
    seen = set()
    for r in venues:
        vid = r['venue_id']
        if not vid or vid in seen:
            continue
        seen.add(vid)
        if vid in aliases:
            counts['alias.excluded'] += 1
            continue
        prov = prov_by_th.get(th_norm(r['province']), '')
        lat, lon = fnum(r.get('latitude')), fnum(r.get('longitude'))
        if lat is not None and lon is not None and not (5 <= lat <= 21 and 97 <= lon <= 106):
            lat = lon = None
            counts['point.outOfRange'] += 1
        has_point = lat is not None and lon is not None
        # District membership
        admin, dcode = 'none', ''
        m = uuid_re.search(r.get('source_url', '')) if r.get('source_dataset_id') == 'hotel_v3' else None
        if m and m.group(1) in district_by_uuid:
            p2, d2 = district_by_uuid[m.group(1)]
            if not prov or p2 == prov:
                admin, dcode, prov = 'source', d2, prov or p2
            else:
                counts['source.provinceDisagree'] += 1
        if not dcode and prov and r.get('district'):
            d2 = district_by_name.get((prov, th_norm(r['district'])))
            if d2:
                admin, dcode = 'name', d2
        if not dcode and has_point and prov:
            pc, d2 = locator.find(lon, lat, [prov])
            if d2:
                admin, dcode = 'point', d2
            else:
                pc2, d3 = locator.find(lon, lat, [p['id'] for p in index['provinces'] if p['id'] != prov])
                if d3:
                    admin = 'conflict'
                    conflicts.append({'venue': vid, 'province': prov, 'pointProvince': pc2})
        if not dcode and admin == 'none' and prov:
            admin = 'province'
        if dcode and dcode not in index_ids:
            counts['district.notInIndex'] += 1
            dcode, admin = '', ('province' if prov else 'none')
        if admin == 'source' and has_point:
            pc, d2 = locator.find(lon, lat, [prov])
            if d2 and d2 != dcode:
                disagree.append(vid)
        counts['admin.' + admin] += 1
        # Group, rooms, prices
        vt = r.get('venue_type') or 'accommodation_unclassified'
        gi = TYPE_GROUP.get(vt, TYPE_GROUP['accommodation_unclassified'])
        rooms = fnum(r.get('rooms_selected'))
        rooms = int(round(rooms)) if rooms and rooms > 0 else -1
        pr = [fnum(r.get(k)) for k in ('min_price_raw_thb', 'max_price_raw_thb', 'avg_price_raw_thb')]
        pr = [int(round(x)) if x and x > 0 else -1 for x in pr]
        # Brand → group (chain)
        bi = -1
        link_ids, link_gid = set(), ''
        bname = (r.get('brand_name') or '').strip()
        if bname:
            br = brand_rows.get(bname.casefold())
            ident = identity_by_label.get(bname.casefold())
            reg_ids = [x for x in (ident or {}).get('brand_ids') or [] if x in brand_by_id]
            if br is None and reg_ids:
                br = brand_by_id[reg_ids[0]]
            brand_resolution['exact_name' if bname.casefold() in brand_rows else 'logo_identity' if reg_ids else 'label_only'] += 1
            gid = (br or {}).get('group_entity_id', '') or next((brand_by_id[x]['group_entity_id'] for x in reg_ids if brand_by_id[x].get('group_entity_id')), '')
            ci = -1
            if gid:
                if gid not in chain_index:
                    chain_index[gid] = len(chains)
                    chains.append({'id': gid, 'name': group_names.get(gid, gid)})
                ci = chain_index[gid]
            key = (reg_ids[0] if reg_ids else '') or (br or {}).get('brand_id') or ('BR-' + hashlib.sha1(bname.casefold().encode()).hexdigest()[:10])
            if key not in brand_index:
                brand_index[key] = len(brands)
                entry = {'id': key, 'name': ident['canonical_name'] if ident else bname, 'chain': ci, 'labels': []}
                if ident:
                    entry['identity'] = ident.get('mapping_id') or ident.get('scope_identity_id')
                brands.append(entry)
            bi = brand_index[key]
            if bname not in brands[bi]['labels']:
                brands[bi]['labels'].append(bname)
            link_ids = ({key, (br or {}).get('brand_id', '')} | set(reg_ids)) - {''}
            link_gid = gid
        # Source + public link
        dsid = r.get('source_dataset_id', '')
        si = source_of(dsid)
        link = public_url(r.get('source_url'))
        ui = intern(urls, url_index, link) if link else -1
        # Context: rail and retail (straight-line, from the selected point)
        rail = rail2 = shopi = -1
        railm = rail2m = shopm = -1
        if has_point:
            s, d = grid_op.nearest(lat, lon, RAIL_MAX_M)
            if s:
                rail, railm = s['i'], int(round(d))
            s, d = grid_cx.nearest(lat, lon, RAIL_MAX_M)
            if s:
                rail2, rail2m = s['i'], int(round(d))
            v, d = grid_retail.nearest(lat, lon, RETAIL_MAX_M)
            if v:
                shopi, shopm = v['i'], int(round(d))
        name = (r.get('venue_name') or r.get('name_th') or '').strip()
        name_en = (r.get('name_en') or '').strip()
        if not re.search(r'[A-Za-z]', name_en) or name_en.casefold() == name.casefold():
            name_en = ''
        i = len(cols['key'])
        if bi >= 0:
            mine = [x for x in listed_names.get(vid, []) if x['brand'] in link_ids] \
                or [x for x in listed_names.get(vid, []) if not x['brand'] and link_gid and x['group'] == link_gid]
            if mine:
                listed_rows.append((i, name, name_en, bi, mine))  # judged after the rows, with every label of the brand
        cols['key'].append(vid)
        cols['name'].append(name)
        cols['nameEn'].append(name_en)
        cols['group'].append(gi)
        cols['raw'].append(intern(raw_types, raw_index, TYPE_TH.get(vt, vt)))
        cols['rooms'].append(rooms)
        cols['pmin'].append(pr[0]); cols['pmax'].append(pr[1]); cols['pavg'].append(pr[2])
        cols['brand'].append(bi)
        cols['province'].append(intern(provinces_list, prov_i, prov) if prov else -1)
        cols['district'].append(intern(districts_list, dist_i, dcode) if dcode else -1)
        cols['admin'].append(ADMIN.index(admin))
        cols['lat'].append(round(lat, 6) if has_point else None)
        cols['lon'].append(round(lon, 6) if has_point else None)
        cs = r.get('coordinate_status', '')
        cols['coord'].append(list(COORD).index(cs) if has_point and cs in COORD else -1)
        cols['src'].append(si)
        cols['url'].append(ui)
        cols['meet'].append(meeting.get(vid, -1))
        cols['mass'].append(MASS.index(mass.get(vid, 'not_checked')))
        cols['rail'].append(rail); cols['railM'].append(railm)
        cols['rail2'].append(rail2); cols['rail2M'].append(rail2m)
        cols['shop'].append(shopi); cols['shopM'].append(shopm)
        if inside.get(vid):
            inside_rows[i] = inside[vid]
        if collections_by_venue.get(vid):
            colls[i] = sorted(collections_by_venue[vid])
        counts['rows'] += 1
        counts['rooms.known'] += 1 if rooms > 0 else 0
        counts['rooms.sum'] += rooms if rooms > 0 else 0
        counts['points'] += 1 if has_point else 0
        counts['price.recorded'] += 1 if pr[2] > 0 else 0
        counts['brand'] += 1 if bi >= 0 else 0

    # CURRENT NAME, judged with the complete label set of each brand; urls interned after the rows (row indices stay).
    for i, name, name_en, bi, mine in listed_rows:
        now = current_name(name, name_en, [brands[bi]['name']] + brands[bi]['labels'], mine)
        if now:
            current[i] = [display_case(now['name']), intern(urls, url_index, now['url']) if now['url'] else -1, now['on']]
            counts['name.current'] += 1

    # SITE: the buildings of each checked site boundary (49_SITE_BOUNDARY_CHECK) as interior points; urls interned after
    # the rows (row link indices stay). The boundary, deed numbers and notes stay in the sheet.
    sites, site_rows = {}, tabs.get(SITE_TAB, [])
    row_of = {k: i for i, k in enumerate(cols['key'])}
    for r in site_rows:
        if (r.get('boundary_status') or '').strip() not in SITE_STATUS:
            continue
        vid = (r.get('venue_id') or '').strip()
        i = row_of.get(vid)
        if i is None:
            counts['site.unmatched'] += 1
            continue
        pts = site_points(r.get('buildings_in_boundary'))
        if not pts:
            counts['site.noBuildings'] += 1
            continue
        if cols['lat'][i] is not None and cols['lon'][i] is not None:
            far = max(haversine(cols['lat'][i], cols['lon'][i], p[1], p[0]) for p in pts)
            if far > SITE_MAX_M:
                sys.exit(f'{SITE_TAB}: {vid} lists a site building {far:.0f} m from its point (more than {SITE_MAX_M} m)')
        on = (r.get('checked_on') or '')[:10]
        src = (r.get('boundary_source') or '').strip()
        evidence = public_url(r.get('boundary_evidence_url'))
        sites[i] = {'pts': pts, 'n': len(pts), 'on': on if re.fullmatch(r'\d{4}-\d{2}-\d{2}', on) else '',
                    'src': src if src in SITE_SOURCES else 'other',
                    'url': intern(urls, url_index, evidence) if evidence else -1}
        counts['site.groups'] += 1
        counts['site.buildings'] += len(pts)
    used_stations = sorted({x for x in cols['rail'] + cols['rail2'] if x >= 0})
    used_retail = sorted({x for x in cols['shop'] if x >= 0})
    # Re-index the context dictionaries to the entries the rows use (plus every operating station: the map draws them).
    keep_st = sorted(set(used_stations) | {s['i'] for s in stations if s['status'] == 'operating'})
    st_map = {old: new for new, old in enumerate(keep_st)}
    rt_map = {old: new for new, old in enumerate(used_retail)}
    for k in ('rail', 'rail2'):
        cols[k] = [st_map[x] if x >= 0 else -1 for x in cols[k]]
    cols['shop'] = [rt_map[x] if x >= 0 else -1 for x in cols['shop']]
    out_stations = [{k: stations[i][k] for k in ('id', 'name', 'nameEn', 'lat', 'lon', 'status', 'lines', 'lineIds')} for i in keep_st]
    out_retail = [{k: retail[i][k] for k in ('id', 'scId', 'name', 'nameEn', 'group', 'lat', 'lon')} for i in used_retail]

    checked_dates = {(r.get('checked_on') or '')[:10] for r in venues if r.get('checked_on')}
    # Room counts re-checked in 47_ROOM_RESOLUTION and written back to 01_VENUES (main_updated = yes) date that check.
    room_res = [r for r in tabs.get(ROOM_TAB, []) if (r.get('main_updated') or '').strip().lower() == 'yes']
    checked_dates |= {(r.get('retrieved_on') or '')[:10] for r in room_res if re.match(r'\d{4}-\d{2}-\d{2}', r.get('retrieved_on') or '')}
    # Site boundaries checked in 49_SITE_BOUNDARY_CHECK date that check.
    checked_dates |= {v['on'] for v in sites.values() if v['on']}
    checked_dates = sorted(checked_dates)
    built_on = datetime.date.today().isoformat()
    meta = {
        'dataset': 'CityMETER Hotel', 'datasetTh': 'ที่พักและโรงแรมในประเทศไทย', 'registryId': 'research.TH.hotel', 'registryRole': 'Land · TH',
        'sheetTitle': 'CityMETER Hotel — Venue, Branch & Building Research Master 2026-10-24', 'exportSha256': export_sha,
        'sheetStatus': 'research_master', 'checkedOn': checked_dates[-1] if checked_dates else a.checked_on, 'checkedDates': checked_dates, 'builtOn': built_on,
        'rows': counts['rows'], 'counts': dict(sorted(counts.items())),
        'roomResolution': {'tab': ROOM_TAB, 'rows': len(tabs.get(ROOM_TAB, [])), 'writtenBack': len(room_res),
                           'retrievedOn': sorted({(r.get('retrieved_on') or '')[:10] for r in room_res if r.get('retrieved_on')})} if tabs.get(ROOM_TAB) else None,
        'unit': {
            'row': 'one row of 01_VENUES — a source-listed accommodation record (CityMETER Hotel V3, TAT accommodation register, official group and property pages, provincial lists); not a field-verified census of operating hotels',
            'rooms': 'rooms_selected — the room count the sheet selected from its sources; recorded stock, not rooms available per night; unknown stays unknown',
            'price': 'min/max/avg_price_raw_thb of CityMETER Hotel V3; THB; the source period is unknown; not a current rate, an ADR or revenue',
        },
        'aliases': [{'venue': k, 'canonical': v.get('canonical_venue_id', ''), 'status': v.get('status', '')} for k, v in aliases.items()],
        'adminMethods': {
            'source': 'CityMETER Hotel V3: the production DISTRICT the source API listed the row under (…/hotel/info/beeSwarm/DISTRICT/{uuid})',
            'name': "the row's own district name is a production district of its province",
            'point': "the row's selected point lies in a production district of its province (display outline)",
            'province': 'province only', 'conflict': "the row's point lies in another province: placed nowhere",
            'none': 'no province',
        },
        'districts': 'CityMETER production base info (lv0/lv1 retrieved %s, %d receipts, sha256 %s) + district outlines of data/frames/{CODE}.json' % (
            min(m['retrievedAt'][:10] for m in receipts.values()), len(receipts), receipts_sha),
        'context': {
            'rail': {'source': 'CityMETER · Transit (montri-th/transit)', 'commit': repo_commit(a.transit), 'file': 'data/transit.json', 'sha256': sha256_file(transit_path),
                     'release': (transit.get('meta') or {}).get('release', ''), 'asOf': (transit.get('meta') or {}).get('asOf', ''),
                     'rule': 'operating = on the operator roster of CityMETER · Transit; construction = a project station, not a service; straight-line distance from the hotel point to the station reference point, up to %d m' % RAIL_MAX_M},
            'retail': {'source': 'CityMETER Shopping centers (montri-th/shoppingcenter)', 'commit': repo_commit(a.shopping), 'file': 'data/venues.json', 'sha256': sha256_file(shop_path),
                       'asOf': (shop.get('meta') or {}).get('asOf', ''), 'groups': RETAIL_GROUPS,
                       'rule': 'countable, located venues of the groups listed with status supply; straight-line distance from the hotel point to the venue reference point, up to %d m' % RETAIL_MAX_M},
            'inBuilding': '16_BRANCH_SPATIAL_CANDIDATES qualified spatial_candidate_requires_identity_review: a branch of another CityMETER research dataset whose source point falls in the same research building mass; not a tenancy, floor or located-in claim',
        },
        'conflicts': conflicts,
        'excludedFields': ['address', 'subdistrict', 'telephone', 'lat_raw', 'lng_raw', 'operator_name', 'source_record_id', 'notes',
                           'source_quality_flags', 'record_review_status', 'building_source_id', 'star_raw', 'star_selected',
                           '16_BRANCH_SPATIAL_CANDIDATES.branch_name', 'README text',
                           SITE_TAB + '.boundary_geojson', SITE_TAB + '.notes', SITE_TAB + '.main_building_note', SITE_TAB + '.checked_by'],
        'checks': {'sourcePointDisagree': len(disagree), 'sourcePointDisagreeSample': disagree[:20]},
        'currentNames': {'rule': "a branded record whose Latin name carries no label of its linked brand, and which that brand's accepted listing in 19_AFFILIATIONS (source_property_name) names differently, is shown under the listed name; the record's own names stay in the row as the recorded name (ชื่อที่บันทึก) and in search",
                         'rows': len(current), 'retrievedOn': sorted({v[2] for v in current.values() if v[2]})},
        'siteGroups': {'tab': SITE_TAB, 'rowsRead': len(site_rows), 'rows': len(sites), 'buildings': sum(v['n'] for v in sites.values()),
                       'status': list(SITE_STATUS), 'checkedOn': sorted({v['on'] for v in sites.values() if v['on']}), 'sources': SITE_SOURCES,
                       'file': sites_file,
                       'rule': "a checked 49_SITE_BOUNDARY_CHECK row publishes the interior points of the drawn buildings inside the research site boundary (buildings_in_boundary); the map shows the buildings whose outline holds one of them as the stay's site; the boundary (Department of Lands parcel outlines, or an OpenStreetMap area of the stay, with the stay's own site layout), deed numbers and notes stay in the sheet",
                       'credits': {'osm_polygon+site_layout': '© OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright): the site follows an OpenStreetMap area'}},
        'brandIdentity': {'rule': 'a 01_VENUES brand label is read by its exact 17_BRANDS name; a label without one, or a spelling variant, is read through the brand identity of the research team logo library (its 17_BRANDS ids); labels of one identity count as one brand',
                          'library': logo_lib, 'rows': dict(brand_resolution),
                          'merged': sorted([b['name'], b['labels']] for b in brands if len(b['labels']) > 1)},
        'limits': [
            'Records are source-listed accommodation records; operation is not revalidated (operation_not_revalidated) and the register is not a census.',
            'Rooms are recorded stock; unknown rooms stay out of room totals and are counted apart.',
            'Recorded prices have an unknown source period; they are not current rates, ADR or revenue.',
            'Brands are the brand names the sheet selected with evidence; a record without a brand is not proof of an independent hotel.',
            'Distances to rail stations and retail venues are straight-line distances between reference points.',
        ],
    }
    data = {
        'meta': meta,
        'groups': [{'id': g[0], 'th': g[1], 'en': g[2], 'types': g[3]} for g in GROUPS],
        'sizes': [{'id': s[0], 'th': s[1], 'min': s[2], 'max': s[3]} for s in SIZES],
        'rawTypes': raw_types,
        'sources': [{'id': s[0], 'th': s[1], 'url': s[2]} for s in sources],
        'brands': brands, 'chains': chains,
        'stations': out_stations, 'retail': out_retail,
        'urls': urls, 'provinces': provinces_list, 'districts': districts_list,
        'vocab': {'admin': ADMIN, 'coord': list(COORD.values()), 'mass': MASS},
        'inBuilding': {str(k): v for k, v in sorted(inside_rows.items())},
        'collections': {str(k): v for k, v in sorted(colls.items())},
        'currentNames': {str(k): v for k, v in sorted(current.items())},
        'siteGroups': {str(k): v for k, v in sorted(sites.items())},
        'cols': cols,
    }
    os.makedirs(os.path.join(a.out, 'data'), exist_ok=True)
    path = os.path.join(a.out, 'data', 'hotels.json')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    report = {'release': 'hotel-data-' + built_on, 'export': {'sha256': export_sha, 'title': meta['sheetTitle']}, 'counts': meta['counts'],
              'checks': meta['checks'], 'conflicts': len(conflicts), 'stations': len(out_stations), 'retail': len(out_retail),
              'brands': len(brands), 'chains': len(chains), 'inBuilding': sum(len(v) for v in inside_rows.values()),
              'files': [{'path': 'data/hotels.json', 'bytes': os.path.getsize(path), 'sha256': sha256_file(path)}]}
    with open(os.path.join(a.out, 'data', 'build-report.json'), 'w', encoding='utf-8') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
