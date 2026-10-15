import React, { useEffect, useRef, useState } from 'https://esm.sh/react@19.1.0';
import { createRoot } from 'https://esm.sh/react-dom@19.1.0/client';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);
const API_ROOT = 'https://api.github.com/repos/nbrosowsky/tonejs-instruments/contents/samples';
const RAW_ROOT = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples';
const INSTRUMENTS = [
  { id: 'piano', name: 'Piyano', subtitle: 'Yumuşak ve parlak', icon: 'piano', color: 'lilac' },
  { id: 'drums', name: 'Davul', subtitle: 'Ritmini yakala', icon: 'drums', color: 'peach' },
  { id: 'guitar-acoustic', name: 'Akustik gitar', subtitle: 'Sıcak ve doğal', icon: 'guitar', color: 'sage' },
];
const NOTE_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const NOTE_KEYS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J'];
const GUITAR_TUNING = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4, standard tuning
const GUITAR_STRING_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y']; // high e to low E, as displayed
const GUITAR_CHORDS = [
  { name: 'C', key: '1', frets: [-1, 3, 2, 0, 1, 0] },
  { name: 'G', key: '2', frets: [3, 2, 0, 0, 0, 3] },
  { name: 'Am', key: '3', frets: [-1, 0, 2, 2, 1, 0] },
  { name: 'F', key: '4', frets: [1, 3, 3, 2, 1, 1] },
  { name: 'Em', key: '5', frets: [0, 2, 2, 0, 0, 0] },
  { name: 'D', key: '6', frets: [-1, -1, 0, 2, 3, 2] },
  { name: 'Dm', key: '7', frets: [-1, -1, 0, 2, 3, 1] },
  { name: 'E', key: '8', frets: [0, 2, 2, 1, 0, 0] },
  { name: 'A', key: '9', frets: [-1, 0, 2, 2, 2, 0] },
  { name: 'A7', key: '0', frets: [-1, 0, 2, 0, 2, 0] },
  { name: 'D7', key: '-', frets: [-1, -1, 0, 2, 1, 2] },
  { name: 'G7', key: '=', frets: [3, 2, 0, 0, 0, 1] },
];
const START_MIDI = 48;
const PIANO_START_MIDI = 21;
const PIANO_END_MIDI = 108;
const isBlackMidi = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);
const PIANO_NOTES = Array.from({ length: PIANO_END_MIDI - PIANO_START_MIDI + 1 }, (_, index) => {
  const midi = PIANO_START_MIDI + index;
  const whiteIndex = Array.from({ length: index }, (_, prior) => PIANO_START_MIDI + prior).filter((note) => !isBlackMidi(note)).length;
  return { midi, whiteIndex, isBlack: isBlackMidi(midi) };
});

function Icon({ name, size = 20, ...props }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...props };
  if (name === 'piano') return html`<svg ...${common}><path d="M4 5h16v14H4z"/><path d="M8 5v9m4-9v9m4-9v9"/><path d="M7 5v5m4-5v5m5-5v5"/></svg>`;
  if (name === 'drums') return html`<svg ...${common}><path d="M3 14c0-3 3-5 7-5s7 2 7 5-3 5-7 5-7-2-7-5Z"/><path d="M7 9 5 5m5 4 2-5m3 6 4-3m-8 7v6m-4 0h8"/><path d="M17 14h4v5h-4z"/></svg>`;
  if (name === 'guitar') return html`<svg ...${common}><path d="M14 7.5 17 5l2 2-2.5 3M7 14l-3 3 3 3 3-3"/><path d="M9 12 15 6l3 3-6 6a3 3 0 0 1-4-3Z"/><circle cx="10.5" cy="13.5" r="1"/><path d="m15 6 3 3"/></svg>`;
  if (name === 'play') return html`<svg ...${common}><path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/></svg>`;
  if (name === 'volume') return html`<svg ...${common}><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M17 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"/></svg>`;
  if (name === 'spark') return html`<svg ...${common}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>`;
  return html`<svg ...${common}><path d="M5 12h14"/></svg>`;
}

