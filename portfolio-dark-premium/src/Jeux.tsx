import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Blocks, Bomb, Brain, Disc3, Grid2x2, Grid3x3, Worm } from 'lucide-react'
import Chantier from './Chantier'
import Demineur from './jeux/Demineur'
import Memory from './jeux/Memory'
import Jeu2048 from './jeux/Jeu2048'
import Puissance4 from './jeux/Puissance4'
import Snake from './jeux/Snake'
import './jeux/jeux.css'

interface GameInfo {
  id: string
  name: string
  description: string
  icon: ReactNode
  component?: () => ReactNode // absent : le jeu est encore en chantier
}

// Pour ajouter un jeu : créer son composant dans src/jeux/ puis le brancher ici.
const games: GameInfo[] = [
  {
    id: 'demineur',
    name: 'Démineur',
    description: 'Le classique : dégager toutes les cases sans faire exploser une seule mine. Les chiffres indiquent combien de mines touchent chaque case.',
    icon: <Bomb size={16} />,
    component: () => <Demineur />,
  },
  {
    id: '2048',
    name: '2048',
    description: 'Fais glisser les tuiles : deux tuiles identiques qui se touchent fusionnent. Arriveras-tu jusqu’à la tuile 2048 ?',
    icon: <Grid2x2 size={16} />,
    component: () => <Jeu2048 />,
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Remplis la grille pour que chaque ligne, chaque colonne et chaque carré contienne une seule fois les chiffres de 1 à 9.',
    icon: <Grid3x3 size={16} />,
  },
  {
    id: 'puissance-4',
    name: 'Puissance 4',
    description: 'Aligne 4 jetons de ta couleur, à l’horizontale, à la verticale ou en diagonale, avant l’ordinateur (ou un ami).',
    icon: <Disc3 size={16} />,
    component: () => <Puissance4 />,
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Retourne les cartes deux par deux et retrouve les paires : les logos des langages et logiciels que j’utilise.',
    icon: <Brain size={16} />,
    component: () => <Memory />,
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Guide le serpent vers la nourriture sans foncer dans un mur ni te mordre la queue : plus il mange, plus il grandit.',
    icon: <Worm size={16} />,
    component: () => <Snake />,
  },
  {
    id: 'blocs',
    name: 'Blocs',
    description: 'Empile les pièces qui tombent pour compléter des lignes : chaque ligne pleine disparaît. Inspiré du célèbre jeu de briques.',
    icon: <Blocks size={16} />,
  },
]

const fromHash = (hash: string) => games.find(g => hash === `#jeux/${g.id}`)?.id

export default function Jeux({ hash }: { hash: string }) {
  const [current, setCurrent] = useState(() => fromHash(hash) ?? games[0].id)
  const game = games.find(g => g.id === current) ?? games[0]

  // Une adresse comme « #jeux/2048 » ouvre directement le bon jeu.
  useEffect(() => {
    const id = fromHash(hash)
    if (id) setCurrent(id)
  }, [hash])

  // Changer d'onglet met l'adresse à jour sans recharger ni faire défiler la page.
  const choose = (id: string) => {
    setCurrent(id)
    history.replaceState(null, '', `#jeux/${id}`)
  }

  return (
    <main className="jeux section-wrap">
      <a className="back-link" href="#accueil"><ArrowLeft size={15} /> Retour à l’accueil</a>

      <header className="jeux-head">
        <div className="section-kicker"><span>JEUX</span> / PASSE-TEMPS</div>
        <h1>Une pause, <span className="gradient-text">entre deux lignes de code.</span></h1>
        <p>Des petits jeux que j’apprécie, intégrés directement au site. Choisis ton jeu : réflexion, rapidité ou mémoire, il y en a pour tous les goûts.</p>
        <div className="jeux-tabs" role="tablist" aria-label="Choisir un jeu">
          {games.map(g => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === current} className={g.id === current ? 'is-active' : ''} onClick={() => choose(g.id)}>
              {g.icon} {g.name}
              {!g.component && <span className="jeux-soon">bientôt</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="jeux-game" role="tabpanel" aria-label={game.name}>
        <div className="jeux-game-head">
          <h2>{game.name}</h2>
          <p>{game.description}</p>
        </div>
        {game.component ? <div key={game.id}>{game.component()}</div> : (
          <Chantier titre="Ce jeu est en chantier" texte="La pelleteuse creuse encore le code de ce jeu. Reviens bientôt pour y jouer !" />
        )}
      </div>
    </main>
  )
}
