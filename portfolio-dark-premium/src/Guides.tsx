import { Suspense, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { guides } from './guides/liste'
import type { GuideInfo } from './guides/liste'
import { SECTIONS } from './guides/elden-ring/plan'
// Polices du guide Elden Ring, hébergées avec le site : rien à charger chez Google, le guide marche même si un bloqueur coupe les polices externes.
import '@fontsource-variable/cinzel'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic.css'
import '@fontsource-variable/eb-garamond/wght-italic.css'
import './guides/guides.css'

// "#guides/elden-ring/bases/les-8-statistiques" → guide "elden-ring", chemin "bases/les-8-statistiques"
function lire(hash: string) {
  const [, id = '', ...reste] = hash.slice(1).split('/')
  return { guide: guides.find(g => g.id === id), chemin: reste.join('/') }
}

// Petite couverture dessinée en CSS pour la carte Elden Ring (reprend la couverture du PDF).
function CouvertureEldenRing() {
  return (
    <span className="gd-couv-er" aria-hidden="true">
      <span className="gd-couv-cadre" />
      <span className="gd-couv-badge">Édition ultime</span>
      <span className="gd-couv-titre">Elden Ring</span>
      <span className="gd-couv-sous">Le guide de A à Z</span>
      <span className="gd-couv-onglets">{SECTIONS.map(s => <i key={s.id} style={{ background: s.couleur }} />)}</span>
    </span>
  )
}

function Carte({ g }: { g: GuideInfo }) {
  const pretes = g.id === 'elden-ring' ? SECTIONS.filter(s => s.prete).length : 0
  return (
    <a className="gd-carte" href={`#guides/${g.id}`} style={{ '--c': g.couleur } as CSSProperties}>
      <span className="gd-apercu">{g.id === 'elden-ring' && <CouvertureEldenRing />}</span>
      <span className="gd-texte">
        <span className="gd-cat">{g.categorie}</span>
        <strong>{g.titre}{g.nouveau && <em>Nouveau</em>}</strong>
        <span>{g.resume}</span>
        {g.id === 'elden-ring' && <span className="gd-avancement">{pretes} sections sur {SECTIONS.length} en ligne <ArrowRight size={14} /></span>}
      </span>
    </a>
  )
}

function Accueil() {
  return (
    <main className="guides section-wrap">
      <a className="back-link" href="#accueil"><ArrowLeft size={15} /> Retour à l’accueil</a>
      <header className="guides-head">
        <div className="section-kicker"><span>GUIDES</span> / DE A À Z</div>
        <h1>Tout ce qu’il faut savoir, <span className="gradient-text">rangé dans le bon ordre.</span></h1>
        <p>Des guides complets sur tout et n’importe quoi : jeux vidéo, technique, vie de tous les jours. Le premier est consacré à Elden Ring.</p>
      </header>
      <div className="gd-grille">
        {guides.map(g => <Carte key={g.id} g={g} />)}
      </div>
    </main>
  )
}

export default function Guides({ hash }: { hash: string }) {
  const { guide, chemin } = lire(hash)

  // L'accueil des guides s'ouvre toujours en haut (chaque guide gère ensuite son propre défilement).
  useEffect(() => {
    if (!guide) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [guide])

  if (!guide) return <Accueil />
  const Guide = guide.component
  return (
    <Suspense fallback={<main className="section-wrap page-chargement" aria-busy="true" />}>
      <Guide chemin={chemin} />
    </Suspense>
  )
}
