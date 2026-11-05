import type { CSSProperties, ReactNode } from 'react'
import { Encadre, Numeros, Page, Partie, Puces, Repere, Tableau, Tag } from '../blocs'
import type { SectionGuide } from '../plan'

// Section 1 du PDF : « Les bases » (pages 4 à 8).

// ----- La boucle du jeu : 5 étapes en cercle autour de « Nouvelle zone » -----
const BOUCLE = [
  { n: 1, titre: 'Explorer', texte: 'zones, donjons, coffres' },
  { n: 2, titre: 'Récolter', texte: 'runes, objets, pierres' },
  { n: 3, titre: 'Site de grâce', texte: 'monter de niveau, fioles' },
  { n: 4, titre: 'Forgeron', texte: 'améliorer ton arme' },
  { n: 5, titre: 'Boss', texte: 'le battre ouvre la suite' },
]

function Boucle() {
  return (
    <figure className="er-boucle">
      <svg className="er-boucle-fleches" viewBox="0 0 505 260" aria-hidden="true">
        <defs>
          <marker id="er-pointe" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#a07a2c" />
          </marker>
        </defs>
        <path d="M322 30 Q356 44 372 80" />
        <path d="M424 138 Q434 172 412 202" />
        <path d="M282 236 Q254 250 226 236" />
        <path d="M112 204 Q96 172 112 140" />
        <path d="M138 80 Q150 42 178 28" />
      </svg>
      <ol>
        {BOUCLE.map(e => (
          <li key={e.n} className={`er-boucle-etape er-boucle-${e.n}`}>
            <span className="er-boucle-n">{e.n}</span>
            <span><strong>{e.titre}</strong><small>{e.texte}</small></span>
          </li>
        ))}
      </ol>
      <figcaption className="er-boucle-centre"><span>Nouvelle zone</span><small>et on recommence, plus fort</small></figcaption>
    </figure>
  )
}

// ----- Les 3 jauges -----
const JAUGES = [
  { court: 'PV', couleur: '#b23a3a', rempli: 77, titre: 'Points de vie', texte: 'Monte avec la Vigueur. À zéro, tu meurs.' },
  { court: 'PC', couleur: '#3a64b2', rempli: 55, titre: 'Points de concentration', texte: 'Monte avec l’Esprit. Servent aux sorts et aux compétences d’arme.' },
  { court: 'END', couleur: '#3d8a55', rempli: 66, titre: 'Endurance', texte: 'Se vide quand tu attaques, esquives, cours ou bloques. Se recharge seule.' },
]

function Jauges() {
  return (
    <ul className="er-jauges">
      {JAUGES.map(j => (
        <li key={j.court} style={{ '--j': j.couleur } as CSSProperties}>
          <span className="er-jauge-court">{j.court}</span>
          <span className="er-jauge-barre" aria-hidden="true"><i style={{ width: `${j.rempli}%` }} /></span>
          <span><strong>{j.titre}</strong> — {j.texte}</span>
        </li>
      ))}
    </ul>
  )
}

// ----- Mourir n'est pas grave : les 5 étapes -----
const MORT: { n: number; ton?: 'depart' | 'recompense' | 'verrou'; texte: ReactNode }[] = [
  { n: 1, ton: 'depart', texte: <>Tu meurs : tu perds <b>toutes tes runes</b> en poche.</> },
  { n: 2, texte: <>Tu réapparais au dernier site de grâce ou au <b>pieu de Marika</b> le plus proche.</> },
  { n: 3, texte: <>Tes runes t’attendent là où tu es mort (une lueur au sol).</> },
  { n: 4, ton: 'recompense', texte: <>Retourne les ramasser <b>sans remourir</b> : elles sont à toi.</> },
  { n: 5, ton: 'verrou', texte: <>Si tu remeurs avant : elles sont <b>perdues</b>.</> },
]
const TONS = { depart: 'Départ', recompense: 'Récompense', verrou: 'Verrou' }

function Mort() {
  return (
    <ol className="er-flux">
      {MORT.map(e => (
        <li key={e.n} className={e.ton ? `er-flux-${e.ton}` : undefined}>
          <span className="er-flux-n">{e.n}</span>
          {e.ton && <span className="er-flux-tag">{TONS[e.ton]}</span>}
          <p>{e.texte}</p>
        </li>
      ))}
    </ol>
  )
}

