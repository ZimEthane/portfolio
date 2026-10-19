// Sons et vibrations du démineur.
// Sons : synthétisés avec la Web Audio API, aucun fichier audio à charger.
// Vibrations : navigator.vibrate sur Android ; sur iPhone (Safari ne le gère pas),
// on déclenche le petit retour haptique natif d'un interrupteur caché (Safari 17.4+).
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

export type Sound = 'reveal' | 'cascade' | 'flag' | 'unflag' | 'boom' | 'win' | 'toggle'

export function playSound(kind: Sound) {
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
  }
}

// Un « tic » haptique sur iPhone : on fait basculer un interrupteur invisible.
function iosTick() {
  try {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.body.appendChild(label)
    label.click()
    label.remove()
  } catch {
    /* pas de retour haptique disponible */
  }
}

// pattern : durées pour Android ; ticks : nombre de tics sur iPhone.
const patterns = {
  reveal: { pattern: 8, ticks: 1 },
  flag: { pattern: 18, ticks: 1 },
  boom: { pattern: [90, 50, 160], ticks: 3 },
  win: { pattern: [30, 60, 30, 60, 80], ticks: 2 },
} as const

export function vibrate(kind: keyof typeof patterns) {
  const { pattern, ticks } = patterns[kind]
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern as number | number[])
    return
  }
  iosTick()
  for (let k = 1; k < ticks; k++) window.setTimeout(iosTick, k * 120)
}

// Choisit le son et la vibration selon ce qui vient de changer dans la partie.
export function gameFeedback(prev: Game, next: Game, opts: { sound: boolean; vibe: boolean }) {
  let sound: Sound | null = null
  let buzz: keyof typeof patterns | null = null
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
}
