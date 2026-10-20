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
      {[44, 54, 64, 74].map(x => <circle key={x} cx={x} cy="40" r="1.8" fill="#ffd84d" />)}
      {[60, 70, 80].map(y => <circle key={y} cx="122" cy={y} r="1.8" fill="#ffd84d" />)}
      <rect x="18" y="74" width="12" height="12" rx="2" fill="#4dffd2" />
      <rect x="21" y="78" width="2" height="2" fill="#0a0614" /><rect x="25" y="78" width="2" height="2" fill="#0a0614" />
      <path d="M40 80h22" stroke="#4dffd240" strokeWidth="3" strokeLinecap="round" />
      <rect x="132" y="14" width="10" height="12" rx="2" fill="#ffd84d" />
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
}
