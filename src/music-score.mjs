// Original scores for 好好收拾. All melodies and arrangements are authored here;
// no sampled recording or third-party musical composition is used.
const midi = (name) => {
  if (typeof name === 'number') return name;
  const [, letter, accidental = '', octave] = /^([A-G])([b#]?)(-?\d)$/.exec(name) || [];
  if (!letter) throw new TypeError(`Invalid pitch: ${name}`);
  return 12 * (Number(octave) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
};

const streetChords = [
  ['F2', 'A3 C4 E4 G4'], ['D2', 'A3 C4 E4 F4'], ['Bb2', 'A3 C4 D4 F4'], ['C3', 'G3 A3 D4 E4'],
  ['F2', 'A3 C4 E4 G4'], ['A2', 'G3 B3 C4 E4'], ['Bb2', 'A3 C4 D4 F4'], ['C3', 'G3 Bb3 D4 E4'],
  ['D2', 'A3 C4 E4 F4'], ['G2', 'A3 Bb3 D4 F4'], ['C3', 'G3 Bb3 D4 E4'], ['F2', 'A3 C4 E4 G4'],
  ['Bb2', 'A3 C4 D4 F4'], ['A2', 'G3 B3 C4 E4'], ['G2', 'A3 Bb3 D4 F4'], ['C3', 'G3 Bb3 D4 E4'],
  ['F2', 'A3 C4 E4 G4'], ['C3', 'G3 A3 D4 E4'], ['D2', 'A3 C4 E4 F4'], ['Bb2', 'A3 C4 D4 F4'],
  ['G2', 'A3 Bb3 D4 F4'], ['C3', 'G3 Bb3 D4 E4'], ['A2', 'G3 B3 C4 E4'], ['D2', 'A3 C4 E4 F4'],
  ['Bb2', 'A3 C4 D4 F4'], ['F2', 'A3 C4 E4 G4'], ['G2', 'A3 Bb3 D4 F4'], ['C3', 'G3 A3 D4 E4'],
  ['Bb2', 'A3 C4 D4 F4'], ['C3', 'G3 Bb3 D4 E4'], ['F2', 'A3 C4 E4 G4'], ['F2', 'A3 C4 E4 G4'],
];
// Each tuple is [beat, pitch, held beats]. Breathing spaces are part of the score.
const streetMelody = [
  [[0,'A4',1],[1.5,'G4',.5],[2,'C5',1.3],[3.5,'A4',.4]],
  [[0,'F4',1.4],[1.5,'A4',.8],[2.5,'E4',1.2]],
  [[.5,'F4',.7],[1.5,'D5',1],[3,'C5',.8]],
  [[0,'A4',1],[1.5,'G4',1.7]],
  [[0,'C5',1.4],[1.5,'A4',.8],[2.5,'G4',.6],[3.5,'E4',.4]],
  [[.5,'G4',.8],[1.5,'E4',1],[3,'C5',.8]],
  [[0,'D5',1.5],[2,'A4',.7],[3,'F4',.8]],
  [[0,'E4',.8],[1.5,'G4',.7],[2.5,'A4',1]],
  [[0,'A4',.7],[1,'F4',.7],[2.5,'E4',1]],
  [[0,'D4',1.4],[1.5,'F4',.7],[2.5,'A4',.6],[3.5,'Bb4',.4]],
  [[0,'G4',1],[1.5,'E4',.7],[2.5,'D4',1.1]],
  [[.5,'C4',.8],[1.5,'E4',.7],[2.5,'F4',1.2]],
  [[0,'A4',1.4],[1.5,'C5',.7],[2.5,'D5',.6],[3.5,'C5',.4]],
  [[0,'B4',1],[1.5,'G4',.7],[2.5,'E4',1.2]],
  [[0,'F4',.8],[1.5,'A4',.7],[2.5,'D5',1]],
  [[0,'C5',1.5],[2,'G4',1.6]],
  [[0,'E5',1.3],[1.5,'C5',.7],[2.5,'A4',1]],
  [[.5,'G4',.7],[1.5,'A4',.7],[2.5,'D5',1]],
  [[0,'F5',1.4],[1.5,'E5',.7],[2.5,'C5',1]],
  [[0,'D5',1],[1.5,'A4',.8],[3,'F4',.7]],
  [[0,'Bb4',.7],[1,'A4',.7],[2,'F4',1.6]],
  [[0,'G4',1],[1.5,'E4',.7],[2.5,'D4',1]],
  [[.5,'E4',.7],[1.5,'G4',.7],[2.5,'C5',1]],
  [[0,'A4',1.4],[2,'F4',1.6]],
  [[0,'D5',1],[1.5,'C5',.7],[2.5,'A4',1]],
  [[0,'G4',.8],[1.5,'E4',.7],[2.5,'F4',1.2]],
  [[.5,'F4',.7],[1.5,'A4',.7],[2.5,'Bb4',1]],
  [[0,'A4',1.4],[2,'G4',1.4]],
  [[0,'F4',1],[1.5,'D4',.7],[2.5,'F4',1]],
  [[0,'E4',1.4],[2,'G4',1.3]],
  [[0,'A4',.9],[1.5,'G4',.7],[2.5,'F4',1.4]],
  [[0,'C5',1.7],[2.5,'G4',1]],
];
const gardenChords = [
  ['D2','A3 D4 E4 F#4'], ['G2','A3 B3 D4 F#4'], ['B2','A3 D4 F#4'], ['A2','B3 C#4 E4'],
  ['D2','A3 D4 E4 F#4'], ['F#2','A3 C#4 E4'], ['G2','A3 B3 D4 F#4'], ['A2','B3 C#4 E4'],
  ['B2','A3 D4 F#4'], ['E2','G3 B3 D4 F#4'], ['G2','A3 B3 D4 F#4'], ['D2','A3 D4 E4 F#4'],
  ['E2','G3 B3 D4 F#4'], ['A2','B3 C#4 E4'], ['D2','A3 D4 E4 F#4'], ['A2','B3 C#4 E4'],
  ['G2','A3 B3 D4 F#4'], ['D2','A3 D4 E4 F#4'], ['E2','G3 B3 D4 F#4'], ['A2','B3 C#4 E4'],
  ['B2','A3 D4 F#4'], ['F#2','A3 C#4 E4'], ['G2','A3 B3 D4 F#4'], ['A2','B3 C#4 E4'],
  ['D2','A3 D4 E4 F#4'], ['G2','A3 B3 D4 F#4'], ['E2','G3 B3 D4 F#4'], ['A2','B3 C#4 E4'],
  ['G2','A3 B3 D4 F#4'], ['A2','B3 C#4 E4'], ['D2','A3 D4 E4 F#4'], ['D2','A3 D4 E4 F#4'],
];
const gardenMelody = [
  [[0,'F#4',.8],[1,'A4',.8],[2,'E5',.8]],
  [[0,'D5',1.3],[1.5,'B4',1.2]],
  [[.5,'A4',.8],[1.5,'F#4',1.2]],
  [[0,'E4',1],[1.5,'C#5',1]],
  [[0,'A4',1.3],[1.5,'F#4',.7],[2.5,'E4',.4]],
  [[0,'C#4',1.2],[1.5,'E4',1.2]],
  [[0,'F#4',.8],[1,'B4',.8],[2,'A4',.8]],
  [[0,'E4',1.8]],
  [[0,'D5',1.2],[1.5,'A4',1.2]],
  [[0,'B4',.8],[1,'G4',.8],[2,'F#4',.8]],
  [[0,'D4',1.2],[1.5,'A4',1.2]],
  [[0,'F#4',1.8],[2,'E4',.8]],
  [[.5,'G4',.8],[1.5,'B4',1.2]],
  [[0,'C#5',.8],[1,'B4',.8],[2,'E4',.8]],
  [[0,'F#4',1],[1.5,'A4',1.2]],
  [[0,'E5',1.6],[2,'C#5',.7]],
  [[0,'B4',.8],[1,'D5',.8],[2,'F#5',.8]],
  [[0,'E5',1.2],[1.5,'A4',1.2]],
  [[0,'G4',.8],[1,'B4',.8],[2,'D5',.8]],
  [[0,'C#5',1.5],[2,'B4',.8]],
  [[0,'A4',.8],[1,'F#4',.8],[2,'D5',.8]],
  [[0,'C#5',1.2],[1.5,'A4',1.2]],
  [[.5,'B4',.8],[1.5,'F#4',1.2]],
  [[0,'E4',1.7],[2,'C#4',.7]],
  [[0,'F#4',.8],[1,'A4',.8],[2,'E5',.8]],
  [[0,'D5',1.3],[1.5,'B4',1.2]],
  [[0,'G4',1.2],[1.5,'F#4',1.2]],
  [[0,'E4',1.8]],
  [[0,'D4',1],[1.5,'F#4',1.2]],
  [[0,'E4',1],[1.5,'C#4',1.2]],
  [[0,'D4',1.3],[1.5,'F#4',1.2]],
  [[0,'A4',1.6],[2,'E4',.7]],
];

function arrange({ id, title, tempo, beatsPerBar, chords, melody }) {
  const events = [];
  const add = (beat, note, duration, velocity, instrument, pan = 0) => events.push(Object.freeze({ beat, note: midi(note), duration, velocity, instrument, pan }));
  chords.forEach(([root, names], bar) => {
    const start = bar * beatsPerBar;
    const chord = names.split(' ').map(midi);
    const phrase = Math.floor(bar / 8);
    add(start, root, beatsPerBar - .2, .37, 'bass', -.12);
    if (id === 'street-shop') {
      // Soft, broken left-hand voicings leave space for the main melody.
      const pattern = phrase === 2 ? [0, 2, 1, 3] : [0, 1, 3, 2];
      pattern.forEach((index, step) => add(start + step * .75 + .018, chord[index], 1.5, .21 + (step % 2) * .025, 'felt', -.22 + step * .12));
      if (bar % 2 === 1) add(start + 3, midi(root) + 12, .85, .21, 'bass', -.08);
      if (phrase > 0 && bar % 2 === 0) add(start + 3.5, chord[2] + 12, .7, .17, 'pluck', .3);
    } else {
      chord.slice(0, 3).forEach((note, step) => add(start + step + .025, note, 2.3, .25, 'felt', -.26 + step * .2));
      if (phrase === 2 || (phrase === 1 && bar % 2 === 0)) add(start + 2.5, chord[1] + 12, .8, .14, 'pluck', .35);
    }
    if (bar % 2 === 0) {
      // A restrained, slow-breathing bed connects the bars without a beat track.
      [chord[0], chord[2]].forEach((note, index) => add(start + .06, note - 12, beatsPerBar * 1.8, id === 'rain-garden' ? .17 : .10, 'pad', index ? .42 : -.42));
    }
    melody[bar].forEach(([beat, note, duration], index) => {
      add(start + beat + (index % 2 ? .012 : 0), note, duration, phrase === 2 ? .52 : .47, id === 'rain-garden' ? 'wood' : 'piano', .12);
      // In the third phrase the garden melody receives a very soft piano shadow.
      if (id === 'rain-garden' && phrase === 2 && index === 0) add(start + beat + .018, midi(note) - 12, duration + .3, .18, 'felt', -.16);
    });
  });
  events.sort((a, b) => a.beat - b.beat);
  return Object.freeze({ id, title, tempo, beatsPerBar, bars: 32, beats: 32 * beatsPerBar, duration: 32 * beatsPerBar * 60 / tempo, events: Object.freeze(events) });
}

export const MUSIC_THEMES = Object.freeze({
  'street-shop': arrange({ id: 'street-shop', title: '窗边慢慢亮', tempo: 72, beatsPerBar: 4, chords: streetChords, melody: streetMelody }),
  'rain-garden': arrange({ id: 'rain-garden', title: '雨停以后', tempo: 60, beatsPerBar: 3, chords: gardenChords, melody: gardenMelody }),
});
export const resolveMusicTheme = (theme) => MUSIC_THEMES[theme] || MUSIC_THEMES['street-shop'];
