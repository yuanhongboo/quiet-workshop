"""Render an original score with attributed multi-velocity acoustic piano samples.
Requires Python + NumPy and ffmpeg. No game files are changed.
"""
from pathlib import Path
import json, math, hashlib, subprocess, wave, struct, bisect
import numpy as np
ROOT=Path(__file__).resolve().parent
CACHE=ROOT.parents[1]/'.cache/salamander'
RATE=44100
score=json.loads((ROOT/'score.json').read_text())
provenance=json.loads((ROOT/'sample-provenance.json').read_text())
TEMPO=sorted(score['tempo'],key=lambda e:e['beat'])
BEATS=[p['beat'] for p in TEMPO]
SECONDS=[0.0]
for i in range(1,len(TEMPO)):
 SECONDS.append(SECONDS[-1]+(BEATS[i]-BEATS[i-1])*60/TEMPO[i-1]['bpm'])
def seconds(beat):
 i=max(0,bisect.bisect_right(BEATS,beat)-1)
 return SECONDS[i]+(beat-BEATS[i])*60/TEMPO[i]['bpm']
notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
def name(m):return notes[m%12]+str(m//12-1)
pedals=sorted(score['pedal'],key=lambda e:e['beat'])
pedal_beats=[p['beat'] for p in pedals]
def release_beat(e):
 end=e['beat']+e['duration'];i=bisect.bisect_right(pedal_beats,end)-1
 if i<0 or pedals[i]['value']<64:return end
 for change in pedals[i+1:]:
  if change['value']<64:return max(end,change['beat'])
 return score['durationBeats']
def decode(path):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(RATE),'-'])
 return np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
raw_cache={};pitch_cache={};sample_stats={}
def get_sample(root,midi,layer):
 key=(root,layer)
 if key not in raw_cache:
  filename=f'Samples/{name(root)}v{layer}.flac';path=CACHE/filename
  expected=next(e for e in provenance['files'] if e['file']==filename)
  assert hashlib.sha256(path.read_bytes()).hexdigest()==expected['sha256'],filename
  pcm=decode(path)
  envelope=np.sqrt(np.mean(pcm[:RATE*2]**2,axis=1))
  smooth=np.convolve(envelope,np.ones(88,dtype=np.float32)/88,mode='same')
  threshold=max(float(np.max(smooth))*.005,1e-6)
  found=np.flatnonzero(smooth>threshold)
  trim=max(0,int(found[0])-int(.005*RATE)) if len(found) else 0
  # Preserve the real hammer transient while removing recording pre-roll.
  trim=min(trim,int(.25*RATE));pcm=pcm[trim:]
  raw_cache[key]=pcm
  sample_stats[filename]={'trimSeconds':round(trim/RATE,5),'peak':float(np.max(np.abs(pcm)))}
 pkey=(root,midi,layer)
 if pkey not in pitch_cache:
  pcm=raw_cache[key];ratio=2**((midi-root)/12)
  if abs(ratio-1)<1e-10:pitched=pcm
  else:
   raw=subprocess.check_output(['ffmpeg','-v','error','-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0','-af',f'asetrate={round(RATE*ratio)},aresample={RATE}','-f','f32le','pipe:1'],input=pcm.astype('<f4').tobytes())
   pitched=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
  pitch_cache[pkey]=pitched
 return pitch_cache[pkey]
def velocity_layers(v):
 position=1+v/127*15
 if position<=4:return [(4,1.0)],(v/(127*3/15))**1.25
 lo,hi=(4,7) if position<7 else (7,10)
 weight=min(1,(position-lo)/(hi-lo))
 return [(lo,1-weight),(hi,weight)],1.0
length=seconds(score['durationBeats'])+score.get('suggestedTailSeconds',5)
frames=math.ceil(length*RATE)
mix=np.zeros((frames,2),dtype=np.float32)
rng=np.random.default_rng(20260908)
rendered=[]
for number,e in enumerate(score['events']):
 root=21+round((e['midi']-21)/3)*3
 layers,soft_gain=velocity_layers(e['velocity'])
 # Small, deterministic changes in attack timing retain the written rubato map.
 jitter=float(np.clip(rng.normal(0,.006),-.012,.012))
 onset=max(0,seconds(e['beat'])+jitter)
 release=seconds(release_beat(e))
 tail=.42 if e['midi']<53 else .30
 duration=max(.12,release-onset+tail)
 n=min(int(duration*RATE),frames-int(onset*RATE))
 voice=np.zeros((n,2),dtype=np.float32)
 for layer,weight in layers:
  if weight<.001:continue
  pcm=get_sample(root,e['midi'],layer);take=min(n,len(pcm));voice[:take]+=pcm[:take]*weight
 envelope=np.ones(n,dtype=np.float32)
 damp=max(0,min(n,int((release-onset)*RATE)))
 if damp<n:envelope[damp:]=np.linspace(1,0,n-damp,dtype=np.float32)**2
 attack=min(44,n);envelope[:attack]*=np.linspace(0,1,attack,dtype=np.float32)
 voice*=envelope[:,None]
 gain=(e['velocity']/80)**1.1*(.86 if e['hand']=='left' else 1.0)*float(rng.uniform(.975,1.025))
 # The original sample has stereo microphone placement; keep it nearly intact.
 pan=float(np.clip((e['midi']-60)*.008,-.20,.20))
 voice[:,0]*=gain*(1-max(0,pan)*.22);voice[:,1]*=gain*(1+min(0,pan)*.22)
 start=int(onset*RATE);mix[start:start+n]+=voice
 rendered.append({'midi':e['midi'],'onset':round(onset,5),'keyRelease':round(seconds(e['beat']+e['duration']),5),'pedalRelease':round(release,5)})
 if number%55==0:print(f'Rendered {number+1}/{len(score["events"])} notes',flush=True)
