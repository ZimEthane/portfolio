// Solitaire (Klondike) : 7 colonnes, une pioche, 4 piles à monter de l'As au Roi par couleur.

export type Enseigne = 'P' | 'C' | 'K' | 'T' // pique, cœur, carreau, trèfle
export const ENSEIGNES: Enseigne[] = ['P', 'C', 'K', 'T']
export const SYMBOLE: Record<Enseigne, string> = { P: '♠', C: '♥', K: '♦', T: '♣' }
export const NOM_ENSEIGNE: Record<Enseigne, string> = { P: 'pique', C: 'cœur', K: 'carreau', T: 'trèfle' }
export const rouge = (e: Enseigne) => e === 'C' || e === 'K'
export const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'] // valet, dame, roi
export const NOM_RANG = ['As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi']

export interface Carte {
  id: number // 0..51
  rang: number // 1 (As) .. 13 (Roi)
  e: Enseigne
  visible: boolean
}

export interface Jeu {
  pioche: Carte[] // face cachée, la dernière est le dessus
  defausse: Carte[] // cartes retournées, la dernière est jouable
  fondations: Carte[][] // 4 piles (index = enseigne dans ENSEIGNES)
  colonnes: Carte[][] // 7 colonnes, la dernière carte est en bas (devant)
  tirage: 1 | 3
}

export type Lieu = { t: 'defausse' } | { t: 'fondation'; i: number } | { t: 'colonne'; i: number; k: number } // k : position de la carte dans la colonne

export function nouvellePartie(tirage: 1 | 3, random: () => number = Math.random): Jeu {
  const paquet: Carte[] = []
  ENSEIGNES.forEach((e, s) => {
    for (let r = 1; r <= 13; r++) paquet.push({ id: s * 13 + r - 1, rang: r, e, visible: false })
  })
  for (let i = paquet.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[paquet[i], paquet[j]] = [paquet[j], paquet[i]]
  }
  const colonnes: Carte[][] = []
  for (let c = 0; c < 7; c++) {
    const col = paquet.splice(0, c + 1)
    col[col.length - 1] = { ...col[col.length - 1], visible: true }
    colonnes.push(col)
  }
  return { pioche: paquet, defausse: [], fondations: [[], [], [], []], colonnes, tirage }
}

export const cloner = (j: Jeu): Jeu => ({
  ...j,
  pioche: j.pioche.slice(),
  defausse: j.defausse.slice(),
  fondations: j.fondations.map(f => f.slice()),
  colonnes: j.colonnes.map(c => c.slice()),
})

// Piocher : retourne 1 ou 3 cartes ; si la pioche est vide, la défausse y retourne.
export function piocher(j: Jeu): Jeu {
  const n = cloner(j)
  if (!n.pioche.length) {
    n.pioche = n.defausse.reverse().map(c => ({ ...c, visible: false }))
    n.defausse = []
    return n
  }
  for (let k = 0; k < n.tirage && n.pioche.length; k++) n.defausse.push({ ...n.pioche.pop()!, visible: true })
  return n
}

// Les cartes que l'on prend à un endroit (une seule, ou une suite depuis une colonne).
export function prendre(j: Jeu, l: Lieu): Carte[] {
  if (l.t === 'defausse') return j.defausse.length ? [j.defausse[j.defausse.length - 1]] : []
  if (l.t === 'fondation') return j.fondations[l.i].length ? [j.fondations[l.i][j.fondations[l.i].length - 1]] : []
  const col = j.colonnes[l.i]
  if (l.k < 0 || l.k >= col.length || !col[l.k].visible) return []
  const suite = col.slice(l.k)
  // Une suite déplaçable : rangs décroissants, couleurs alternées.
  for (let k = 1; k < suite.length; k++) {
    if (suite[k].rang !== suite[k - 1].rang - 1 || rouge(suite[k].e) === rouge(suite[k - 1].e)) return []
  }
  return suite
}

export function peutFondation(j: Jeu, c: Carte, i: number): boolean {
  if (ENSEIGNES[i] !== c.e) return false
  const f = j.fondations[i]
  return f.length === c.rang - 1
}

export function peutColonne(j: Jeu, c: Carte, i: number): boolean {
  const col = j.colonnes[i]
  if (!col.length) return c.rang === 13 // un Roi sur une colonne vide
  const dessus = col[col.length - 1]
  return dessus.visible && dessus.rang === c.rang + 1 && rouge(dessus.e) !== rouge(c.e)
}