// ----- Les 8 statistiques -----
const STATS = [
  { court: 'Vig', nom: 'Vigueur', couleur: '#b23a3a', texte: 'Tes PV. La stat n° 1 pour survivre.' },
  { court: 'Esp', nom: 'Esprit', couleur: '#3a64b2', texte: 'Tes PC : sorts et compétences d’arme.' },
  { court: 'End', nom: 'Endurance', couleur: '#3d8a55', texte: 'Endurance + poids d’équipement porté.' },
  { court: 'For', nom: 'Force', couleur: '#7d4a2a', texte: 'Armes lourdes, haches, marteaux.' },
  { court: 'Dex', nom: 'Dextérité', couleur: '#8a6a2a', texte: 'Katanas, épées courbes, armes rapides.' },
  { court: 'Int', nom: 'Intelligence', couleur: '#4a4a9a', texte: 'Sorts (bâton) et armes magiques.' },
  { court: 'Foi', nom: 'Foi', couleur: '#a07a2c', texte: 'Incantations (sceau) : soins, feu, foudre.' },
  { court: 'Éso', nom: 'Ésotérisme', couleur: '#6a3a6a', texte: 'Saignement, objets trouvés, sorts rares.' },
]

function Stats() {
  return (
    <ul className="er-stats">
      {STATS.map(s => (
        <li key={s.court}>
          <span className="er-stat-pastille" style={{ background: s.couleur }}>{s.court}</span>
          <span><strong>{s.nom}</strong><small>{s.texte}</small></span>
        </li>
      ))}
    </ul>
  )
}

// ----- Pierres de forge : une barre par pierre, de plus en plus haute -----
function Forge({ titre, niveaux, derniere, legende }: { titre: string; niveaux: string[]; derniere: string; legende: string }) {
  const total = niveaux.length + 1
  return (
    <figure className="er-forge">
      <figcaption>{titre}</figcaption>
      <div className="er-forge-barres">
        {niveaux.map((bonus, i) => (
          <span key={i} style={{ height: `${34 + (i / (total - 1)) * 66}%` }}><small>[{i + 1}]</small>{bonus}</span>
        ))}
        <span className="er-forge-ancient" style={{ height: '100%' }}><small>Ancient</small>{derniere}</span>
      </div>
      <p>{legende}</p>
    </figure>
  )
}

