import { tutos as liste } from './liste'
import type { Tuto } from './types'

// Contenu détaillé de chaque tuto (étapes, matériel…), rangé dans son propre fichier.
const contenus: Record<string, Partial<Tuto>> = {}

export const tutos: Tuto[] = liste.map(t => ({ ...t, ...contenus[t.id] }))
export type { Tuto, Etape, Categorie } from './types'
