/** Original score: 光落在窗台. All pitches, rhythm and form composed for this draft. */
const pitchClass = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new TypeError(`Invalid pitch: ${name}`);
  return (Number(match[3]) + 1) * 12 + pitchClass[match[1]]
    + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}
const events = [];
function add(bar, offset, names, duration, velocity, hand) {
  for (const name of Array.isArray(names) ? names : [names]) {
    events.push({ beat: (bar - 1) * 4 + offset, midi: midi(name), duration, velocity, hand });
  }
}
function part(bar, hand, notes) {
  for (const [offset, pitches, duration, velocity] of notes) add(bar, offset, pitches, duration, velocity, hand);
}

// A phrase crosses a bar line: B4 – G#4 – A4 – C#5 | B4.
// Each accompaniment is voiced separately; rests are part of the arrangement.
const right = [
  // 1–4: a window opens; no statement of the main motif yet.
  [[1.5,'G#4',1.1,43],[3,'F#4',0.72,39]],
  [[0.5,'E4',1.2,42],[2,'G#4',1.35,45]],
  [[1.5,'C#5',1.2,49],[3,'B4',0.75,43]],
  [[0,'A4',1.5,43],[2,'F#4',0.9,39]],
  // 5–12: theme A. Four paired measures; two small breaths.
  [[0,'B4',1,55],[1.5,'G#4',0.5,48],[2.25,'A4',0.5,50],[3,'C#5',0.78,56]],
  [[0,'B4',1.4,51],[2,'E5',0.75,56],[3,'D#5',0.8,49]],
  [[0.5,'C#5',0.95,53],[1.75,'B4',0.7,48],[3,'G#4',0.72,44]],
  [[0,'F#4',1.2,47],[1.75,'A4',0.65,51],[2.75,'G#4',0.5,47],[3.5,'F#4',0.38,43]],
  [[0,'E5',1,58],[1.5,'D#5',0.5,52],[2.25,'C#5',0.5,49],[3,'G#4',0.75,46]],
  [[0.25,'A4',1.05,49],[1.75,'C#5',0.7,54],[3,'E5',0.75,58]],
  [[0,'E5',1.4,55],[2,'D#5',0.7,49],[3,'F#5',0.65,53]],
  [[0,'E5',2.2,52],[2.75,'B4',0.75,41]],
  // 13–20: theme B; a wider upper register, only a few inner voices.
  [[0,'C#5',1,57],[1.5,'E5',0.65,61],[2.5,'G#5',1.15,66]],
  [[0,'F#5',0.75,60],[1,'E5',0.85,57],[2.5,'B4',0.9,50]],
  [[0,'C#5',0.65,56],[1,'E5',0.65,60],[2,'F#5',0.8,64],[3,'E5',0.8,58]],
  [[0,'D#5',0.85,55],[1.25,'C#5',0.8,52],[2.5,'G#4',1.05,47]],
  [[0,'E5',0.75,61],[1,'F#5',0.75,64],[2,'G#5',1.5,69]],
  [[0,'E5',1.25,59],[1.75,'G5',0.75,62],[3,'E5',0.75,54]],
  [[0,'F#5',0.7,57],[1,'E5',0.85,53],[2.5,'D#5',1.15,48]],
  [[0,'B4',0.8,47],[1.25,'G#4',1.2,41]],
  // 21–28: the first phrase returns, with a gentler answering phrase.
  [[0,'B4',1,53],[1.5,'G#4',0.5,46],[2.25,'A4',0.5,48],[3,'C#5',0.78,53]],
  [[0,'B4',1.25,49],[1.75,'D#5',0.75,52],[3,'E5',0.8,54]],
  [[0,'C#5',1.25,49],[1.75,'B4',0.7,45],[3,'A4',0.68,42]],
  [[0,'F#4',1.25,43],[1.75,'E4',0.75,40],[3,'F#4',0.75,43]],
  [[0,'G#4',1,45],[1.5,'B4',0.65,49],[2.5,'E5',1.1,53]],
  [[0.25,'C#5',1,48],[1.75,'A4',0.75,44],[3,'G#4',0.7,40]],
  [[0,'A4',1.25,43],[1.75,'F#4',0.75,39],[3,'D#4',0.75,37]],
  [[0,'E4',2.4,39],[3,'F#4',0.65,37]],
  // 29–32: a borrowed minor colour, then a plain, unhurried arrival.
  [[0.5,'G#4',1,42],[2,'B4',0.7,43],[3,'C#5',0.7,45]],
  [[0,'C5',1.7,43],[2.5,'B4',0.75,38],[3.5,'A4',0.38,35]],
  [[0,'G#4',1.25,38],[2,'F#4',0.85,34],[3,'E4',0.8,32]],
  [[0,'E4',3.7,33],[0.04,'G#4',3.58,27],[0.08,'B4',3.5,25]],
];
const left = [
  [[0,'E2',1.3,35],[0.75,'B2',1,30],[2,'F#3',1.4,30]],
  [[0,'C#3',1.3,34],[1.5,'G#3',1.2,30],[2.75,'B3',0.85,28]],
  [[0,'A2',1.6,35],[1,'E3',1.3,30],[2.5,'B3',1.1,29]],
  [[0,'B2',1.4,34],[1,'F#3',0.7,30],[2,'D#3',1.2,28]],
  [[0,'E2',1.3,38],[1.25,'B2',0.8,33],[2.25,['G#3','D#4'],1.25,31]],
  [[0,'G#2',1.3,37],[1.25,'D#3',1,32],[2.75,['F#3','B3'],0.95,31]],
  [[0,'A2',1.5,37],[1.5,['E3','G#3'],1.4,32],[3.25,'B3',0.5,28]],
  [[0,'B2',1.3,37],[1,'F#3',0.8,32],[2.5,['A3','D#4'],1.15,31]],
  [[0,'C#2',1.2,39],[0.75,'G#2',0.8,33],[2,['B3','D#4'],1.5,32]],
  [[0,'F#2',1.4,38],[1.25,'C#3',0.9,33],[2.5,['A3','E4'],1.1,32]],
  [[0,'B2',1.25,36],[0.75,'F#3',1,31],[2,['A3','D#4'],1.5,31]],
  [[0,'E2',1.2,36],[1.25,'B2',0.8,29],[2.5,['G#3','F#4'],1,27]],
  [[0,'A2',1.3,40],[0.75,'E3',0.8,35],[2,['G#3','B3'],1.5,36]],
  [[0,'G#2',1.5,40],[1.5,['B3','E4'],1.3,35],[3.25,'F#3',0.5,31]],
  [[0,'F#2',1.2,42],[1,'C#3',0.7,35],[2,['A3','E4'],1.4,37]],
  [[0,'C#3',1.4,39],[1,'G#3',0.8,33],[2.25,['B3','E4'],1.3,33]],
  [[0,'A2',1.3,45],[0.75,'E3',0.9,37],[2,['G#3','B3','C#4'],1.55,39]],
  [[0,'C3',1.4,41],[1,'G3',0.7,34],[2.25,['B3','E4'],1.4,35]],
  [[0,'B2',1.3,39],[0.75,['F#3','A3'],1,34],[2.5,['D#3','F#3'],1.15,31]],
  [[0,'E2',0.8,34],[1.5,['B3','F#4'],1.3,28]],
  [[0,'E2',1.3,36],[1.25,'B2',0.8,31],[2.25,['G#3','D#4'],1.25,29]],
  [[0,'G#2',1.3,35],[1.5,['D#3','F#3'],1,30],[3,'B3',0.7,29]],
  [[0,'A2',1.5,34],[1.5,['E3','G#3'],1.4,29]],
  [[0,'B2',1.25,33],[1,'F#3',0.7,28],[2.5,['A3','D#4'],1.15,28]],
  [[0,'C#3',1.25,34],[1.5,'G#3',0.9,29],[2.75,['B3','D#4'],0.95,29]],
  [[0,'F#2',1.4,33],[1.5,['A3','E4'],1.5,28]],
  [[0,'B2',1.3,32],[1,'F#3',0.7,27],[2.5,['A3','C#4'],0.3,26],[3.25,'D#3',0.5,26]],
  [[0,'E2',1.5,30],[1.5,['B2','C#3'],1.2,25],[3,'G#3',0.7,24]],
  [[0,'A2',1.4,30],[1.5,['E3','G#3'],1.5,26]],
  [[0,'A2',1.4,29],[1.5,['C4','F#4'],1.5,25]],
  [[0,'B2',1.3,27],[1.5,['E3','B3'],1.1,24],[3,'F#3',0.7,22]],
  [[0,'E2',0.3,28],[0.2,'B2',3.4,23],[0.45,'F#3',3,21]],
];
right.forEach((notes, index) => part(index + 1, 'right', notes));
left.forEach((notes, index) => part(index + 1, 'left', notes));

