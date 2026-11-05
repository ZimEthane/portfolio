// Les 12 classes de départ (page 10 du PDF). Valeurs de départ de chaque stat, max 17.
// « fortes » : les 2 stats les plus hautes, en foncé sur les barres.
// ★ = classe du Tarnished Pack (mise à jour 1.17).

export type Stat = 'vig' | 'esp' | 'end' | 'for' | 'dex' | 'int' | 'foi' | 'eso'
export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

export const STATS_COURTES: { id: Stat; court: string }[] = [
  { id: 'vig', court: 'Vig' }, { id: 'esp', court: 'Esp' }, { id: 'end', court: 'End' }, { id: 'for', court: 'For' },
  { id: 'dex', court: 'Dex' }, { id: 'int', court: 'Int' }, { id: 'foi', court: 'Foi' }, { id: 'eso', court: 'Éso' },
]

export const COULEURS_TIER: Record<Tier, string> = { S: '#b8892b', A: '#8a7a3a', B: '#5d7466', C: '#6c6a75', D: '#7a4a44' }

export interface Classe {
  nom: string
  pack?: boolean
  niveau: number
  style: string
  stats: Record<Stat, number>
  fortes: Stat[]
  debutant: Tier
  expert: Tier
}

const s = (vig: number, esp: number, end: number, force: number, dex: number, int: number, foi: number, eso: number): Record<Stat, number> =>
  ({ vig, esp, end, for: force, dex, int, foi, eso })

export const CLASSES: Classe[] = [
  { nom: 'Vagabond', niveau: 9, style: 'Mêlée', stats: s(15, 10, 11, 14, 13, 9, 9, 7), fortes: ['vig', 'for'], debutant: 'S', expert: 'A' },
  { nom: 'Samouraï', niveau: 9, style: 'Dextérité', stats: s(12, 11, 13, 12, 15, 9, 8, 8), fortes: ['end', 'dex'], debutant: 'S', expert: 'S' },
  { nom: 'Astrologue', niveau: 6, style: 'Magie', stats: s(9, 15, 9, 8, 12, 16, 7, 9), fortes: ['esp', 'int'], debutant: 'A', expert: 'A' },
  { nom: 'Confesseur', niveau: 10, style: 'Foi + mêlée', stats: s(10, 13, 10, 12, 12, 9, 14, 9), fortes: ['esp', 'foi'], debutant: 'A', expert: 'A' },
  { nom: 'Héros', niveau: 7, style: 'Force', stats: s(14, 9, 12, 16, 9, 7, 8, 11), fortes: ['vig', 'for'], debutant: 'B', expert: 'A' },
  { nom: 'Prisonnier', niveau: 9, style: 'Lame magique', stats: s(11, 12, 11, 11, 14, 14, 6, 9), fortes: ['dex', 'int'], debutant: 'B', expert: 'B' },
  { nom: 'Prophète', niveau: 7, style: 'Foi', stats: s(10, 14, 8, 11, 10, 7, 16, 10), fortes: ['esp', 'foi'], debutant: 'B', expert: 'B' },
  { nom: 'Guerrier', niveau: 8, style: 'Dextérité', stats: s(11, 12, 11, 10, 16, 10, 8, 9), fortes: ['esp', 'dex'], debutant: 'C', expert: 'C' },
  { nom: 'Bandit', niveau: 5, style: 'Ésotérisme', stats: s(10, 11, 10, 9, 13, 9, 8, 14), fortes: ['dex', 'eso'], debutant: 'C', expert: 'B' },
  { nom: 'Misérable', niveau: 1, style: 'Page blanche', stats: s(10, 10, 10, 10, 10, 10, 10, 10), fortes: [], debutant: 'D', expert: 'S' },
  { nom: 'Heavy Knight', pack: true, niveau: 10, style: 'Force, tank', stats: s(14, 8, 17, 15, 11, 7, 8, 9), fortes: ['end', 'for'], debutant: 'A', expert: 'C' },
  { nom: 'Idus Knight', pack: true, niveau: 7, style: 'Dex + Foi', stats: s(10, 12, 11, 13, 15, 8, 11, 6), fortes: ['for', 'dex'], debutant: 'B', expert: 'A' },
]
