import './chantier.css'

// Écran « en chantier » : une pelleteuse qui creuse du code, en boucle.
// Utilisé pour les jeux et les tutos pas encore terminés.
export default function Chantier({ titre = 'En chantier', texte }: { titre?: string; texte: string }) {
  return (
    <div className="chantier">
      <svg className="chantier-scene" viewBox="0 0 480 250" role="img" aria-label="Une pelleteuse creuse du code">
        <defs>
          <pattern id="chantier-rayures" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#ffcc4d" />
            <rect x="8" width="8" height="16" fill="#1a1d22" />
          </pattern>
        </defs>

        {/* Sol et trou creusé */}
        <line x1="10" y1="222" x2="470" y2="222" stroke="#2b3038" strokeWidth="2" />
        <path d="M300 222 Q345 252 392 222 Z" fill="#07080a" stroke="#2b3038" strokeWidth="2" />
        <g className="chantier-sol" fontFamily="DM Mono, monospace" fontSize="11" fill="#3d4654">
          <text x="318" y="236">01</text><text x="346" y="241">{'{}'}</text><text x="370" y="234">;</text>
        </g>

        {/* Tas de code déjà sorti */}
        <g className="chantier-tas" fontFamily="DM Mono, monospace" fontWeight="500">
          <text x="404" y="218" fontSize="15" fill="#8bb9fa">{'</>'}</text>
          <text x="440" y="219" fontSize="14" fill="#6fd59a">{'{ }'}</text>
          <text x="418" y="202" fontSize="13" fill="#ffb36b">01</text>
          <text x="448" y="203" fontSize="13" fill="#b79bff">;</text>
          <text x="430" y="186" fontSize="12" fill="#ff8585">( )</text>
        </g>

        {/* Code qui tombe du godet sur le tas */}
        <g className="chantier-chute" fontFamily="DM Mono, monospace" fontSize="12">
          <text className="c1" x="408" y="150" fill="#8bb9fa">{'{'}</text>
          <text className="c2" x="424" y="146" fill="#6fd59a">;</text>
          <text className="c3" x="438" y="152" fill="#ffb36b">1</text>
        </g>

        {/* Pelleteuse : chenilles, châssis, cabine */}
        <g className="chantier-engin">
          <rect x="58" y="194" width="156" height="28" rx="14" fill="#1a1d22" stroke="#3a414c" strokeWidth="2" />
          {[76, 102, 128, 154, 180, 198].map(x => <circle key={x} cx={x} cy="208" r="7" fill="#2b3038" stroke="#4a5260" strokeWidth="2" />)}
          <rect x="62" y="160" width="24" height="32" rx="5" fill="#d9a92f" />
          <rect x="78" y="150" width="122" height="46" rx="7" fill="#ffcc4d" />
          <rect x="84" y="108" width="62" height="50" rx="7" fill="#ffcc4d" />
          <rect x="92" y="116" width="44" height="28" rx="4" fill="#8bb9fa33" stroke="#1a1d22" strokeWidth="2" />
          <rect x="150" y="165" width="40" height="6" rx="3" fill="#1a1d22" opacity=".5" />
          <text x="98" y="186" fontFamily="DM Mono, monospace" fontSize="12" fontWeight="500" fill="#1a1d22">EZ</text>
        </g>

        {/* Bras : flèche, balancier, godet (chacun pivote sur le précédent) */}
        <g className="chantier-fleche">
          <line x1="190" y1="160" x2="300" y2="92" stroke="#ffcc4d" strokeWidth="16" strokeLinecap="round" />
          <line x1="176" y1="146" x2="262" y2="104" stroke="#1a1d22" strokeWidth="4" strokeLinecap="round" opacity=".55" />
          <circle cx="190" cy="160" r="7" fill="#1a1d22" />
          <g className="chantier-balancier">
            <line x1="300" y1="92" x2="338" y2="186" stroke="#e6b53d" strokeWidth="12" strokeLinecap="round" />
            <circle cx="300" cy="92" r="6" fill="#1a1d22" />
            <g className="chantier-godet">
              <path d="M338 186 L370 192 Q374 220 348 228 L326 222 Z" fill="#d9a92f" stroke="#1a1d22" strokeWidth="2" strokeLinejoin="round" />
              <path d="M326 222 l-4 8 M336 225 l-3 8 M346 228 l-2 8" stroke="#1a1d22" strokeWidth="3" strokeLinecap="round" />
              <text className="chantier-charge" x="334" y="214" fontFamily="DM Mono, monospace" fontSize="11" fontWeight="500" fill="#1a1d22">{'</>'}</text>
              <circle cx="338" cy="186" r="5" fill="#1a1d22" />
            </g>
          </g>
        </g>

        {/* Barrière et plots */}
        <rect x="16" y="196" width="34" height="24" rx="3" fill="url(#chantier-rayures)" stroke="#1a1d22" strokeWidth="2" />
        <path d="M232 222 l8 -26 l8 26 z" fill="#ff8a4d" /><rect x="235" y="206" width="10" height="4" fill="#fff" opacity=".85" />
        <path d="M252 222 l7 -20 l7 20 z" fill="#ff8a4d" /><rect x="255" y="209" width="8" height="3" fill="#fff" opacity=".85" />
      </svg>

      <div className="chantier-bandeau" aria-hidden="true"><span>EN CHANTIER</span></div>
      <h3>{titre}</h3>
      <p>{texte}</p>
    </div>
  )
}
