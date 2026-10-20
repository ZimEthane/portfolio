// Petites illustrations des cartes de la page de garde des jeux (160 × 100), dessinées pour chaque jeu.
import type { ReactNode } from 'react'

const Svg = ({ fond, children }: { fond: string; children: ReactNode }) => (
  <svg viewBox="0 0 160 100" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="160" height="100" fill={fond} />
    {children}
  </svg>
)

function Demineur() {
  const nb: Record<string, [string, string]> = { '1': ['1', '#8bb9fa'], '2': ['2', '#7bd6aa'], '3': ['3', '#ff8585'] }
  const grille = ['..1F1.', '.12x2.', '.1F31.', '..111.']
  return (
    <Svg fond="#10141a">
      {grille.map((l, y) =>
        l.split('').map((c, x) => {
          const px = 26 + x * 18
          const py = 14 + y * 18
          const ouvert = c !== 'F' && c !== 'x'
          return (
            <g key={`${x}-${y}`}>
              <rect x={px} y={py} width="16" height="16" rx="3" fill={ouvert ? '#1a2029' : '#2a3442'} />
              {nb[c] && <text x={px + 8} y={py + 12} textAnchor="middle" fontSize="11" fontWeight="800" fill={nb[c][1]}>{nb[c][0]}</text>}
              {c === 'F' && <path d={`M${px + 6} ${py + 13}V${py + 3}l7 3-7 3`} fill="#ff6b6b" stroke="#ff6b6b" strokeWidth="1.4" strokeLinejoin="round" />}
              {c === 'x' && <circle cx={px + 8} cy={py + 8} r="4" fill="#0b0e12" stroke="#cfd8ea" strokeWidth="1.2" />}
            </g>
          )
        }),
      )}
    </Svg>
  )
}

function Jeu2048() {
  const t = [
    { v: '2', x: 30, y: 16, f: '#1b2431', c: '#a9bdd6' },
    { v: '8', x: 82, y: 16, f: '#1f4166', c: '#dbe9ff' },
    { v: '64', x: 30, y: 54, f: '#3b7fd6', c: '#fff' },
    { v: '2048', x: 82, y: 54, f: '#ffd36b', c: '#2a1c00' },
  ]
  return (
    <Svg fond="#0f1319">
      {t.map(k => (
        <g key={k.v}>
          <rect x={k.x} y={k.y} width="48" height="32" rx="7" fill={k.f} />
          <text x={k.x + 24} y={k.y + 21} textAnchor="middle" fontSize={k.v.length > 3 ? 12 : 15} fontWeight="800" fill={k.c}>{k.v}</text>
        </g>
      ))}
    </Svg>
  )
}

function Sudoku() {
  const c = '5.3....9.'
  return (
    <Svg fond="#10141a">
      <rect x="47" y="8" width="84" height="84" rx="6" fill="#151b23" stroke="#3a4656" strokeWidth="1.5" />
      {[1, 2].map(k => <line key={`v${k}`} x1={47 + k * 28} y1="8" x2={47 + k * 28} y2="92" stroke="#2a3442" />)}
      {[1, 2].map(k => <line key={`h${k}`} x1="47" y1={8 + k * 28} x2="131" y2={8 + k * 28} stroke="#2a3442" />)}
      <rect x="76" y="37" width="26" height="26" rx="3" fill="#8bb9fa30" />
      {c.split('').map((d, i) => d !== '.' && <text key={i} x={61 + (i % 3) * 28} y={27 + Math.floor(i / 3) * 28} textAnchor="middle" fontSize="15" fontWeight="700" fill="#dce6f7">{d}</text>)}
      <text x="89" y="55" textAnchor="middle" fontSize="15" fontWeight="700" fill="#8bb9fa">4</text>
    </Svg>
  )
}

