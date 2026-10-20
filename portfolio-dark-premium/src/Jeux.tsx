import { lazy, Suspense, useState } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, LayoutGrid } from 'lucide-react'
import { APERCUS } from './jeux/apercus'
import './jeux/jeux.css'

type Categorie = 'reflexion' | 'arcade' | 'plateau'
const CATEGORIES: { id: Categorie | 'tous'; nom: string }[] = [
  { id: 'tous', nom: 'Tous les jeux' },
  { id: 'reflexion', nom: 'Réflexion' },
  { id: 'arcade', nom: 'Arcade' },
  { id: 'plateau', nom: 'Plateau et cartes' },
]

interface GameInfo {
  id: string
  name: string
  court: string // une ligne, pour la carte de la page de garde
  description: string
  categorie: Categorie
  couleur: string // couleur du jeu (bordure de la carte au survol)
  nouveau?: boolean
  component: ComponentType // chargé seulement quand on ouvre le jeu
}

// Pour ajouter un jeu : créer son composant dans src/jeux/, son aperçu dans apercus.tsx, puis le brancher ici.
const games: GameInfo[] = [
  {
    id: 'demineur', name: 'Démineur', categorie: 'reflexion', couleur: '#ff6b6b',
    court: 'Dégage la grille sans toucher une mine.',
    description: 'Le classique : dégager toutes les cases sans faire exploser une seule mine. Les chiffres indiquent combien de mines touchent chaque case.',
    component: lazy(() => import('./jeux/Demineur')),
  },
  {
    id: '2048', name: '2048', categorie: 'reflexion', couleur: '#ffd36b',
    court: 'Fusionne les tuiles jusqu’à 2048.',
    description: 'Fais glisser les tuiles : deux tuiles identiques qui se touchent fusionnent. Arriveras-tu jusqu’à la tuile 2048 ?',
    component: lazy(() => import('./jeux/Jeu2048')),
  },
  {
    id: 'sudoku', name: 'Sudoku', categorie: 'reflexion', couleur: '#8bb9fa',
    court: 'Les chiffres de 1 à 9, une fois chacun.',
    description: 'Remplis la grille pour que chaque ligne, chaque colonne et chaque carré contienne une seule fois les chiffres de 1 à 9.',
    component: lazy(() => import('./jeux/Sudoku')),
  },
  {
    id: 'glissieres', name: 'Glissières', categorie: 'reflexion', couleur: '#ef3e33',
    court: 'Fais sortir le bloc rouge. 500 niveaux.',
    description: 'Fais glisser les blocs pour sortir le gros bloc rouge par l’ouverture du bas. 500 niveaux, du débutant à l’expert, d’après le casse-tête de « l’Âne rouge ».',
    component: lazy(() => import('./jeux/Glissieres')),
  },
  {
    id: 'pose-blocs', name: 'Pose-blocs', categorie: 'reflexion', couleur: '#ff5f8f', nouveau: true,
    court: 'Pose les pièces, vide les lignes.',
    description: 'Fais glisser les pièces sur la grille de 8 × 8 : chaque ligne ou colonne remplie disparaît. Enchaîne les combos et garde de la place pour les trois pièces suivantes.',
    component: lazy(() => import('./jeux/PoseBlocs')),
  },
  {
    id: 'nonogramme', name: 'Nonogramme', categorie: 'reflexion', couleur: '#8bb9fa', nouveau: true,
    court: 'Noircis les cases, découvre le dessin.',
    description: 'Les nombres indiquent les groupes de cases noires de chaque ligne et colonne : noircis les bonnes cases pour faire apparaître un dessin. 32 images du 5 × 5 au 15 × 15, et des grilles aléatoires.',
    component: lazy(() => import('./jeux/Nonogramme')),
  },
  {
    id: 'points', name: 'Relier les points', categorie: 'reflexion', couleur: '#ffd84d', nouveau: true,
    court: 'Relie les couleurs, remplis la grille.',
    description: 'Relie chaque paire de points de la même couleur sans croiser les autres chemins, en remplissant toute la grille. 100 niveaux du 5 × 5 au 8 × 8, chacun avec une seule solution.',
    component: lazy(() => import('./jeux/Points')),
  },
  {
    id: 'snake', name: 'Snake', categorie: 'arcade', couleur: '#7bd6aa',
    court: 'Mange, grandis, ne te mords pas la queue.',
    description: 'Guide le serpent vers la nourriture sans foncer dans un mur ni te mordre la queue : plus il mange, plus il grandit.',
    component: lazy(() => import('./jeux/Snake')),
  },
  {
    id: 'blocs', name: 'Blocs', categorie: 'arcade', couleur: '#b79bff',
    court: 'Empile les pièces, complète des lignes.',
    description: 'Empile les pièces qui tombent pour compléter des lignes : chaque ligne pleine disparaît. Inspiré du célèbre jeu de briques.',
    component: lazy(() => import('./jeux/Blocs')),
  },
  {
    id: 'ninja', name: 'Ninja', categorie: 'arcade', couleur: '#ff4d4d',
    court: 'Cours, saute, traverse huit mondes.',
    description: 'Le petit ninja court tout seul : saute, baisse-toi, traverse huit mondes (désert, Japon, monde de lave, monde du vide…) et gagne des médailles du cuivre jusqu’à Légende.',
    component: lazy(() => import('./jeux/Ninja')),
  },
  {
    id: 'labyrinthe', name: 'Labyrinthe', categorie: 'arcade', couleur: '#c45cff', nouveau: true,
    court: 'Glisse jusqu’au mur, trouve la sortie.',
    description: 'Le héros fonce tout droit jusqu’au prochain mur : trouve le bon chemin vers la sortie, évite les pics et ramasse les points. 60 niveaux à débloquer.',
    component: lazy(() => import('./jeux/Labyrinthe')),
  },
  {
    id: 'puissance-4', name: 'Puissance 4', categorie: 'plateau', couleur: '#ffd36b',
    court: 'Aligne 4 jetons avant l’ordinateur.',
    description: 'Aligne 4 jetons de ta couleur, à l’horizontale, à la verticale ou en diagonale, avant l’ordinateur (ou un ami).',
    component: lazy(() => import('./jeux/Puissance4')),
  },
  {
    id: 'memory', name: 'Memory', categorie: 'plateau', couleur: '#8bb9fa',
    court: 'Retrouve les paires de cartes.',
    description: 'Retourne les cartes deux par deux et retrouve les paires : les logos des langages et logiciels que j’utilise.',
    component: lazy(() => import('./jeux/Memory')),
  },
]

