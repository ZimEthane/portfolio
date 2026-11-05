import { Castle, Coins, Crosshair, Droplet, Flame, FlaskConical, Gem, Ghost, Hammer, Key, Leaf, Shield, Skull, Sparkles, Sprout, Sword, Swords, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Categorie {
  id: string
  nom: string
  couleur: string
  icone: LucideIcon
  groupe: 'Lieux' | 'Objets' | 'Divers'
  visible: boolean // affichée à la première visite
}

// L'ordre est celui du panneau des filtres.
export const CATEGORIES: Categorie[] = [
  { id: 'graces', nom: 'Sites de grâce', couleur: '#d9a93a', icone: Flame, groupe: 'Lieux', visible: true },
  { id: 'lieux', nom: 'Lieux et donjons', couleur: '#3f7ea6', icone: Castle, groupe: 'Lieux', visible: true },
  { id: 'boss', nom: 'Boss', couleur: '#b3322b', icone: Skull, groupe: 'Lieux', visible: true },
  { id: 'pnj', nom: 'Personnages', couleur: '#4f8a4f', icone: User, groupe: 'Lieux', visible: true },
  { id: 'graines-larmes', nom: 'Graines dorées et larmes sacrées', couleur: '#c79a1e', icone: Sprout, groupe: 'Objets', visible: true },
  { id: 'pierres-forge', nom: 'Pierres de forge', couleur: '#6f7a86', icone: Hammer, groupe: 'Objets', visible: true },
  { id: 'objets-cles', nom: 'Objets clés', couleur: '#7d55b8', icone: Key, groupe: 'Objets', visible: true },
  { id: 'armes', nom: 'Armes', couleur: '#b8642a', icone: Sword, groupe: 'Objets', visible: true },
  { id: 'armures', nom: 'Armures', couleur: '#5b6b82', icone: Shield, groupe: 'Objets', visible: true },
  { id: 'talismans', nom: 'Talismans', couleur: '#a8782a', icone: Gem, groupe: 'Objets', visible: true },
  { id: 'sorts', nom: 'Sorts et incantations', couleur: '#4565b8', icone: Sparkles, groupe: 'Objets', visible: true },
  { id: 'cendres-guerre', nom: 'Cendres de guerre', couleur: '#b84a3a', icone: Swords, groupe: 'Objets', visible: true },
  { id: 'cendres-spirituelles', nom: 'Cendres spirituelles', couleur: '#3a8fa8', icone: Ghost, groupe: 'Objets', visible: true },
  { id: 'larmes', nom: 'Larmes de cristal', couleur: '#2f9c8c', icone: Droplet, groupe: 'Objets', visible: true },
  { id: 'materiaux', nom: "Matériaux d'artisanat", couleur: '#5e8a35', icone: Leaf, groupe: 'Divers', visible: false },
  { id: 'runes', nom: 'Runes à consommer', couleur: '#b08d1a', icone: Coins, groupe: 'Divers', visible: false },
  { id: 'consommables', nom: 'Consommables', couleur: '#8a7350', icone: FlaskConical, groupe: 'Divers', visible: false },
  { id: 'munitions', nom: 'Flèches et carreaux', couleur: '#7a5c3e', icone: Crosshair, groupe: 'Divers', visible: false },
]

export const PAR_ID = new Map(CATEGORIES.map(c => [c.id, c]))