function Puissance4() {
  const p = ['.......', '.......', '...J...', '..RJ...', '.JRRJ..', 'RJRJR.J']
  return (
    <Svg fond="#0f1319">
      <rect x="34" y="8" width="92" height="82" rx="8" fill="#1e4f9c" />
      {p.map((l, y) => l.split('').map((c, x) => <circle key={`${x}-${y}`} cx={45 + x * 11.7} cy={18 + y * 12.6} r="4.6" fill={c === 'R' ? '#ff6b6b' : c === 'J' ? '#ffd36b' : '#0f1319'} />))}
    </Svg>
  )
}

function Memory() {
  return (
    <Svg fond="#10141a">
      {[0, 1, 2].map(k => {
        const x = 26 + k * 38
        const ouverte = k === 1
        return (
          <g key={k} transform={`rotate(${(k - 1) * 6} ${x + 16} 52)`}>
            <rect x={x} y="24" width="32" height="44" rx="6" fill={ouverte ? '#e8eef8' : '#2b4f86'} stroke={ouverte ? '#fff' : '#8bb9fa'} strokeWidth="1.2" />
            {ouverte ? <text x={x + 16} y="51" textAnchor="middle" fontSize="12" fontWeight="800" fill="#2b4f86">{'</>'}</text> : <path d={`M${x + 8} ${46}h16M${x + 16} ${38}v16`} stroke="#8bb9fa70" strokeWidth="2" />}
          </g>
        )
      })}
      <rect x="128" y="34" width="24" height="34" rx="5" fill="#2b4f86" opacity=".5" />
    </Svg>
  )
}

function Snake() {
  return (
    <Svg fond="#0b0e12">
      {Array.from({ length: 8 }, (_, y) => Array.from({ length: 13 }, (_, x) => <rect key={`${x}-${y}`} x={8 + x * 12} y={8 + y * 12} width="1.6" height="1.6" fill="#ffffff18" />))}
      <path d="M26 74H62V44H98V32" fill="none" stroke="#2f62a8" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 44H98V32" fill="none" stroke="#5d92d6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="92" y="22" width="12" height="12" rx="4" fill="#8bb9fa" />
      <circle cx="95.5" cy="26" r="1.3" fill="#07111d" /><circle cx="100.5" cy="26" r="1.3" fill="#07111d" />
      <circle cx="130" cy="30" r="5" fill="#ff6b6b" /><ellipse cx="132" cy="24" rx="2.4" ry="1.2" fill="#6fd59a" />
    </Svg>
  )
}

function Blocs() {
  const c = 10
  const cell = (x: number, y: number, f: string) => <rect key={`${x}-${y}-${f}`} x={50 + x * c} y={6 + y * c} width={c - 1} height={c - 1} rx="2" fill={f} />
  const bas = ['#8bb9fa', '#7bd6aa', '#ffd36b', '#ff8a8a', '#b79bff', '#5fd6d6']
  return (
    <Svg fond="#0d1117">
      <rect x="49" y="5" width="61" height="91" rx="3" fill="#121821" />
      {[[2, 1], [3, 1], [4, 1], [3, 2]].map(([x, y]) => cell(x, y, '#b79bff'))}
      {Array.from({ length: 3 }, (_, r) => Array.from({ length: 6 }, (_, x) => (r === 0 && x === 2) || (r === 1 && x === 4) ? null : cell(x, 6 + r, bas[(x + r) % 6])))}
    </Svg>
  )
}

