// Sons et vibrations des jeux.
// Sons : synthétisés avec la Web Audio API, aucun fichier audio à charger.
// Vibrations : navigator.vibrate sur Android. Sur iPhone, Safari ne le gère pas et, depuis
// iOS 26.5, refuse toute vibration lancée par le code : seul un vrai toucher sur un
// interrupteur natif (<input type="checkbox" switch>) fait vibrer. La grille est donc un
// <label> relié à un interrupteur caché (voir Demineur.tsx) : un « tic » par toucher.
import type { Game } from './demineur-logic'

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

// Le contexte audio est créé au premier clic : iPhone et navigateurs l'exigent.
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state !== 'running') void ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, endFreq?: number) {
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.03)
}

function boom(a: AudioContext) {
  const t = a.currentTime
  if (!noise) {
    noise = a.createBuffer(1, Math.floor(a.sampleRate * 0.8), a.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  // Souffle : bruit blanc filtré de plus en plus sourd.
  const src = a.createBufferSource()
  src.buffer = noise
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2200, t)
  filter.frequency.exponentialRampToValueAtTime(120, t + 0.7)
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75)
  src.connect(filter).connect(gain).connect(a.destination)
  src.start(t)
  // Grondement grave par-dessus.
  tone(a, 120, 0, 0.55, 'sine', 0.55, 38)
}

export type Sound =
  | 'reveal' | 'cascade' | 'flag' | 'unflag' | 'boom' | 'win' | 'toggle'
  | 'flip' | 'match' | 'nomatch' | 'slide' | 'merge' | 'drop' | 'eat'
  | 'rotate' | 'lock' | 'line' | 'gameover' | 'select' | 'error'

// level : pour « merge » (valeur de la tuile) et « line » (nombre de lignes), le son monte avec.
export function playSound(kind: Sound, level = 1) {
  const a = audio()
  if (!a) return
  switch (kind) {
    case 'reveal': return tone(a, 520, 0, 0.07, 'sine', 0.13, 780)
    case 'cascade':
      tone(a, 520, 0, 0.07, 'sine', 0.12, 780)
      return tone(a, 780, 0.05, 0.1, 'sine', 0.1, 1150)
    case 'flag': return tone(a, 330, 0, 0.09, 'triangle', 0.22, 460)
    case 'unflag': return tone(a, 460, 0, 0.08, 'triangle', 0.16, 300)
    case 'boom': return boom(a)
    case 'win':
      ;[523.25, 659.25, 783.99].forEach((f, k) => tone(a, f, k * 0.09, 0.16, 'triangle', 0.15))
      return tone(a, 1046.5, 0.27, 0.4, 'triangle', 0.15)
    case 'toggle': return tone(a, 660, 0, 0.06, 'sine', 0.1)
    case 'flip': return tone(a, 720, 0, 0.05, 'triangle', 0.1, 960)
    case 'match':
      tone(a, 660, 0, 0.09, 'sine', 0.13)
      return tone(a, 990, 0.08, 0.16, 'sine', 0.12)
    case 'nomatch': return tone(a, 300, 0, 0.14, 'triangle', 0.12, 210)
    case 'slide': return tone(a, 220, 0, 0.05, 'sine', 0.07, 170)
    case 'merge': {
      const f = 240 * Math.pow(1.12, Math.log2(Math.max(2, level)))
      return tone(a, f, 0, 0.09, 'triangle', 0.13, f * 1.25)
    }
    case 'drop':
      tone(a, 190, 0, 0.12, 'sine', 0.22, 85)
      return tone(a, 900, 0, 0.025, 'triangle', 0.05)
    case 'eat': return tone(a, 560, 0, 0.07, 'triangle', 0.13, 900)
    case 'rotate': return tone(a, 520, 0, 0.04, 'triangle', 0.07, 640)
    case 'lock': return tone(a, 150, 0, 0.07, 'sine', 0.18, 100)
    case 'line': {
      const notes = [523.25, 659.25, 783.99, 1046.5].slice(0, Math.min(4, Math.max(1, level)) + 1)
      notes.forEach((f, k) => tone(a, f, k * 0.06, 0.14, 'triangle', 0.13))
      return
    }
    case 'gameover':
      ;[440, 349.23, 261.63].forEach((f, k) => tone(a, f, k * 0.14, 0.22, 'triangle', 0.14))
      return tone(a, 196, 0.42, 0.45, 'triangle', 0.13)
    case 'select': return tone(a, 880, 0, 0.035, 'sine', 0.07)
    case 'error': return tone(a, 230, 0, 0.16, 'triangle', 0.14, 180)
  }
}

// Durées de vibration (ms) pour Android.
const patterns = {
  reveal: 12,
  flag: 25,
  boom: [120, 60, 220],
  win: [40, 70, 40, 70, 120],
  tap: 10,
  error: [40, 50, 40],
  success: [20, 50, 60],
} as const
export type Buzz = keyof typeof patterns

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function vibrate(kind: Buzz) {
  if (canVibrate()) navigator.vibrate(patterns[kind] as number | number[])
}

// Choisit le son et la vibration selon ce qui vient de changer dans la partie.
// Renvoie la vibration voulue : sur iPhone, c'est le toucher en cours qui la produira.
export function gameFeedback(prev: Game, next: Game, opts: { sound: boolean; vibe: boolean }): Buzz | null {
  let sound: Sound | null = null
  let buzz: Buzz | null = null
  if (next.status === 'lost' && prev.status !== 'lost') {
    sound = 'boom'
    buzz = 'boom'
  } else if (next.status === 'won' && prev.status !== 'won') {
    sound = 'win'
    buzz = 'win'
  } else if (next.flags !== prev.flags) {
    sound = next.flags > prev.flags ? 'flag' : 'unflag'
    buzz = 'flag'
  } else if (next.opened > prev.opened) {
    sound = next.opened - prev.opened > 1 ? 'cascade' : 'reveal'
    buzz = 'reveal'
  }
  if (opts.sound && sound) playSound(sound)
  if (opts.vibe && buzz) vibrate(buzz)
  return buzz
}