# An understated stereo room, with separate early reflections and diffused tail.
dry=mix.copy()
for delay,level in [(.019,.065),(.031,.047),(.047,.031)]:
 shift=int(delay*RATE);mix[shift:,0]+=dry[:-shift,1]*level;mix[shift:,1]+=dry[:-shift,0]*level
ir_frames=int(2.4*RATE);t=np.arange(ir_frames)/RATE
ir_rng=np.random.default_rng(85102)
irs=[]
for channel in range(2):
 ir=ir_rng.standard_normal(ir_frames).astype(np.float32)
 ir=np.convolve(ir,np.ones(9,dtype=np.float32)/9,mode='same')
 ir*=np.exp(-6.907*t/1.85).astype(np.float32)
 ir[:int(.027*RATE)]=0
 ir/=max(float(np.linalg.norm(ir)),1e-9)
 irs.append(ir)
def convolve_room(signal,ir):
 block=65536;nfft=1<<math.ceil(math.log2(block+len(ir)-1));kernel=np.fft.rfft(ir,nfft)
 output=np.zeros(len(signal)+len(ir)-1,dtype=np.float32)
 for start in range(0,len(signal),block):
  fragment=signal[start:start+block];part=np.fft.irfft(np.fft.rfft(fragment,nfft)*kernel,nfft).astype(np.float32)
  stop=min(start+len(fragment)+len(ir)-1,len(output));output[start:stop]+=part[:stop-start]
 return output[:len(signal)]
for channel in range(2):
 send=dry[:,channel]*.85+dry[:,1-channel]*.15
 mix[:,channel]+=convolve_room(send,irs[channel])*.085
# Keep complete silence at file boundaries, without squeezing the performance dynamics.
mix[:int(.015*RATE)]*=np.linspace(0,1,int(.015*RATE),dtype=np.float32)[:,None]
fade=int(1.8*RATE);mix[-fade:]*=np.linspace(1,0,fade,dtype=np.float32)[:,None]**2
peak=float(np.max(np.abs(mix)));gain=10**(-2.5/20)/max(peak,1e-12);mix*=gain
rms=float(np.sqrt(np.mean(mix.astype(np.float64)**2)))
raw=ROOT/'performance-raw.wav'
with wave.open(str(raw),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE)
 dither=(rng.random(mix.shape,dtype=np.float32)-rng.random(mix.shape,dtype=np.float32))/65536
 f.writeframes(np.round(np.clip(mix+dither,-1,1)*32767).astype('<i2').tobytes())
# A standard MIDI companion keeps the composition editable independently of this renderer.
def vlq(value):
 out=[value&127];value>>=7
 while value:out.insert(0,(value&127)|128);value>>=7
 return bytes(out)
def track(events):
 events.sort(key=lambda v:(v[0],v[1]));body=b'';last=0
 for tick,order,event in events:body+=vlq(tick-last)+event;last=tick
 body+=b'\x00\xff\x2f\x00'
 return b'MTrk'+struct.pack('>I',len(body))+body
ppq=score['ppq'];meta=[]
label=score['title'].encode('utf-8');meta.append((0,0,b'\xff\x03'+vlq(len(label))+label))
meta.append((0,1,b'\xff\x58\x04\x04\x02\x18\x08'))
for v in TEMPO:meta.append((round(v['beat']*ppq),2,b'\xff\x51\x03'+round(60000000/v['bpm']).to_bytes(3,'big')))
tracks=[track(meta)]
for channel,hand in enumerate(['left','right']):
 events=[(0,0,bytes([0xC0+channel,0]))]
 for p in pedals:events.append((round(p['beat']*ppq),1,bytes([0xB0+channel,64,p['value']])))
 for e in score['events']:
  if e['hand']!=hand:continue
  events.append((round(e['beat']*ppq),3,bytes([0x90+channel,e['midi'],e['velocity']])))
  events.append((round((e['beat']+e['duration'])*ppq),2,bytes([0x80+channel,e['midi'],0])))
 tracks.append(track(events))
(ROOT/'after-the-light.mid').write_bytes(b'MThd'+struct.pack('>IHHH',6,1,3,ppq)+b''.join(tracks))
report={'title':score['title'],'seconds':length,'scoreSeconds':seconds(score['durationBeats']),'notes':len(rendered),'sampleRate':RATE,'channels':2,'peakBeforeMaster':peak,'peakNormalized':float(np.max(np.abs(mix))),'rmsBeforeLoudnessMaster':rms,'normalizationGain':gain,'sampleRootCount':len(raw_cache),'pitchVariants':len(pitch_cache),'sampleSourceCommit':provenance['commit'],'events':rendered,'samples':sample_stats}
(ROOT/'render-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({key:report[key] for key in ['title','seconds','notes','peakNormalized','rmsBeforeLoudnessMaster','sampleRootCount','pitchVariants']},ensure_ascii=False),flush=True)
