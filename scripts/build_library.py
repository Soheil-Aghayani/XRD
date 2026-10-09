"""Build traceable COD powder references. No sample data is sent to COD."""
import threading
import concurrent.futures, hashlib, importlib.metadata, json, re, warnings
from datetime import datetime, timezone
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pymatgen.io.cif import CifParser
from pymatgen.analysis.diffraction.xrd import XRDCalculator

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'library'
BASE = 'https://www.crystallography.net/cod/'
TARGETS = ['Quartz','Cristobalite','Tridymite','Anatase','Rutile','Brookite','Corundum','Hematite','Magnetite','Goethite','Wustite','Periclase','Brucite','Aragonite','Vaterite','Dolomite','Gypsum','Anhydrite','Halite','Sylvite','Fluorite','Hydroxylapatite','Zincite','Graphite','Diamond','Silicon','Copper','Pyrite','Sphalerite','Barite']
FIXED = [('CaO','1000044'),('Calcite','9000095'),('Portlandite','1001769'),('Calcium chloride hexahydrate','1001770')]
VERSIONS = {name: importlib.metadata.version(name) for name in ['pymatgen','pymatgen-core','numpy','spglib']}
PARSER_LOCK=threading.Lock()
NOW = datetime.now(timezone.utc).isoformat()

def get(url,**kwargs):
    session=requests.Session();session.mount('https://',HTTPAdapter(max_retries=Retry(total=3,backoff_factor=1,status_forcelist=[429,500,502,503,504])))
    response=session.get(url,timeout=35,headers={'User-Agent':'XRD-Workbench/0.3 scientific reference build'},**kwargs)
    response.raise_for_status();return response

def candidates(name):
    cache=LIB/'queries'/f'{name.lower()}.json'
    if cache.exists(): records=json.loads(cache.read_text(encoding='utf8'))
    else:
        records=get(BASE+'result',params={'text':name,'format':'json'}).json()
        cache.write_text(json.dumps(records,ensure_ascii=False),encoding='utf8')
    exact=[r for r in records if any(str(r.get(key) or '').casefold()==name.casefold() for key in ['mineral','commonname']) and not r.get('duplicateof') and 'coordinates' in (r.get('flags') or '')]
    def acceptable(record):
        temp=record.get('diffrtemp') or record.get('celltemp')
        pressure=record.get('cellpressure') or record.get('diffrpressure')
        return (not temp or 270<=float(temp)<=330) and (not pressure or float(pressure)==0) and not re.search(r'high.pressure|high.temperature',record.get('title') or '',re.I)
    exact=[r for r in exact if acceptable(r)]
    return sorted(exact,key=lambda r:(not bool(r.get('diffrtemp') or r.get('celltemp')),int(r['file'])))[:4]

