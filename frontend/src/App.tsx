import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API = '';

interface Station {
  id: number; name: string; source: string; lat: number; lon: number;
  pm25: number; pm10: number; so2: number; no2: number;
  pm25_exceed: boolean; pm10_exceed: boolean; so2_exceed: boolean; no2_exceed: boolean;
  timestamp: string;
}

const makeFlag = (color: string) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:28px;height:36px">
    <div style="position:absolute;top:0;left:7px;width:16px;height:16px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
  </div>`,
  iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -36]
});

const GROUP_LABELS: Record<string, string> = {
  PCD:   'สถานีตรวจวัดอากาศแบบต่อเนื่องของกรมควบคุมมลพิษ',
  IEAT:  'สถานีตรวจวัดอากาศแบบต่อเนื่องของการนิคมอุตสาหกรรมมาบตาพุด',
  เทศบาล: 'สถานีตรวจวัดอากาศแบบต่อเนื่องของเทศบาลนครมาบตาพุด',
};

const NAV = [
  { icon: '🗺️', label: 'ภาพรวม' },
  { icon: '🕐', label: 'ข้อมูลย้อนหลัง' },
  { icon: '📊', label: 'รายงาน' },
  { icon: '⚠️', label: 'ติดตามและเฝ้าระวัง' },
  { icon: '⚙️', label: 'การจัดการ' },
];

const SOURCE_COLOR: Record<string, string> = { PCD: '#22c55e', IEAT: '#22c55e', เทศบาล: '#22c55e' };

export default function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selected, setSelected] = useState<Station | null>(null);
  const [activeNav, setActiveNav] = useState(0);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/stations`);
      setStations(Array.isArray(res.data) ? res.data : []);
      setLastUpdate(new Date().toLocaleString('th-TH'));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 3600000); return () => clearInterval(t); }, []);

  const exceed = (s: Station) => s.pm25_exceed || s.pm10_exceed || s.so2_exceed || s.no2_exceed;

  const ValCell = ({ val, over }: { val: number; over: boolean }) => (
    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
      <span style={{
        display: 'inline-block', minWidth: 64, padding: '3px 8px', borderRadius: 6,
        background: over ? '#fee2e2' : '#dcfce7',
        color: over ? '#dc2626' : '#16a34a',
        fontWeight: 600, fontSize: 13
      }}>{val}</span>
    </td>
  );

  const ParamCard = ({ label, val, over }: { label: string; val: number; over: boolean }) => (
    <div style={{ marginBottom: 10, padding: '10px 14px', background: over ? '#fff1f2' : '#f0fdf4', borderRadius: 10, borderLeft: `4px solid ${over ? '#ef4444' : '#22c55e'}` }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: over ? '#ef4444' : '#0ea5e9' }}>
        {val} {over && <span style={{ fontSize: 14 }}>▲</span>}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>⏱ Max. Value</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Segoe UI',sans-serif", overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 68, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, gap: 4, zIndex: 100 }}>
        <div style={{ marginBottom: 14, width: 38, height: 38, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
        {NAV.map((item, i) => (
          <div key={i} onClick={() => setActiveNav(i)} style={{
            width: 54, padding: '8px 0', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
            background: activeNav === i ? '#eff6ff' : 'transparent',
            borderLeft: activeNav === i ? '3px solid #3b82f6' : '3px solid transparent'
          }}>
            <div style={{ fontSize: 18 }}>{item.icon}</div>
            <div style={{ fontSize: 9, color: activeNav === i ? '#3b82f6' : '#94a3b8', marginTop: 2, lineHeight: 1.2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '5px 14px', fontSize: 13, color: '#475569' }}>📅 วันนี้</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '5px 14px', fontSize: 13, color: '#475569' }}>🕐 ล่าสุด</div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>อัพเดต: {lastUpdate}</div>
        </div>

        {/* Map + Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ flex: 1 }}>
            <MapContainer center={[12.6748, 101.1547]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {stations.map(s => (
                <Marker key={s.id} position={[s.lat, s.lon]}
                  icon={makeFlag(exceed(s) ? '#ef4444' : '#22c55e')}
                  eventHandlers={{ click: () => setSelected(s) }}>
                  <Popup>{s.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {selected && (
            <div style={{ width: 270, background: '#fff', borderLeft: '1px solid #e2e8f0', overflowY: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.4, flex: 1 }}>{selected.name}</div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
              <ParamCard label="PM2.5 (µg/m³)" val={selected.pm25} over={selected.pm25_exceed} />
              <ParamCard label="PM10 (µg/m³)"  val={selected.pm10} over={selected.pm10_exceed} />
              <ParamCard label="SO2 (µg/m³)"   val={selected.so2}  over={selected.so2_exceed}  />
              <ParamCard label="NO2 (µg/m³)"   val={selected.no2}  over={selected.no2_exceed}  />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>อัพเดตล่าสุด: {lastUpdate}</div>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ height: 300, overflowY: 'auto', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>รายงานคุณภาพอากาศ</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>อัพเดต: {lastUpdate}</span>
          </div>
          {['เทศบาล','IEAT','PCD'].map(grp => {
            const grpStations = stations.filter(s => s.source === grp);
            if (!grpStations.length) return null;
            return (
              <div key={grp}>
                <div style={{ padding: '6px 20px', background: '#f8fafc', fontWeight: 600, fontSize: 12, color: '#334155' }}>
                  ▾ {GROUP_LABELS[grp]}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', fontSize: 12, color: '#64748b' }}>
                      <th style={{ padding: '6px 20px', textAlign: 'left', fontWeight: 500 }}>สถานี</th>
                      {['PM2.5 (µg/m³)','PM10 (µg/m³)','SO2 (ppm)','NO2 (ppm)'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grpStations.map((s, i) => (
                      <tr key={s.id} onClick={() => setSelected(s)} style={{
                        background: selected?.id === s.id ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                        cursor: 'pointer', borderLeft: selected?.id === s.id ? '3px solid #3b82f6' : '3px solid transparent'
                      }}>
                        <td style={{ padding: '6px 20px', fontSize: 13, color: '#334155' }}>{i+1}. {s.name}</td>
                        <ValCell val={s.pm25} over={s.pm25_exceed} />
                        <ValCell val={s.pm10} over={s.pm10_exceed} />
                        <ValCell val={s.so2}  over={s.so2_exceed}  />
                        <ValCell val={s.no2}  over={s.no2_exceed}  />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