function Ninja() {
  return (
    <Svg fond="#14243a">
      <path d="M0 70Q30 52 60 66T120 60T160 64V100H0Z" fill="#1f3b33" />
      <rect y="78" width="160" height="22" fill="#18221b" />
      <rect y="77" width="160" height="2" fill="#5fbf6a" />
      <g transform="translate(36 46)">
        <path d="M6 6Q-4 3-10 8M6 8Q-3 10-8 14" stroke="#ff4d4d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="4" y="12" width="16" height="14" rx="5" fill="#1c2740" />
        <circle cx="12" cy="8" r="7.5" fill="#1c2740" />
        <rect x="7" y="6" width="12" height="4" rx="2" fill="#f2d3b3" />
        <rect x="5" y="2" width="14" height="3" fill="#ff4d4d" />
        <rect x="12" y="7" width="1.6" height="2" fill="#0b0e12" /><rect x="15.5" y="7" width="1.6" height="2" fill="#0b0e12" />
        <rect x="6" y="25" width="4" height="7" fill="#1c2740" /><rect x="14" y="25" width="4" height="7" fill="#1c2740" />
      </g>
      <path d="M104 77V58l6-10 6 10v19z" fill="#8d95a6" />
      <path d="M135 31l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#cfd8ea" />
      <circle cx="135" cy="38" r="1.3" fill="#14243a" />
    </Svg>
  )
}

function Glissieres() {
  const p = (x: number, y: number, w: number, h: number, f: string) => <rect key={`${x}-${y}`} x={53 + x * 13.5} y={8 + y * 16.8} width={w * 13.5 - 2} height={h * 16.8 - 2} rx="3" fill={f} />
  return (
    <Svg fond="#0f1216">
      <rect x="50" y="5" width="60" height="90" rx="6" fill="#050607" />
      {p(0, 0, 1, 2, '#2f8fff')}{p(1, 0, 2, 2, '#ef3e33')}{p(3, 0, 1, 2, '#2f8fff')}
      {p(0, 2, 1, 2, '#2f8fff')}{p(1, 2, 2, 1, '#33c167')}{p(3, 2, 1, 2, '#2f8fff')}
      {p(1, 3, 1, 1, '#ffc22e')}{p(2, 3, 1, 1, '#ffc22e')}{p(0, 4, 1, 1, '#ffc22e')}{p(3, 4, 1, 1, '#ffc22e')}
      <path d="M76 96l4 3 4-3" stroke="#ff4d42" strokeWidth="1.5" fill="none" />
    </Svg>
  )
}

function PoseBlocs() {
  const c = 9
  const plein: Record<string, string> = { '0,7': '#5b6cf0', '1,7': '#5b6cf0', '2,7': '#7b6cf0', '0,6': '#5b6cf0', '5,7': '#9c7cf5', '6,7': '#9c7cf5', '7,7': '#9c7cf5', '7,6': '#9c7cf5', '3,5': '#7b6cf0', '3,6': '#7b6cf0', '4,6': '#7b6cf0' }
  return (
    <Svg fond="#2a1a2c">
      <rect x="10" y="10" width={8 * c + 4} height={8 * c + 4} rx="4" fill="#5a3a52" />
      {Array.from({ length: 64 }, (_, i) => {
        const x = i % 8
        const y = Math.floor(i / 8)
        const f = plein[`${x},${y}`]
        return <rect key={i} x={12 + x * c} y={12 + y * c} width={c - 1} height={c - 1} rx="1.5" fill={f ?? '#6e4a62'} />
      })}
      {[[0, 0], [1, 1], [2, 2]].map(([x, y]) => <rect key={`a${x}`} x={104 + x * 8} y={14 + y * 8} width="7" height="7" rx="1.5" fill="#ff5fa2" />)}
      {[[0, 0], [0, 1], [1, 1], [2, 1]].map(([x, y]) => <rect key={`b${x}${y}`} x={104 + x * 8} y={50 + y * 8} width="7" height="7" rx="1.5" fill="#ff5fa2" />)}
      {[0, 1, 2, 3].map(y => <rect key={`c${y}`} x={140} y={44 + y * 8} width="7" height="7" rx="1.5" fill="#ff5fa2" />)}
    </Svg>
  )
}

