import { ArrowLeft, ArrowUpRight, Check, Cloud, Gauge, Puzzle, Sparkles, Workflow, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { veille } from './data'
import { scrollToId } from './scroll'

const evolutionIcons: Record<string, ReactNode> = {
  ia: <Sparkles size={18} />,
  cloud: <Cloud size={18} />,
  ext: <Puzzle size={18} />,
  devops: <Workflow size={18} />,
  perf: <Gauge size={18} />,
}

const levelLabel = { good: 'Point fort', mid: 'Selon le contexte', bad: 'Limite' } as const

const toc = [
  ['presentation', 'Présentation'],
  ['evolutions', 'Évolutions'],
  ['comptes', 'Comptes à suivre'],
  ['chronologie', 'Chronologie'],
  ['langages', 'Langages'],
  ['avis', 'Pour et contre'],
  ['comparaison', 'Comparaison'],
  ['conclusion', 'Conclusion'],
]

// Le routage utilise le hash (#veille) : on défile sans modifier l'adresse.
function goTo(id: string) {
  scrollToId(id)
}

function Source({ label, href }: { label: string; href: string }) {
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">{label} <ArrowUpRight size={12} /></a>
}

export default function Veille() {
  return (
    <main className="veille section-wrap">
      <a className="back-link" href="#accueil"><ArrowLeft size={15} /> Retour à l’accueil</a>

      <header className="veille-head">
        <div className="section-kicker"><span>VEILLE</span> / TECHNOLOGIQUE</div>
        <h1>Visual Studio Code, <span className="gradient-text">un éditeur qui évolue vite.</span></h1>
        <p>Ma veille sur l’éditeur que j’utilise au quotidien : ses nouveautés, les sources que je suis, ses forces, ses limites, et une comparaison avec NetBeans.</p>
        <nav className="veille-toc" aria-label="Sommaire de la veille">
          {toc.map(([id, label]) => <button key={id} type="button" onClick={() => goTo(id)}>{label}</button>)}
        </nav>
      </header>

      <section className="veille-block" id="presentation">
        <h2>Qu’est-ce que VS Code ?</h2>
        <div className="veille-text">{veille.intro.map(p => <p key={p}>{p}</p>)}</div>
      </section>

      <section className="veille-block" id="evolutions">
        <h2>Évolutions récentes et fonctionnalités</h2>
        <div className="evo-grid">
          {veille.evolutions.map(e => (
            <article className="evo-card" key={e.title}>
              <span className="evo-icon">{evolutionIcons[e.icon]}</span>
              <h3>{e.title}</h3>
              <ul>{e.points.map(p => <li key={p}>{p}</li>)}</ul>
              <Source label={`Source : ${e.source.label}`} href={e.source.href} />
            </article>
          ))}
        </div>
      </section>

      <section className="veille-block" id="comptes">
        <h2>Comptes à suivre pour rester à jour</h2>
        <div className="accounts-layout">
          <ul className="account-list">
            {veille.accounts.map(a => (
              <li key={a.handle}><a href={a.href} target="_blank" rel="noreferrer"><strong>{a.handle}</strong><span>{a.note}</span><ArrowUpRight size={14} /></a></li>
            ))}
          </ul>
          <div className="community-list">
            <span className="mini-label">Communautés</span>
            {veille.communities.map(c => <Source key={c.href} label={c.label} href={c.href} />)}
          </div>
        </div>
      </section>

      <section className="veille-block" id="chronologie">
        <h2>Chronologie de VS Code</h2>
        <ol className="v-timeline">
          {veille.timeline.map(t => <li key={t.year}><span className="v-year">{t.year}</span><span>{t.text}</span></li>)}
        </ol>
      </section>

      <section className="veille-block" id="langages">
        <h2>Langages pris en charge</h2>
        <p className="veille-note">Disponible sur Linux, Windows et macOS, avec ces langages notamment :</p>
        <ul className="lang-chips">{veille.languages.map(l => <li key={l}>{l}</li>)}</ul>
        <Source label={`Source : ${veille.languagesSource.label}`} href={veille.languagesSource.href} />
      </section>

      <section className="veille-block" id="avis">
        <h2>Pour et contre</h2>
        <div className="proscons">
          <div className="pc-card pc-pros"><h3><Check size={16} /> Avantages</h3><ul>{veille.pros.map(p => <li key={p}>{p}</li>)}</ul></div>
          <div className="pc-card pc-cons"><h3><X size={16} /> Inconvénients</h3><ul>{veille.cons.map(p => <li key={p}>{p}</li>)}</ul></div>
        </div>
        <div className="source-row"><span className="mini-label">Sources</span>{veille.prosConsSources.map(s => <Source key={s.href} label={s.label} href={s.href} />)}</div>
      </section>

      <section className="veille-block" id="comparaison">
        <h2>Comparaison : VS Code et NetBeans</h2>
        <div className="table-scroll">
          <table className="compare-table">
            <thead><tr><th scope="col">Critère</th><th scope="col">Visual Studio Code</th><th scope="col">NetBeans</th></tr></thead>
            <tbody>
              {veille.compare.map(r => (
                <tr key={r.criterion}>
                  <th scope="row">{r.criterion}</th>
                  <td className={`cell cell-${r.vscode[0]}`} title={levelLabel[r.vscode[0]]}>{r.vscode[1]}</td>
                  <td className={`cell cell-${r.netbeans[0]}`} title={levelLabel[r.netbeans[0]]}>{r.netbeans[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="legend">
          <li><i className="dot dot-good" /> Point fort</li>
          <li><i className="dot dot-mid" /> Selon le contexte</li>
          <li><i className="dot dot-bad" /> Limite</li>
        </ul>
        <div className="source-row"><span className="mini-label">Sources</span>{veille.compareSources.map(s => <Source key={s.href} label={s.label} href={s.href} />)}</div>
      </section>

      <section className="veille-block veille-conclusion" id="conclusion">
        <h2>Conclusion</h2>
        <p>{veille.conclusion}</p>
        <div className="veille-actions">
          {veille.resources.map(r => <a key={r.href} className="button button-ghost" href={r.href} target="_blank" rel="noreferrer">{r.label} <ArrowUpRight size={15} /></a>)}
        </div>
      </section>
    </main>
  )
}
