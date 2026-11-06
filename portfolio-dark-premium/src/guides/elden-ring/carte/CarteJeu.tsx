import { useEffect, useRef, useState } from 'react'

// Carte du jeu zoomable, centrée sur le repère d'une fiche du guide (donjon ou boss).
export default function CarteJeu({ fiche, nom, repli }: { fiche: string; nom: string; repli?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [absent, setAbsent] = useState(false)
  useEffect(() => {
    let fin: (() => void) | undefined
    let annule = false
    setAbsent(false)
    import('./miniCarte').then(async ({ creerMiniCarte, positionFiche }) => {
      const p = await positionFiche(fiche)
      if (annule || !ref.current) return
      if (!p) { setAbsent(true); return }
      fin = creerMiniCarte(ref.current, {
        couche: p.s, centre: [p.x, p.y], zoom: 5.25,
        pins: [{ x: p.x, y: p.y, texte: '●', couleur: '#b3322b', titre: nom }],
        lien: `#guides/elden-ring/carte/${fiche}`,
      })
    })
    return () => { annule = true; fin?.() }
  }, [fiche, nom])
  if (absent) return <>{repli}</>
  return <div ref={ref} className="er-mc" />
}
