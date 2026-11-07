// Données de l'encyclopédie des objets (voir scripts/carte-elden-ring/extraire_objets.py), partagées avec la carte.

export type Valeur = number | string | Record<string, number | string>
export interface Lien { s?: string; n: string; q?: number } // autre fiche (adresse, nom, quantité)

export interface Source {
  t: 'carte' | 'boutique' | 'recompense' | 'butin' | 'cueillette' | 'hors-carte' | 'fabrication' | 'depart' | 'souvenir'
    | 'retouche' | 'fiole' | 'attachee' | 'aide' | 'quete'
  id?: string // repère de la carte (t = carte)
  ids?: string[] // repères : marchand, boss, personnage, lieu
  e?: string // groupe d'ennemis ou endroit d'un événement (ennemis.json)
  nb?: number // nombre d'endroits (ennemis) ou de points de cueillette
  k?: string[] // types de ressources à cueillir (ressources.json)
  comment?: string
  pres?: string
  z?: string
  sous?: number
  qui?: string
  chez?: string[] // qui donne la récompense
  prix?: number
  echange?: string
  stock?: number
  quoi?: string
  pc?: number
  livres?: Lien[]
  ingredients?: Lien[]
  classes?: string[]
  s?: string // fiche liée (retouche, fiole)
  n?: string
  inverse?: number
  niveau?: number
  armes?: Lien[]
  tableau?: Lien // carte : récompense d'un tableau (n'apparaît que si l'on a le tableau)
  apres?: string // boutique : condition (« après leur avoir donné la Perle… »)
  perle?: Lien // boutique : Perle cinéraire du marchand (les Carcasses des Servantes jumelles vendent alors son stock)
  q?: string // quête (adresse)
  i?: number // quête : n° de l'étape (à partir de 0)
  et?: string // quête : titre de l'étape
  pack?: string // départ : classe ajoutée par un pack payant
}
export interface Objet {
  s: string // adresse
  t: string // groupe
  n: string
  en: string
  c: string // sous-catégorie
  pack?: string // contenu payant à part (« Tarnished Pack ») : absent du monde sans lui
  i?: number // illustration
  d: string // description
  e?: string // effet
  st?: Record<string, Valeur>
  ou?: Source[]
}
export interface Donnees { version: string; groupes: { t: string; nom: string }[]; objets: Objet[] }

export const BASE_OBJETS = `${import.meta.env.BASE_URL}guides/elden-ring/objets/`
export const LIEN_OBJETS = '#guides/elden-ring/objets'
export const LIEN_CARTE_OBJET = '#guides/elden-ring/carte/objet'
export const LIEN_QUETES = '#guides/elden-ring/quetes-pas-a-pas'
export const lienQuete = (s: Source) => `${LIEN_QUETES}/${s.q}${s.i !== undefined ? `/${s.i + 1}` : ''}`

let cache: Promise<Donnees> | null = null
export const chargerObjets = () => (cache ??= fetch(`${BASE_OBJETS}objets.json`).then(r => {
  if (!r.ok) throw new Error(String(r.status))
  return r.json() as Promise<Donnees>
}))