// Low inner-voice notes support only the middle section; melody stays in front.
for (const [bar, offset, pitch, length, velocity] of [
  [13,2.5,'E5',1.1,37], [15,2,'A4',0.8,34],
  [17,2,'C#5',1.45,39], [18,1.75,'C5',0.75,34],
]) add(bar, offset, pitch, length, velocity, 'right');

const pedal = [{ beat: 0, value: 0 }];
const splitPedalBars = new Map([[4,2],[8,2.5],[11,2],[19,2.5],[24,2.5],[27,3.25]]);
for (let bar = 1; bar <= 32; bar += 1) {
  const start = (bar - 1) * 4;
  pedal.push({ beat: start + 0.1, value: bar >= 29 ? 78 : 86 });
  if (splitPedalBars.has(bar)) {
    const change = start + splitPedalBars.get(bar);
    pedal.push({ beat: change - 0.09, value: 0 }, { beat: change + 0.09, value: 82 });
  }
  pedal.push({ beat: start + 3.88, value: 0 });
}
events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
pedal.sort((a, b) => a.beat - b.beat);

const score = {
  title: '光落在窗台',
  id: 'after-the-light',
  version: 1,
  composer: 'Original composition for Quiet Workshop',
  key: 'E major',
  bpm: 66,
  meter: [4, 4],
  ppq: 480,
  durationBeats: 128,
  suggestedTailSeconds: 5,
  sections: [
    { firstBar: 1, lastBar: 4, title: '窗边的空气', dynamics: 'pp' },
    { firstBar: 5, lastBar: 12, title: '光落下来', dynamics: 'p, gently singing' },
    { firstBar: 13, lastBar: 20, title: '房间慢慢亮起', dynamics: 'p to mp to p' },
    { firstBar: 21, lastBar: 28, title: '回到手边', dynamics: 'p to pp' },
    { firstBar: 29, lastBar: 32, title: '留下余温', dynamics: 'pp, ritardando' },
  ],
  harmony: [
    'Eadd9','C#m7','Amaj9','Bsus4 → B',
    'Emaj9','G#m7','Amaj9','Bsus4 → B7',
    'C#m9','F#m9','B7sus4 → B7','Emaj9',
    'Amaj9','Eadd9/G#','F#m9','C#m7',
    'Amaj9','Cmaj7','B7sus4 → B7','Eadd9',
    'Emaj9','G#m7','Amaj9','Bsus4 → B7',
    'C#m9','F#m9','B13sus4 → B7','E6/9',
    'Amaj9','Am6/9','Eadd9/B','Eadd9',
  ],
  motif: { pitches: ['B4','G#4','A4','C#5','B4'], firstBeat: 16, lastBeat: 20 },
  tempo: [
    { beat: 0, bpm: 66 }, { beat: 8, bpm: 64 }, { beat: 12, bpm: 66 },
    { beat: 16, bpm: 68 }, { beat: 44, bpm: 64 }, { beat: 46, bpm: 62 },
    { beat: 48, bpm: 69 }, { beat: 64, bpm: 70 }, { beat: 72, bpm: 66 },
    { beat: 78, bpm: 62 }, { beat: 80, bpm: 66 }, { beat: 108, bpm: 64 },
    { beat: 112, bpm: 62 }, { beat: 116, bpm: 60 }, { beat: 120, bpm: 58 },
    { beat: 124, bpm: 54 }, { beat: 126, bpm: 50 },
  ],
  events,
  pedal,
};
export default score;
