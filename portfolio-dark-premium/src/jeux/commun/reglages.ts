import { useState } from 'react'
import { playSound, vibrate } from '../feedback'

// Réglages partagés par tous les jeux (le choix fait dans un jeu vaut pour les autres).
export const SOUND_KEY = 'ez-demineur-son'
export const VIBE_KEY = 'ez-demineur-vibrations'

// Activés par défaut ; le stockage du navigateur peut être indisponible (navigation privée).
export function loadSetting(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}
export function saveSetting(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    /* rien à faire */
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* rien à faire */
  }
}

// Son et vibrations, avec un petit retour quand on les réactive.
export function useSonVibrations() {
  const [sound, setSound] = useState(() => loadSetting(SOUND_KEY))
  const [vibe, setVibe] = useState(() => loadSetting(VIBE_KEY))
  const toggleSound = () => {
    setSound(!sound)
    saveSetting(SOUND_KEY, !sound)
    if (!sound) playSound('toggle')
  }
  const toggleVibe = () => {
    setVibe(!vibe)
    saveSetting(VIBE_KEY, !vibe)
    if (!vibe) vibrate('flag')
  }
  return { sound, vibe, toggleSound, toggleVibe }
}

// Meilleurs scores par niveau. « better » indique si le plus petit ou le plus grand gagne.
export function useRecords(key: string, better: 'lower' | 'higher') {
  const [records, setRecords] = useState<Record<string, number>>(() => loadJSON(key, {}))
  const submit = (level: string, value: number): boolean => {
    const best = records[level]
    const isBest = best === undefined || (better === 'lower' ? value < best : value > best)
    if (!isBest) return false
    const updated = { ...records, [level]: value }
    setRecords(updated)
    saveJSON(key, updated)
    return true
  }
  return { records, submit }
}