function Labyrinthe() {
  return (
    <Svg fond="#0a0614">
      <path d="M14 10H146V90H14ZM34 30H90M110 30V70M34 50H70V90M90 50V70H130" fill="none" stroke="#a24cff" strokeWidth="5" strokeLinejoin="round" />
      <path d="M44 40l3-6 3 6 3-6 3 6" fill="#ff4d6d" />
      <rect x="18" y="74" width="12" height="12" rx="2" fill="#4dffd2" />
      <rect x="21" y="78" width="2" height="2" fill="#0a0614" /><rect x="25" y="78" width="2" height="2" fill="#0a0614" />
      <path d="M40 80h22" stroke="#4dffd240" strokeWidth="3" strokeLinecap="round" />
      <rect x="132" y="14" width="11" height="11" rx="1" fill="#4dffb833" stroke="#4dffb8" strokeWidth="1.6" />
    </Svg>
  )
}

function Nonogramme() {
  const coeur = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']
  return (
    <Svg fond="#f2f5fb">
      <rect x="44" y="20" width="84" height="72" fill="#fff" stroke="#c8d2e2" />
      {coeur.map((l, y) => l.split('').map((c, x) => c === '#' ? <rect key={`${x}-${y}`} x={44 + x * 12} y={20 + y * 12} width="12" height="12" fill="#2a3d5c" /> : <path key={`${x}-${y}`} d={`M${48 + x * 12} ${24 + y * 12}l4 4m0-4-4 4`} stroke="#9fb0c8" strokeWidth="1" />))}
      {['2 2', '7', '7', '5', '3', '1'].map((t, y) => <text key={y} x="40" y={29 + y * 12} textAnchor="end" fontSize="8" fill="#5a6b85">{t}</text>)}
      {['2', '4', '5', '5', '5', '4', '2'].map((t, x) => <text key={x} x={50 + x * 12} y="16" textAnchor="middle" fontSize="8" fill="#5a6b85">{t}</text>)}
    </Svg>
  )
}

function Points() {
  const c = 16
  const xy = (x: number, y: number) => `${44 + x * c + c / 2} ${12 + y * c + c / 2}`
  const chemins: [string, string][] = [
    ['#3d7bff', `M${xy(0, 0)}V${12 + 2 * c + c / 2}H${44 + 2 * c + c / 2}`],
    ['#ffd84d', `M${xy(1, 0)}H${44 + 4 * c + c / 2}V${12 + 4 * c + c / 2}H${44 + 2 * c + c / 2}`],
    ['#4fd06a', `M${xy(0, 3)}V${12 + 4 * c + c / 2}H${44 + 1 * c + c / 2}V${12 + 3 * c + c / 2}H${44 + 3 * c + c / 2}`],
  ]
  return (
    <Svg fond="#24344c">
      <rect x="44" y="12" width={5 * c} height={5 * c} rx="4" fill="#1b2638" />
      {chemins.map(([f, d]) => <path key={f} d={d} fill="none" stroke={f} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />)}
      {([[0, 0, '#3d7bff'], [2, 2, '#3d7bff'], [1, 0, '#ffd84d'], [2, 4, '#ffd84d'], [0, 3, '#4fd06a'], [3, 3, '#4fd06a']] as [number, number, string][]).map(([x, y, f]) => <circle key={`${x}${y}`} cx={44 + x * c + c / 2} cy={12 + y * c + c / 2} r="6" fill={f} />)}
    </Svg>
  )
}

function Solitaire() {
  // Une carte : coin en haut à gauche, grand symbole au centre.
  const carte = (x: number, y: number, rang: string, sym: string, rouge: boolean) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="24" height="34" rx="3" fill="#fbfcfe" stroke="#00000030" strokeWidth=".6" />
      <text x={x + 3} y={y + 9} fontSize="8" fontWeight="800" fill={rouge ? '#d6343a' : '#1a2233'}>{rang}</text>
      <text x={x + 12} y={y + 25} textAnchor="middle" fontSize="13" fill={rouge ? '#d6343a' : '#1a2233'}>{sym}</text>
    </g>
  )
  const dos = (x: number, y: number) => <rect key={`d${x}-${y}`} x={x} y={y} width="24" height="34" rx="3" fill="#2f5fa8" stroke="#f2f5fa" strokeWidth="1.2" />
  return (
    <Svg fond="#17372a">
      {dos(14, 8)}
      {[0, 1, 2, 3].map(k => <rect key={k} x={70 + k * 20} y="8" width="17" height="24" rx="3" fill="none" stroke="#ffffff26" />)}
      {carte(70, 8, 'A', '♥', true)}
      {[0, 1].map(k => dos(14 + 28, 40 + k * 5))}
      {carte(42, 50, 'K', '♠', false)}
      {carte(42, 60, 'Q', '♥', true)}
      {[0, 1, 2].map(k => dos(98, 40 + k * 5))}
      {carte(98, 55, '9', '♣', false)}
      {carte(98, 65, '8', '♦', true)}
      {carte(126, 46, '5', '♠', false)}
      {carte(14, 52, '7', '♦', true)}
    </Svg>
  )
}

