export const DEMO = '32.284\n37.450\n54.001\n64.330\n67.564';
export function toAngle(value,unit,wavelength) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Peak positions must be positive numbers.');
  const angle = unit === 'd' ? 2*Math.asin(wavelength/(2*value))*180/Math.PI : value;
  if (!Number.isFinite(angle) || angle >= 180) throw new Error('A peak is outside the valid diffraction range for this wavelength.');
  return angle;
}
export function parseData(text,{unit='angle',wavelength=1.5406,scan=false}={}) {
  const rows=[];
  for (const [i,line] of text.trim().split(/\r?\n/).entries()) {
    if (!line.trim() || /^\s*[#;]/.test(line)) continue;
    const parts=line.trim().split(/[\s,;]+/);
    if (i===0 && /^(2.?theta|angle|d(?:spacing)?|position)\b/i.test(parts[0])) continue;
    const values=parts.map(Number);
    if (values.length > 2 || values.some(v=>!Number.isFinite(v)) || (scan && values.length !== 2)) throw new Error(`Line ${i+1}: use ${scan?'two columns: position and intensity':'one position per line, with optional intensity'}.`);
    const x=toAngle(values[0],unit,wavelength), y=values[1]??1;
    if(y<0) throw new Error(`Line ${i+1}: intensity must be nonnegative.`);
    rows.push({x,y});
  }
  if(!rows.length) throw new Error('Enter at least one peak or import a scan.');
  rows.sort((a,b)=>a.x-b.x);
  if(rows.some((p,i)=>i && Math.abs(p.x-rows[i-1].x)<1e-8)) throw new Error('Duplicate positions found. Merge them before searching.');
  return rows;
}
export function detectPeaks(rows,threshold=0.1,separation=0.2) {
  const max=Math.max(...rows.map(p=>p.y));
  const candidates=rows.filter((p,i)=>i>0&&i<rows.length-1&&p.y>=max*threshold&&p.y>rows[i-1].y&&p.y>=rows[i+1].y).sort((a,b)=>b.y-a.y);
  const peaks=[];for(const p of candidates) if(peaks.every(q=>Math.abs(q.x-p.x)>=separation)) peaks.push(p);
  return peaks.sort((a,b)=>a.x-b.x);
}
export function reviewPeaks(text,settings){
  if(text.length>5_000_000)throw new Error('Keep reviewed peak data below 5 MB.');
  const peaks=parseData(text,{unit:'angle',wavelength:settings.wavelength});
  if(peaks.length>20000)throw new Error('This prototype supports at most 20,000 reviewed peaks.');
  if(peaks.some(p=>p.x<settings.min||p.x>settings.max))throw new Error('Reviewed peaks must stay within the measured analysis range.');
  return peaks;
}
export function describeEvidence(results){
  const top=results[0];
  if(!top||!top.matches.length)return 'No reference positions match within the current tolerance. Review wavelength, peak positions and library coverage.';
  const parts=[`${top.name} ranks first within this four-phase reference subset.`];
  if(top.matches.length<3)parts.push('Fewer than three reference lines match; positional evidence is limited.');
  if(results[1]?.matches.length&&top.score-results[1].score<5)parts.push(`The next candidate, ${results[1].name}, is within five score points. The ranking is ambiguous.`);
  if(top.refs.length<3)parts.push('The analyzed range contains fewer than three reference lines for this candidate. A high score may reflect a narrow scan range.');
  if(top.unexplained.length)parts.push(`${top.unexplained.length} input peak${top.unexplained.length===1?' remains':'s remain'} unexplained by this candidate.`);
  return parts.join(' ');
}
export function rankPhases(peaks,phases,{wavelength,tolerance,offset,min,max}) {
  return phases.map(phase=>{
    const refs=phase.positions.map(angle=>({original:angle,d:1.5406/(2*Math.sin(angle*Math.PI/360))})).filter(r=>wavelength<2*r.d).map(r=>({...r,x:toAngle(r.d,'d',wavelength)+offset})).filter(r=>r.x>=min&&r.x<=max);
    const edges=refs.flatMap((r,ri)=>peaks.map((p,pi)=>({ri,pi,error:p.x-r.x}))).filter(e=>Math.abs(e.error)<=tolerance).sort((a,b)=>Math.abs(a.error)-Math.abs(b.error));
    const usedR=new Set(),usedP=new Set(),matches=[];
    for(const e of edges) if(!usedR.has(e.ri)&&!usedP.has(e.pi)){usedR.add(e.ri);usedP.add(e.pi);matches.push({...e,reference:refs[e.ri].x,observed:peaks[e.pi].x});}
    const coverage=refs.length?matches.length/refs.length:0;
    const mean=matches.length?matches.reduce((s,m)=>s+Math.abs(m.error),0)/matches.length:null;
    const score=matches.length?100*coverage*(1-0.5*mean/tolerance):0;
    return {...phase,refs,matches,score,mean,unexplained:peaks.filter((_,i)=>!usedP.has(i)),missing:refs.filter((_,i)=>!usedR.has(i))};
  }).sort((a,b)=>b.score-a.score||b.matches.length-a.matches.length);
}
