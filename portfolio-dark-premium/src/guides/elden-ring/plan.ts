// Plan du guide Elden Ring, repris du sommaire du PDF « Édition ultime ».
// Chaque section a sa couleur (l'onglet sur le bord droit) et ses pages.
// « prete: false » : la section n'est pas encore convertie, elle affiche l'écran « en chantier ».

export interface PageGuide {
  id: string // ancre dans la page de la section : #guides/elden-ring/<section>/<id>
  surtitre: string // petit mot au-dessus du titre (BIENVENUE, CHAPITRE 5…)
  titre: string
}

export interface SectionGuide {
  id: string
  numero: number
  nom: string // nom court, sur l'onglet de couleur
  titre: string
  intro: string
  couleur: string
  prete: boolean
  pages: PageGuide[]
}

export const SECTIONS: SectionGuide[] = [
  {
    id: 'bases', numero: 1, nom: 'Bases', titre: 'Les bases', couleur: '#2c6355', prete: true,
    intro: 'Commandes, combat, progression du personnage, objets utiles : tout pour bien démarrer.',
    pages: [
      { id: 'avant-de-commencer', surtitre: 'Bienvenue', titre: 'Avant de commencer' },
      { id: 'les-bases-du-jeu', surtitre: 'Les bases', titre: 'Les bases du jeu' },
    ],
  },
  {
    id: 'classes', numero: 2, nom: 'Classes', titre: 'Classes & builds', couleur: '#57407f', prete: true,
    intro: 'Les 10 classes de départ, les tier lists débutant et expert, et quoi monter en premier.',
    pages: [
      { id: 'choisir-sa-classe', surtitre: 'Classes', titre: 'Choisir sa classe' },
    ],
  },
  {
    id: 'progression', numero: 3, nom: 'Progression', titre: 'Progression', couleur: '#96712a', prete: false,
    intro: 'Le parcours conseillé de A à Z, chapitre par chapitre, avec cartes, boss et objets à ne pas rater.',
    pages: [
      { id: 'de-a-a-z', surtitre: 'Progression', titre: 'La progression de A à Z' },
      { id: 'ch-0', surtitre: 'Chapitre 0', titre: 'Prologue et premiers pas' },
      { id: 'ch-1', surtitre: 'Chapitre 1', titre: 'Nécrolimbe et Stormhill' },
      { id: 'ch-2', surtitre: 'Chapitre 2', titre: 'Péninsule larmoyante' },
      { id: 'ch-3', surtitre: 'Chapitre 3', titre: 'Château de Voilorage et Table ronde' },
      { id: 'ch-4', surtitre: 'Chapitre 4', titre: 'Siofra (optionnel)' },
      { id: 'ch-5', surtitre: 'Chapitre 5', titre: 'Liurnia des Lacs et Raya Lucaria' },
      { id: 'ch-6', surtitre: 'Chapitre 6', titre: 'Caelid et Dragonbarrow' },
      { id: 'ch-7', surtitre: 'Chapitre 7', titre: 'Nokron, Ainsel et quête de Ranni' },
      { id: 'ch-8', surtitre: 'Chapitre 8', titre: 'Plateau Altus' },
      { id: 'ch-9', surtitre: 'Chapitre 9', titre: 'Mont Gelmir et Manoir du Volcan' },
      { id: 'ch-10', surtitre: 'Chapitre 10', titre: 'Leyndell, Capitale royale' },
      { id: 'ch-11', surtitre: 'Chapitre 11', titre: 'Cimes des Géants, Champs de neige, Mohgwyn et Arbre sacré' },
      { id: 'ch-12', surtitre: 'Chapitre 12', titre: 'Avant la Forge : la checklist' },
      { id: 'ch-13', surtitre: 'Chapitre 13', titre: 'Ruines de Farum Azula' },
      { id: 'ch-14', surtitre: 'Chapitre 14', titre: 'Capitale des Cendres et fins' },
    ],
  },
  {
    id: 'quetes', numero: 4, nom: 'Quêtes', titre: 'Quêtes', couleur: '#2d5079', prete: false,
    intro: 'Les points de non-retour, les grandes quêtes en schémas et toutes les quêtes en un coup d’œil.',
    pages: [
      { id: 'points-de-non-retour', surtitre: 'Quêtes', titre: 'Les points de non-retour' },
      { id: 'grandes-quetes', surtitre: 'Quêtes', titre: 'Les grandes quêtes en schémas' },
      { id: 'toutes-les-quetes', surtitre: 'Annexe', titre: 'Toutes les quêtes en un coup d’œil' },
    ],
  },
  {
    id: 'donjons', numero: 5, nom: 'Donjons', titre: 'Donjons', couleur: '#8a4b2a', prete: false,
    intro: 'Catacombes, grottes, tunnels, tours divines et prisons éternelles : carte de l’entrée, boss et objets.',
    pages: [
      { id: 'tous-les-donjons', surtitre: 'Donjons', titre: 'Tous les donjons, région par région' },
    ],
  },
  {
    id: 'bestiaire', numero: 6, nom: 'Bestiaire', titre: 'Bestiaire', couleur: '#8f2a24', prete: false,
    intro: 'Tous les boss du jeu de base : où, quand, faiblesses, méthode et butin.',
    pages: [
      { id: 'tous-les-boss', surtitre: 'Bestiaire', titre: 'Tous les boss, région par région' },
    ],
  },
  {
    id: '100', numero: 8, nom: '100 %', titre: '100 %', couleur: '#4d6b80', prete: false,
    intro: 'Les 42 trophées, les objets légendaires, la collection complète et la checklist lieu par lieu.',
    pages: [
      { id: 'objectif-100', surtitre: '100 %', titre: 'Objectif 100 % : trophées et collection' },
      { id: 'checklist', surtitre: 'Annexe', titre: 'Checklist 100 % : tous les objets, lieu par lieu' },
    ],
  },
]

// Parties annoncées dans le PDF mais pas encore écrites.
export const A_VENIR = '7 Inventaire · 9 Atlas · 10 Index'

export const lienSection = (s: SectionGuide) => `#guides/elden-ring/${s.id}`
export const lienPage = (s: SectionGuide, p: PageGuide) => `#guides/elden-ring/${s.id}/${p.id}`
