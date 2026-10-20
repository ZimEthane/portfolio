// Dictionnaire français pour les jeux de lettres (Mots mélangés, Joute de lettres).
//
// Source : la liste « an-array-of-french-words » (licence MIT, ~336 000 mots, tirée de la liste de
// mots du jeu Letterpress). Les mots sont mis en majuscules sans accents (É → E, Œ → OE), seuls ceux
// de 2 à 15 lettres sont gardés : 311 509 mots.
//
// Le fichier est compressé « par préfixe » : les mots sont triés, et chacun commence par un caractère
// qui dit combien de lettres il partage avec le précédent ('0' = 0, '1' = 1, …), suivi du reste du mot.
// Il pèse 900 Ko (150 Ko une fois compressé par le serveur) et n'est chargé que quand on ouvre un jeu de lettres.
import url from './lexique-fr.txt?url'

const A = 65 // code de la lettre A

// Un arbre de lettres (trie) rangé dans des tableaux : rapide et léger, même avec 300 000 mots.
export interface Lexique {
  nbMots: number
  // Le nœud atteint en suivant la lettre (0 à 25) depuis le nœud n, ou -1.
  fils(n: number, lettre: number): number
  // Les lettres qui suivent le nœud n, en masque de bits (bit 0 = A).
  suites(n: number): number
  // Le chemin jusqu'au nœud n forme-t-il un mot ?
  estMot(n: number): boolean
  // Le nœud atteint en suivant un préfixe (ou -1).
  noeud(prefixe: string): number
  contient(mot: string): boolean
}

export function construire(texte: string): Lexique {
  // Nombre de nœuds : une lettre nouvelle par caractère qui n'est pas un compteur de préfixe.
  let taille = 1
  for (let i = 0; i < texte.length; i++) if (texte.charCodeAt(i) >= A) taille++
  const lettre = new Uint8Array(taille)
  const premier = new Int32Array(taille).fill(-1)
  const suivant = new Int32Array(taille).fill(-1)
  const dernier = new Int32Array(taille).fill(-1)
  const masque = new Int32Array(taille)
  const fin = new Uint8Array(taille)
  let nb = 1
  let nbMots = 0
  const chemin = [0] // chemin[k] = nœud après k lettres du mot courant
  let i = 0
  while (i < texte.length) {
    const commun = texte.charCodeAt(i++) - 48
    chemin.length = commun + 1
    let n = chemin[commun]
    while (i < texte.length && texte.charCodeAt(i) >= A) {
      const l = texte.charCodeAt(i++) - A
      // Les mots sont triés : la nouvelle lettre va toujours en dernier parmi les enfants.
      const c = nb++
      lettre[c] = l
      if (dernier[n] < 0) premier[n] = c
      else suivant[dernier[n]] = c
      dernier[n] = c
      masque[n] |= 1 << l
      n = c
      chemin.push(n)
    }
    fin[n] = 1
    nbMots++
  }
  const fils = (n: number, l: number) => {
    if (!(masque[n] & (1 << l))) return -1
    for (let c = premier[n]; c >= 0; c = suivant[c]) if (lettre[c] === l) return c
    return -1
  }
  const noeud = (p: string) => {
    let n = 0
    for (let k = 0; k < p.length && n >= 0; k++) n = fils(n, p.charCodeAt(k) - A)
    return n
  }
  return {
    nbMots,
    fils,
    suites: n => masque[n],
    estMot: n => fin[n] === 1,
    noeud,
    contient: m => {
      const n = noeud(m)
      return n >= 0 && fin[n] === 1
    },
  }
}

let promesse: Promise<Lexique> | null = null
export function chargerLexique(): Promise<Lexique> {
  if (!promesse) {
    promesse = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`dictionnaire introuvable (${r.status})`)
        return r.text()
      })
      .then(construire)
    promesse.catch(() => (promesse = null)) // on pourra réessayer
  }
  return promesse
}

// Enlève les accents et met en majuscules : « Été » → « ETE ».
export const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/gi, 'OE').replace(/æ/gi, 'AE').toUpperCase()

// Tous les mots qu'on peut écrire avec ces lettres (chaque lettre au plus une fois), d'au moins `min` lettres.
export function motsPossibles(lx: Lexique, lettres: string, min = 3): string[] {
  const compte = new Array(26).fill(0)
  for (const c of lettres) compte[c.charCodeAt(0) - A]++
  const res: string[] = []
  const pile: number[] = []
  const visiter = (n: number) => {
    if (pile.length >= min && lx.estMot(n)) res.push(String.fromCharCode(...pile.map(l => l + A)))
    const s = lx.suites(n)
    for (let l = 0; l < 26; l++) {
      if (!compte[l] || !(s & (1 << l))) continue
      compte[l]--
      pile.push(l)
      visiter(lx.fils(n, l))
      pile.pop()
      compte[l]++
    }
  }
  visiter(0)
  return res
}
