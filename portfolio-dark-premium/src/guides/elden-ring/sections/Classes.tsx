import type { CSSProperties, ReactNode } from 'react'
import { Encadre, Page, Partie, Puces, Tableau } from '../blocs'
import { CLASSES, COULEURS_TIER, STATS_COURTES } from '../donnees/classes'
import type { Classe, Tier } from '../donnees/classes'
import type { SectionGuide } from '../plan'

// Section 2 du PDF : « Classes & builds » (pages 10 à 12).

const STAT_MAX = 17
const nomClasse = (c: Classe) => c.pack ? `${c.nom} ★` : c.nom

function PastilleTier({ tier }: { tier: Tier }) {
  return <span className="er-tier-pastille" style={{ background: COULEURS_TIER[tier] }}>{tier}</span>
}

function CarteClasse({ c }: { c: Classe }) {
  return (
    <li className="er-classe">
      <div className="er-classe-tete">
        <strong>{nomClasse(c)}</strong>
        <span className="er-classe-niv">Niv. {c.niveau}</span>
      </div>
      <span className="er-classe-style">{c.style}</span>
      <dl className="er-classe-stats">
        {STATS_COURTES.map(st => {
          const forte = c.fortes.includes(st.id)
          return (
            <div key={st.id} className={forte ? 'is-forte' : undefined}>
              <dt>{st.court}</dt>
              <dd>
                <span className="er-classe-barre" aria-hidden="true"><i style={{ width: `${(c.stats[st.id] / STAT_MAX) * 100}%` }} /></span>
                <span className="er-classe-val">{c.stats[st.id]}</span>
              </dd>
            </div>
          )
        })}
      </dl>
      <div className="er-classe-tiers">
        <span>Débutant <PastilleTier tier={c.debutant} /></span>
        <span>Expert <PastilleTier tier={c.expert} /></span>
      </div>
    </li>
  )
}

