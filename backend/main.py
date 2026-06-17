from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fetchers import fetch_ieat, fetch_air4thai, fetch_vocs
from datetime import datetime
import asyncio, os

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_cache = {"data": [], "updated_at": None}

async def refresh_cache():
    while True:
        try:
            print(f"[{datetime.now()}] fetching real data...")
            data = fetch_ieat() + fetch_air4thai() + fetch_vocs()
            if data:
                _cache["data"] = data
                _cache["updated_at"] = datetime.now().isoformat()
                print(f"✅ loaded {len(data)} stations")
        except Exception as e:
            print(f"❌ error: {e}")
        await asyncio.sleep(3600)

@app.on_event("startup")
async def startup():
    asyncio.create_task(refresh_cache())

@app.get("/api/stations")
def get_stations():
    return _cache["data"] if _cache["data"] else _fallback_mock()

@app.get("/api/status")
def status():
    return {"status": "ok", "updated_at": _cache["updated_at"], "count": len(_cache["data"])}

def _fallback_mock():
    import random
    STATIONS = [
        {"id":1,"name":"PCD มาบตาพุด","source":"PCD","lat":12.6748,"lon":101.1547},
        {"id":2,"name":"PCD บ้านฉาง","source":"PCD","lat":12.7123,"lon":101.0891},
        {"id":3,"name":"PCD ระยอง","source":"PCD","lat":12.6833,"lon":101.2667},
        {"id":4,"name":"IEAT สถานี 1","source":"IEAT","lat":12.6612,"lon":101.1423},
        {"id":5,"name":"IEAT สถานี 2","source":"IEAT","lat":12.6534,"lon":101.1678},
        {"id":6,"name":"IEAT สถานี 3","source":"IEAT","lat":12.6891,"lon":101.1234},
        {"id":7,"name":"IEAT สถานี 4","source":"IEAT","lat":12.6445,"lon":101.1890},
        {"id":8,"name":"IEAT สถานี 5","source":"IEAT","lat":12.6723,"lon":101.1056},
        {"id":9,"name":"IEAT สถานี 6","source":"IEAT","lat":12.6567,"lon":101.1345},
        {"id":10,"name":"IEAT สถานี 7","source":"IEAT","lat":12.6812,"lon":101.1789},
        {"id":11,"name":"IEAT สถานี 8","source":"IEAT","lat":12.6634,"lon":101.1567},
        {"id":12,"name":"เทศบาล สถานี 1","source":"เทศบาล","lat":12.6756,"lon":101.1623},
        {"id":13,"name":"เทศบาล สถานี 2","source":"เทศบาล","lat":12.6689,"lon":101.1456},
        {"id":14,"name":"เทศบาล สถานี 3","source":"เทศบาล","lat":12.6823,"lon":101.1345},
        {"id":15,"name":"เทศบาล สถานี 4","source":"เทศบาล","lat":12.6578,"lon":101.1712},
    ]
    T = {"pm25":37.5,"pm10":120,"so2":300,"no2":170}
    result = []
    for s in STATIONS:
        pm25=round(random.uniform(10,60),1); pm10=round(random.uniform(30,150),1)
        so2=round(random.uniform(50,400),1); no2=round(random.uniform(30,200),1)
        result.append({**s,"pm25":pm25,"pm10":pm10,"so2":so2,"no2":no2,
            "pm25_exceed":pm25>T["pm25"],"pm10_exceed":pm10>T["pm10"],
            "so2_exceed":so2>T["so2"],"no2_exceed":no2>T["no2"],
            "timestamp":datetime.now().isoformat()})
    return result

# Serve React frontend
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=os.path.join(static_path, "static")), name="static-files")

    @app.get("/")
    def root():
        return FileResponse(os.path.join(static_path, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api"): 
            return {"error": "not found"}
        return FileResponse(os.path.join(static_path, "index.html"))

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class GithubCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["X-Frame-Options"] = "ALLOWALL"
        return response

app.add_middleware(GithubCORSMiddleware)
