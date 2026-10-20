// Dessin des faces de tuiles (viewBox 40 × 52). Ronds, bambous, caractères, vents, dragons, fleurs, saisons.
import type { ReactNode } from 'react'

const CHIFFRES = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
const VENTS: Record<string, string> = { E: '東', S: '南', O: '西', N: '北' }

// Positions des motifs pour 1 à 9 (ronds et bambous), dans une zone de 30 × 42.
const DISPO: Record<number, [number, number][]> = {
  1: [[15, 21]],
  2: [[15, 10], [15, 32]],
  3: [[7, 8], [15, 21], [23, 34]],
  4: [[8, 10], [22, 10], [8, 32], [22, 32]],
  5: [[8, 8], [22, 8], [15, 21], [8, 34], [22, 34]],
  6: [[8, 7], [22, 7], [8, 21], [22, 21], [8, 35], [22, 35]],
  7: [[6, 6], [15, 10], [24, 14], [8, 26], [22, 26], [8, 37], [22, 37]],
  8: [[8, 5], [22, 5], [8, 16], [22, 16], [8, 27], [22, 27], [8, 38], [22, 38]],
  9: [[5, 7], [15, 7], [25, 7], [5, 21], [15, 21], [25, 21], [5, 35], [15, 35], [25, 35]],
}

function Ronds({ n }: { n: number }) {
  const r = n === 1 ? 11 : n <= 4 ? 6.5 : n <= 6 ? 5.4 : 4.6
  const couleurs = ['#2a6fd6', '#1f9a5a', '#d6343a']
  return (
    <g transform="translate(5 5)">
      {DISPO[n].map(([x, y], k) => (
        <g key={k}>
          <circle cx={x} cy={y} r={r} fill="none" stroke={couleurs[(k + n) % 3]} strokeWidth={n === 1 ? 2.4 : 1.6} />
          <circle cx={x} cy={y} r={r * 0.45} fill={couleurs[(k + n + 1) % 3]} />
        </g>
      ))}
    </g>
  )
}

function Bambous({ n }: { n: number }) {
  if (n === 1) {
    // Le 1 de bambou : un petit oiseau stylisé.
    return (
      <g transform="translate(20 27)">
        <ellipse cx="0" cy="2" rx="9" ry="7" fill="#1f9a5a" />
        <circle cx="6" cy="-6" r="4.5" fill="#d6343a" />
        <path d="M10 -6l5 1-5 2z" fill="#e8a33d" />
        <path d="M-8 4l-6 6 8-2z" fill="#2a6fd6" />
        <circle cx="7" cy="-7" r="1" fill="#111" />
      </g>
    )
  }
  return (
    <g transform="translate(5 5)">
      {DISPO[n].map(([x, y], k) => (
        <g key={k} transform={`translate(${x} ${y})`}>
          <rect x="-2.2" y="-6" width="4.4" height="12" rx="2" fill={k % 3 === 2 && n > 3 ? '#d6343a' : '#1f9a5a'} />
          <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#e9f7ee" strokeWidth=".9" />
        </g>
      ))}
    </g>
  )
}

function Caractere({ n }: { n: number }) {
  return (
    <g>
      <text x="20" y="22" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1a2233" fontFamily="'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif">{CHIFFRES[n - 1]}</text>
      <text x="20" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill="#d6343a" fontFamily="'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif">萬</text>
    </g>
  )
}

function Fleur({ n }: { n: number }) {
  const c = ['#d6343a', '#e8a33d', '#2a6fd6', '#a14bd6'][n - 1]
  return (
    <g transform="translate(20 24)">
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-7" rx="4.5" ry="7" fill={c} transform={`rotate(${a})`} opacity=".9" />)}
      <circle r="3.5" fill="#ffd36b" />
      <text x="13" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={c}>{n}</text>
    </g>
  )
}

function Saison({ n }: { n: number }) {
  // Printemps, été, automne, hiver.
  const motifs: ReactNode[] = [
    <g key="p"><path d="M0 8V-4" stroke="#1f9a5a" strokeWidth="2" /><ellipse cx="-5" cy="-5" rx="5" ry="3" fill="#4fd06a" transform="rotate(-30 -5 -5)" /><ellipse cx="5" cy="-8" rx="5" ry="3" fill="#4fd06a" transform="rotate(30 5 -8)" /></g>,
    <g key="e">{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <rect key={a} x="-1" y="-12" width="2" height="5" fill="#e8a33d" transform={`rotate(${a})`} />)}<circle r="6" fill="#ffc22e" /></g>,
    <g key="a"><path d="M0 -11C8 -4 7 5 0 10C-7 5 -8 -4 0 -11Z" fill="#d96a2a" /><path d="M0 -9V10" stroke="#8a3a12" strokeWidth="1.2" /></g>,
    <g key="h" stroke="#2a6fd6" strokeWidth="1.8" strokeLinecap="round">{[0, 60, 120].map(a => <g key={a} transform={`rotate(${a})`}><line x1="0" y1="-11" x2="0" y2="11" /><line x1="-3" y1="-8" x2="0" y2="-5" /><line x1="3" y1="-8" x2="0" y2="-5" /></g>)}</g>,
  ]
  return (
    <g transform="translate(20 24)">
      {motifs[n - 1]}
      <text x="13" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill="#5a6b85">{n}</text>
    </g>
  )
}

export function FaceTuile({ t }: { t: string }) {
  const n = Number(t.slice(1))
  let contenu: ReactNode
  switch (t[0]) {
    case 'r': contenu = <Ronds n={n} />; break
    case 'b': contenu = <Bambous n={n} />; break
    case 'c': contenu = <Caractere n={n} />; break
    case 'v': contenu = <text x="20" y="34" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a2233" fontFamily="'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif">{VENTS[t[1]]}</text>; break
    case 'd':
      contenu = t[1] === 'B'
        ? <rect x="9" y="10" width="22" height="32" rx="2" fill="none" stroke="#2a6fd6" strokeWidth="2.5" />
        : <text x="20" y="35" textAnchor="middle" fontSize="23" fontWeight="800" fill={t[1] === 'R' ? '#d6343a' : '#1f9a5a'} fontFamily="'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif">{t[1] === 'R' ? '中' : '發'}</text>
      break
    case 'f': contenu = <Fleur n={n} />; break
    default: contenu = <Saison n={n} />
  }
  return <svg viewBox="0 0 40 52" aria-hidden="true">{contenu}</svg>
}

export function nomTuile(t: string): string {
  const n = Number(t.slice(1))
  switch (t[0]) {
    case 'r': return `${n} de ronds`
    case 'b': return `${n} de bambous`
    case 'c': return `${n} de caractères`
    case 'v': return ({ E: 'vent d’est', S: 'vent du sud', O: 'vent d’ouest', N: 'vent du nord' } as Record<string, string>)[t[1]]
    case 'd': return t[1] === 'R' ? 'dragon rouge' : t[1] === 'V' ? 'dragon vert' : 'dragon blanc'
    case 'f': return `fleur ${n}`
    default: return ['printemps', 'été', 'automne', 'hiver'][n - 1]
  }
}