function useAudio() {
  const context = useRef(null);
  const cache = useRef({ piano: new Map(), 'guitar-acoustic': new Map() });
  const folders = useRef({ piano: null, 'guitar-acoustic': null });
  const [audioStatus, setAudioStatus] = useState({ piano: 'loading', 'guitar-acoustic': 'loading' });
  const [sampleCounts, setSampleCounts] = useState({ piano: 0, 'guitar-acoustic': 0 });
  const getContext = () => {
    if (!context.current) context.current = new (window.AudioContext || window.webkitAudioContext)();
    if (context.current.state === 'suspended') context.current.resume();
    return context.current;
  };

  useEffect(() => {
    let active = true;
    Promise.all(['piano', 'guitar-acoustic'].map(async (instrument) => {
      try {
        const response = await fetch(`${API_ROOT}/${instrument}`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) throw new Error('API yanıt vermedi');
        const files = await response.json();
        folders.current[instrument] = files.filter((file) => file.type === 'file' && /\.(mp3|ogg|wav)$/i.test(file.name));
        if (!folders.current[instrument].length) throw new Error('Örnek bulunamadı');
        if (active) setSampleCounts((current) => ({ ...current, [instrument]: folders.current[instrument].length }));
        if (active) setAudioStatus((current) => ({ ...current, [instrument]: 'ready' }));
      } catch {
        if (active) setAudioStatus((current) => ({ ...current, [instrument]: 'fallback' }));
      }
    }));
    return () => { active = false; };
  }, []);

  const noteFrequency = (midi) => 440 * (2 ** ((midi - 69) / 12));
  const sampleFor = (instrument, midi) => {
    const files = folders.current[instrument] || [];
    const targetName = midiToSample(midi);
    const exact = files.find((file) => file.name.replace(/\.(mp3|ogg|wav)$/i, '').toLowerCase() === targetName.toLowerCase());
    if (exact) return exact;
    const candidates = files.map((file) => ({ file, midi: sampleToMidi(file.name) })).filter((item) => item.midi !== null);
    candidates.sort((a, b) => Math.abs(a.midi - midi) - Math.abs(b.midi - midi));
    return candidates[0]?.file;
  };

  const playSampleOrSynth = async (instrument, midi, velocity = 0.8) => {
    const ctx = getContext();
    const file = sampleFor(instrument, midi);
    if (file) {
      const cacheKey = `${instrument}:${file.name}`;
      try {
        let buffer = cache.current[instrument].get(cacheKey);
        if (!buffer) {
          const response = await fetch(file.download_url || `${RAW_ROOT}/${instrument}/${file.name}`);
          if (!response.ok) throw new Error('Örnek yüklenemedi');
          buffer = await ctx.decodeAudioData(await response.arrayBuffer());
          cache.current[instrument].set(cacheKey, buffer);
        }
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.playbackRate.value = 2 ** ((midi - sampleToMidi(file.name)) / 12);
        gain.gain.value = velocity * 0.8;
        source.connect(gain).connect(ctx.destination);
        source.start();
        return;
      } catch { /* Use the synthesizer below when the sample host is unavailable. */ }
    }
    if (instrument === 'guitar-acoustic') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.value = noteFrequency(midi);
      gain.gain.setValueAtTime(velocity * 0.45, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.5);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = noteFrequency(midi);
      gain.gain.setValueAtTime(velocity * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.2);
    }
  };

  const playDrum = (kind, velocity = 0.85) => {
    const ctx = getContext();
    const now = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = velocity * 0.85; out.connect(ctx.destination);
    if (kind === 'kick') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(145, now); osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
      gain.gain.setValueAtTime(1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(gain).connect(out); osc.start(now); osc.stop(now + 0.35);
    } else {
      const length = ctx.sampleRate * (kind === 'snare' ? 0.22 : 0.12);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate); const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const filter = ctx.createBiquadFilter(); filter.type = kind === 'snare' ? 'highpass' : 'highpass'; filter.frequency.value = kind === 'snare' ? 1100 : 6500;
      const gain = ctx.createGain(); gain.gain.setValueAtTime(kind === 'snare' ? 0.9 : 0.5, now); gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'snare' ? 0.2 : 0.1));
      noise.connect(filter).connect(gain).connect(out); noise.start(now);
      if (kind === 'snare') {
        const osc = ctx.createOscillator(); const body = ctx.createGain(); osc.type = 'triangle'; osc.frequency.value = 185;
        body.gain.setValueAtTime(0.45, now); body.gain.exponentialRampToValueAtTime(0.001, now + 0.12); osc.connect(body).connect(out); osc.start(now); osc.stop(now + 0.13);
      }
    }
  };
  return { playSampleOrSynth, playDrum, audioStatus, sampleCounts };
}

