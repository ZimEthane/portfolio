// Mots mélangés : retrouver tous les mots qu'on peut écrire avec les lettres de la roue.

export interface NiveauMots {
  lettres: string // les lettres de la roue (sans accents)
  mots: string[] // les mots à trouver, sans accents, du plus court au plus long
  formes: Record<string, string> // la forme accentuée à afficher (« ETE » → « ÉTÉ »)
}

export function lireNiveau(code: string): NiveauMots {
  const [lettres, liste] = code.split(':')
  const mots: string[] = []
  const formes: Record<string, string> = {}
  for (const m of liste.split(',')) {
    const [mot, forme] = m.split('=')
    mots.push(mot)
    formes[mot] = forme ?? mot
  }
  return { lettres, mots, formes }
}

// Le mot peut-il s'écrire avec ces lettres (chacune au plus une fois) ?
export function possible(mot: string, lettres: string): boolean {
  const reste = lettres.split('')
  for (const c of mot) {
    const k = reste.indexOf(c)
    if (k < 0) return false
    reste.splice(k, 1)
  }
  return true
}

// Prochaine lettre à dévoiler pour l'indice : dans le plus court des mots pas encore trouvés,
// la première lettre encore cachée.
export function prochainIndice(nv: NiveauMots, trouves: string[], reveles: Record<string, number[]>): { mot: string; i: number } | null {
  for (const mot of nv.mots) {
    if (trouves.includes(mot)) continue
    const deja = reveles[mot] ?? []
    for (let i = 0; i < mot.length; i++) if (!deja.includes(i)) return { mot, i }
  }
  return null
}
