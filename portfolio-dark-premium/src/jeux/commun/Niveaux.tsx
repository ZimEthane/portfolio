import { useState } from 'react'

// Les 500 niveaux des jeux à niveaux, rangés en 5 paliers de 100 (comme Glissières).
export const PALIERS = [
  { nom: 'Débutant', de: 1, a: 100 },
  { nom: 'Facile', de: 101, a: 200 },
  { nom: 'Moyen', de: 201, a: 300 },
  { nom: 'Difficile', de: 301, a: 400 },
  { nom: 'Expert', de: 401, a: 500 },
]
export const palierDe = (n: number) => PALIERS.find(p => n >= p.de && n <= p.a) ?? PALIERS[PALIERS.length - 1]

export type EtatNiveau = '' | 'fait' | 'parfait'

interface Props {
  courant: number
  etat: (n: number) => EtatNiveau
  onChoisir: (n: number) => void
  details?: string[] // une précision par palier (« 5 × 5 », « 4 lettres »…)
  parfait?: string // ce que veut dire « parfait » dans ce jeu, pour les lecteurs d'écran
}

// Les 5 paliers ; un clic ouvre la grille des 100 niveaux du palier.
export function ChoixNiveaux({ courant, etat, onChoisir, details, parfait = 'parfait' }: Props) {
  const [ouvert, setOuvert] = useState<number | null>(null)
  const actif = palierDe(courant)
  const reussis = (de: number, a: number) => {
    let r = 0
    for (let n = de; n <= a; n++) if (etat(n)) r++
    return r
  }
  return (
    <>
      <div className="ms-levels niv-paliers" role="group" aria-label="Choisir un niveau">
        {PALIERS.map((p, k) => (
          <button key={p.nom} type="button" aria-expanded={ouvert === k} aria-controls="niv-grille" className={`${p === actif ? 'is-active' : ''}${ouvert === k ? ' is-open' : ''}`} onClick={() => setOuvert(ouvert === k ? null : k)}>
            <strong>{p.nom}</strong>
            <small>{details?.[k] ?? `${p.de} à ${p.a}`}</small>
            <small>{reussis(p.de, p.a)}/100 réussis</small>
          </button>
        ))}
      </div>
      {ouvert !== null && (
        <div id="niv-grille" className="niv-grille" role="group" aria-label={`Niveaux ${PALIERS[ouvert].nom}`}>
          {Array.from({ length: 100 }, (_, k) => PALIERS[ouvert].de + k).map(n => {
            const e = etat(n)
            return (
              <button
                key={n}
                type="button"
                className={`niv-n${e ? ` is-${e}` : ''}${n === courant ? ' is-current' : ''}`}
                aria-label={`Niveau ${n}${e === 'parfait' ? `, ${parfait}` : e ? ', réussi' : ''}`}
                aria-current={n === courant || undefined}
                onClick={() => {
                  onChoisir(n)
                  setOuvert(null)
                }}
              >
                {n}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// Progression par palier, pour le bas de la page du jeu.
export function ProgressionPaliers({ etat }: { etat: (n: number) => EtatNiveau }) {
  return (
    <ul className="niv-prog">
      {PALIERS.map(p => {
        let r = 0
        for (let n = p.de; n <= p.a; n++) if (etat(n)) r++
        return (
          <li key={p.nom}>
            <span>{p.nom}</span>
            <strong>{r} / 100</strong>
            <i className="niv-jauge" aria-hidden="true"><b style={{ width: `${r}%` }} /></i>
          </li>
        )
      })}
    </ul>
  )
}
