import { useMemo, useState } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landData from 'world-atlas/land-110m.json';
import { LocateFixed, Minus, Plus, MapPin } from 'lucide-react';
import { floatColor, type Profile } from '../types';

const topology = landData as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);
const labels: [string, [number, number], string][] = [
  ['INDIA', [78, 20], 'land-label'], ['SRI LANKA', [81, 6], 'small-label'],
  ['MADAGASCAR', [47, -21], 'small-label'], ['INDIAN OCEAN', [74, -16], 'ocean-label'],
  ['MALDIVES', [72.5, 3], 'small-label'], ['ARABIAN SEA', [63, 14], 'sea-label'],
  ['BAY OF BENGAL', [88, 15], 'sea-label'], ['EAST AFRICA', [39, -3], 'land-label'],
];

export default function OceanMap({ profiles, selected, onSelect }: { profiles: Profile[]; selected: string; onSelect: (id: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const projection = useMemo(() => geoMercator().center([73, -1]).scale(620 * zoom).translate([480, 205]), [zoom]);
  const path = geoPath(projection);
  const groups = [...new Set(profiles.map(p => p.wmo))];
  return <div className="ocean-map">
    <svg viewBox="0 0 960 430" className="map-svg" aria-label="Indian Ocean map with observed Argo profile locations">
      <defs><clipPath id="map-clip"><rect width="960" height="430" /></clipPath><radialGradient id="ocean-fill"><stop stopColor="#eaf5f7" /><stop offset="1" stopColor="#dcecf2" /></radialGradient></defs>
      <rect width="960" height="430" fill="url(#ocean-fill)" />
      <g clipPath="url(#map-clip)">
        <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="#cbdfe6" strokeWidth="0.7" />
        <path d={path(land) ?? ''} fill="#f5f5eb" stroke="#b9cec8" strokeWidth="1" />
        {labels.map(([label, point, className]) => {
          const [x, y] = projection(point)!;
          return <text key={label} x={x} y={y} textAnchor="middle" className={className}>{label}</text>;
        })}
        {groups.map(wmo => {
          const points = profiles.filter(p => p.wmo === wmo).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
          return <path key={wmo} d={path({ type: 'LineString', coordinates: points.map(p => [p.longitude, p.latitude]) }) ?? ''} fill="none" stroke={floatColor(wmo)} strokeWidth="1.8" strokeDasharray="4 5" opacity="0.65" />;
        })}
        {profiles.map(p => {
          const [x, y] = projection([p.longitude, p.latitude])!;
          const active = p.id === selected;
          return <g key={p.id} transform={`translate(${x},${y})`} className="map-point" role="button" tabIndex={0}
            aria-label={`Select float ${p.wmo} cycle ${p.cycle}`} aria-pressed={active}
            onClick={() => onSelect(p.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(p.id); } }}>
            <title>{`Float ${p.wmo} · cycle ${p.cycle} · ${p.timestamp.slice(0,10)}`}</title>
            <circle r="13" fill="transparent" />
            {active && <><circle r="17" fill={floatColor(p.wmo)} opacity="0.12"/><circle r="11" fill="none" stroke={floatColor(p.wmo)} opacity="0.4" /></>}
            <circle r={active ? 6 : 4.5} fill={floatColor(p.wmo)} stroke="white" strokeWidth="2" />
            {active && <g transform="translate(16,-37)"><rect width="123" height="30" rx="6" fill="#fff" stroke="#d5e4e6"/><text x="10" y="19" fill="#294653" fontSize="11" fontWeight="600">{p.wmo} · #{p.cycle}</text></g>}
          </g>;
        })}
      </g>
    </svg>
    <div className="map-caption"><MapPin size={13}/><span>Observed positions</span><span className="caption-divider"/>May 2025</div>
    <div className="map-tools">
      <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(2, z + .25))} disabled={zoom === 2}><Plus size={17}/></button>
      <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(.75, z - .25))} disabled={zoom === .75}><Minus size={17}/></button>
      <button aria-label="Reset map view" onClick={() => setZoom(1)}><LocateFixed size={17}/></button>
    </div>
    <div className="map-attribution">Natural Earth · Argo / INCOIS</div>
    <div className="map-note">Dashed lines connect observations; paths between them are unmeasured.</div>
  </div>;
}