function Mahjong() {
  // Des tuiles empilées : bambous, ronds et caractères.
  const tuile = (x: number, y: number, motif: 'bambou' | 'rond' | 'car', sel = false) => (
    <g key={`${x}-${y}`}>
      <rect x={x + 2.5} y={y + 3} width="20" height="26" rx="3" fill="#9c8659" />
      <rect x={x} y={y} width="20" height="26" rx="3" fill={sel ? '#ffd96a' : '#fbf6e6'} stroke="#d6c79c" strokeWidth=".8" />
      {motif === 'bambou' && [-4, 0, 4].map(d => <rect key={d} x={x + 9 + d} y={y + 6} width="2.4" height="14" rx="1.2" fill="#1f9a5a" />)}
      {motif === 'rond' && <><circle cx={x + 10} cy={y + 13} r="6" fill="none" stroke="#2a6fd6" strokeWidth="1.8" /><circle cx={x + 10} cy={y + 13} r="2.4" fill="#d6343a" /></>}
      {motif === 'car' && <><rect x={x + 6} y={y + 6} width="8" height="2" fill="#1a2233" /><rect x={x + 9} y={y + 6} width="2" height="9" fill="#1a2233" /><rect x={x + 5} y={y + 17} width="10" height="3" rx="1" fill="#d6343a" /></>}
    </g>
  )
  const motifs = ['bambou', 'rond', 'car'] as const
  return (
    <Svg fond="#173530">
      {[0, 1, 2, 3, 4, 5].map(k => tuile(18 + k * 21, 52, motifs[k % 3]))}
      {[0, 1, 2, 3].map(k => tuile(39 + k * 21, 30, motifs[(k + 1) % 3], k === 1))}
      {[0, 1].map(k => tuile(60 + k * 21, 8, motifs[(k + 2) % 3], k === 0))}
    </Svg>
  )
}

function Glouton() {
  return (
    <Svg fond="#070a12">
      <path d="M10 10H150V90H10ZM30 30H70V50M90 30H130M110 30V70M30 70H90M50 50V70" fill="none" stroke="#2de0c4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".75" />
      {[44, 56, 68, 80, 92].map(x => <circle key={x} cx={x} cy="20" r="1.5" fill="#e8edf5" />)}
      {[30, 42, 54, 66, 78].map(y => <circle key={y} cx="20" cy={y + 2} r="1.5" fill="#e8edf5" />)}
      <circle cx="140" cy="20" r="3.5" fill="#ffd84d" />
      <circle cx="122" cy="80" r="1.5" fill="#e8edf5" /><circle cx="134" cy="80" r="1.5" fill="#e8edf5" />
      {/* Le glouton */}
      <circle cx="32" cy="20" r="8" fill="#a6e22e" />
      <circle cx="30" cy="17" r="2.2" fill="#fff" /><circle cx="36" cy="17" r="2.2" fill="#fff" />
      <circle cx="31" cy="17" r="1" fill="#10200a" /><circle cx="37" cy="17" r="1" fill="#10200a" />
      <ellipse cx="34" cy="23.5" rx="3" ry="1.8" fill="#2b4a0e" />
      {/* Un monstre */}
      <g fill="#ff4d6d" stroke="#ff4d6d" strokeWidth="1.2">
        <rect x="92" y="74" width="16" height="13" rx="6" />
        <path d="M96 75l-2-4M104 75l2-4" fill="none" />
        <circle cx="94" cy="70.5" r="1.3" /><circle cx="106" cy="70.5" r="1.3" />
      </g>
      <circle cx="97" cy="79" r="2.2" fill="#fff" /><circle cx="103" cy="79" r="2.2" fill="#fff" />
      <circle cx="96" cy="79" r="1" fill="#1a2a6a" /><circle cx="102" cy="79" r="1" fill="#1a2a6a" />
    </Svg>
  )
}

