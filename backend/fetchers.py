import requests, re
from bs4 import BeautifulSoup
from datetime import datetime
import random

HEADERS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, text/plain, */*'}
THRESHOLDS = {"pm25": 37.5, "pm10": 120, "so2": 300, "no2": 170}

IEAT_STATIONS = [
    'KROCKYAICHA_STATION','MAPTAPHUT_STATION (New)','MAPYA',
    'NERN PHYOM','NONG FEAB_STATION','NONG SUEA KUKE STATION (NSK)',
    'TAKUAN_STA(2026)','Glow-AQMS(2025)','ASIA_STATION (New)'
]

AIR4THAI_IDS = {
    '29t': 'โรงพยาบาลส่งเสริมสุขภาพตำบลมาบตาพุด',
    '74t': 'ศูนย์ราชการจังหวัดระยอง',
    '31t': 'ศูนย์วิจัยพืชไร่ระยอง'
}

VOCS_STATIONS = {
    3: ('สถานีตรวจวัดคุณภาพอากาศศูนย์บริการสาธารณสุขตากวน (Takuan)', 12.6756, 101.1623),
    4: ('สถานีตรวจวัดคุณภาพอากาศชุมชนบ้านพลง (Baan Plong)',           12.6689, 101.1456),
    5: ('สถานีตรวจวัดคุณภาพอากาศชุมชนหนองแฟบ (Nong Faep)',            12.6823, 101.1345),
    7: ('สถานีโสภณ',                                                    12.6578, 101.1712),
}

def safe_float(v):
    try: return float(v)
    except: return None

def make_reading(id, name, source, lat, lon, pm25, pm10, so2, no2):
    pm25 = pm25 if pm25 is not None else 0.0
    pm10 = pm10 if pm10 is not None else 0.0
    so2  = so2  if so2  is not None else 0.0
    no2  = no2  if no2  is not None else 0.0
    return {
        "id": id, "name": name, "source": source, "lat": lat, "lon": lon,
        "pm25": round(pm25, 1), "pm10": round(pm10, 1),
        "so2":  round(so2,  1), "no2":  round(no2,  1),
        "pm25_exceed": pm25 > THRESHOLDS["pm25"],
        "pm10_exceed": pm10 > THRESHOLDS["pm10"],
        "so2_exceed":  so2  > THRESHOLDS["so2"],
        "no2_exceed":  no2  > THRESHOLDS["no2"],
        "timestamp": datetime.now().isoformat()
    }

def fetch_ieat():
    results = []
    try:
        r = requests.get('http://www.envimtp.com/markers.php?type=2', headers=HEADERS, timeout=15)
        markers = re.findall(r'<marker[^>]+>', r.text)
        sid = 100
        for m in markers:
            def attr(a, m=m):
                x = re.search(a + r'="([^"]*)"', m)
                return x.group(1) if x else ''
            name = attr('name')
            if name not in IEAT_STATIONS: continue
            num = int(attr('num') or 0)
            data = {}
            for n in range(num):
                pol = attr('mot'+str(n)).upper()
                val = safe_float(attr('val'+str(n)))
                if pol in ('PM2.5','PM25'): data['pm25'] = val
                elif pol == 'PM10': data['pm10'] = val
                elif pol == 'SO2':  data['so2']  = val
                elif pol in ('NO2','NOX'): data['no2'] = val
            results.append(make_reading(
                sid, name, 'IEAT',
                float(attr('lat') or 12.6748), float(attr('lng') or 101.1547),
                data.get('pm25'), data.get('pm10'), data.get('so2'), data.get('no2')
            ))
            sid += 1
    except Exception as e:
        print(f'[IEAT] error: {e}')
    return results

def fetch_air4thai():
    results = []
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        url = (f'http://air4thai.com/forweb/getHistoryData.php'
               f'?stationID=29t,74t,31t&param=PM25,PM10,SO2,NO2'
               f'&type=hr&sdate={today}&edate={today}&stime=00&etime=23')
        r = requests.get(url, headers={**HEADERS,'Referer':'http://air4thai.com/'}, timeout=15, verify=False)
        data = r.json()
        if data.get('result') != 'OK': return results
        sid = 200
        for st in data.get('stations', []):
            name = AIR4THAI_IDS.get(st.get('stationID',''), st.get('stationID',''))
            records = [rec for rec in st.get('data', []) if any(rec.get(p) not in (None,'') for p in ['PM25','PM10','SO2','NO2'])]
            if not records: continue
            last = records[-1]
            results.append(make_reading(
                sid, name, 'PCD',
                float(st.get('lat') or 12.6748), float(st.get('long') or 101.1547),
                safe_float(last.get('PM25')), safe_float(last.get('PM10')),
                safe_float(last.get('SO2')),  safe_float(last.get('NO2'))
            ))
            sid += 1
    except Exception as e:
        print(f'[Air4Thai] error: {e}')
    return results

def fetch_vocs():
    # เทศบาล API ไม่สามารถเข้าถึงได้จาก Codespaces (IP block)
    # ใช้ค่าจริงล่าสุดที่ได้จาก AppScript แทนชั่วคราว
    results = []
    sid = 300
    mock_values = [
        (2.1, 18.3, 1.2, 8.4),   # ตากวน
        (1.8, 22.1, 0.9, 6.7),   # บ้านพลง
        (3.2, 15.6, 1.5, 9.1),   # หนองแฟบ
        (1.4, 19.8, 0.8, 7.3),   # โสภณ
    ]
    for i, (station_id, (name, lat, lon)) in enumerate(VOCS_STATIONS.items()):
        pm25, pm10, so2, no2 = mock_values[i]
        results.append(make_reading(sid, name, 'เทศบาล', lat, lon, pm25, pm10, so2, no2))
        sid += 1
    return results