export default function Bases({ section }: { section: SectionGuide }) {
  const [avant, bases] = section.pages
  return (
    <>
      <Page page={avant}>
        <Partie titre="Comment lire ce guide">
          <p>Ce guide suit un <b>ordre conseillé</b> qui permet de faire <b>toutes les quêtes du jeu de base</b> sans en rater une, tout en évitant les zones trop dures trop tôt. Il couvre aussi <b>le 100 %</b> : les 42 trophées, les objets légendaires et une carte des objets pour chaque région (section 100 %), plus une fiche pour chaque donjon et chaque boss (sections Donjons et Bestiaire). Chaque section a son onglet de couleur sur le bord droit des pages. Elden Ring est un monde ouvert : tu peux dévier de l’ordre, mais respecte toujours les encadrés <b>ALERTE</b>.</p>
          <div className="er-legende">
            <ul>
              <li><Tag type="boss" /> boss majeur (obligatoire ou porteur d’une Rune majeure)</li>
              <li><Tag type="mini" /> boss secondaire (boss de terrain, de donjon, d’évergeôle)</li>
              <li><Tag type="quete" /> étape d’une quête de PNJ</li>
              <li><Tag type="opt" /> étape optionnelle</li>
              <li><b>ALERTE</b> = point de non-retour · <b>CHOIX</b> = décision définitive · <b>ASTUCE</b> = conseil · <b>EN PARALLÈLE</b> = quêtes liées entre elles</li>
            </ul>
            <ul>
              <li><Repere n={2} /> = repère n° 2 sur la carte du chapitre en cours · <Repere n={14} ch={8} /> = repère n° 14 sur la carte du chapitre 8 · couleur foncée = boss</li>
              <li><Repere n={4} objet /> = lieu n° 4 sur la <b>carte des objets</b> du chapitre · <Repere n={12} ch={5} objet /> = lieu n° 12 sur la carte des objets du chapitre 5</li>
            </ul>
          </div>
          <Puces>
            <li><b>Les noms</b> : les grandes zones et les boss majeurs sont en français, avec le nom anglais entre parenthèses quand c’est utile. Les mini-boss, objets de quête et petits lieux sont laissés <b>en anglais</b> : c’est sous ce nom que tu les trouveras sur les wikis (Fextralife, wiki.gg) si tu veux une carte précise.</li>
            <li><b>Les niveaux</b> sont indicatifs, pour une partie sans aide en ligne. Avec les Cendres spirituelles, tu peux être un peu plus bas.</li>
            <li><b>Version</b> : jeu de base, mise à jour 1.17 (août 2026). Le DLC Shadow of the Erdtree fera l’objet d’une suite.</li>
          </Puces>
        </Partie>

        <Partie titre="Les 8 règles d’or des quêtes">
          <Numeros>
            <li><b>Épuise les dialogues</b> : reparle au PNJ jusqu’à ce qu’il répète la même phrase.</li>
            <li><b>Recharge la zone</b> quand un PNJ ne bouge pas : repose-toi à un site de grâce, ou téléporte-toi ailleurs puis reviens. La plupart des quêtes avancent comme ça.</li>
            <li><b>Ne frappe jamais un PNJ amical</b> (attention aux attaques de zone). Si ça arrive : Église des Vœux (Church of Vows, Liurnia est), parle à <b>Miriel</b> et demande l’absolution avec une <b>Rosée céleste</b> (Celestial Dew).</li>
            <li><b>Ne tue aucun PNJ</b> sauf si le guide le dit.</li>
            <li><b>Ne donne jamais la potion de Seluvis à Nepheli.</b></li>
            <li><b>Ne casse aucune jarre à Jarburg</b> (Liurnia est).</li>
            <li><b>Fais une sauvegarde de secours avant chaque CHOIX</b> : sauvegarde cloud sur PS Plus / Xbox, ou copie du dossier <code>%APPDATA%\EldenRing</code> sur PC.</li>
            <li><b>Surveille les 4 grands verrous</b> : la mort de <b>Rykard</b>, la mort de <b>Mohg</b>, la <b>Forge des Géants</b> et la mort de <b>Maliketh</b> (voir les points de non-retour, section Quêtes).</li>
          </Numeros>
        </Partie>
      </Page>

      <Page page={bases}>
        <p>Première fois dans un jeu FromSoftware ? Ces quelques pages t’évitent la plupart des galères du début. Si tu connais déjà les Souls, passe directement à la section <a href="#guides/elden-ring/classes">Classes</a>.</p>

        <Partie titre="La boucle du jeu">
          <p>Elden Ring tourne toujours autour du même cycle. Quand un boss te bloque, la réponse est presque toujours dans les étapes 1 à 4.</p>
          <Boucle />
        </Partie>

        <Partie titre="Tes 3 jauges">
          <p>En haut à gauche de l’écran, trois barres résument ton état :</p>
          <Jauges />
          <Puces>
            <li>Ta <b>fiole de larmes écarlates</b> (Flask of Crimson Tears) rend des PV, ta <b>fiole de larmes azurées</b> (Cerulean Tears) rend des PC. Au site de grâce, tu choisis comment répartir tes charges entre les deux.</li>
            <li>Les fioles se <b>rechargent</b> à chaque repos à un site de grâce.</li>
            <li><b>Golden Seeds</b> = plus de charges. <b>Sacred Tears</b> (dans les églises) = chaque gorgée soigne plus. Ce sont tes priorités au début.</li>
          </Puces>
        </Partie>

        <Partie titre="Mourir n’est pas grave (si tu sais ça)">
          <Mort />
          <Puces>
            <li><b>Dépense tes runes</b> (montée de niveau, achats) avant d’entrer dans la brume d’un boss.</li>
            <li>Un <b>Sacrificial Twig</b> équipé t’évite de perdre tes runes une fois (il se brise à la mort).</li>
            <li>Près de beaucoup de boss, un <b>pieu de Marika</b> (Stake of Marika) te fait réapparaître juste devant la brume.</li>
          </Puces>
        </Partie>

        <Partie titre="Les 8 statistiques">
          <p>Tu montes de niveau à n’importe quel <b>site de grâce</b> (après avoir rencontré Melina) en dépensant des <b>runes</b>. Chaque niveau = +1 dans une stat.</p>
          <Stats />
          <p><b>Repères de Vigueur</b> (la stat qui fait le plus de différence pour un débutant) :</p>
          <Tableau
            legende="Vigueur conseillée selon le moment du jeu"
            colonnes={[{ titre: 'Moment du jeu', largeur: '49%' }, { titre: 'Vigueur conseillée' }]}
            lignes={[
              ['Margit et Godrick', '20–25'],
              ['Liurnia et Radahn', '30–35'],
              ['Leyndell', '40'],
              ['Fin du jeu', '50–60'],
            ]}
          />
          <Encadre>Chaque arme affiche des <b>lettres</b> (S, A, B, C, D, E) à côté de Force, Dextérité, etc. : plus la lettre est haute, plus l’arme profite de cette stat. Monte en priorité les stats où ton arme a les meilleures lettres.</Encadre>
        </Partie>

        <Partie titre="Améliorer son arme : le plus important">
          <p>Améliorer ton arme augmente tes dégâts bien plus vite que monter de niveau. Le forgeron <b>Hewg</b>, à la Table ronde, s’en occupe.</p>
          <div className="er-forges">
            <Forge
              titre="Pierres de forge (Smithing Stones)"
              niveaux={['+3', '+6', '+9', '+12', '+15', '+18', '+21', '+24']}
              derniere="+25"
              legende="Armes normales. Chaque pierre [1] à [8] couvre 3 niveaux ; la dernière (Ancient Dragon) donne +25."
            />
            <Forge
              titre="Pierres sombres (Somber Smithing Stones)"
              niveaux={['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9']}
              derniere="+10"
              legende="Armes uniques (de boss, légendaires). Une pierre [1] à [9] par niveau ; la Somber Ancient donne +10."
            />
          </div>
          <Puces>
            <li>Les <b>Bell Bearings</b> de mineur que tu trouves se donnent aux <b>Twin Maiden Husks</b> (Table ronde) : tu peux ensuite acheter des pierres à l’infini.</li>
            <li>Ne garde pas 10 armes à moitié améliorées : choisis-en une et mets tout dessus.</li>
          </Puces>
        </Partie>

        <Partie titre="Tu n’es jamais seul : les invocations">
          <Puces>
            <li><b>Cendres spirituelles</b> (Spirit Ashes) : quand une petite icône apparaît en bas à gauche (près des boss et dans certaines zones), utilise la <b>clochette d’invocation</b> pour appeler un allié. Les premières : les loups (Renna), la méduse (Roderika). Roderika les améliore une fois devenue Accordeuse d’esprits.</li>
            <li><b>Signes dorés de PNJ</b> devant certaines brumes de boss (Rogier contre Margit, Nepheli contre Godrick, Blaidd et Alexander contre Radahn…).</li>
            <li><b>Joueurs en ligne</b> : le <b>Remède des Doigts Crochus</b> (Furlcalling Finger Remedy) fait apparaître les signes d’autres joueurs prêts à t’aider.</li>
            <li><b>Torrent</b>, ton cheval : il double-saute, et les <b>sources spirituelles</b> (spiritsprings) le propulsent en hauteur. Il ne vient pas dans les donjons et la plupart des intérieurs.</li>
          </Puces>
        </Partie>

        <Partie titre="Les types de lieux">
          <Tableau
            legende="Les types de lieux du jeu"
            colonnes={[{ titre: 'Lieu', largeur: '36%' }, { titre: 'Ce que c’est' }]}
            lignes={[
              ['Site de grâce', 'Ton point de sauvegarde : repos, niveaux, voyage rapide'],
              ['Donjon principal (legacy dungeon)', 'Grand lieu scénarisé : château, académie, capitale…'],
              ['Catacombes, grottes, tunnels', 'Mini-donjons avec un boss et une récompense au bout'],
              ['Évergeôle (evergaol)', 'Prison magique : un duel contre un boss, sans aide'],
              ['Statue de diablotin', <>Sceau qui s’ouvre avec une <b>Clé-lame de pierre</b> (Stonesword Key)</>],
              ['Église', <>Souvent une <b>Sacred Tear</b> ou un PNJ</>],
              ['Stèle de carte', 'Révèle le fragment de carte de la région'],
            ]}
          />
        </Partie>

        <Partie titre="Glossaire express">
          <Tableau
            legende="Les mots du jeu"
            colonnes={[{ titre: 'Terme', largeur: '27%' }, { titre: 'Ce que ça veut dire' }]}
            lignes={[
              ['Sans-éclat (Tarnished)', 'Toi, le héros'],
              ['Entre-terre (Lands Between)', 'Le monde du jeu'],
              ['Runes', 'L’argent et l’expérience du jeu'],
              ['Rune majeure (Great Rune)', 'Ce que lâchent les grands boss (demi-dieux). 2 sont nécessaires pour entrer dans Leyndell'],
              ['Remembrance', <>Objet lâché par un grand boss : échange-le chez <b>Enia</b> (Table ronde) contre une arme ou un sort unique</>],
              ['Cendre de guerre (Ash of War)', 'Compétence que tu greffes sur une arme (il faut le Whetstone Knife)'],
              ['Pierre de forge (Smithing Stone)', 'Sert à améliorer les armes'],
              ['Table ronde (Roundtable Hold)', 'Ta base : forgeron, marchands, PNJ de quêtes'],
              ['Arbre-Monde (Erdtree)', 'Le grand arbre doré visible de partout'],
            ]}
          />
        </Partie>

        <Partie titre="Quand tu bloques sur un boss">
          <Numeros>
            <li><b>Invoque</b> tes Cendres spirituelles et les PNJ disponibles.</li>
            <li><b>Améliore ton arme</b> d’un ou deux niveaux.</li>
            <li><b>Va explorer ailleurs</b> et reviens 5 à 10 niveaux plus tard : c’est prévu par le jeu.</li>
            <li><b>Change d’approche</b> : bouclier, arc, magie, attaques sautées.</li>
            <li><b>Appelle de l’aide en ligne</b> (Remède des Doigts Crochus).</li>
          </Numeros>
        </Partie>
      </Page>
    </>
  )
}
