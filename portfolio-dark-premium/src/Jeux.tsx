import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Bomb } from 'lucide-react'
import Demineur from './jeux/Demineur'
import './jeux/jeux.css'

// Pour ajouter un jeu : créer son composant dans src/jeux/ puis l'ajouter à cette liste.
const games: { id: string; name: string; description: string; icon: ReactNode; component: () => ReactNode }[] = [
  {
    id: 'demineur',
    name: 'Démineur',
    description: 'Le classique : dégager toutes les cases sans faire exploser une seule mine. Les chiffres indiquent combien de mines touchent chaque case.',
    icon: <Bomb size={16} />,
    component: () => <Demineur />,
  },
]

export default function Jeux() {
  const [current, setCurrent] = useState(games[0].id)
  const game = games.find(g => g.id === current) ?? games[0]

  return (
    <main className="jeux section-wrap">
      <a className="back-link" href="#accueil"><ArrowLeft size={15} /> Retour à l’accueil</a>

      <header className="jeux-head">
        <div className="section-kicker"><span>JEUX</span> / PASSE-TEMPS</div>
        <h1>Une pause, <span className="gradient-text">entre deux lignes de code.</span></h1>
        <p>Des petits jeux que j’apprécie, intégrés directement au site en React et TypeScript. Le démineur ouvre le bal, d’autres suivront.</p>
        <div className="jeux-tabs" role="tablist" aria-label="Choisir un jeu">
          {games.map(g => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === current} className={g.id === current ? 'is-active' : ''} onClick={() => setCurrent(g.id)}>
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      </header>

      <div className="jeux-game" role="tabpanel" aria-label={game.name}>
        <div className="jeux-game-head">
          <h2>{game.name}</h2>
          <p>{game.description}</p>
        </div>
        {game.component()}
      </div>
    </main>
  )
}
