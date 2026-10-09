import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEMO,parseData,rankPhases,detectPeaks,toAngle} from './science.js';
import {reviewPeaks,describeEvidence} from './science.js';
const phases=JSON.parse(readFileSync(new URL('./references.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const settings={wavelength:1.5406,tolerance:0.2,offset:0,min:10,max:80};
test('synthetic CaO ranks first with all five positions',()=>{const r=rankPhases(parseData(DEMO),phases,settings);assert.equal(r[0].id,'1000044');assert.equal(r[0].matches.length,5);assert.ok(r[0].score>99.99);});
test('Bragg conversion respects wavelength and rejects inaccessible d',()=>{assert.ok(Math.abs(toAngle(2,'d',1.5406)-45.3061)<0.001);assert.throws(()=>toAngle(.1,'d',1.5406));});
test('a single observed peak cannot match multiple reference lines',()=>{const r=rankPhases([{x:30,y:1}],[{positions:[29.99,30.01]}],settings)[0];assert.equal(r.matches.length,1);});
test('no overlap yields zero score and all unexplained peaks',()=>{const r=rankPhases([{x:15,y:1}],phases,settings);assert.ok(r.every(p=>p.score===0&&p.unexplained.length===1));});
test('out of range references do not lower coverage',()=>{const r=rankPhases([{x:32.284,y:1}],phases,{...settings,min:30,max:34})[0];assert.equal(r.refs.length,1);assert.ok(r.score>99.99);});
test('parsing refuses duplicate, invalid and negative intensity data',()=>{for(const s of ['30\n30','bad\n12','30,-1'])assert.throws(()=>parseData(s));assert.equal(parseData('angle,intensity\n30,12',{scan:true}).length,1);});
test('scan detector selects separated local maxima',()=>{const rows=parseData('10,1\n10.1,5\n10.2,1\n11,9\n11.1,1',{scan:true});assert.equal(detectPeaks(rows).length,2);});
test('inaccessible reference reflections are skipped for long wavelengths',()=>{assert.doesNotThrow(()=>rankPhases([{x:30,y:1}],phases,{...settings,wavelength:5}));});
test('reviewed peaks validate range, duplicates and empty edits',()=>{
  assert.equal(reviewPeaks('32.284\t100\n37.45\t80',settings).length,2);
  for(const text of ['9\n32','32\n32',''])assert.throws(()=>reviewPeaks(text,settings));
});
test('narrow-range high scores are described as limited evidence',()=>{
  const results=rankPhases([{x:32.284,y:1}],phases,{...settings,min:30,max:34});
  assert.match(describeEvidence(results),/narrow scan range/);
});
test('close candidate scores are flagged as ambiguous',()=>{
  assert.match(describeEvidence([{name:'A',matches:[1,2,3],refs:[1,2,3],unexplained:[],score:80},{name:'B',matches:[1],score:78}]),/ambiguous/);
});
