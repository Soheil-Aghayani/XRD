import {read,utils} from './vendor/xlsx.mjs';
const $=id=>document.getElementById(id);
let workbook=null,apply=null,rows=[];
export function closeWorkbook(){workbook=null;apply=null;rows=[];$('workbook-import').hidden=true;}
export async function openWorkbook(file,onApply){
  workbook=read(await file.arrayBuffer(),{type:'array',cellDates:false,sheetRows:20005});apply=onApply;
  if(!workbook.SheetNames.length)throw new Error('This workbook has no worksheets.');
  $('worksheet').replaceChildren(...workbook.SheetNames.map(name=>new Option(name,name)));
  $('workbook-import').hidden=false;changeSheet();
}
function changeSheet(){
  const sheet=workbook.Sheets[$('worksheet').value];
  if(!sheet['!ref']) {rows=[];} else {
    const range=utils.decode_range(sheet['!fullref']??sheet['!ref']);
    if(range.e.c>255||range.e.r>20000)throw new Error('Choose a worksheet with at most 20,000 rows and 256 columns.');
    rows=utils.sheet_to_json(sheet,{header:1,defval:'',blankrows:true,range:0});
  }
  const width=Math.max(1,...rows.slice(0,25).map(row=>row.length));
  const options=Array.from({length:width},(_,i)=>new Option(`Column ${utils.encode_col(i)}`,String(i)));
  $('position-column').replaceChildren(...options);
  $('intensity-column').replaceChildren(new Option('None · peak list','none'),...options.map(o=>o.cloneNode(true)));
  $('intensity-column').value=width>1?'1':'none';
  const first=rows.findIndex(row=>typeof row[0]==='number');$('first-row').value=first>=0?String(first+1):'1';
  preview();
}
function preview(){
  const start=Number($('first-row').value)-1,p=Number($('position-column').value),v=$('intensity-column').value;
  const table=$('workbook-preview');table.replaceChildren();
  for(const row of rows.slice(Math.max(0,start),Math.max(0,start)+5)) {
    const tr=document.createElement('tr');
    for(const value of [row[p]??'',...(v==='none'?[]:[row[Number(v)]??''])]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}
    table.append(tr);
  }
}
$('worksheet').addEventListener('change',()=>{try{changeSheet();$('error').textContent='';}catch(e){$('error').textContent=e.message;rows=[];}});
for(const id of ['first-row','position-column','intensity-column'])$(id).addEventListener('input',preview);
$('cancel-workbook').addEventListener('click',closeWorkbook);
$('apply-workbook').addEventListener('click',()=>{
  try{
    const start=Number($('first-row').value)-1,p=Number($('position-column').value),v=$('intensity-column').value;
    if(!Number.isInteger(start)||start<0||start>=rows.length)throw new Error('Choose a valid first data row.');
    if(v!=='none'&&Number(v)===p)throw new Error('Position and intensity must use different columns.');
    const selected=[];
    for(let i=start;i<rows.length;i++){
      const row=rows[i];if(row.every(c=>c===''))continue;
      const values=[row[p],...(v==='none'?[]:[row[Number(v)]])];
      if(values.some(c=>c===''||c==null||typeof c==='boolean'||!Number.isFinite(Number(c))))throw new Error(`Worksheet row ${i+1}: selected columns must contain numeric data. Adjust the first row or columns.`);
      selected.push(values.map(Number).join('\t'));
    }
    if(!selected.length)throw new Error('No numeric data found in the selected columns.');
    apply({text:selected.join('\n'),scan:v!=='none'});closeWorkbook();
  }catch(e){$('error').textContent=e.message;}
});