function midiToSample(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
function sampleToMidi(filename) {
  const match = filename.match(/([A-G]#?)(-?\d)(?:\.[^.]+)$/i);
  if (!match) return null;
  const semitones = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  return (Number(match[2]) + 1) * 12 + semitones[match[1].toUpperCase()];
}

function PianoKeyboard({ octave, setOctave, activeNotes, setActiveNotes, playNote }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const scroller = scrollRef.current;
    const c4 = PIANO_NOTES.find((note) => note.midi === 60);
    if (scroller && c4) scroller.scrollLeft = Math.max(0, (c4.whiteIndex - Math.floor(scroller.clientWidth / 56)) * 28);
  }, []);

  const shortcutStart = (octave + 1) * 12;
  return html`<div className="piano-view">
    <div className="octave-control"><button onClick=${() => setOctave((value) => Math.max(1, value - 1))} aria-label="Klavye kısayollarını bir oktav düşür">−</button><span>Bilgisayar: ${octave}. oktav</span><button onClick=${() => setOctave((value) => Math.min(7, value + 1))} aria-label="Klavye kısayollarını bir oktav yükselt">＋</button></div>
    <div className="keyboard-scroll" ref=${scrollRef} aria-label="88 tuşun tamamını görmek için yatay kaydır">
      <div className="keyboard" role="group" aria-label="A0 ile C8 arasında 88 tuşlu piyano">
        ${PIANO_NOTES.map(({ midi, whiteIndex, isBlack }) => {
          const noteIndex = midi % 12;
          const noteOctave = Math.floor(midi / 12) - 1;
          const isShortcut = midi >= shortcutStart && midi < shortcutStart + 12;
          const shortcutIndex = midi - shortcutStart;
          const showNote = midi === PIANO_START_MIDI || noteIndex === 0;
          const isPressed = activeNotes.includes(midi) || (isShortcut && activeNotes.includes(NOTE_KEYS[shortcutIndex]));
          return html`<button className=${`key ${isBlack ? 'black' : 'white'} ${isPressed ? 'pressed' : ''}`} style=${{ '--white-index': whiteIndex }} onPointerDown=${(event) => { event.preventDefault(); playNote(midi); }} onPointerUp=${() => setActiveNotes((items) => items.filter((item) => item !== midi))} onPointerLeave=${() => setActiveNotes((items) => items.filter((item) => item !== midi))} aria-label=${`${NOTE_NAMES[noteIndex]} ${noteOctave} notası${isShortcut ? `, klavye ${NOTE_KEYS[shortcutIndex]} tuşu` : ''}`} key=${midi}>
            ${showNote ? html`<span className="key-note">${NOTE_NAMES[noteIndex]}${noteOctave}</span>` : null}
            ${isShortcut ? html`<span className=${`key-letter ${isBlack ? 'on-black' : ''}`}>${NOTE_KEYS[shortcutIndex]}</span>` : null}
          </button>`;
        })}
      </div>
    </div>
    <div className="keyboard-footer"><span><b>⌨</b> Klavyenle de çalabilirsin · A–J ve W/E/T/Y/U</span><span>88 tuş <i>·</i> A0 ← kaydır → C8</span></div>
  </div>`;
}

function GuitarView({ activeChord, playChord, playSampleOrSynth, volume }) {
  const stringNames = ['Mi', 'Si', 'Sol', 'Re', 'La', 'Mi'];
  return html`<div className="guitar-view">
    <div className="chord-row" role="group" aria-label="Gitar akorları">
      ${GUITAR_CHORDS.map((chord) => html`<button className=${`chord-button ${activeChord === chord.name ? 'active' : ''}`} onClick=${() => playChord(chord)} aria-label=${`${chord.name} akoru, ${chord.key} tuşu ile çal`} key=${chord.name}>
        <span>${chord.name}</span><small><kbd>${chord.key}</kbd></small>
        <span className="chord-diagram" aria-hidden="true">
          <span className="chord-markers">${chord.frets.slice().reverse().map((fret, index) => html`<i key=${index}>${fret === -1 ? '×' : fret === 0 ? '○' : ''}</i>`)}</span>
          <span className="fretboard">${chord.frets.slice().reverse().map((fret, index) => html`<i className="fret-string" key=${index}>${fret > 0 && fret <= 4 ? html`<b style=${{ top: `${(fret - 0.5) * 25}%` }}></b>` : null}</i>`)}</span>
        </span>
      </button>`)}
    </div>
    <div className="guitar-strings" role="group" aria-label="Açık gitar telleri">
      ${GUITAR_STRING_KEYS.map((key, index) => html`<button className="string-button" onPointerDown=${() => playSampleOrSynth('guitar-acoustic', GUITAR_TUNING[5 - index], volume / 100)} aria-label=${`Gitar ${6 - index}. tel, ${stringNames[index]}, klavye ${key} tuşu`} key=${index}><span className="string-line" style=${{ height: `${1 + index * 0.55}px` }}></span><span>${stringNames[index]} <kbd>${key}</kbd></span></button>`)}
    </div>
    <div className="drum-hint">Akorlar: <kbd>1</kbd>–<kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd> · Açık teller: <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd> <kbd>Y</kbd></div>
  </div>`;
}

function App() {
  const [instrument, setInstrument] = useState('piano');
  const [activeNotes, setActiveNotes] = useState([]);
  const [activeDrum, setActiveDrum] = useState('');
  const [activeChord, setActiveChord] = useState('');
  const [volume, setVolume] = useState(75);
  const [octave, setOctave] = useState(4);
  const [tempo, setTempo] = useState(96);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [pattern, setPattern] = useState({ kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14] });
  const patternRef = useRef(pattern);
  patternRef.current = pattern;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const timer = useRef(null);
  const beatRef = useRef(0);
  const { playSampleOrSynth, playDrum, audioStatus, sampleCounts } = useAudio();
  const currentInstrument = INSTRUMENTS.find((item) => item.id === instrument);

  const playNote = (midi, id = midi) => {
    setActiveNotes((items) => [...items.filter((item) => item !== id), id]);
    window.setTimeout(() => setActiveNotes((items) => items.filter((item) => item !== id)), 180);
    playSampleOrSynth(instrument === 'guitar-acoustic' ? instrument : 'piano', midi, volume / 100);
  };
  const playDrumPad = (kind) => {
    setActiveDrum(kind); window.setTimeout(() => setActiveDrum(''), 140); playDrum(kind, volume / 100);
  };
  const playChord = (chord) => {
    setActiveChord(chord.name);
    window.setTimeout(() => setActiveChord((current) => current === chord.name ? '' : current), 260);
    chord.frets.forEach((fret, stringIndex) => {
      if (fret < 0) return;
      const midi = GUITAR_TUNING[stringIndex] + fret;
      window.setTimeout(() => playSampleOrSynth('guitar-acoustic', midi, volume / 100), stringIndex * 22);
    });
  };

  useEffect(() => {
    const onDown = (event) => {
      if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      const key = event.key.toUpperCase();
      if (instrument === 'drums') {
        const drums = { A: 'kick', S: 'snare', D: 'hat' };
        if (drums[key]) playDrumPad(drums[key]);
        return;
      }
      if (instrument === 'guitar-acoustic') {
        const chord = GUITAR_CHORDS.find((item) => item.key === key);
        if (chord) { playChord(chord); return; }
        const stringIndex = GUITAR_STRING_KEYS.indexOf(key);
        if (stringIndex !== -1) { playSampleOrSynth('guitar-acoustic', GUITAR_TUNING[5 - stringIndex], volume / 100); return; }
        return;
      }
      const index = NOTE_KEYS.indexOf(key);
      if (index !== -1) playNote((octave + 1) * 12 + index, key);
    };
    const onUp = (event) => setActiveNotes((items) => items.filter((item) => item !== event.key.toUpperCase()));
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [instrument, octave, volume]);

  useEffect(() => {
    if (!playing) { window.clearInterval(timer.current); return; }
    beatRef.current = 0;
    const tick = () => {
      const step = beatRef.current % 16;
      setCurrentStep(step);
      if (patternRef.current.kick.includes(step)) playDrum('kick', volumeRef.current / 100);
      if (patternRef.current.snare.includes(step)) playDrum('snare', volumeRef.current / 100);
      if (patternRef.current.hat.includes(step)) playDrum('hat', volumeRef.current / 100);
      beatRef.current++;
    };
    tick(); timer.current = window.setInterval(tick, (60000 / tempo) / 4);
    return () => window.clearInterval(timer.current);
  }, [playing, tempo]);
  const toggleSequencer = () => setPlaying((value) => !value);
  const toggleStep = (drum, step) => setPattern((current) => ({ ...current, [drum]: current[drum].includes(step) ? current[drum].filter((item) => item !== step) : [...current[drum], step] }));

  return html`<div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="DoReMi ana sayfa"><span className="brand-mark"><span></span><span></span><span></span></span><span>DoReMi</span></a>
      <nav className="instrument-nav" aria-label="Enstrüman seçimi">
        ${INSTRUMENTS.map((item) => html`<button className=${`nav-item ${instrument === item.id ? 'selected' : ''}`} onClick=${() => setInstrument(item.id)} aria-pressed=${instrument === item.id} key=${item.id}><${Icon} name=${item.icon} size=${19}/><span>${item.name}</span></button>`)}
      </nav>
      <div className="top-actions"><span className="live-badge"><i></i> Canlı çal</span><button className="avatar" aria-label="Kullanıcı profili">D</button></div>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><${Icon} name="spark" size=${15}/> KENDİ RİTMİNİ BUL</div><h1>Müziğini keşfet,<br/><span>anı yakala.</span></h1><p>Bir tuşa dokun, içinden geleni çal. DoReMi ile müzik yapmak bu kadar kolay.</p><div className="hero-meta"><span className="avatar-stack"><i>♫</i><i>♪</i><i>✳</i></span><span>Her an, herkes için müzik</span></div></div>
        <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-sun"></div><div className="art-disc"><span></span></div><div className="art-note note-one">♪</div><div className="art-note note-two">♫</div><div className="art-star">✳</div><div className="art-caption">iyi hisset<br/>ve çal</div></div>
      </section>

      <section className="studio" aria-label="Müzik stüdyosu">
        <div className="studio-heading"><div><div className="section-kicker">MİNİ STÜDYO</div><h2>Şimdi senin sıran<span>.</span></h2></div><div className="studio-controls"><label className="volume-control"><${Icon} name="volume" size=${17}/><input aria-label="Ses seviyesi" type="range" min="0" max="100" value=${volume} onInput=${(e) => setVolume(Number(e.currentTarget.value))}/></label><button className="tempo-control" onClick=${() => setTempo((value) => value >= 140 ? 70 : value + 8)} aria-label=${`Tempo: ${tempo} BPM, değiştirmek için tıkla`}><span>♩</span> ${tempo} BPM</button></div></div>
        <div className="instrument-card">
          <div className="instrument-info"><div className=${`instrument-icon ${currentInstrument.color}`}><${Icon} name=${currentInstrument.icon} size=${25}/></div><div><h3>${currentInstrument.name}</h3><p>${currentInstrument.subtitle}</p></div><span className=${`sound-status ${instrument === 'drums' || audioStatus[instrument] === 'ready' ? 'ready' : audioStatus[instrument] === 'loading' ? 'loading' : 'fallback'}`}><i></i>${instrument === 'drums' ? 'Hazır' : audioStatus[instrument] === 'ready' ? `${sampleCounts[instrument]} örnek hazır` : audioStatus[instrument] === 'loading' ? 'Sesler yükleniyor' : 'Çevrimdışı ses'}</span></div>
          <div className="instrument-content">
            ${instrument === 'drums' ? html`<div className="drum-view"><div className="drum-pad-row">${[['kick', 'Bas davul', 'KICK', 'kick-pad'], ['snare', 'Trampet', 'SNARE', 'snare-pad'], ['hat', 'Hi-hat', 'HI-HAT', 'hat-pad']].map(([id, label, short, color]) => html`<button className=${`drum-pad ${color} ${activeDrum === id ? 'hit' : ''}`} onPointerDown=${() => playDrumPad(id)} key=${id}><span className="pad-shape">${id === 'kick' ? '●' : id === 'snare' ? '◉' : '✳'}</span><span className="pad-name">${label}</span><span className="pad-key">${id === 'kick' ? 'A' : id === 'snare' ? 'S' : 'D'}</span></button>`)}</div><div className="drum-hint">Pedlere dokun veya klavyende <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> tuşlarını kullan</div></div>` : instrument === 'guitar-acoustic' ? html`<${GuitarView} activeChord=${activeChord} playChord=${playChord} playSampleOrSynth=${playSampleOrSynth} volume=${volume}/>` : html`<${PianoKeyboard} octave=${octave} setOctave=${setOctave} activeNotes=${activeNotes} setActiveNotes=${setActiveNotes} playNote=${playNote}/>`}
          </div>
        </div>
      </section>

      <section className="groove-section"><div className="groove-heading"><div><div className="section-kicker">RİTMİNİ KUR</div><h2>Bir beat ekle<span>.</span></h2><p>Küçük bir ritim, kocaman bir başlangıç.</p></div><button className=${`play-button ${playing ? 'playing' : ''}`} onClick=${toggleSequencer}><${Icon} name=${playing ? 'pause' : 'play'} size=${18}/>${playing ? 'Durdur' : 'Ritmi çal'}</button></div><div className="sequencer-card">${[['kick', 'Bas davul', 'kick-dot'], ['snare', 'Trampet', 'snare-dot'], ['hat', 'Hi-hat', 'hat-dot']].map(([drum, label, color]) => html`<div className="sequence-row" key=${drum}><span className="sequence-label"><i className=${color}></i>${label}</span><div className="steps">${Array.from({ length: 16 }, (_, step) => html`<button className=${`step ${pattern[drum].includes(step) ? 'on' : ''} ${step % 4 === 0 ? 'measure' : ''} ${playing && currentStep === step ? 'current' : ''}`} aria-label=${`${label}, adım ${step + 1}`} aria-pressed=${pattern[drum].includes(step)} onClick=${() => toggleStep(drum, step)} key=${step}></button>`)}</div></div>`)}</div></section>
      <section className="bottom-note"><span className="note-icon">♪</span><p>İlk notan en güzel notan.<br/><b>Devam et, kendi sesini bul.</b></p><span className="note-spark">✳</span></section>
    </main>

    <footer><a className="footer-brand" href="#top">DoReMi<span>✳</span></a><span>Ücretsiz. Özgürce çal.</span><span className="source-links">Ses örnekleri: <a className="source-link" href="https://vis.versilstudios.net/vsco-community.html" target="_blank" rel="noreferrer">VSO2</a> · <a className="source-link" href="https://theremin.music.uiowa.edu/" target="_blank" rel="noreferrer">Iowa</a></span></footer>
  </div>`;
}

function AppWithIcons() { return html`<${App}/>`; }
createRoot(document.getElementById('root')).render(html`<${AppWithIcons}/>`);
