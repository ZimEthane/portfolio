import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Clock, GraduationCap, ListChecks, RotateCcw, Sparkles, Users } from 'lucide-react'
import Chantier from './Chantier'
import { tutos } from './tutos'
import type { Categorie, Tuto } from './tutos'
import './tutos/tutos.css'

const categories: ('Tous' | Categorie)[] = ['Tous', 'Vie quotidienne', 'Casse-têtes', 'Informatique', 'Cuisine']

function Meta({ tuto }: { tuto: Tuto }) {
  return (
    <ul className="tuto-meta">
      <li><GraduationCap size={14} /> {tuto.niveau}</li>
      <li><Clock size={14} /> {tuto.duree}</li>
      <li><Users size={14} /> {tuto.age}</li>
    </ul>
  )
}

// ----- Liste des tutos -----
function Liste() {
  const [filtre, setFiltre] = useState<(typeof categories)[number]>('Tous')
  const visibles = tutos.filter(t => filtre === 'Tous' || t.categorie === filtre)

  return (
    <main className="tutos section-wrap">
      <a className="back-link" href="#accueil"><ArrowLeft size={15} /> Retour à l’accueil</a>
      <header className="tutos-head">
        <div className="section-kicker"><span>TUTOS</span> / PAS À PAS</div>
        <h1>Les petites choses de la vie, <span className="gradient-text">expliquées simplement.</span></h1>
        <p>Des tutos pas à pas et illustrés, pour les petits comme pour les grands : faire ses lacets, résoudre un casse-tête, monter son PC… À ton rythme, une étape à la fois.</p>
        <div className="tutos-filtres" role="group" aria-label="Filtrer par catégorie">
          {categories.map(c => {
            const n = c === 'Tous' ? tutos.length : tutos.filter(t => t.categorie === c).length
            if (!n) return null
            return <button key={c} type="button" aria-pressed={filtre === c} className={filtre === c ? 'is-active' : ''} onClick={() => setFiltre(c)}>{c} <small>{n}</small></button>
          })}
        </div>
      </header>

      <ul className="tutos-grille">
        {visibles.map(t => {
          const Icone = t.icone
          return (
            <li key={t.id}>
              <a className="tuto-carte" href={`#tutos/${t.id}`} style={{ '--accent': t.couleur } as CSSProperties}>
                <span className="tuto-icone"><Icone size={22} /></span>
                <span className="tuto-cat">{t.categorie}{!t.etapes && <span className="tuto-bientot">bientôt</span>}</span>
                <strong>{t.titre}</strong>
                <span className="tuto-resume">{t.resume}</span>
                <Meta tuto={t} />
                <span className="tuto-go">{t.etapes ? `${t.etapes.length} étapes` : 'En chantier'} <ArrowRight size={14} /></span>
              </a>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

// ----- Un tuto, étape par étape -----
function Detail({ tuto }: { tuto: Tuto }) {
  const [etape, setEtape] = useState(0)
  const [toutVoir, setToutVoir] = useState(false)
  const etapes = tuto.etapes ?? []
  const fini = etape >= etapes.length
  const Icone = tuto.icone

  // Flèches gauche/droite du clavier pour changer d'étape.
  useEffect(() => {
    if (!etapes.length || toutVoir) return
    const onKey = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement
      if (cible.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') setEtape(n => Math.min(etapes.length, n + 1))
      if (e.key === 'ArrowLeft') setEtape(n => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [etapes.length, toutVoir])

  const aller = (n: number) => {
    setEtape(n)
    document.querySelector('.tuto-lecteur')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <main className="tutos section-wrap" style={{ '--accent': tuto.couleur } as CSSProperties}>
      <a className="back-link" href="#tutos"><ArrowLeft size={15} /> Tous les tutos</a>
      <header className="tuto-head">
        <span className="tuto-icone tuto-icone-grande"><Icone size={28} /></span>
        <div>
          <div className="section-kicker"><span>TUTO</span> / {tuto.categorie.toUpperCase()}</div>
          <h1>{tuto.titre}</h1>
          <p>{tuto.resume}</p>
          <Meta tuto={tuto} />
        </div>
      </header>

      {!tuto.etapes ? (
        <Chantier titre="Ce tuto est en chantier" texte="La pelleteuse est en train de creuser les explications. Reviens bientôt pour le découvrir !" />
      ) : (
        <>
          {(tuto.intro || tuto.materiel) && (
            <section className="tuto-prepa">
              {tuto.intro && <div className="tuto-intro">{tuto.intro}</div>}
              {tuto.materiel && (
                <div className="tuto-materiel">
                  <span className="mini-label">Il te faut</span>
                  <ul>{tuto.materiel.map(m => <li key={m}>{m}</li>)}</ul>
                </div>
              )}
            </section>
          )}

          <div className="tuto-vues" role="group" aria-label="Affichage">
            <button type="button" aria-pressed={!toutVoir} className={!toutVoir ? 'is-active' : ''} onClick={() => setToutVoir(false)}>Pas à pas</button>
            <button type="button" aria-pressed={toutVoir} className={toutVoir ? 'is-active' : ''} onClick={() => setToutVoir(true)}><ListChecks size={14} /> Toutes les étapes</button>
          </div>

          {toutVoir ? (
            <ol className="tuto-liste-etapes">
              {etapes.map((e, k) => (
                <li key={e.titre} className="tuto-etape">
                  {e.visuel && <div className="tuto-visuel">{e.visuel}</div>}
                  <div className="tuto-texte">
                    <span className="tuto-num">Étape {k + 1}</span>
                    <h2>{e.titre}</h2>
                    <div className="tuto-corps">{e.texte}</div>
                    {e.astuce && <div className="tuto-astuce"><Sparkles size={14} /> <div>{e.astuce}</div></div>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <section className="tuto-lecteur" aria-live="polite">
              <div className="tuto-progression" aria-hidden="true"><span style={{ width: `${(Math.min(etape, etapes.length) / etapes.length) * 100}%` }} /></div>
              {fini ? (
                <div className="tuto-bravo">
                  <span className="tuto-icone tuto-icone-grande"><Sparkles size={28} /></span>
                  <h2>Bravo, tu as réussi !</h2>
                  {tuto.conclusion && <div className="tuto-corps">{tuto.conclusion}</div>}
                  <div className="tuto-bravo-actions">
                    <button type="button" className="button button-ghost" onClick={() => aller(0)}><RotateCcw size={15} /> Recommencer</button>
                    <a className="button button-primary" href="#tutos">Voir les autres tutos <ArrowRight size={15} /></a>
                  </div>
                </div>
              ) : (
                <div className="tuto-etape" key={etape}>
                  {etapes[etape].visuel && <div className="tuto-visuel">{etapes[etape].visuel}</div>}
                  <div className="tuto-texte">
                    <span className="tuto-num">Étape {etape + 1} sur {etapes.length}</span>
                    <h2>{etapes[etape].titre}</h2>
                    <div className="tuto-corps">{etapes[etape].texte}</div>
                    {etapes[etape].astuce && <div className="tuto-astuce"><Sparkles size={14} /> <div>{etapes[etape].astuce}</div></div>}
                  </div>
                </div>
              )}
              <nav className="tuto-nav" aria-label="Étapes">
                <button type="button" className="button button-ghost" disabled={etape === 0} onClick={() => aller(etape - 1)}><ArrowLeft size={15} /> Précédent</button>
                <div className="tuto-points">
                  {etapes.map((e, k) => (
                    <button key={e.titre} type="button" aria-label={`Étape ${k + 1} : ${e.titre}`} aria-current={k === etape ? 'step' : undefined} className={k < etape ? 'is-done' : k === etape ? 'is-current' : ''} onClick={() => aller(k)} />
                  ))}
                </div>
                <button type="button" className="button button-primary" disabled={fini} onClick={() => aller(etape + 1)}>{etape === etapes.length - 1 ? 'Terminer' : 'Suivant'} <ArrowRight size={15} /></button>
              </nav>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default function Tutos({ hash }: { hash: string }) {
  const id = hash.startsWith('#tutos/') ? hash.slice('#tutos/'.length) : null
  const tuto = id ? tutos.find(t => t.id === id) : undefined
  return tuto ? <Detail key={tuto.id} tuto={tuto} /> : <Liste />
}
