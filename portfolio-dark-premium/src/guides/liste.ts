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
  avancement?: string // petite ligne en bas de la carte
  onglets?: string[] // couleurs des sections, pour la couverture miniature
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
    avancement: 'Guide complet · 7 sections · carte interactive',
    onglets: ['#2c6355', '#57407f', '#96712a', '#2d5079', '#8a4b2a', '#8f2a24', '#4d6b80'],
    component: lazy(() => import('./elden-ring/EldenRing')),
  },
]