export type Destination = { t: 'fondation'; i: number } | { t: 'colonne'; i: number }

export function deplacer(j: Jeu, de: Lieu, vers: Destination): Jeu | null {
  const cartes = prendre(j, de)
  if (!cartes.length) return null
  if (vers.t === 'fondation') {
    if (cartes.length !== 1 || !peutFondation(j, cartes[0], vers.i)) return null
  } else {
    if (de.t === 'colonne' && de.i === vers.i) return null
    if (!peutColonne(j, cartes[0], vers.i)) return null
  }
  const n = cloner(j)
  if (de.t === 'defausse') n.defausse.pop()
  else if (de.t === 'fondation') n.fondations[de.i].pop()
  else {
    n.colonnes[de.i] = n.colonnes[de.i].slice(0, de.k)
    const col = n.colonnes[de.i]
    if (col.length && !col[col.length - 1].visible) col[col.length - 1] = { ...col[col.length - 1], visible: true } // on retourne la carte découverte
  }
  if (vers.t === 'fondation') n.fondations[vers.i].push(cartes[0])
  else n.colonnes[vers.i].push(...cartes)
  return n
}

// Meilleure destination pour un toucher : la fondation d'abord (carte seule), sinon une colonne utile.
export function destinationAuto(j: Jeu, de: Lieu): Destination | null {
  const cartes = prendre(j, de)
  if (!cartes.length) return null
  if (cartes.length === 1 && de.t !== 'fondation') {
    const i = ENSEIGNES.indexOf(cartes[0].e)
    if (peutFondation(j, cartes[0], i)) return { t: 'fondation', i }
  }
  const possibles: number[] = []
  for (let i = 0; i < 7; i++) if (!(de.t === 'colonne' && de.i === i) && peutColonne(j, cartes[0], i)) possibles.push(i)
  if (!possibles.length) return null
  // Un Roi qui est déjà en haut d'une colonne ne bouge pas vers une autre colonne vide (inutile).
  if (de.t === 'colonne' && de.k === 0 && cartes[0].rang === 13 && possibles.every(i => !j.colonnes[i].length)) return null
  // On préfère une colonne non vide.
  return { t: 'colonne', i: possibles.find(i => j.colonnes[i].length) ?? possibles[0] }
}

export const gagne = (j: Jeu) => j.fondations.every(f => f.length === 13)

// Toutes les cartes sont visibles et la pioche est vide : on peut finir automatiquement.
export const finissable = (j: Jeu) => !j.pioche.length && !j.defausse.length && j.colonnes.every(c => c.every(x => x.visible))

// Un coup à conseiller (indice) : fondation, puis carte qui découvre une carte cachée, puis défausse, puis pioche.
export function conseil(j: Jeu): { de: Lieu; vers: Destination } | 'piocher' | null {
  // 1. Vers une fondation
  const sources: Lieu[] = [{ t: 'defausse' }, ...j.colonnes.map((c, i) => ({ t: 'colonne' as const, i, k: c.length - 1 }))]
  for (const s of sources) {
    const c = prendre(j, s)
    if (c.length === 1) {
      const i = ENSEIGNES.indexOf(c[0].e)
      if (peutFondation(j, c[0], i)) return { de: s, vers: { t: 'fondation', i } }
    }
  }
  // 2. Déplacer une suite qui découvre une carte cachée (ou libère une colonne pour un Roi)
  for (let i = 0; i < 7; i++) {
    const col = j.colonnes[i]
    const k = col.findIndex(c => c.visible)
    if (k < 0) continue
    if (k === 0 && col[0].rang === 13) continue
    const d = destinationAuto(j, { t: 'colonne', i, k })
    if (d && d.t === 'colonne') return { de: { t: 'colonne', i, k }, vers: d }
  }
  // 3. Jouer la défausse sur une colonne
  if (j.defausse.length) {
    const d = destinationAuto(j, { t: 'defausse' })
    if (d) return { de: { t: 'defausse' }, vers: d }
  }
  // 4. Piocher, seulement si une carte de la pioche ou de la défausse peut encore servir.
  const reserve = [...j.pioche, ...j.defausse]
  const utile = reserve.some(c => peutFondation(j, c, ENSEIGNES.indexOf(c.e)) || j.colonnes.some((_, i) => peutColonne(j, c, i)))
  return utile ? 'piocher' : null
}