function Minigolf() {
  return (
    <Svg fond="#0b0e12">
      <path d="M18 88V30Q18 12 36 12H142V52H66V88Z" fill="#339552" stroke="#c9a66b" strokeWidth="3" strokeLinejoin="round" />
      <rect x="86" y="18" width="26" height="16" rx="7" fill="#e3cd92" />
      <circle cx="30" cy="62" r="5" fill="#e8394a" /><circle cx="30" cy="62" r="2.6" fill="none" stroke="#fff" strokeWidth=".8" />
      <circle cx="128" cy="32" r="3.6" fill="#0a1a10" />
      <path d="M128 32V15" stroke="#e8edf5" strokeWidth="1" />
      <path d="M128 15q5 1 9 3l-9 3z" fill="#ff4d4d" />
      <path d="M44 76Q44 40 70 32T116 30" fill="none" stroke="#9cf0b0" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      <circle cx="44" cy="78" r="3" fill="#fff" />
    </Svg>
  )
}

function Mots() {
  const lettres = ['M', 'A', 'I', 'S', 'O', 'N']
  const mots: [string, boolean][] = [['AMI', true], ['SON', false], ['MAIN', true], ['MAISON', false]]
  return (
    <Svg fond="#1d1d42">
      {mots.map(([m, ok], k) => m.split('').map((c, i) => (
        <g key={`${k}-${i}`}>
          <rect x={10 + i * 10.5} y={12 + k * 19} width="9.5" height="9.5" rx="2" fill={ok ? '#ff8a3d' : '#ffffff14'} />
          {ok && <text x={14.75 + i * 10.5} y={19.6 + k * 19} textAnchor="middle" fontSize="7" fontWeight="800" fill="#24112a">{c}</text>}
        </g>
      )))}
      <circle cx="118" cy="50" r="34" fill="#ffffff0c" stroke="#ffffff18" />
      <polyline points="118,25 96.35,62.5 139.65,62.5" fill="none" stroke="#ff8a3d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {lettres.map((c, i) => {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2
        const x = 118 + Math.cos(a) * 25
        const y = 50 + Math.sin(a) * 25
        const choisi = i === 0 || i === 2 || i === 4
        return (
          <g key={c}>
            <circle cx={x} cy={y} r="8" fill={choisi ? '#ff8a3d' : '#f6efe0'} />
            <text x={x} y={y + 3} textAnchor="middle" fontSize="9" fontWeight="800" fill={choisi ? '#fff' : '#2a2148'}>{c}</text>
          </g>
        )
      })}
    </Svg>
  )
}

