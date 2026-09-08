"""Fetch only the attributed piano samples used by this original score."""
from pathlib import Path
import json, hashlib, subprocess, urllib.parse, concurrent.futures
ROOT=Path(__file__).resolve().parent
CACHE=ROOT.parents[1]/'.cache/salamander'
CACHE.mkdir(parents=True,exist_ok=True)
if not (CACHE/'source-tree.json').exists():
 recorded=json.loads((ROOT/'sample-provenance.json').read_text())
 tree=json.loads(subprocess.check_output(['gh','api',f'repos/{recorded["repository"]}/git/trees/{recorded["commit"]}?recursive=1'],text=True))
 assert not tree.get('truncated')
 (CACHE/'source-tree.json').write_text(json.dumps({'repository':recorded['repository'],'commit':recorded['commit'],'tree':tree['tree']},indent=2)+'\n')
source=json.loads((CACHE/'source-tree.json').read_text())
score=json.loads((ROOT/'score.json').read_text())
notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
def name(m):return notes[m%12]+str(m//12-1)
def layers(velocity):
 v=1+velocity/127*15
 if v<=4:return [4]
 if v<7:return [4,7]
 return [7,10]
wanted={'LICENSE','README.md'}
for e in score['events']:
 root=21+round((e['midi']-21)/3)*3
 for layer in layers(e['velocity']):wanted.add(f'Samples/{name(root)}v{layer}.flac')
entries={e['path']:e for e in source['tree']}
assert all(key in entries for key in wanted),sorted(wanted-set(entries))
print(f'Fetching {len(wanted)-2} used samples, {sum(entries[n].get("size",0) for n in wanted)/1048576:.1f} MiB',flush=True)
def fetch(relative):
 dest=CACHE/relative;dest.parent.mkdir(parents=True,exist_ok=True)
 url=f'https://raw.githubusercontent.com/{source["repository"]}/{source["commit"]}/'+urllib.parse.quote(relative,safe='/')
 def valid(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==entries[relative]['sha']
 if not dest.exists() or not valid(dest.read_bytes()):
  temp=dest.with_suffix(dest.suffix+'.part')
  subprocess.run(['curl','--fail','--location','--silent','--show-error','--connect-timeout','10','--max-time','90','--retry','2',url,'-o',str(temp)],check=True)
  data=temp.read_bytes();assert valid(data),relative;temp.replace(dest)
 data=dest.read_bytes()
 return {'file':relative,'bytes':len(data),'gitBlob':entries[relative]['sha'],'sha256':hashlib.sha256(data).hexdigest(),'url':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(fetch,sorted(wanted)))
(ROOT/'sample-provenance.json').write_text(json.dumps({'repository':source['repository'],'commit':source['commit'],'author':'Alexander Holm','library':'Salamander Grand Piano','files':results},indent=2)+'\n')
print('All used samples verified against Git blob hashes.',flush=True)
