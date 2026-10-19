import type { ReactNode } from 'react'
import { Maximize2, Minimize2, Vibrate, VibrateOff, Volume2, VolumeX } from 'lucide-react'
import { SWITCH_ATTR } from './useHaptique'

interface Props {
  sound: boolean
  vibe: boolean
  onSound: () => void
  onVibe: () => void
  full: boolean
  onFull: () => void
  children?: ReactNode // réglages propres au jeu, affichés en premier
}

// Barre d'outils commune : son, vibrations (écran tactile), plein écran (écran tactile).
export default function Outils({ sound, vibe, onSound, onVibe, full, onFull, children }: Props) {
  return (
    <div className="ms-tools">
      {children}
      <div className="ms-toggles">
        <button type="button" className={sound ? 'ms-icon-toggle is-on' : 'ms-icon-toggle'} aria-pressed={sound} aria-label="Son" title={sound ? 'Couper le son' : 'Activer le son'} onClick={onSound}>
          {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        {/* Vrai interrupteur natif invisible : sur iPhone, c'est lui qui vibre quand on le touche. */}
        <span className={vibe ? 'ms-icon-toggle ms-vibe is-on' : 'ms-icon-toggle ms-vibe'} title={vibe ? 'Couper les vibrations' : 'Activer les vibrations'}>
          {vibe ? <Vibrate size={17} /> : <VibrateOff size={17} />}
          <input type="checkbox" {...SWITCH_ATTR} className="ms-native-switch" checked={vibe} onChange={onVibe} aria-label="Vibrations" />
        </span>
      </div>
      <button type="button" className="ms-full" aria-pressed={full} onClick={onFull}>
        {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {full ? 'Réduire' : 'Plein écran'}
      </button>
    </div>
  )
}
