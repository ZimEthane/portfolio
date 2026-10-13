// Défilement doux géré par le site (identique sur tous les navigateurs et même si le système réduit les animations).
// Durée proportionnelle à la distance (0,6 à 1,1 s), courbe qui démarre et finit en douceur.
// L'animation s'arrête dès que le visiteur reprend la main (molette, doigt, clavier).
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const OFFSET = 100 // même marge que scroll-padding-top dans le CSS

let cancelCurrent: (() => void) | null = null

export function animateScrollTo(target: number) {
  cancelCurrent?.()
  const max = document.documentElement.scrollHeight - window.innerHeight
  const end = Math.max(0, Math.min(target, max))
  const start = window.scrollY
  const distance = Math.abs(end - start)
  if (distance < 2) return
  const duration = Math.min(1100, Math.max(600, 350 + distance * 0.15))
  const root = document.documentElement
  const previous = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto' // évite que le défilement du CSS se superpose à l'animation
  const interrupts = ['wheel', 'touchstart', 'keydown'] as const
  let frame = 0
  const finish = () => {
    cancelAnimationFrame(frame)
    root.style.scrollBehavior = previous
    interrupts.forEach(name => window.removeEventListener(name, finish))
    if (cancelCurrent === finish) cancelCurrent = null
  }
  cancelCurrent = finish
  interrupts.forEach(name => window.addEventListener(name, finish, { passive: true }))
  const t0 = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - t0) / duration)
    window.scrollTo(0, Math.round(start + (end - start) * ease(progress)))
    if (progress < 1) frame = requestAnimationFrame(step)
    else finish()
  }
  frame = requestAnimationFrame(step)
}

export const scrollToTop = () => animateScrollTo(0)

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return false
  animateScrollTo(el.getBoundingClientRect().top + window.scrollY - OFFSET)
  return true
}