function Joute() {
  const c = 11
  const couleur: Record<string, string> = { T: '#c2410c', D: '#d9826a', t: '#1d5fd1', d: '#74b3e6' }
  const plan = ['T..d...T..', '.D...t...t', '..D...d.d.', 'd..D...d..', '....D.....', '.t...t...t', '..d...d.d.']
  const tuiles: [number, number, string][] = [[2, 3, 'J'], [3, 3, 'O'], [4, 3, 'U'], [5, 3, 'T'], [6, 3, 'E'], [5, 1, 'M'], [5, 2, 'O'], [5, 4, 'S']]
  return (
    <Svg fond="#0d2a24">
      {plan.map((l, y) => l.split('').map((ch, x) => (
        <rect key={`${x}-${y}`} x={20 + x * c} y={6 + y * c} width={c - 1.2} height={c - 1.2} rx="1.5" fill={couleur[ch] ?? '#17463d'} />
      )))}
      {tuiles.map(([x, y, l]) => (
        <g key={`t${x}${y}`}>
          <rect x={20 + x * c} y={6 + y * c} width={c - 1.2} height={c - 1.2} rx="1.5" fill="#f4e7c8" />
          <text x={24.9 + x * c} y={13.6 + y * c} textAnchor="middle" fontSize="7" fontWeight="800" fill="#2b2118">{l}</text>
        </g>
      ))}
      <rect x="128" y="10" width="24" height="80" rx="4" fill="#2b2118" />
      {['A', 'R', 'E', 'N', 'S'].map((l, k) => (
        <g key={l}>
          <rect x="131" y={13 + k * 15} width="18" height="13" rx="2" fill="#f4e7c8" />
          <text x="140" y={22.5 + k * 15} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#2b2118">{l}</text>
        </g>
      ))}
    </Svg>
  )
}

function RaseMottes() {
  return (
    <Svg fond="#141a40">
      {[[12, 10], [40, 22], [70, 8], [98, 18], [130, 12], [150, 30], [22, 34], [84, 36]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" fill="#ffffffaa" />)}
      <path d="M0 100V78Q20 62 40 72T80 66T120 76T160 64V100Z" fill="#2f6b3a" />
      <path d="M0 78Q20 62 40 72T80 66T120 76T160 64" fill="none" stroke="#7bd66a" strokeWidth="1.4" />
      <g transform="translate(112 66)">
        <rect x="-5" y="-6" width="10" height="6" rx="1.5" fill="#ffd84d" />
        <rect x="-5" y="-4" width="10" height="1.6" fill="#7a5a00" />
      </g>
      <g transform="translate(84 58)">
        <path d="M-1.6 0V-7Q0 -11 1.6 -7V0Z" fill="#e8edf5" />
        <path d="M-1.6 -3L-3.4 0H-1.6ZM1.6 -3L3.4 0H1.6Z" fill="#ff5a5a" />
        <path d="M-1.2 0L0 4L1.2 0Z" fill="#ffd84d" />
      </g>
      <g transform="translate(42 38) scale(1.6)">
        <path d="M-5 -1L-9 0L-5 1Z" fill="#ff8a3d" />
        <path d="M6 0L-2 -2.2L-5 -1.3V1.3L-2 2.2Z" fill="#e8f4ff" />
        <path d="M0 1L-4 4L-2.4 1ZM0 -1L-4 -3.4L-2.4 -1Z" fill="#2dd4ff" />
      </g>
      <path d="M58 38H66M74 38H82" stroke="#fff7a8" strokeWidth="1.2" />
      <ellipse cx="60" cy="54" rx="2.2" ry="1.5" fill="#1a1f2a" stroke="#ff6b6b" strokeWidth=".6" />
      <rect x="6" y="6" width="34" height="5" rx="2" fill="#00000066" />
      <rect x="7" y="7" width="22" height="3" rx="1.5" fill="#7bd66a" />
    </Svg>
  )
}

export const APERCUS: Record<string, () => ReactNode> = {
  demineur: Demineur,
  '2048': Jeu2048,
  sudoku: Sudoku,
  'puissance-4': Puissance4,
  memory: Memory,
  snake: Snake,
  blocs: Blocs,
  ninja: Ninja,
  glissieres: Glissieres,
  'pose-blocs': PoseBlocs,
  labyrinthe: Labyrinthe,
  nonogramme: Nonogramme,
  points: Points,
  solitaire: Solitaire,
  mahjong: Mahjong,
  glouton: Glouton,
  minigolf: Minigolf,
  mots: Mots,
  joute: Joute,
  'rase-mottes': RaseMottes,
}
