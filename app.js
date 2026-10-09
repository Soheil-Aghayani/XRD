import {parseData,detectPeaks,rankPhases} from './science.js';
import {openWorkbook,closeWorkbook} from './workbook.js';
const $=id=>document.getElementById(id);
const phases=await fetch('references.json').then(r=>r.json());
let analysis=null,selected=null;
const f=n=>Number(n).toFixed(3);
$('provenance').innerHTML=phases.map(p=>`<p><a href="${p.source}" target="_blank" rel="noopener">${p.name} · COD ${p.id}</a> · ${p.license} · <a href="${p.cif}" target="_blank" rel="noopener">Original CIF</a><br>SHA-256: <code style="overflow-wrap:anywhere">${p.cifSha256}</code></p>`).join('');
function invalidate(){analysis=null;selected=null;$('export').disabled=true;$('results').innerHTML='<p class="empty-small">Compare references to update results.</p>';$('chart').innerHTML='<div class="empty"><strong>Ready for comparison.</strong></div>';$('point-count').textContent='';}
for(const id of ['data','mode','unit','wavelength','tolerance','offset','min','max','threshold']) $(id).addEventListener('input',invalidate);
$('mode').addEventListener('change',()=>{$('format').textContent=$('mode').value==='scan'?'Two columns: position, intensity. Comma, tab or space separated.':'One position per line. Optional second column: intensity.';});
$('file').addEventListener('change',async()=>{
  const file=$('file').files[0];if(!file)return;invalidate();closeWorkbook();$('error').textContent='';
  try {
    if(file.size>5_000_000)throw new Error('Please use a file smaller than 5 MB.');
    if(/\.xlsx$/i.test(file.name)) await openWorkbook(file,({text,scan})=>{
      invalidate();$('data').value=text;$('mode').value=scan?'scan':'peaks';$('mode').dispatchEvent(new Event('change'));$('filename').textContent=file.name;$('error').textContent='';
    });
    else {$('data').value=await file.text();$('filename').textContent=file.name;$('mode').value='scan';$('mode').dispatchEvent(new Event('change'));}
  }catch(e){$('error').textContent=e.message;}
  finally {$('file').value='';}
});
function number(id,min,max){const raw=$(id).value;const v=Number(raw);if(!raw.trim()||!Number.isFinite(v)||v<min||v>max)throw new Error(`Check ${$(id).previousElementSibling.textContent}: expected ${min}–${max}.`);return v;}
function compare(){
  $('error').textContent='';
  try{
    const settings={unit:$('unit').value,wavelength:number('wavelength',0.01,10),tolerance:number('tolerance',0.001,2),offset:number('offset',-2,2),min:number('min',0,179),max:number('max',0,179),threshold:number('threshold',1,100)/100,scan:$('mode').value==='scan'};
    if(settings.min>=settings.max)throw new Error('Scan end must be greater than scan start.');
    if($('data').value.length>5_000_000)throw new Error('Input is too large. Please keep data below 5 MB.');
    const rows=parseData($('data').value,settings);
    if(rows.length>20000)throw new Error('This prototype supports up to 20,000 points.');
    if(settings.scan){settings.min=Math.max(settings.min,rows[0].x);settings.max=Math.min(settings.max,rows.at(-1).x);if(settings.min>=settings.max)throw new Error('The scan must contain a measured interval inside the selected range.');}
    const visible=rows.filter(p=>p.x>=settings.min&&p.x<=settings.max);
    if(!visible.length)throw new Error('No data lies inside the selected scan range.');
    const peaks=settings.scan?detectPeaks(visible,settings.threshold):visible;
    if(!peaks.length)throw new Error('No local maxima found. Review the threshold and scan data.');
    const results=rankPhases(peaks,phases,settings);
    analysis={version:'0.1.0',createdAt:new Date().toISOString(),settings,rows,peaks,results,limitations:['Selected four-phase calcium reference subset, not complete patterns','Scores are not probabilities or phase fractions','No calibration, background correction or instrument profile refinement','Unknown source CIF revision and calculator version']};
    selected=results[0].id;render();$('export').disabled=false;
  }catch(e){invalidate();$('error').textContent=e.message;}
}
$('search').addEventListener('click',compare);
function render(){
  const {results,peaks,rows,settings}=analysis;
  $('point-count').textContent=`${peaks.length} PEAKS · ${rows.length} POINTS`;
  $('results').innerHTML=results.map(r=>`<article class="candidate ${r.id===selected?'selected':''}"><div class="candidate-head"><div><h3>${r.name}</h3><small><a href="${r.source}" target="_blank" rel="noopener">COD ${r.id}</a></small></div><div class="score">${r.score.toFixed(1)}<small>MATCH SCORE / 100</small></div><button data-phase="${r.id}" aria-pressed="${r.id===selected}">${r.id===selected?'Selected':'Inspect'}</button></div><div class="metrics"><span>${r.matches.length}/${r.refs.length} reference lines matched</span><span>${r.mean===null?'No match':f(r.mean)+'° mean error'}</span><span>${r.unexplained.length} unexplained input peaks</span></div>${r.id===selected?evidence(r):''}</article>`).join('');
  $('results').querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.phase;render();}));
  draw(results.find(r=>r.id===selected),rows,peaks,settings);
}
function evidence(r){return `<div class="evidence"><table><thead><tr><th>Reference 2θ</th><th>Input 2θ</th><th>Δ2θ</th><th>Status</th></tr></thead><tbody>${r.refs.map(ref=>{const m=r.matches.find(m=>m.reference===ref.x);return `<tr><td>${f(ref.x)}°</td><td>${m?f(m.observed)+'°':'—'}</td><td>${m?f(m.error)+'°':'—'}</td><td>${m?'Matched':'Unmatched'}</td></tr>`;}).join('')}</tbody></table></div><p class="hint">Unexplained input peaks: ${r.unexplained.length?r.unexplained.map(p=>f(p.x)+'°').join(', '):'none within the selected range'}. Selected reference lines lack intensity and hkl metadata; unmatched lines cannot be treated as absent major reflections.</p>`;}
function draw(phase,rows,peaks,s){
  const W=850,H=240,L=48,R=20,T=15,B=48,base=H-B;
  const x=v=>L+(v-s.min)/(s.max-s.min)*(W-L-R);
  const visible=rows.filter(p=>p.x>=s.min&&p.x<=s.max),max=Math.max(...visible.map(p=>p.y),1),y=v=>base-25-v/max*(base-T-35);
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Entered diffraction data and selected ${phase.name} reference positions"><title>Input and ${phase.name} reference positions</title>`;
  for(let i=0;i<=7;i++){const v=s.min+(s.max-s.min)*i/7;svg+=`<line x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${base+20}" stroke="#edf0f2"/><text x="${x(v)}" y="${H-15}" fill="#74818a" font-size="10" text-anchor="middle">${v.toFixed(1)}</text>`;}
  if(s.scan)svg+=`<polyline points="${visible.map(p=>`${x(p.x)},${y(p.y)}`).join(' ')}" fill="none" stroke="#216450" stroke-width="1.5"/>`;
  else svg+=peaks.map(p=>`<line x1="${x(p.x)}" x2="${x(p.x)}" y1="${base-25}" y2="${y(p.y)}" stroke="#216450" stroke-width="2"/>`).join('');
  svg+=phase.refs.map(r=>`<line x1="${x(r.x)}" x2="${x(r.x)}" y1="${base+2}" y2="${base+20}" stroke="#8496b0" stroke-width="2"/>`).join('');
  svg+=`<line x1="${L}" x2="${W-R}" y1="${base-25}" y2="${base-25}" stroke="#d4dce0"/><text x="12" y="100" fill="#74818a" font-size="10" transform="rotate(-90 12 100)">${s.scan?'Intensity (relative)':'Entered peak intensity'}</text><text x="${W-20}" y="${H-1}" text-anchor="end" fill="#74818a" font-size="10">2θ · degrees</text></svg>`;
  $('chart').innerHTML=svg;
}
$('export').addEventListener('click',()=>{if(!analysis)return;const blob=new Blob([JSON.stringify(analysis,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='xrd-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