const runes = (n: number) => `${n.toLocaleString('fr-FR')} runes`
const liste = (l: string[]) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}`)

// Phrase qui décrit une source, pour l'encyclopédie et le panneau de la carte.
export function texteSource(s: Source): { titre: string; detail?: string } {
  switch (s.t) {
    case 'carte':
      return {
        titre: s.comment || 'Ramassé sur place',
        detail: [s.tableau && 'Va à l\'endroit peint : l\'esprit du peintre n\'apparaît que si tu as le tableau', s.z && `À l'intérieur : ${s.z}`,
          s.pres && `Grâce la plus proche : ${s.pres}${s.sous ? ' (souterrain)' : ''}`].filter(Boolean).join(' · '),
      }
    case 'cueillette':
      return { titre: 'Se ramasse dans la nature', detail: `${(s.nb ?? 0).toLocaleString('fr-FR')} points de cueillette sur la carte (ils réapparaissent)` }
    case 'hors-carte':
      return { titre: s.quoi ?? 'Hors de la carte' }
    case 'boutique':
      return {
        titre: `Vendu par ${s.qui}${s.apres ? `, ${s.apres}` : ''}`,
        detail: `${s.echange ? `Échange contre : ${s.echange}` : s.prix ? runes(s.prix) : 'Prix variable'}${s.stock ? ` · ${s.stock} en stock` : ' · stock illimité'}`
          + (s.perle ? ` · aussi chez les Carcasses des Servantes jumelles (Table ronde) si tu leur donnes la ${s.perle.n}` : ''),
      }
    case 'recompense': {
      const chez = s.chez?.length ? liste(s.chez) : ''
      if (s.quoi?.startsWith('Événement du jeu')) return { titre: chez ? `Obtenu auprès de ${chez}` : 'Donné par un événement du jeu', detail: 'Butin ou cadeau (boss, envahisseur, personnage ou scène)' }
      if (chez && s.chez?.length === 1 && s.chez[0] === s.quoi) return { titre: `Obtenu auprès de ${chez}`, detail: 'Récompense (boss, quête, personnage ou envahisseur)' }
      return { titre: `Obtenu : ${s.quoi}`, detail: chez ? `Auprès de : ${chez}` : 'Récompense (boss, quête ou personnage)' }
    }
    case 'butin':
      return { titre: `Lâché par ${s.qui}`, detail: `Chance : ${s.pc?.toLocaleString('fr-FR')} %${s.nb ? ` · ${s.nb} ${s.nb > 1 ? 'endroits' : 'endroit'} sur la carte` : ''}` }
    case 'fabrication': {
      const livres = (s.livres ?? []).map(l => l.n)
      const ingr = (s.ingredients ?? []).map(i => `${i.n} ×${i.q ?? 1}`)
      return { titre: livres.length ? `Fabrication : recette du ${liste(livres)}` : 'Fabrication', detail: ingr.length ? `Ingrédients : ${ingr.join(', ')}` : undefined }
    }
    case 'depart':
      return { titre: 'Équipement de départ', detail: `Classe : ${liste(s.classes ?? [])}${s.pack ? ` (classe du ${s.pack})` : ''}` }
    case 'souvenir':
      return { titre: 'Souvenir au choix à la création du personnage' }
    case 'retouche':
      return s.inverse
        ? { titre: `En annulant la retouche de « ${s.n} »`, detail: 'À un site de grâce, menu « Retoucher un vêtement »' }
        : { titre: `En retouchant « ${s.n} »`, detail: 'À un site de grâce, menu « Retoucher un vêtement »' }
    case 'fiole':
      return { titre: `Fiole améliorée au niveau +${s.niveau}`, detail: `Une ${s.n ?? 'Larme de vie'} par niveau, à un site de grâce` }
    case 'attachee':
      return { titre: `Fixée sur ${liste((s.armes ?? []).map(a => a.n))}`, detail: 'Vient avec l\'arme ; se retire avec une Pierre à aiguiser' }
    case 'aide':
      return { titre: 'Message d\'aide du jeu', detail: 'Obtenu automatiquement au fil de l\'aventure (premières découvertes)' }
    case 'quete':
      return { titre: `Quête : ${s.n}`, detail: s.i !== undefined ? `Étape ${s.i + 1} : ${s.et}` : 'Récompense de la quête' }
  }
  return { titre: '' }
}

// Raisons acceptées de ne rien montrer sur la carte.
export const SANS_CARTE = new Set<Source['t']>(['depart', 'souvenir', 'aide', 'quete'])

// Fiches liées dont les emplacements comptent pour cette source (livre de recettes, version d'origine…).
export function liensSource(s: Source): { s: string; n: string; pourquoi: string }[] {
  const res: { s: string; n: string; pourquoi: string }[] = []
  if (s.t === 'fabrication') {
    const livres = (s.livres ?? []).filter(l => l.s)
    if (livres.length) livres.forEach(l => res.push({ s: l.s!, n: l.n, pourquoi: 'Livre de recettes' }))
    else (s.ingredients ?? []).filter(i => i.s).forEach(i => res.push({ s: i.s!, n: i.n, pourquoi: 'Ingrédient' }))
  }
  if ((s.t === 'retouche' || s.t === 'fiole') && s.s) res.push({ s: s.s, n: s.n ?? '', pourquoi: s.t === 'fiole' ? 'Améliorée avec' : s.inverse ? 'Version retouchée' : 'Version d\'origine' })
  if (s.t === 'attachee') (s.armes ?? []).filter(a => a.s).forEach(a => res.push({ s: a.s!, n: a.n, pourquoi: 'Arme qui la porte' }))
  return res
}

// Ce que la carte montre directement pour une source : repères, groupe d'ennemis, types de ressources.
export function ciblesDirectes(s: Source): { ids: string[]; e?: string; r: string[] } {
  return { ids: [...(s.t === 'carte' && s.id ? [s.id] : []), ...(s.ids ?? [])], e: s.e, r: s.t === 'cueillette' ? s.k ?? [] : [] }
}

export function aDesCibles(s: Source): boolean {
  const c = ciblesDirectes(s)
  return c.ids.length > 0 || !!c.e || c.r.length > 0 || liensSource(s).length > 0
}
