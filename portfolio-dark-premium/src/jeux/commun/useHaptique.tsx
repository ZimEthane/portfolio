import { useId, useRef } from 'react'
import type { MouseEvent } from 'react'
import { canVibrate, vibrate } from '../feedback'
import type { Buzz } from '../feedback'

// Attribut « switch » : l'interrupteur natif de Safari, qui porte le retour haptique sur iPhone.
export const SWITCH_ATTR = { switch: '' } as Record<string, string>

// Vibrations pour les jeux qu'on touche du doigt (cartes, cases, colonnes…).
// Android : navigator.vibrate. iPhone : la zone de jeu est le <label> d'un interrupteur caché ;
// un vrai toucher le fait basculer et l'iPhone vibre. Sans vibration demandée pendant le clic,
// on annule le basculement. À l'intérieur du label, pas de <button> (sinon le label ne réagit pas) :
// on utilise des éléments role="button".
export function useHaptique(vibe: boolean) {
  const id = useId()
  const wanted = useRef(false)

  // À appeler pendant le traitement d'un clic ou d'un toucher.
  const request = (kind: Buzz) => {
    if (!vibe) return
    if (canVibrate()) vibrate(kind)
    else wanted.current = true
  }

  const input = <input type="checkbox" {...SWITCH_ATTR} id={id} className="ms-haptic" tabIndex={-1} aria-hidden="true" defaultChecked={false} />

  const labelProps = {
    htmlFor: id,
    onPointerDownCapture: () => {
      wanted.current = false
    },
    onClick: (e: MouseEvent) => {
      if (!wanted.current) e.preventDefault()
      wanted.current = false
    },
  }

  return { input, labelProps, request }
}
