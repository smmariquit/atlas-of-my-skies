#!/usr/bin/env python3
import json
from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS


def get_exif(img_path: Path):
    try:
        img = Image.open(img_path)
        exif = img._getexif()
        if not exif:
            return None
        data = {}
        for tag, value in exif.items():
            decoded = TAGS.get(tag, tag)
            data[decoded] = value
        return data
    except Exception as e:
        print(f"Error reading EXIF from {img_path}: {e}")
        return None


def get_gps_info(exif):
    if not exif:
        return None
    gps_info = exif.get('GPSInfo')
    if not gps_info:
        return None
    gps = {}
    for key in gps_info.keys():
        name = GPSTAGS.get(key, key)
        gps[name] = gps_info[key]
    return gps


def dms_to_dd(dms, ref):
    # dms is a tuple of 3 tuples (num, den)
    def frac(t):
        return t[0] / t[1] if isinstance(t, tuple) else float(t)
    deg = frac(dms[0])
    minutes = frac(dms[1])
    seconds = frac(dms[2])
    dd = deg + minutes / 60.0 + seconds / 3600.0
    if ref in ['S', 'W']:
        dd = -dd
    return dd


def extract_decimal_coords(gps):
    if not gps:
        return None
    lat = gps.get('GPSLatitude')
    lat_ref = gps.get('GPSLatitudeRef')
    lon = gps.get('GPSLongitude')
    lon_ref = gps.get('GPSLongitudeRef')
    if not lat or not lon or not lat_ref or not lon_ref:
        return None
    try:
        latitude = dms_to_dd(lat, lat_ref)
        longitude = dms_to_dd(lon, lon_ref)
        return latitude, longitude
    except Exception as e:
        print(f"Error converting DMS to DD: {e}")
        return None


def main():
    repo_root = Path(__file__).resolve().parents[1]
    data_file = repo_root / 'data' / 'imagesMeta.json'
    images_dir = repo_root / 'public' / 'images'

    if not data_file.exists():
        print(f"Data file not found: {data_file}")
        return

    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for item in data:
        if item.get('latitude') is None or item.get('longitude') is None:
            src = item.get('src', '')
            fname = src.lstrip('/')
            img_path = repo_root / 'public' / fname
            if not img_path.exists():
                # try images/ prefix
                img_path = images_dir / Path(fname).name
            if not img_path.exists():
                # can't find image
                continue
            exif = get_exif(img_path)
            gps = get_gps_info(exif)
            coords = extract_decimal_coords(gps)
            if coords:
                lat, lon = coords
                item['latitude'] = lat
                item['longitude'] = lon
                updated += 1
                print(f"Updated {fname} -> lat={lat}, lon={lon}")

    if updated > 0:
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"WROTE {data_file} (updated {updated} entries)")
    else:
        print("No updates made.")


if __name__ == '__main__':
    main()
