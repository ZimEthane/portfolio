// Logique pure du Snake.

export type Dir = 'up' | 'down' | 'left' | 'right'
export interface Pt { x: number; y: number }

export interface Snake {
  n: number // taille de la grille (n × n)
  walls: boolean // true : toucher un bord fait perdre ; false : on ressort de l'autre côté
  body: Pt[] // tête en premier
  dir: Dir
  food: Pt
  bonus: (Pt & { ttl: number }) | null // pomme dorée, disparaît après ttl pas
  grow: number // segments encore à ajouter
  score: number
  eaten: number
  alive: boolean
}

const DELTA: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
export const OPPOSE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y

export function freeCell(s: Pick<Snake, 'n' | 'body' | 'food' | 'bonus'>, random: () => number, avoidFood = true): Pt | null {
  const taken = new Set(s.body.map(p => p.y * s.n + p.x))
  if (avoidFood) taken.add(s.food.y * s.n + s.food.x)
  if (s.bonus) taken.add(s.bonus.y * s.n + s.bonus.x)
  const free: Pt[] = []
  for (let y = 0; y < s.n; y++) for (let x = 0; x < s.n; x++) if (!taken.has(y * s.n + x)) free.push({ x, y })
  return free.length ? free[Math.floor(random() * free.length)] : null
}

export function newSnake(n: number, walls: boolean, random: () => number = Math.random): Snake {
  const mid = Math.floor(n / 2)
  const body = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }]
  const base = { n, body, food: { x: -1, y: -1 }, bonus: null }
  const food = freeCell(base, random, false)!
  return { n, walls, body, dir: 'right', food, bonus: null, grow: 0, score: 0, eaten: 0, alive: true }
}

export type Event = 'food' | 'bonus' | 'dead' | 'full' | null

// Avance d'une case. dir : direction demandée (ignorée si c'est un demi-tour).
export function step(s: Snake, dir: Dir, random: () => number = Math.random): { s: Snake; event: Event } {
  if (!s.alive) return { s, event: null }
  const d = dir === OPPOSE[s.dir] ? s.dir : dir
  let head = { x: s.body[0].x + DELTA[d].x, y: s.body[0].y + DELTA[d].y }
  const out = head.x < 0 || head.y < 0 || head.x >= s.n || head.y >= s.n
  if (out) {
    if (s.walls) return { s: { ...s, dir: d, alive: false }, event: 'dead' }
    head = { x: (head.x + s.n) % s.n, y: (head.y + s.n) % s.n }
  }
  // La queue avance en même temps : on peut entrer dans la case qu'elle libère (sauf si on grandit).
  const tailFrees = s.grow === 0
  const bodyToCheck = tailFrees ? s.body.slice(0, -1) : s.body
  if (bodyToCheck.some(p => same(p, head))) return { s: { ...s, dir: d, alive: false }, event: 'dead' }

  let grow = s.grow
  let score = s.score
  let eaten = s.eaten
  let food = s.food
  let bonus = s.bonus ? { ...s.bonus, ttl: s.bonus.ttl - 1 } : null
  let event: Event = null

  const body = [head, ...s.body]
  if (grow > 0) grow--
  else body.pop()

  if (same(head, s.food)) {
    grow += 1
    score += 1
    eaten += 1
    event = 'food'
    const next = { ...s, body, food: { x: -1, y: -1 }, bonus }
    const cell = freeCell(next, random, false)
    if (!cell) return { s: { ...s, body, dir: d, score, eaten, grow, alive: false }, event: 'full' }
    food = cell
    // De temps en temps, une pomme dorée apparaît pour un court moment.
    if (!bonus && eaten % 5 === 0) {
      const b = freeCell({ ...next, food }, random)
      if (b) bonus = { ...b, ttl: Math.max(25, s.n * 2) }
    }
  } else if (bonus && same(head, bonus)) {
    score += 5
    grow += 1
    bonus = null
    event = 'bonus'
  }
  if (bonus && bonus.ttl <= 0) bonus = null

  return { s: { ...s, body, dir: d, food, bonus, grow, score, eaten }, event }
}
