import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

// Plein écran : vrai plein écran du navigateur quand il est disponible (Android, PC),
// sinon le panneau du jeu recouvre tout l'écran visible (iPhone).
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
type FsDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void }
const fsDoc = () => document as FsDocument
const fsElement = () => fsDoc().fullscreenElement ?? fsDoc().webkitFullscreenElement ?? null

export function useFullscreen(panelRef: RefObject<HTMLElement | null>) {
  const [full, setFull] = useState(false)
  const native = useRef(false)

  const enter = async () => {
    setFull(true)
    const el = panelRef.current as FsElement | null
    const d = fsDoc()
    if (!el || !(d.fullscreenEnabled || d.webkitFullscreenEnabled)) return
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
      else await el.webkitRequestFullscreen?.()
      native.current = true
    } catch {
      /* refusé : le jeu reste en mode écran complet */
    }
  }

  const exit = () => {
    setFull(false)
    native.current = false
    const d = fsDoc()
    if (fsElement()) void Promise.resolve(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()).catch(() => {})
  }

  // Sortie par le geste retour ou la touche Échap du navigateur.
  useEffect(() => {
    const onChange = () => {
      if (!fsElement() && native.current) {
        native.current = false
        setFull(false)
      }
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  // Pendant le plein écran : la page derrière ne défile plus, Échap permet de sortir.
  useEffect(() => {
    if (!full) return
    const root = document.documentElement
    root.classList.add('ms-lock')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      root.classList.remove('ms-lock')
      window.removeEventListener('keydown', onKey)
    }
  }, [full])

  return { full, enter, exit, toggle: () => (full ? exit() : void enter()) }
}