// Tableau de tier list : la lettre dans une case de couleur, les classes en gras, l'explication.
function TierList({ titre, lignes }: { titre: string; lignes: { tier: Tier; classes: ReactNode; pourquoi: ReactNode }[] }) {
  return (
    <div className="er-tableau-cadre">
      <table className="er-tableau er-tiers is-large">
        <caption className="er-invisible">{titre}</caption>
        <colgroup><col style={{ width: '7%' }} /><col style={{ width: '26%' }} /><col /></colgroup>
        <thead><tr><th scope="col">Tier</th><th scope="col">Classes</th><th scope="col">Pourquoi</th></tr></thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.tier}>
              <th scope="row" className="er-tier-lettre" style={{ '--t': COULEURS_TIER[l.tier] } as CSSProperties}>{l.tier}</th>
              <td className="er-tier-classes">{l.classes}</td>
              <td>{l.pourquoi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Classes({ section }: { section: SectionGuide }) {
  const [page] = section.pages
  const parNom = (nom: string) => CLASSES.find(c => c.nom === nom)!
  const equipement: [string, string, string][] = [
    ['Vagabond', 'Épée longue, hallebarde, bouclier lourd, armure lourde', 'Corps-à-corps solide, bloque tout'],
    ['Guerrier', 'Deux cimeterres, petit bouclier en bois', 'Dextérité, combos rapides'],
    ['Héros', 'Hache de guerre, grand bouclier en cuir', 'Force brute'],
    ['Bandit', 'Grand couteau, arc court, bouclier de parade', 'Furtif, parades, saignement'],
    ['Astrologue', 'Bâton, épée courte, sorts Glintstone Pebble et Glintstone Arc', 'Magie à distance'],
    ['Prophète', 'Lance courte, sceau sacré, sorts Heal et Catch Flame', 'Foi, soins'],
    ['Samouraï', 'Uchigatana (saignement), arc long, bouclier rond', 'Dextérité, très polyvalent'],
    ['Prisonnier', 'Estoc, bâton, sort Magic Glintblade', 'Mêlée + magie'],
    ['Confesseur', 'Épée large, sceau, bouclier, sorts Urgent Heal et Assassin’s Approach', 'Foi + mêlée'],
    ['Misérable', 'Une massue. C’est tout.', 'Page blanche'],
    ['Heavy Knight', 'Hefty Scimitar (grande épée courbe), armure d’acier, pas de bouclier', 'Force, encaisse les coups'],
    ['Idus Knight', 'Idus Sword (grande épée légère), bouclier moyen, armure légère', 'Dextérité + Foi, mobile'],
  ]

  return (
    <Page page={page}>
      <Partie titre="Ce que la classe change vraiment">
        <Puces>
          <li>La classe (« origine ») fixe seulement tes <b>statistiques et ton équipement de départ</b>. Tu peux manier n’importe quelle arme ou magie ensuite.</li>
          <li>Toutes les classes ont le même total de points : <b>79 + leur niveau de départ</b>. Une classe de haut niveau n’est pas plus forte : ses points sont juste déjà placés, parfois dans des stats inutiles pour ton build.</li>
          <li>Tu peux <b>redistribuer tes stats</b> après avoir battu Rennala (Académie de Raya Lucaria) grâce aux <b>Larmes larvaires</b> (Larval Tear).</li>
          <li><b>Nouveau (1.17)</b> : le <b>Tarnished Pack</b> (DLC payant à 4,99 €, inclus d’office dans la Tarnished Edition sur Switch 2) ajoute deux classes, <b>Heavy Knight</b> et <b>Idus Knight</b>. Elles sont marquées ★ dans les tableaux.</li>
        </Puces>
      </Partie>

      <Partie titre="Les 12 classes en un coup d’œil">
        <ul className="er-classes">
          {CLASSES.map(c => <CarteClasse key={c.nom} c={c} />)}
        </ul>
        <p className="er-note">Barres = valeur de départ de chaque stat (max 17). Les 2 stats les plus hautes sont en foncé. ★ = classe du Tarnished Pack.</p>
        <p className="er-note er-note-grande">Vig = Vigueur (PV) · Esp = Esprit (PC) · End = Endurance · For = Force · Dex = Dextérité · Int = Intelligence · Foi = Foi · Éso = Ésotérisme (Arcane). Le détail de chaque stat est dans la section <a href="#guides/elden-ring/bases/les-8-statistiques">Les bases</a>.</p>
      </Partie>

      <Partie titre="Équipement et style de jeu">
        <Tableau
          legende="Équipement de départ et style de chaque classe"
          colonnes={[{ titre: 'Classe', largeur: '16%', fort: true }, { titre: 'Équipement de départ', largeur: '56%' }, { titre: 'Style' }]}
          lignes={equipement.map(([nom, equip, style]) => [nomClasse(parNom(nom)), equip, style])}
        />
      </Partie>

      <Partie titre="Tier list débutant (première partie)">
        <p>Critères : survie (vigueur, armure, bouclier), facilité de l’arme de départ, efficacité dans les 10 premières heures.</p>
        <TierList
          titre="Tier list débutant"
          lignes={[
            { tier: 'S', classes: 'Vagabond, Samouraï', pourquoi: 'Vagabond : meilleure vigueur, armure lourde et bouclier qui bloque 100 % des dégâts physiques. Samouraï : l’Uchigatana est une des meilleures armes du début et l’arc long permet de tirer les ennemis un par un.' },
            { tier: 'A', classes: 'Astrologue, Confesseur, Heavy Knight ★', pourquoi: 'Astrologue : tue presque tout de loin, en sécurité. Confesseur : se soigne, se bat bien au corps-à-corps et peut lancer des sorts. Heavy Knight : très résistant, mais pas de bouclier et peu de PC.' },
            { tier: 'B', classes: 'Héros, Prisonnier, Prophète, Idus Knight ★', pourquoi: 'Bons, mais avec un défaut net au départ : Héros peu mobile, Prisonnier fragile, Prophète faible au corps-à-corps, Idus Knight peu de vigueur.' },
            { tier: 'C', classes: 'Guerrier, Bandit', pourquoi: 'Peu de défense : chaque erreur coûte cher. Le Bandit demande de maîtriser la parade.' },
            { tier: 'D', classes: 'Misérable', pourquoi: 'Niveau 1, sans armure, une massue. À réserver aux joueurs qui connaissent déjà le jeu.' },
          ]}
        />
        <Encadre>Tu hésites encore ? Tu débutes et tu aimes le corps-à-corps : <b>Vagabond</b>. Tu débutes et tu préfères la distance : <b>Astrologue</b>. Tu connais déjà les Souls : <b>Samouraï</b> (ou <b>Misérable</b> si tu veux optimiser).</Encadre>
      </Partie>

      <Partie titre="Tier list expert (optimisation)">
        <p>Critères : niveau de départ bas (peu de points gaspillés), stats alignées sur un build précis, potentiel du kit de départ (speedrun, challenge).</p>
        <TierList
          titre="Tier list expert"
          lignes={[
            { tier: 'S', classes: 'Misérable, Samouraï', pourquoi: 'Misérable : niveau 1 et 10 partout, zéro point perdu, base idéale pour n’importe quel build optimisé. Samouraï : le meilleur kit de départ du jeu (Uchigatana + arc long) et des stats parfaites pour la dextérité.' },
            { tier: 'A', classes: 'Astrologue, Vagabond, Héros, Confesseur, Idus Knight ★', pourquoi: 'Chacun est la base la plus efficace pour son build : Intelligence pure (Astrologue), qualité Force/Dex (Vagabond), Force pure (Héros), Foi hybride (Confesseur), Dex + Foi (Idus Knight).' },
            { tier: 'B', classes: 'Prophète, Bandit, Prisonnier', pourquoi: 'Excellents pour un build précis (Foi pure, Ésotérisme/saignement, lame magique) mais moins flexibles.' },
            { tier: 'C', classes: 'Guerrier, Heavy Knight ★', pourquoi: 'Guerrier : beaucoup de points en Intelligence et Esprit inutiles pour un build Dextérité. Heavy Knight : niveau 10, le Héros fait mieux pour un build Force.' },
          ]}
        />
        <Encadre>À haut niveau (150 et plus), l’écart entre la meilleure et la pire classe pour un même build ne représente que quelques niveaux. Pour un joueur expérimenté, la vraie question est : quelle classe colle le mieux à mon build ?</Encadre>
      </Partie>

      <Partie titre="Quelle classe pour quel build">
        <Tableau
          legende="Meilleure classe de départ selon le build visé"
          colonnes={[{ titre: 'Build visé', largeur: '49%', fort: true }, { titre: 'Meilleure classe de départ' }]}
          lignes={[
            ['Force pure (grandes armes)', 'Héros (ou Heavy Knight ★)'],
            ['Dextérité (katanas, épées courbes)', 'Samouraï, Guerrier'],
            ['Qualité (Force + Dextérité)', 'Vagabond'],
            ['Intelligence (sorcier)', 'Astrologue'],
            ['Lame magique (Intelligence + Dextérité)', 'Prisonnier'],
            ['Foi (incantations)', 'Prophète (pure) ou Confesseur (hybride)'],
            ['Dextérité + Foi', 'Idus Knight ★ ou Confesseur'],
            ['Ésotérisme / saignement', 'Bandit'],
            ['Optimisation totale, n’importe quel build', 'Misérable'],
          ]}
        />
      </Partie>

      <Partie titre="Le souvenir de départ">
        <Puces>
          <li><b>Golden Seed</b> (+1 utilisation de fiole dès le départ) : le meilleur choix, débutant comme expert.</li>
          <li><b>Stonesword Key ×2</b> : pour ouvrir tôt des sceaux de statues de diablotin (coffres, passages).</li>
          <li><b>Crimson Amber Medallion</b> (+PV) : correct, mais vite remplacé. Les autres souvenirs sont situationnels.</li>
        </Puces>
      </Partie>
    </Page>
  )
}
