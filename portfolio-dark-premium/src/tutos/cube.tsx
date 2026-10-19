import type { ReactNode } from 'react'
import type { Tuto } from './types'

// Couleurs d'un cube standard : blanc en face du jaune, rouge en face de l'orange, vert en face du bleu.
// Lettres : w blanc, y jaune, r rouge, o orange, g vert, b bleu, x gris (peu importe).
const C: Record<string, string> = { w: '#f4f6fa', y: '#ffd84a', r: '#ff5a5a', o: '#ff9a3c', g: '#42c66a', b: '#4d8cff', x: '#39414d' }
type P = [number, number]
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// Les 9 autocollants d'une face, à partir de ses 4 coins (haut-gauche, haut-droite, bas-droite, bas-gauche).
function Face({ coins, couleurs, accent }: { coins: [P, P, P, P]; couleurs: string; accent?: number[] }) {
  const [A, B, Cc, D] = coins
  const pt = (u: number, v: number) => lerp(lerp(A, B, u), lerp(D, Cc, u), v)
  return (
    <>
      <polygon points={coins.map(p => p.join(',')).join(' ')} fill="#14171c" stroke="#14171c" strokeWidth="4" strokeLinejoin="round" />
      {couleurs.split('').map((k, n) => {
        const i = Math.floor(n / 3)
        const j = n % 3
        const m = 0.1
        const poly = [pt((j + m) / 3, (i + m) / 3), pt((j + 1 - m) / 3, (i + m) / 3), pt((j + 1 - m) / 3, (i + 1 - m) / 3), pt((j + m) / 3, (i + 1 - m) / 3)]
        return <polygon key={n} points={poly.map(p => p.join(',')).join(' ')} fill={C[k]} stroke={accent?.includes(n) ? '#fff' : 'none'} strokeWidth={accent?.includes(n) ? 2.5 : 0} strokeLinejoin="round" />
      })}
    </>
  )
}

// Cube en perspective : dessus (u), avant (f), droite (r). Ligne 0 du dessus = rangée du fond.
function Iso({ u, f, r, cx = 150, cy = 118, s = 74, accent }: { u: string; f: string; r: string; cx?: number; cy?: number; s?: number; accent?: { u?: number[]; f?: number[]; r?: number[] } }) {
  const k = s * Math.cos(Math.PI / 6)
  const T0: P = [cx, cy - s], T1: P = [cx + k, cy - s / 2], T2: P = [cx, cy], T3: P = [cx - k, cy - s / 2]
  const B1: P = [cx + k, cy + s / 2], B2: P = [cx, cy + s], B3: P = [cx - k, cy + s / 2]
  return (
    <g>
      <Face coins={[T0, T1, T2, T3]} couleurs={u} accent={accent?.u} />
      <Face coins={[T3, T2, B2, B3]} couleurs={f} accent={accent?.f} />
      <Face coins={[T2, T1, B1, B2]} couleurs={r} accent={accent?.r} />
    </g>
  )
}

// Une face à plat, avec la rangée voisine de chaque côté (h = haut, d = droite, b = bas, g = gauche).
function Plat({ c, h, d, b, g, x = 0, y = 0, t = 26, coche }: { c: string; h?: string; d?: string; b?: string; g?: string; x?: number; y?: number; t?: number; coche?: number }) {
  const o = t * 0.62
  const carre = (px: number, py: number, w: number, hh: number, k: string, key: string) => <rect key={key} x={px + 2} y={py + 2} width={w - 4} height={hh - 4} rx="4" fill={C[k]} />
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={o - 3} y={o - 3} width={3 * t + 6} height={3 * t + 6} rx="7" fill="#14171c" />
      {c.split('').map((k, n) => carre(o + (n % 3) * t, o + Math.floor(n / 3) * t, t, t, k, `c${n}`))}
      {h?.split('').map((k, n) => carre(o + n * t, 0, t, o - 4, k, `h${n}`))}
      {b?.split('').map((k, n) => carre(o + n * t, o + 3 * t + 4, t, o - 4, k, `b${n}`))}
      {g?.split('').map((k, n) => carre(0, o + n * t, o - 4, t, k, `g${n}`))}
      {d?.split('').map((k, n) => carre(o + 3 * t + 4, o + n * t, o - 4, t, k, `d${n}`))}
      {coche !== undefined && <path d={`M${o + (coche % 3) * t + t * 0.28} ${o + Math.floor(coche / 3) * t + t * 0.52} l${t * 0.16} ${t * 0.16} l${t * 0.3} -${t * 0.32}`} fill="none" stroke="#14171c" strokeWidth="3" strokeLinecap="round" />}
    </g>
  )
}

