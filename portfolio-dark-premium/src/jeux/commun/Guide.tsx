import type { ReactNode } from 'react'
import { BookOpen, ChevronDown, Lightbulb } from 'lucide-react'

export interface GuideEtape {
  title: string
  text: ReactNode
  visual?: ReactNode
}

// Panneau dépliant « Comment jouer ? », fermé par défaut, commun à tous les jeux.
export default function Guide({ etapes, astuces, sousTitre }: { etapes: GuideEtape[]; astuces?: ReactNode[]; sousTitre?: string }) {
  return (
    <details className="ms-guide">
      <summary>
        <span className="ms-guide-icon"><BookOpen size={17} /></span>
        <span className="ms-guide-title"><strong>Comment jouer ?</strong><small>{sousTitre ?? `Les règles en ${etapes.length} étapes`}</small></span>
        <ChevronDown className="ms-guide-chevron" size={18} />
      </summary>
      <div className="ms-guide-body">
        <ol className="ms-steps">
          {etapes.map((s, k) => (
            <li className="ms-step" key={s.title}>
              {s.visual && <div className="ms-step-visual">{s.visual}</div>}
              <span className="ms-step-num">{String(k + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        {astuces && astuces.length > 0 && (
          <div className="ms-tips">
            <h3><Lightbulb size={15} /> Astuces</h3>
            <ul>{astuces.map((t, k) => <li key={k}>{t}</li>)}</ul>
          </div>
        )}
      </div>
    </details>
  )
}
