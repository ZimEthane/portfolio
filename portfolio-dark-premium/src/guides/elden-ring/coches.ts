// Cases cochées du guide (et lieux trouvés sur la carte) : enregistrées dans le navigateur du visiteur.
function lire(cle: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(cle) ?? '[]') as string[]) } catch { return new Set() }
}
function ecrire(cle: string, valeurs: Set<string>) {
  try { localStorage.setItem(cle, JSON.stringify([...valeurs])) } catch { /* stockage indisponible : l'état tient jusqu'au rechargement */ }
}

const CLE_COCHES = 'guides:elden-ring:coches'
const CLE_TROUVES = 'guides:elden-ring:carte'

export const lireCoches = () => lire(CLE_COCHES)
export const ecrireCoches = (c: Set<string>) => ecrire(CLE_COCHES, c)
export const lireTrouves = () => lire(CLE_TROUVES)
export const ecrireTrouves = (c: Set<string>) => ecrire(CLE_TROUVES, c)
const CLE_OBTENUS = 'guides:elden-ring:objets'
export const lireObtenus = () => lire(CLE_OBTENUS)
export const ecrireObtenus = (c: Set<string>) => ecrire(CLE_OBTENUS, c)