// Pointes de flèche de couleur fixe (la couleur « context-stroke » n'est pas gérée partout).
const POINTES: Record<string, string> = { '#e8eef8': 'cube-fleche', '#ffd36b': 'cube-fleche-jaune', '#14171c': 'cube-fleche-sombre', '#fff': 'cube-fleche-blanche' }
const Fleche = ({ d, couleur = '#e8eef8' }: { d: string; couleur?: string }) => <path d={d} fill="none" stroke={couleur} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${POINTES[couleur]})`} />
// Flèche posée sur le cube : trait blanc bordé de sombre pour rester lisible sur toutes les couleurs.
const FlecheCube = ({ d }: { d: string }) => (
  <>
    <path d={d} fill="none" stroke="#14171c" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#cube-fleche-blanche)" />
  </>
)
function Dessin({ children, titre, h = 240 }: { children: ReactNode; titre: string; h?: number }) {
  return (
    <svg viewBox={`0 0 300 ${h}`} role="img" aria-label={titre}>
      <defs>
        {Object.entries(POINTES).map(([couleur, id]) => (
          <marker key={id} id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={couleur} />
          </marker>
        ))}
      </defs>
      {children}
    </svg>
  )
}
const Texte = ({ x, y, children, taille = 15 }: { x: number; y: number; children: ReactNode; taille?: number }) => <text x={x} y={y} textAnchor="middle" fontFamily="DM Mono, monospace" fontWeight="600" fontSize={taille} fill="#e8eef8">{children}</text>

// Une formule, mouvement par mouvement.
const Formule = ({ f }: { f: string }) => <span className="tuto-formule">{f.split(' ').map((m, k) => <kbd key={k}>{m}</kbd>)}</span>

const etapes: Tuto['etapes'] = [
  {
    titre: 'Apprends le langage du cube',
    texte: (
      <>
        <p>Tiens le cube devant toi. Chaque lettre désigne une face : <kbd>F</kbd> avant, <kbd>R</kbd> droite, <kbd>L</kbd> gauche, <kbd>U</kbd> haut, <kbd>D</kbd> bas.</p>
        <ul>
          <li>Une lettre seule : un quart de tour dans le sens des aiguilles d’une montre, en regardant cette face. <kbd>R</kbd> fait <strong>monter</strong> la colonne de droite, <kbd>U</kbd> envoie la rangée du haut <strong>vers la gauche</strong>.</li>
          <li>Avec une apostrophe, dans l’autre sens : <kbd>R'</kbd> fait descendre la colonne de droite, <kbd>U'</kbd> envoie le haut vers la droite.</li>
          <li>Avec un 2, un demi-tour : <kbd>F2</kbd>.</li>
        </ul>
      </>
    ),
    astuce: 'Entraîne-toi : fais R puis R’, U puis U’. Tu dois retrouver ton cube comme avant.',
    visuel: (
      <Dessin titre="Les mouvements R et U">
        <Iso cx={78} cy={112} s={62} u="yyyyyyyyy" f="rrrrrrrrr" r="ggggggggg" accent={{ u: [2, 5, 8], f: [2, 5, 8] }} />
        <FlecheCube d="M69 168 L69 104" />
        <Texte x={78} y={224} taille={20}>R</Texte>
        <Iso cx={222} cy={112} s={62} u="yyyyyyyyy" f="rrrrrrrrr" r="ggggggggg" accent={{ f: [0, 1, 2], r: [0, 1, 2] }} />
        <FlecheCube d="M262 98 L224 120 L186 98" />
        <Texte x={222} y={224} taille={20}>U</Texte>
      </Dessin>
    ),
  },
  {
    titre: 'Fais la marguerite',
    texte: <p>Tiens le cube avec le <strong>centre jaune en haut</strong>. Amène les 4 arêtes blanches autour de lui, blanc vers le haut : on dirait une fleur, c’est la marguerite. Ici, pas de formule : tourne les faces pour faire monter chaque arête blanche, sans déloger celles déjà placées.</p>,
    astuce: 'Une arête blanche est sur un côté ? Tourne cette face jusqu’à ce qu’elle arrive en haut. Si la place est déjà prise, tourne d’abord le haut (U).',
    visuel: (
      <Dessin titre="La marguerite : quatre arêtes blanches autour du centre jaune">
        <Plat x={70} y={42} t={46} c="xwxwywxwx" />
        <Texte x={150} y={228} taille={12}>vue du dessus</Texte>
      </Dessin>
    ),
  },
  {
    titre: 'Forme la croix blanche',
    texte: (
      <>
        <p>Regarde une arête blanche de la marguerite : sa deuxième couleur est sur le côté. Tourne le haut (<kbd>U</kbd>) jusqu’à ce que cette couleur soit juste au-dessus du <strong>centre de la même couleur</strong>. Fais alors <kbd>F2</kbd> (en tenant cette face devant toi) : l’arête descend sur la face blanche.</p>
        <p>Fais pareil pour les 4 arêtes. Dessous, tu as maintenant une croix blanche dont chaque arête est alignée avec le centre de son côté. <strong>Garde le blanc en bas</strong> pour toute la suite.</p>
      </>
    ),
    visuel: (
      <Dessin titre="La croix blanche, vue du dessous, alignée avec les centres">
        <Plat x={53} y={12} t={44} c="xwxwwwxwx" h="xrx" d="xgx" b="xox" g="xbx" />
        <Texte x={150} y={232} taille={12}>vue du dessous</Texte>
      </Dessin>
    ),
  },
  {
    titre: 'Place les coins blancs',
    texte: (
      <>
        <p>Blanc en bas. Cherche, en haut, un coin qui a du blanc. Tourne le haut (<kbd>U</kbd>) pour le mettre <strong>juste au-dessus de sa place</strong> (entre les centres de ses deux autres couleurs), en avant à droite. Puis répète :</p>
        <Formule f="R U R' U'" />
        <p>jusqu’à ce qu’il soit à sa place, blanc en dessous (entre 1 et 5 fois). Recommence pour les 4 coins.</p>
      </>
    ),
    astuce: 'Un coin blanc est déjà en bas, mais mal placé ? Tiens-le en avant à droite et fais R U R’ U’ une fois : il remonte en haut, et tu peux le replacer.',
    visuel: (
      <Dessin titre="Un coin blanc au-dessus de sa place, en avant à droite">
        <Iso u="xxxxyxxxr" f="xxwxrxrrr" r="gxxxgxggg" accent={{ u: [8], f: [2], r: [0] }} />
        <Fleche d="M168 112 C 196 124 196 168 168 184" couleur="#ffd36b" />
      </Dessin>
    ),
  },
  {
    titre: 'Complète la deuxième couronne',
    texte: (
      <>
        <p>Cherche, en haut, une arête <strong>sans jaune</strong>. Tourne le haut pour que sa couleur de devant soit au-dessus du centre de la même couleur (ça dessine un T à l’envers). Regarde la couleur de son dessus :</p>
        <ul>
          <li>Elle est comme le centre <strong>de droite</strong> : <Formule f="U R U' R' U' F' U F" /></li>
          <li>Elle est comme le centre <strong>de gauche</strong> : <Formule f="U' L' U L U F U' F'" /></li>
        </ul>
        <p>Fais-le pour les 4 arêtes du milieu.</p>
      </>
    ),
    astuce: 'Une arête est bloquée au milieu, mais à l’envers ou au mauvais endroit ? Fais une des deux formules pour la sortir vers le haut, puis replace-la.',
    visuel: (
      <Dessin titre="L’arête rouge et verte va descendre à droite">
        <Iso u="xxxxyxxgx" f="xrxrrxrrr" r="xxxxggggg" accent={{ u: [7], f: [1] }} />
        <Fleche d="M150 92 C 186 98 192 140 178 150" couleur="#ffd36b" />
      </Dessin>
    ),
  },
  {
    titre: 'Fais la croix jaune',
    texte: (
      <>
        <p>Regarde seulement le jaune sur le dessus (ignore les coins). Tu vois un <strong>point</strong>, un <strong>L</strong> ou une <strong>ligne</strong>. La formule est toujours :</p>
        <Formule f="F R U R' U' F'" />
        <ul>
          <li>Un point : fais la formule, tu obtiens un L.</li>
          <li>Un L : tiens-le en haut à gauche (vers le fond et la gauche), puis fais la formule.</li>
          <li>Une ligne : tiens-la à l’horizontale, puis fais la formule.</li>
        </ul>
      </>
    ),
    visuel: (
      <Dessin titre="Du point à la croix jaune, en passant par le L et la ligne" h={130}>
        <Plat x={-4} y={24} t={18} c="xxxxyxxxx" />
        <Fleche d="M66 62 L 76 62" />
        <Plat x={70} y={24} t={18} c="xyxyyxxxx" />
        <Fleche d="M140 62 L 150 62" />
        <Plat x={144} y={24} t={18} c="xxxyyyxxx" />
        <Fleche d="M214 62 L 224 62" />
        <Plat x={218} y={24} t={18} c="xyxyyyxyx" />
        <Texte x={34} y={118} taille={11}>point</Texte><Texte x={108} y={118} taille={11}>L</Texte><Texte x={182} y={118} taille={11}>ligne</Texte><Texte x={256} y={118} taille={11}>croix</Texte>
      </Dessin>
    ),
  },
  {
    titre: 'Place les arêtes jaunes',
    texte: (
      <>
        <p>Tourne le haut (<kbd>U</kbd>) jusqu’à ce qu’au moins deux arêtes aient leur couleur de côté alignée avec le centre en dessous.</p>
        <ul>
          <li>Si ces deux arêtes sont <strong>voisines</strong>, tiens-les à l’arrière et à droite, puis fais : <Formule f="R U R' U R U2 R' U" /></li>
          <li>Si elles sont <strong>face à face</strong>, fais la formule une fois, puis recommence cette étape.</li>
        </ul>
      </>
    ),
    visuel: (
      <Dessin titre="La croix jaune, chaque arête alignée avec son centre">
        <Iso u="xyxyyyxyx" f="xrxrrrrrr" r="xgxgggggg" />
      </Dessin>
    ),
  },
  {
    titre: 'Place les coins jaunes',
    texte: (
      <>
        <p>Cherche un coin qui est <strong>déjà à sa place</strong> : ses trois couleurs sont celles des trois centres autour, même s’il est tourné. Tiens-le en avant à droite, puis répète :</p>
        <Formule f="U R U' L' U R' U' L" />
        <p>jusqu’à ce que les 4 coins soient à leur place. Elle fait tourner les trois autres coins, sans bouger celui en avant à droite.</p>
      </>
    ),
    astuce: 'Aucun coin n’est à sa place ? Fais la formule une fois depuis n’importe quelle position : un coin le sera ensuite.',
    visuel: (
      <Dessin titre="Les trois autres coins tournent, le coin avant droit ne bouge pas">
        <Plat x={70} y={42} t={46} c="xyxyyyxyx" coche={8} />
        <Fleche d="M136 170 L 198 108" couleur="#ffd36b" />
        <Fleche d="M200 82 C 182 60 154 60 136 80" couleur="#ffd36b" />
        <Fleche d="M108 106 C 90 128 90 150 108 170" couleur="#ffd36b" />
        <Texte x={150} y={232} taille={12}>vue du dessus</Texte>
      </Dessin>
    ),
  },
  {
    titre: 'Tourne les derniers coins',
    texte: (
      <>
        <p>Jaune en haut. Le coin à tourner est en avant à droite. Répète :</p>
        <Formule f="R' D' R D" />
        <p>jusqu’à ce que son jaune soit sur le dessus (2 ou 4 fois). <strong>Le bas du cube a l’air cassé : c’est normal, ne t’arrête pas !</strong> Tourne ensuite seulement le haut (<kbd>U</kbd>) pour amener le coin suivant en avant à droite, et recommence. À la fin, tourne le haut pour tout aligner.</p>
      </>
    ),
    astuce: 'Ne tourne jamais le cube entier pendant cette étape : seulement la face du haut entre deux coins.',
    visuel: (
      <Dessin titre="Le cube résolu">
        <Iso u="yyyyyyyyy" f="rrrrrrrrr" r="ggggggggg" />
        {[[52, 50, 9], [250, 58, 11], [262, 190, 7], [40, 186, 6]].map(([x, y, r]) => (
          <path key={x} d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`} fill="#ffd36b" />
        ))}
      </Dessin>
    ),
  },
]

export const cube: Partial<Tuto> = {
  intro: (
    <>
      <p>Le cube 3×3 (le célèbre Rubik’s Cube) a 6 couleurs. Les <strong>centres</strong> ne bougent jamais les uns par rapport aux autres : ce sont eux qui donnent la couleur de chaque face.</p>
      <p>Cette méthode résout le cube <strong>couche par couche</strong> : d’abord le blanc, puis le milieu, puis le jaune. Il n’y a que quelques formules à retenir.</p>
    </>
  ),
  materiel: ['Un cube 3×3, de n’importe quelle marque', 'Environ une heure pour la première fois', 'Un papier pour noter les formules (au début)'],
  etapes,
  conclusion: <p>Ton cube est résolu ! Mélange-le et recommence : avec de l’entraînement, tu passeras sous les 2 minutes. Ensuite, tu pourras apprendre des méthodes plus rapides, comme la méthode CFOP utilisée en compétition.</p>,
}
