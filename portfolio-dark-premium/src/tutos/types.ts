import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type Categorie = 'Vie quotidienne' | 'Casse-têtes' | 'Informatique' | 'Cuisine'

export interface Etape {
  titre: string
  texte: ReactNode
  visuel?: ReactNode
  astuce?: ReactNode
}

export interface Tuto {
  id: string
  titre: string
  resume: string
  categorie: Categorie
  niveau: 'Facile' | 'Moyen' | 'Avancé'
  duree: string
  age: string
  icone: LucideIcon
  couleur: string // couleur d'accent de la carte
  materiel?: string[]
  intro?: ReactNode
  etapes?: Etape[] // absent : le tuto est encore en chantier
  conclusion?: ReactNode
}
