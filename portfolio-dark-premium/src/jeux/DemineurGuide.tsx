import type { CSSProperties, ReactNode } from 'react'
import { Bomb, BookOpen, Check, ChevronDown, Flag, Lightbulb } from 'lucide-react'
import { neighbors } from './demineur-logic'
import { Zone, zoneAround } from './zone'

// Mini-grilles d'exemple, écrites case par case :
//   o  case ouverte (le chiffre est calculé automatiquement)
//   .  case cachée sans mine        *  case cachée avec une mine
//   F  drapeau sur une mine         B  mine dévoilée (pour l'exemple)
//   D  mine trouvée par déduction   S  case cachée sûre
const MINES = ['*', 'F', 'B', 'D']

interface Example {
  layout: string[]
  zone?: [number, number] // ligne, colonne du chiffre encadré
}

function MiniBoard({ layout, zone }: Example) {
  const rows = layout.length
  const cells = layout.flatMap(row => row.split(' '))
  const cols = cells.length / rows
  const adj = cells.map((_, i) => neighbors(i, rows, cols).filter(n => MINES.includes(cells[n])).length)
  const center = zone ? zone[0] * cols + zone[1] : null
  const inZone = new Set(center === null ? [] : neighbors(center, rows, cols))

  const view = (t: string, i: number): [string, ReactNode] => {
    const zoneClass = inZone.has(i) ? ' is-zone' : ''
    switch (t) {
      case 'o': {
        const centerClass = i === center ? ' is-center' : ''
        return adj[i] ? [`is-open n${adj[i]}${centerClass}`, adj[i]] : ['is-open', null]
      }
      case 'F': return ['is-flag', <Flag />]
      case 'B': return ['is-mine', <Bomb />]
      case 'D': return ['is-flag is-deduced', <Flag />]
      case 'S': return ['is-safe', <Check />]
      default: return [zoneClass.trim(), null]
    }
  }

  return (
    <div className="ms-board ms-mini" style={{ '--cols': cols } as CSSProperties} aria-hidden="true">
      {cells.map((t, i) => {
        const [cls, content] = view(t, i)
        return <span key={i} className={`ms-cell ${cls}`}>{content}</span>
      })}
      {center !== null && <Zone box={zoneAround(center, rows, cols)} />}
    </div>
  )
}

const steps: { title: string; text: string; example: Example }[] = [
  {
    title: 'Le but',
    text: 'Ouvrir toutes les cases qui ne cachent pas de mine. Le premier clic est toujours sans danger et dégage une zone comme celle-ci.',
    example: { layout: ['o o o o . .', 'o o o o * .', 'o o o o . .', 'o o o * . .', '. * . . . .'] },
  },
  {
    title: 'Lire les chiffres',
    text: 'Un chiffre indique combien de mines touchent sa case, diagonales comprises. Ce 2 a deux mines parmi les cases du cadre (dévoilées ici pour l’exemple).',
    example: { layout: ['B . .', '. o .', '. . B'], zone: [1, 1] },
  },
  {
    title: 'Trouver une mine',
    text: 'Ce 1 ne touche qu’une seule case cachée : la mine est forcément là. Marque-la d’un drapeau (clic droit, ou appui long sur téléphone).',
    example: { layout: ['o o o o', 'o o o o', 'o o D .'], zone: [1, 1] },
  },
  {
    title: 'Ouvrir les cases sûres',
    text: 'Ce 1 a déjà son drapeau : l’autre case cachée autour est donc sûre. Clique sur le chiffre pour ouvrir d’un coup tout ce qui reste autour.',
    example: { layout: ['o o o o', 'o o o o', 'o o F S'], zone: [1, 2] },
  },
]

const tips = [
  'Active l’aide débutant : un cadre entoure les 9 cases autour du chiffre survolé ou touché, et indique combien de mines il reste à y trouver.',
  'Commence par les chiffres au bord des zones ouvertes : ce sont eux qui donnent le plus d’indices.',
  'Quand plus aucune déduction n’est possible, il faut parfois tenter sa chance.',
  'Le chrono démarre au premier clic et ton meilleur temps est gardé pour chaque niveau.',
]

export default function DemineurGuide() {
  return (
    <details className="ms-guide">
      <summary>
        <span className="ms-guide-icon"><BookOpen size={17} /></span>
        <span className="ms-guide-title"><strong>Comment jouer ?</strong><small>Les règles en 4 étapes</small></span>
        <ChevronDown className="ms-guide-chevron" size={18} />
      </summary>
      <div className="ms-guide-body">
        <ol className="ms-steps">
          {steps.map((s, k) => (
            <li className="ms-step" key={s.title}>
              <div className="ms-step-visual"><MiniBoard {...s.example} /></div>
              <span className="ms-step-num">{String(k + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="ms-tips">
          <h3><Lightbulb size={15} /> Astuces</h3>
          <ul>{tips.map(t => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </details>
  )
}