const fromHash = (hash: string) => games.find(g => hash === `#jeux/${g.id}`)

function Carte({ g }: { g: GameInfo }) {
  const Apercu = APERCUS[g.id]
  return (
    <a className="jx-carte" href={`#jeux/${g.id}`} style={{ '--c': g.couleur } as CSSProperties}>
      <span className="jx-apercu">{Apercu ? <Apercu /> : null}</span>
      <span className="jx-texte">
        <strong>{g.name}{g.nouveau && <em>Nouveau</em>}</strong>
        <span>{g.court}</span>
      </span>
    </a>
  )
}

function Accueil() {
  const [cat, setCat] = useState<Categorie | 'tous'>('tous')
  // Les nouveautés d'abord, puis les autres jeux dans l'ordre de la liste.
  const tries = [...games.filter(g => g.nouveau), ...games.filter(g => !g.nouveau)]
  const liste = cat === 'tous' ? tries : tries.filter(g => g.categorie === cat)
  return (
    <>
      <header className="jeux-head">
        <div className="section-kicker"><span>JEUX</span> / PASSE-TEMPS</div>
        <h1>Une pause, <span className="gradient-text">entre deux lignes de code.</span></h1>
        <p>{games.length} petits jeux intégrés directement au site, à la souris, au clavier ou au doigt. Choisis-en un.</p>
        <div className="jx-filtres" role="group" aria-label="Trier les jeux">
          {CATEGORIES.map(c => {
            const n = c.id === 'tous' ? games.length : games.filter(g => g.categorie === c.id).length
            return (
              <button key={c.id} type="button" aria-pressed={cat === c.id} className={cat === c.id ? 'is-active' : ''} onClick={() => setCat(c.id)}>
                {c.nom} <small>{n}</small>
              </button>
            )
          })}
        </div>
      </header>
      <div className="jx-grille">
        {liste.map(g => <Carte key={g.id} g={g} />)}
      </div>
    </>
  )
}

function PageJeu({ game }: { game: GameInfo }) {
  const i = games.indexOf(game)
  const prec = games[(i - 1 + games.length) % games.length]
  const suiv = games[(i + 1) % games.length]
  const Jeu = game.component
  return (
    <>
      <div className="jeux-game">
        <div className="jeux-game-head">
          <h1>{game.name}</h1>
          <p>{game.description}</p>
        </div>
        <Suspense fallback={<div className="jx-chargement" aria-busy="true">Chargement du jeu…</div>}>
          <Jeu key={game.id} />
        </Suspense>
      </div>
      <nav className="jx-suite" aria-label="Autres jeux">
        <a href={`#jeux/${prec.id}`}><ArrowLeft size={15} /> <span><small>Jeu précédent</small>{prec.name}</span></a>
        <a href="#jeux" className="jx-tous"><LayoutGrid size={15} /> Tous les jeux</a>
        <a href={`#jeux/${suiv.id}`} className="jx-suivant"><span><small>Jeu suivant</small>{suiv.name}</span> <ArrowRight size={15} /></a>
      </nav>
    </>
  )
}

export default function Jeux({ hash }: { hash: string }) {
  const game = fromHash(hash)
  return (
    <main className={game ? 'jeux section-wrap is-game' : 'jeux section-wrap'}>
      {game ? <a className="back-link" href="#jeux"><ArrowLeft size={15} /> Tous les jeux</a> : <a className="back-link" href="#accueil"><ArrowLeft size={15} /> Retour à l’accueil</a>}
      {game ? <PageJeu game={game} /> : <Accueil />}
    </main>
  )
}
