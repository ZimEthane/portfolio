import { cube } from './cube'
import { lacets } from './lacets'
import { tutos as liste } from './liste'
import { pc } from './pc'
import type { Tuto } from './types'

// Contenu détaillé de chaque tuto (étapes, matériel…), rangé dans son propre fichier.
const contenus: Record<string, Partial<Tuto>> = { lacets, cube, pc }

export const tutos: Tuto[] = liste.map(t => ({ ...t, ...contenus[t.id] }))
export type { Tuto, Etape, Categorie } from './types'
