import { useMemo, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, PlotMouseEvent, PlotlyHTMLElement } from 'plotly.js';
import { temperatureSalinityPoints } from '../analysis';
import { floatColor, type ProfileResult } from '../types';
import Evidence from './Evidence';
const Plot=createPlotlyComponent(Plotly);
type Point=ReturnType<typeof temperatureSalinityPoints>[number];
export default function TemperatureSalinity({results,scope}:{results:ProfileResult[];scope:string}) {
  const [float,setFloat]=useState('all');
  const [color,setColor]=useState('depth');
  const [selected,setSelected]=useState<Point|null>(null);
  const [open,setOpen]=useState(false);
  const floats=[...new Set(results.map(r=>r.profile.wmo))].sort();
  const filtered=useMemo(()=>results.filter(r=>float==='all'||r.profile.wmo===float),[results,float]);
  const points=useMemo(()=>temperatureSalinityPoints(filtered),[filtered]);
  const groups=color==='float'?floats.filter(f=>float==='all'||float===f).map(f=>({name:f,points:points.filter(p=>p.result.profile.wmo===f)})):[{name:'Paired samples',points}];
  const traces:Data[]=groups.map(g=>({type:'scatter',mode:'markers',name:g.name,x:g.points.map(p=>p.observation.salinity),y:g.points.map(p=>p.observation.temperature),text:g.points.map(p=>`Float ${p.result.profile.wmo} · cycle ${p.result.profile.cycle}<br>${p.result.profile.timestamp}<br>Source level ${p.observation.source_level} · ${p.observation.depth_m.toFixed(1)} m`),marker:{size:6,opacity:0.75,color:color==='depth'?g.points.map(p=>p.observation.depth_m):floatColor(g.name),...(color==='depth'?{colorscale:'Viridis',showscale:true,cmin:Math.min(...filtered.map(r=>r.plan.min_depth)),cmax:Math.max(...filtered.map(r=>r.plan.max_depth)),colorbar:{title:{text:'Depth (m)'},thickness:12}}:{})},hovertemplate:'%{x:.3f} PSS-78<br>%{y:.3f} °C<br>%{text}<extra></extra>'}));
  const click=(event:PlotMouseEvent)=>{const p=event.points[0];const point=groups[p?.curveNumber]?.points[p?.pointIndex];if(point){setSelected(point);setOpen(true);}};
  const bind=(g:PlotlyHTMLElement)=>{g.removeAllListeners('plotly_click');g.on('plotly_click',click);};
  const download=()=>{const data={method:'same-level-temperature-salinity-v1',scope,float,profiles:filtered,points:points.map(p=>({profile_id:p.result.profile.id,source_level:p.observation.source_level,temperature_c:p.observation.temperature,practical_salinity:p.observation.salinity,depth_m:p.observation.depth_m})),note:'Observed in-situ temperature and practical salinity, paired at the same source level. No interpolation, density conversion or water-mass classification.'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='floatchat-temperature-salinity.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <section className="profile-detail ts-panel" aria-labelledby="ts-title"><div className="detail-heading"><div><div className="eyebrow">TWO MEASUREMENTS, ONE SAMPLE</div><h2 id="ts-title">Temperature–salinity diagram</h2><p>{scope}</p></div><button className="button secondary" disabled={!points.length} onClick={download}>Export paired samples</button></div>
    <div className="section-controls"><label>Float<select aria-label="TS float" value={float} onChange={e=>{setFloat(e.target.value);setSelected(null);setOpen(false);}}><option value="all">All available floats</option>{floats.map(f=><option key={f}>{f}</option>)}</select></label><label>Color by<select aria-label="TS color" value={color} onChange={e=>setColor(e.target.value)}><option value="depth">Depth</option><option value="float">Float</option></select></label></div>
    <p className="section-note">{points.length.toLocaleString()} same-level pairs across {new Set(points.map(p=>p.result.profile.id)).size} profiles. Both variables must be selected and pass the current QC policy.</p>
    {points.length?<Plot data={traces} layout={{autosize:true,height:400,margin:{l:65,r:80,t:20,b:60},paper_bgcolor:'transparent',plot_bgcolor:'#f6fafb',font:{family:'Segoe UI, sans-serif',color:'#526d7a',size:11},xaxis:{title:{text:'Practical salinity (PSS-78, dimensionless)'},zeroline:false},yaxis:{title:{text:'In-situ temperature (°C)'},zeroline:false},showlegend:color==='float',legend:{orientation:'h',y:1.12},hovermode:'closest',dragmode:'zoom'}} config={{responsive:true,displayModeBar:false}} style={{width:'100%',height:400}} useResizeHandler onInitialized={(_,g)=>bind(g as PlotlyHTMLElement)} onUpdate={(_,g)=>bind(g as PlotlyHTMLElement)}/>:<div className="chart-empty">No paired samples. Select both temperature and salinity, then run the query, or choose another float.</div>}
    <p className="section-note">Each point uses temperature and salinity from the same original source level. No interpolation or water-mass classification. In-situ temperature is not potential or Conservative Temperature. Positions and dates vary between profiles. Drag to zoom; double-click to reset; click a point for evidence.</p>
    <details><summary>Inspect samples using the keyboard</summary><label className="ts-sample-picker">Paired sample<select aria-label="TS paired sample" value={selected?`${selected.result.profile.id}:${selected.observation.source_level}`:''} onChange={e=>{setSelected(points.find(p=>`${p.result.profile.id}:${p.observation.source_level}`===e.target.value)??null);}}><option value="">Choose a sample</option>{points.map(p=><option key={`${p.result.profile.id}:${p.observation.source_level}`} value={`${p.result.profile.id}:${p.observation.source_level}`}>{p.result.profile.wmo} / {p.result.profile.cycle} · level {p.observation.source_level} · {p.observation.depth_m.toFixed(1)} m</option>)}</select></label><button className="button secondary" disabled={!selected} onClick={()=>setOpen(true)}>Inspect paired source</button></details>
    <Evidence result={selected?.result??null} sample={selected?.observation??null} open={open} onClose={()=>setOpen(false)}/>
  </section>;
}
