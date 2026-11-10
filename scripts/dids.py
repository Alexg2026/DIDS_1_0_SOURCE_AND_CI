#!/usr/bin/env python3
"""DIDS: deterministic, offline, standard-library build/QA for legacy V34."""
import argparse, hashlib, json, os, shutil, struct, subprocess, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/'config/project.json').read_text(encoding='utf-8'))
SRC=ROOT/CFG['game_source']; DIST=ROOT/'dist'; REPORTS=ROOT/'reports'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def webp_size(p):
 # VP8X, VP8 and VP8L formats; no external dependencies.
 with p.open('rb') as f: data=f.read(64)
 if len(data)<30 or data[:4]!=b'RIFF' or data[8:12]!=b'WEBP':raise ValueError('invalid WEBP')
 typ=data[12:16]
 if typ==b'VP8X':return (1+int.from_bytes(data[24:27],'little'),1+int.from_bytes(data[27:30],'little'))
 if typ==b'VP8 ':
  off=data.find(b'\x9d\x01\x2a')
  if off<0:raise ValueError('VP8 frame header missing')
  return (int.from_bytes(data[off+3:off+5],'little')&0x3fff,int.from_bytes(data[off+5:off+7],'little')&0x3fff)
 if typ==b'VP8L':
  v=int.from_bytes(data[21:25],'little');return ((v&0x3fff)+1,((v>>14)&0x3fff)+1)
 raise ValueError('unsupported WEBP chunk '+repr(typ))
def audit():
 errors=[];warnings=[];cameras={}; files=list(SRC.rglob('*'))
 if not SRC.is_dir():return {'passed':False,'errors':['source directory absent'],'warnings':[]}
 for c in CFG['cameras']:
  states=sorted([p for p in SRC.rglob('*.webp') if c.lower() in p.as_posix().lower()])
  cameras[c]=len(states)
  if len(states)!=CFG['states_per_camera']:errors.append(f'{c}: expected {CFG["states_per_camera"]} states, got {len(states)}')
  for p in states:
   try:
    if list(webp_size(p))!=CFG['expected_resolution']:errors.append(f'{p.relative_to(SRC)}: incorrect dimensions {webp_size(p)}')
   except Exception as e:errors.append(f'{p.relative_to(SRC)}: {e}')
 for name in [CFG['entrypoint'],'game.js','renderer3d.js']:
  if not (SRC/name).is_file():errors.append(f'missing entry file: {name}')
 if CFG['central_power_initially_on']:errors.append('canon violation: central power must start OFF')
 if CFG['art_status']=='NOT_FINAL_ART_APPROVED':warnings.append('Camera art is technical/gameplay material, not FINAL ART APPROVED')
 node=shutil.which('node')
 if node:
  for js in sorted(SRC.glob('*.js')):
   result=subprocess.run([node,'--check',str(js)],capture_output=True,text=True)
   if result.returncode:errors.append(f'JS syntax {js.name}: {result.stderr.strip()}')
 else:warnings.append('Node.js not installed; JavaScript syntax check skipped')
 return {'passed':not errors,'errors':errors,'warnings':warnings,'camera_counts':cameras,'source_files':sum(p.is_file() for p in files),'node_check':bool(node),'art_status':CFG['art_status']}
def run_audit():
 REPORTS.mkdir(exist_ok=True)
 result=audit();(REPORTS/'qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(result,ensure_ascii=False,indent=2));return result

def build():
 result=run_audit()
 if not result['passed']:raise RuntimeError('QA failed; release blocked')
 DIST.mkdir(exist_ok=True)
 name=CFG['build_name']; staging=DIST/name
 if staging.exists():shutil.rmtree(staging)
 shutil.copytree(SRC,staging)
 manifest=[]
 for p in sorted(staging.rglob('*')):
  if p.is_file():manifest.append({'path':p.relative_to(staging).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
 (staging/'DIDS_MANIFEST.json').write_text(json.dumps({'version':CFG['version'],'source':'V34','files':manifest,'qa':result},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 archive=DIST/(name+'.zip')
 with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(staging.rglob('*')):
   if p.is_file():
    info=zipfile.ZipInfo((Path(name)/p.relative_to(staging)).as_posix(),date_time=(2026,1,1,0,0,0))
    info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
    z.writestr(info,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
 with zipfile.ZipFile(archive) as z:
  if z.testzip() is not None:raise RuntimeError('ZIP integrity failure')
 print(f'BUILD OK: {archive} ({archive.stat().st_size} bytes)')
def main():
 ap=argparse.ArgumentParser();ap.add_argument('command',choices=['audit','build']);args=ap.parse_args()
 try:
  if args.command=='audit':sys.exit(0 if run_audit()['passed'] else 1)
  build()
 except Exception as e:print(f'ERROR: {e}',file=sys.stderr);sys.exit(1)
if __name__=='__main__':main()
