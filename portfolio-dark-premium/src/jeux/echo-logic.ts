// Logique du jeu Écho : couleurs, notes, rythme de la suite et dessin des touches du plateau.

export interface Couleur {
  nom: string
  sombre: string // touche éteinte
  vif: string // touche allumée
  note: number // fréquence en Hz (gamme pentatonique de do : chaque couleur garde sa note)
}

export const COULEURS: Record<string, Couleur> = {
  vert: { nom: 'Vert', sombre: '#1b5a3a', vif: '#4ef08a', note: 392.0 },
  rouge: { nom: 'Rouge', sombre: '#6a1d24', vif: '#ff5c5c', note: 523.25 },
  orange: { nom: 'Orange', sombre: '#6b3613', vif: '#ff9a3d', note: 440.0 },
  bleu: { nom: 'Bleu', sombre: '#1b3c6e', vif: '#5aa8ff', note: 261.63 },
  violet: { nom: 'Violet', sombre: '#45276a', vif: '#c084ff', note: 293.66 },
  jaune: { nom: 'Jaune', sombre: '#665210', vif: '#ffd84d', note: 329.63 },
}

// Ordre des touches dans le sens des aiguilles d'une montre, en partant du haut à gauche.
export const DISPOSITIONS: Record<number, string[]> = {
  4: ['vert', 'rouge', 'bleu', 'jaune'],
  6: ['vert', 'rouge', 'orange', 'bleu', 'violet', 'jaune'],
}

export const tirage = (n: number) => Math.floor(Math.random() * n)

// Durée d'allumage d'une couleur (ms) : la suite accélère à partir de 6 couleurs, puis de 14.
export function rythme(vitesses: readonly [number, number, number], longueur: number) {
  const on = longueur <= 5 ? vitesses[0] : longueur <= 13 ? vitesses[1] : vitesses[2]
  // La pause reste assez longue pour bien voir deux fois la même couleur d'affilée.
  return { on, pause: Math.max(100, Math.round(on * 0.3)) }
}

// Angles (en degrés, sens horaire depuis midi) de la touche i sur n.
// Avec 4 touches : quarts haut-gauche, haut-droite, bas-droite, bas-gauche.
export function angles(n: number, i: number): [number, number] {
  const part = 360 / n
  return [(i - 1) * part, i * part]
}

// Chemin SVG d'une portion d'anneau (centre cx, cy ; rayons R extérieur et r intérieur).
export function secteur(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  const p = (a: number, rr: number) => {
    const t = (a * Math.PI) / 180
    return `${(cx + rr * Math.sin(t)).toFixed(2)} ${(cy - rr * Math.cos(t)).toFixed(2)}`
  }
  const grand = a1 - a0 > 180 ? 1 : 0
  return `M${p(a0, R)}A${R} ${R} 0 ${grand} 1 ${p(a1, R)}L${p(a1, r)}A${r} ${r} 0 ${grand} 0 ${p(a0, r)}Z`
}

// Position du centre d'une touche (pour y écrire son numéro de clavier).
export function milieu(cx: number, cy: number, rayon: number, a0: number, a1: number) {
  const t = (((a0 + a1) / 2) * Math.PI) / 180
  return { x: cx + rayon * Math.sin(t), y: cy - rayon * Math.cos(t) }
}
