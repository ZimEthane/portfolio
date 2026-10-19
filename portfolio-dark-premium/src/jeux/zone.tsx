import type { CSSProperties } from 'react'

// Cadre de l'aide débutant : il entoure un chiffre et ses 8 voisines (moins sur les bords).
export interface ZoneBox {
  r0: number
  c0: number
  h: number
  w: number
}

export function zoneAround(i: number, rows: number, cols: number): ZoneBox {
  const r = Math.floor(i / cols)
  const c = i % cols
  const r0 = Math.max(0, r - 1)
  const c0 = Math.max(0, c - 1)
  return { r0, c0, h: Math.min(rows - 1, r + 1) - r0 + 1, w: Math.min(cols - 1, c + 1) - c0 + 1 }
}

// Positionné en CSS à partir de la taille des cases (--cell) et de l'espacement (--gap) de la grille.
export function Zone({ box }: { box: ZoneBox }) {
  const style = { '--r0': box.r0, '--c0': box.c0, '--h': box.h, '--w': box.w } as CSSProperties
  return <div className="ms-zone" style={style} aria-hidden="true" />
}
