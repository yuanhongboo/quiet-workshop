from pathlib import Path
import argparse,json,re,subprocess,hashlib
p=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--lufs',type=float,default=-20);parser.add_argument('--peak',type=float,default=-2);args=parser.parse_args()
analysis=json.loads(re.search(r'\{\s*"input_i".*?\}',(p/'loudness-analysis.txt').read_text(),re.S).group())
gain=min(args.lufs-float(analysis['input_i']),args.peak-float(analysis['input_tp']))
assert -12<gain<12
metadata=['-metadata','title=光落在窗台','-metadata','artist=好好收拾 · 原创钢琴','-metadata','album=钢琴试听稿','-metadata','comment=Original score. Piano samples: Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0. See CREDITS.md.']
filters=f'highpass=f=30,lowpass=f=10500,volume={gain:.4f}dB'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(p/'performance-raw.wav'),'-af',filters,*metadata,'-c:a','pcm_s16le',str(p/'after-the-light.wav')],check=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(p/'after-the-light.wav'),*metadata,'-c:a','libmp3lame','-q:a','2','-id3v2_version','3',str(p/'after-the-light.mp3')],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,sample_rate,channels','-of','json',str(p/'after-the-light.mp3')],text=True))
subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(p/'after-the-light.wav'),'-af','loudnorm=I=-20:TP=-2:LRA=12:print_format=json','-f','null','-'],stderr=open(p/'master-analysis.txt','w'),stdout=subprocess.DEVNULL,check=True)
final=json.loads(re.search(r'\{\s*"input_i".*?\}',(p/'master-analysis.txt').read_text(),re.S).group())
assert abs(float(probe['format']['duration'])-122.1713)<.2
assert float(final['input_tp'])<=-2
assert -21<float(final['input_i'])<-19
assert probe['streams'][0]['channels']==2
files={name:{'bytes':(p/name).stat().st_size,'sha256':hashlib.sha256((p/name).read_bytes()).hexdigest()}for name in ['after-the-light.mp3','after-the-light.wav','after-the-light.mid','score.json']}
report={'stage':'listening-draft','gameChanged':False,'constantMasterGainDb':gain,'durationSeconds':float(probe['format']['duration']),'integratedLufs':float(final['input_i']),'truePeakDb':float(final['input_tp']),'loudnessRangeLu':float(final['input_lra']),'probe':probe,'files':files}
(p/'delivery.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k]for k in ['stage','durationSeconds','integratedLufs','truePeakDb','loudnessRangeLu']},ensure_ascii=False))