def calculate(name,id,record=None):
    path=LIB/'cif'/f'{id}.cif'
    if not path.exists():path.write_bytes(get(BASE+id+'.cif').content)
    retrieval=LIB/'cif'/f'{id}.json'
    if not retrieval.exists():retrieval.write_text(json.dumps({'retrievedAt':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),'record':record}),encoding='utf8')
    retrieval_data=json.loads(retrieval.read_text(encoding='utf8'));record=record or retrieval_data.get('record')
    raw=path.read_bytes()
    with PARSER_LOCK, warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        parser=CifParser(str(path),occupancy_tolerance=1.0)
        structures=parser.parse_structures(primitive=False,on_error='raise')
    if any('Defaulting to P1' in str(w.message) or 'incommensurate' in str(w.message).lower() or 'Missing elements' in str(w.message) for w in caught):raise ValueError('Missing symmetry, elements, or modulated structure requires manual review')
    if len(structures)!=1:raise ValueError('Multiple structure blocks require manual review')
    structure=structures[0]
    if not structure.is_ordered:raise ValueError('Disordered/partial occupancy structure excluded')
    metadata=next(iter(parser.as_dict().values()))
    calculator=XRDCalculator(wavelength=1.5406,symprec=0)
    # Calculate intensity at the documented wavelength for accessible reflections.
    cu=calculator.get_pattern(structure,scaled=True,two_theta_range=(0,179))
    reflections=[]
    for x,y,hkl,d in zip(cu.x,cu.y,cu.hkls,cu.d_hkls):
        reflections.append({'twoTheta':float(x),'d':float(d),'intensity':float(y),'hkls':[{'hkl':[int(v) for v in h['hkl']],'multiplicity':int(h['multiplicity'])} for h in hkl]})
    text=raw.decode('utf8',errors='replace');revision=re.search(r'\$Revision:\s*(\d+)',text)
    return {'id':id,'name':name,'formula':structure.composition.reduced_formula,'elements':sorted({e.symbol for e in structure.composition.elements}),'spaceGroup':metadata.get('_space_group_name_H-M_alt',metadata.get('_symmetry_space_group_name_H-M','unknown')),'source':BASE+id+'.html','cif':BASE+id+'.cif','localCif':'library/cif/'+id+'.cif','license':'CC0-1.0','cifSha256':hashlib.sha256(raw).hexdigest(),'revision':revision.group(1) if revision else (record or {}).get('svnrevision'),'retrievedAt':retrieval_data['retrievedAt'],'referenceWavelengthAngstrom':1.5406,'calculatorVersion':VERSIONS,'calculation':{'engine':'pymatgen XRDCalculator','wavelengthAngstrom':1.5406,'twoThetaRange':[0,179],'symprec':0,'scaledMaximum':100,'debyeWaller':'not supplied','intensityKind':'calculated, not experimental'},'reflections':reflections,'positions':[r['twoTheta'] for r in reflections],'temperatureK':(record or {}).get('diffrtemp') or metadata.get('_diffrn_ambient_temperature'),'pressure':(record or {}).get('diffrpressure') or metadata.get('_diffrn_ambient_pressure'),'publication':{'title':metadata.get('_publ_section_title') or (record or {}).get('title'),'authors':metadata.get('_publ_author_name') or (record or {}).get('authors'),'journal':metadata.get('_journal_name_full'),'year':metadata.get('_journal_year'),'doi':metadata.get('_journal_paper_doi')},'parserWarnings':list(dict.fromkeys(str(w.message) for w in caught)),'tableOrigin':'Complete calculated pattern in 0أ¢â‚¬â€œ179 degrees at the reference wavelength; numerical cutoff defined by pymatgen'}

def task(name):
    failures=[]
    for r in candidates(name):
        try:return calculate(name,r['file'],r),failures
        except Exception as e:failures.append({'name':name,'id':r['file'],'reason':str(e)})
    return None,failures or [{'name':name,'reason':'No ordered ambient-condition candidate found'}]

if __name__=='__main__':
    LIB.mkdir(exist_ok=True);(LIB/'cif').mkdir(exist_ok=True);(LIB/'queries').mkdir(exist_ok=True)
    references=[];excluded=[]
    import sys
    if '--offline' in sys.argv:
        existing=json.loads((ROOT/'references.json').read_text(encoding='utf8'))
        rebuilt=[calculate(p['name'],p['id']) for p in existing]
        (ROOT/'references.json').write_text(json.dumps(rebuilt,ensure_ascii=False,separators=(',',':')),encoding='utf8')
        print('Rebuilt pinned references:',len(rebuilt));raise SystemExit(0)
    for name,id in FIXED:
        try:references.append(calculate(name,id));print('Calculated',name,flush=True)
        except Exception as e:excluded.append({'name':name,'id':id,'reason':str(e)});print('Excluded',name,str(e),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(task,name):name for name in TARGETS}
        for future in concurrent.futures.as_completed(futures):
            name=futures[future]
            try:
                result,errors=future.result();excluded.extend(errors)
                if result:references.append(result);print('Calculated',name,len(result['reflections']),flush=True)
                else:print('No candidate',name,flush=True)
            except Exception as e:excluded.append({'name':name,'reason':str(e)});print('Failed',name,str(e),flush=True)
    references.sort(key=lambda r:r['name'])
    if len(references)<10:raise RuntimeError('Insufficient successful reference build; existing references unchanged')
    (ROOT/'references.json').write_text(json.dumps(references,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    (LIB/'manifest.json').write_text(json.dumps({'builtAt':NOW,'versions':VERSIONS,'count':len(references),'selection':'Exact mineral/common name, coordinates, ordered structure, ambient conditions when recorded; one representative per requested name','excluded':excluded},indent=2),encoding='utf8')
    print('Library built:',len(references),flush=True)
