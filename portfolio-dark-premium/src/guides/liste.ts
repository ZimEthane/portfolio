import { lazy } from 'react'
import type { ComponentType } from 'react'

export interface GuideInfo {
  id: string // adresse : #guides/<id>
  titre: string
  sousTitre: string
  resume: string
  categorie: string
  couleur: string // couleur d'accent de la carte
  nouveau?: boolean
  // Le guide reçoit la suite de l'adresse : "bases/les-8-statistiques" pour #guides/elden-ring/bases/les-8-statistiques
  component: ComponentType<{ chemin: string }>
}

// Pour ajouter un guide : créer son dossier dans src/guides/, puis le brancher ici.
export const guides: GuideInfo[] = [
  {
    id: 'elden-ring',
    titre: 'Elden Ring',
    sousTitre: 'Le guide de A à Z',
    resume: 'Les bases, les classes, la progression zone par zone, toutes les quêtes dans le bon ordre, les donjons, les boss et le 100 %.',
    categorie: 'Jeu vidéo',
    couleur: '#d9c08a',
    nouveau: true,
    component: lazy(() => import('./elden-ring/EldenRing')),
  },
]
