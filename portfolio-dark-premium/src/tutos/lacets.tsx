import type { ReactNode } from 'react'
import type { Tuto } from './types'

// Dessins : une chaussure vue de dessus, un lacet bleu (trou de gauche) et un lacet orange (trou de droite).
const BLEU = '#6fa0f0'
const ORANGE = '#ffb36b'
const L = { stroke: BLEU, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
const O = { ...L, stroke: ORANGE }

function Scene({ children, titre }: { children: ReactNode; titre: string }) {
  return (
    <svg viewBox="0 0 300 232" role="img" aria-label={titre}>
      <defs>
        <marker id="lacet-fleche" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#e8eef8" />
        </marker>
      </defs>
      {/* Chaussure et laçage du bas */}
      <path d="M78 232 L78 180 Q78 152 106 152 L194 152 Q222 152 222 180 L222 232 Z" fill="#232a33" stroke="#3a4452" strokeWidth="3" />
      <path d="M100 152 Q150 166 200 152" fill="none" stroke="#3a4452" strokeWidth="2" />
      <path d="M125 216 L175 196 L125 174" {...L} strokeWidth={6} />
      <path d="M175 216 L125 196 L175 174" {...O} strokeWidth={6} />
      {[[125, 216], [175, 216], [125, 196], [175, 196]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#0b0e12" stroke="#4a5260" strokeWidth="2" />)}
      {children}
    </svg>
  )
}

const Fleche = ({ d }: { d: string }) => <path d={d} fill="none" stroke="#e8eef8" strokeWidth="2.5" strokeDasharray="5 4" markerEnd="url(#lacet-fleche)" opacity=".85" />
const Embout = ({ x, y, c }: { x: number; y: number; c: string }) => <circle cx={x} cy={y} r="5.5" fill={c} stroke="#0b0e12" strokeWidth="2" />
const Noeud = () => (
  <>
    <ellipse cx="150" cy="140" rx="10" ry="6" transform="rotate(-18 150 140)" fill="none" stroke={ORANGE} strokeWidth="6" />
    <path d="M141 146 Q150 131 159 135" {...L} strokeWidth={6} />
  </>
)
const Etoile = ({ x, y, r = 7 }: { x: number; y: number; r?: number }) => (
  <path d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`} fill="#ffd36b" />
)

const etapes: Tuto['etapes'] = [
  {
    titre: 'Croise les lacets',
    texte: <p>Prends un lacet dans chaque main et croise-les pour former un grand <strong>X</strong> au-dessus de la chaussure.</p>,
    astuce: 'Avec deux lacets de couleurs différentes, c’est beaucoup plus facile de voir lequel passe où.',
    visuel: (
      <Scene titre="Les deux lacets se croisent en X">
        <path d="M125 174 C132 150 160 118 205 92" {...L} />
        <path d="M175 174 C168 150 140 118 95 92" {...O} />
        <Embout x={205} y={92} c={BLEU} /><Embout x={95} y={92} c={ORANGE} />
        <circle cx="150" cy="128" r="17" fill="none" stroke="#ffd36b" strokeWidth="2" strokeDasharray="4 4" />
      </Scene>
    ),
  },
  {
    titre: 'Passe dessous et serre',
    texte: <p>Glisse le lacet du dessus <strong>sous l’autre</strong>, dans le trou du X. Puis tire fort sur les deux bouts, vers les côtés : c’est le premier nœud.</p>,
    visuel: (
      <Scene titre="Premier nœud, on tire sur les deux bouts">
        <path d="M125 174 Q138 154 148 144" {...L} />
        <path d="M175 174 Q162 154 152 144" {...O} />
        <path d="M144 138 C122 126 98 130 72 122" {...L} />
        <path d="M156 138 C178 126 202 130 228 122" {...O} />
        <Noeud />
        <Embout x={72} y={122} c={BLEU} /><Embout x={228} y={122} c={ORANGE} />
        <Fleche d="M62 116 L40 108" /><Fleche d="M238 116 L260 108" />
      </Scene>
    ),
  },
  {
    titre: 'Fais une première oreille',
    texte: <p>Plie le lacet bleu pour faire une <strong>boucle</strong>, comme une oreille de lapin. Pince-la entre ton pouce et ton index pour qu’elle ne bouge pas.</p>,
    astuce: 'Fais une boucle à peu près de la taille de ton pouce : trop grande, elle traînerait par terre.',
    visuel: (
      <Scene titre="Le lacet bleu forme une boucle">
        <path d="M125 174 Q138 154 148 144" {...L} />
        <path d="M175 174 Q162 154 152 144" {...O} />
        <path d="M148 140 C128 124 92 118 88 96 C84 74 118 78 132 100 C140 114 146 128 149 138" {...L} />
        <path d="M144 146 C128 160 112 170 96 184" {...L} />
        <path d="M156 138 C178 126 202 130 228 122" {...O} />
        <Noeud />
        <Embout x={96} y={184} c={BLEU} /><Embout x={228} y={122} c={ORANGE} />
      </Scene>
    ),
  },
  {
    titre: 'Fais la deuxième oreille',
    texte: <p>Fais pareil avec le lacet orange : tu tiens maintenant <strong>deux oreilles de lapin</strong>, une dans chaque main.</p>,
    visuel: (
      <Scene titre="Deux boucles, une bleue et une orange">
        <path d="M125 174 Q138 154 148 144" {...L} />
        <path d="M175 174 Q162 154 152 144" {...O} />
        <path d="M148 140 C128 124 92 118 88 96 C84 74 118 78 132 100 C140 114 146 128 149 138" {...L} />
        <path d="M152 140 C172 124 208 118 212 96 C216 74 182 78 168 100 C160 114 154 128 151 138" {...O} />
        <path d="M144 146 C128 160 112 170 96 184" {...L} />
        <path d="M156 146 C172 160 188 170 204 184" {...O} />
        <Noeud />
        <Embout x={96} y={184} c={BLEU} /><Embout x={204} y={184} c={ORANGE} />
      </Scene>
    ),
  },
  {
    titre: 'Croise les oreilles',
    texte: <p>Croise les deux oreilles pour former un <strong>X</strong>, exactement comme au tout début avec les lacets.</p>,
    visuel: (
      <Scene titre="Les deux boucles se croisent en X">
        <path d="M125 174 Q138 154 148 144" {...L} />
        <path d="M175 174 Q162 154 152 144" {...O} />
        <path d="M144 146 C128 160 112 170 96 184" {...L} />
        <path d="M156 146 C172 160 188 170 204 184" {...O} />
        <path d="M150 142 C160 118 178 82 200 78 C222 74 214 104 196 118 C182 128 162 136 150 142" {...L} />
        <path d="M150 142 C140 118 122 82 100 78 C78 74 86 104 104 118 C118 128 138 136 150 142" {...O} />
        <Noeud />
        <circle cx="150" cy="118" r="16" fill="none" stroke="#ffd36b" strokeWidth="2" strokeDasharray="4 4" />
        <Embout x={96} y={184} c={BLEU} /><Embout x={204} y={184} c={ORANGE} />
      </Scene>
    ),
  },
  {
    titre: 'Passe dessous et tire',
    texte: <p>Passe l’oreille du dessus <strong>sous l’autre</strong>, dans le trou du X, puis tire sur les deux oreilles en même temps, vers les côtés. Ton nœud est fait !</p>,
    astuce: 'Pour défaire ton lacet, il suffit de tirer sur un des deux bouts.',
    visuel: (
      <Scene titre="Le nœud terminé avec deux boucles">
        <path d="M125 174 Q138 154 148 144" {...L} />
        <path d="M175 174 Q162 154 152 144" {...O} />
        <path d="M150 140 C120 112 66 110 64 136 C62 162 118 158 150 140" {...L} />
        <path d="M150 140 C180 112 234 110 236 136 C238 162 182 158 150 140" {...O} />
        <path d="M146 146 C136 168 128 186 118 206" {...L} />
        <path d="M154 146 C164 168 172 186 182 206" {...O} />
        <ellipse cx="150" cy="141" rx="11" ry="9" fill={BLEU} stroke={ORANGE} strokeWidth="4" />
        <Embout x={118} y={206} c={BLEU} /><Embout x={182} y={206} c={ORANGE} />
        <Fleche d="M54 136 L30 136" /><Fleche d="M246 136 L270 136" />
        <Etoile x={98} y={76} /><Etoile x={208} y={72} r={9} /><Etoile x={250} y={182} r={6} />
      </Scene>
    ),
  },
]

export const lacets: Partial<Tuto> = {
  intro: <p>La méthode des <strong>oreilles de lapin</strong> est la plus simple pour apprendre : on fait un premier nœud, deux boucles, et on les noue ensemble. Les dessins montrent la chaussure vue du dessus.</p>,
  materiel: ['Une chaussure à lacets (plus facile en la gardant au pied ou posée devant toi)', 'Des lacets pas trop courts', 'Un peu de patience : ça vient en s’entraînant'],
  etapes,
  conclusion: <p>Entraîne-toi plusieurs fois par jour : au bout de quelques jours, tes mains le feront toutes seules. Pour un nœud qui ne se défait pas en courant, refais un nœud avec les deux oreilles : c’est le <strong>double nœud</strong>.</p>,
}
