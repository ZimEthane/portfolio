import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, CircuitBoard, Cpu, HardDrive, MemoryStick, MonitorPlay, PcCase, Zap } from 'lucide-react'
import type { Tuto } from './types'

// Fiche illustrée d'un composant : son rôle en une image, et ce qu'il faut regarder.
function Fiche({ icone: Icone, nom, surnom, couleur, points }: { icone: LucideIcon; nom: string; surnom: string; couleur: string; points: string[] }) {
  return (
    <div className="pc-fiche" style={{ '--c': couleur } as CSSProperties}>
      <span className="pc-fiche-icone"><Icone size={44} strokeWidth={1.6} /></span>
      <strong>{nom}</strong>
      <em>{surnom}</em>
      <ul>{points.map(p => <li key={p}>{p}</li>)}</ul>
    </div>
  )
}

// Répartition du budget selon l'usage (ordres d'idée, en pourcentage du total).
const PARTS = [
  { nom: 'Carte graphique', c: '#6fd59a' },
  { nom: 'Processeur', c: '#8bb9fa' },
  { nom: 'Carte mère', c: '#b79bff' },
  { nom: 'Mémoire', c: '#5fd6d6' },
  { nom: 'Stockage', c: '#ffd36b' },
  { nom: 'Alimentation', c: '#ff9a6b' },
  { nom: 'Boîtier et ventilos', c: '#8d95a6' },
]
const USAGES: { nom: string; parts: number[] }[] = [
  { nom: 'École et bureautique', parts: [0, 30, 15, 12, 15, 11, 17] },
  { nom: 'Jeux vidéo', parts: [38, 17, 11, 8, 8, 8, 10] },
  { nom: 'Montage vidéo, 3D', parts: [28, 25, 10, 14, 11, 6, 6] },
]
function Budget() {
  return (
    <div className="pc-budget">
      {USAGES.map(u => (
        <div key={u.nom} className="pc-budget-ligne">
          <span>{u.nom}</span>
          <div className="pc-barre">
            {u.parts.map((p, k) => p > 0 && <i key={k} style={{ width: `${p}%`, background: PARTS[k].c }} title={`${PARTS[k].nom} : ${p} %`} />)}
          </div>
        </div>
      ))}
      <ul className="pc-legende">{PARTS.map(p => <li key={p.nom}><i style={{ background: p.c }} />{p.nom}</li>)}</ul>
    </div>
  )
}

const VERIFS = [
  'Processeur et carte mère : même socket',
  'Mémoire et carte mère : même type (DDR4 ou DDR5)',
  'Carte mère et boîtier : format compatible (ATX, micro-ATX…)',
  'Carte graphique : assez courte pour le boîtier',
  'Ventirad : assez bas pour le boîtier',
  'Alimentation : assez puissante, avec les bons câbles',
]
function Checklist() {
  return (
    <ul className="pc-check">
      {VERIFS.map(v => <li key={v}><span><Check size={15} strokeWidth={3} /></span>{v}</li>)}
    </ul>
  )
}

const etapes: Tuto['etapes'] = [
  {
    titre: 'Choisis ton usage et ton budget',
    texte: (
      <>
        <p>Avant de choisir les pièces, pose-toi deux questions : <strong>à quoi va servir le PC</strong>, et <strong>combien je peux dépenser</strong> ? Un PC pour l’école n’a pas les mêmes besoins qu’un PC de jeu.</p>
        <p>Le graphique montre comment on répartit souvent le budget. Pour jouer, c’est la <strong>carte graphique</strong> qui compte le plus. Pour l’école, on peut même s’en passer.</p>
      </>
    ),
    astuce: 'Ce sont des ordres d’idée : vérifie toujours les prix du moment, ils changent souvent.',
    visuel: <Budget />,
  },
  {
    titre: 'Le processeur (CPU)',
    texte: (
      <>
        <p>C’est le <strong>cerveau</strong> du PC : il fait tous les calculs. Les deux grandes marques sont <strong>AMD</strong> (Ryzen) et <strong>Intel</strong> (Core).</p>
        <ul>
          <li><strong>Les cœurs</strong> : chacun travaille en parallèle. 6 à 8 cœurs suffisent largement pour jouer, plus pour le montage vidéo ou la 3D.</li>
          <li><strong>Le socket</strong> : c’est la forme de sa prise. Il doit être le même que celui de la carte mère (par exemple AM5 chez AMD).</li>
          <li><strong>La puce graphique intégrée</strong> : certains processeurs en ont une. Suffisant pour l’école et les vidéos, pas pour les jeux récents.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={Cpu} nom="Processeur" surnom="le cerveau" couleur="#8bb9fa" points={['Nombre de cœurs', 'Socket (prise)', 'Puce graphique intégrée ?']} />,
  },
  {
    titre: 'La carte mère',
    texte: (
      <>
        <p>C’est le <strong>squelette</strong> qui relie toutes les pièces entre elles. On la choisit en fonction du processeur.</p>
        <ul>
          <li><strong>Même socket</strong> que le processeur.</li>
          <li><strong>Type de mémoire</strong> accepté : DDR4 ou DDR5 (les deux ne sont pas compatibles entre elles).</li>
          <li><strong>Format</strong> : ATX (grand), micro-ATX (moyen) ou mini-ITX (petit). Il doit rentrer dans le boîtier.</li>
          <li><strong>Emplacements M.2</strong> pour les SSD, et le <strong>Wi-Fi intégré</strong> si tu n’as pas de câble réseau.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={CircuitBoard} nom="Carte mère" surnom="le squelette" couleur="#b79bff" points={['Socket', 'DDR4 ou DDR5', 'Format', 'Ports M.2, Wi-Fi']} />,
  },
  {
    titre: 'La mémoire vive (RAM)',
    texte: (
      <>
        <p>C’est le <strong>bureau de travail</strong> du PC : plus il est grand, plus il peut garder de choses ouvertes en même temps (jeu, navigateur, musique…).</p>
        <ul>
          <li><strong>16 Go</strong> pour l’école et la plupart des jeux, <strong>32 Go</strong> pour être tranquille ou faire du montage.</li>
          <li>Prends toujours <strong>2 barrettes identiques</strong> (par exemple 2 × 8 Go) : elles travaillent à deux, c’est plus rapide.</li>
          <li>Le <strong>type</strong> (DDR4 ou DDR5) doit être celui de la carte mère.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={MemoryStick} nom="Mémoire vive" surnom="le bureau de travail" couleur="#5fd6d6" points={['16 Go ou 32 Go', '2 barrettes identiques', 'DDR4 ou DDR5']} />,
  },
  {
    titre: 'La carte graphique (GPU)',
    texte: (
      <>
        <p>C’est l’<strong>artiste</strong> qui dessine chaque image à l’écran. Pour jouer, c’est la pièce la plus importante. Les marques : <strong>NVIDIA</strong> (GeForce), <strong>AMD</strong> (Radeon) et <strong>Intel</strong> (Arc).</p>
        <ul>
          <li><strong>La mémoire vidéo</strong> : 8 Go suffisent pour les jeux légers en 1080p. Vise 12 Go pour être à l’aise, et 16 Go pour les jeux récents en haute qualité ou en 1440p.</li>
          <li><strong>La taille</strong> : certaines cartes sont très longues, vérifie qu’elle rentre dans le boîtier.</li>
          <li><strong>L’alimentation conseillée</strong> par le fabricant, et les câbles qu’elle demande.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={MonitorPlay} nom="Carte graphique" surnom="l’artiste" couleur="#6fd59a" points={['Mémoire vidéo', 'Longueur', 'Puissance conseillée']} />,
  },
  {
    titre: 'Le stockage (SSD)',
    texte: (
      <>
        <p>C’est l’<strong>armoire</strong> où sont rangés le système, les jeux et tes fichiers, même quand le PC est éteint.</p>
        <ul>
          <li>Prends un <strong>SSD NVMe</strong> (au format M.2, une petite barrette) : le PC démarre en quelques secondes.</li>
          <li><strong>1 To</strong> est un bon choix pour jouer : un jeu récent prend souvent 50 à 150 Go.</li>
          <li>Un disque dur classique (HDD), plus lent mais moins cher, peut servir en plus pour les photos et vidéos.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={HardDrive} nom="Stockage" surnom="l’armoire" couleur="#ffd36b" points={['SSD NVMe M.2', '1 To pour jouer', 'HDD en bonus']} />,
  },
  {
    titre: 'L’alimentation',
    texte: (
      <>
        <p>C’est le <strong>cœur</strong> qui envoie l’énergie à toutes les pièces. Ne la néglige jamais : une mauvaise alimentation peut abîmer tout le reste.</p>
        <ul>
          <li><strong>La puissance</strong> : regarde ce que conseille le fabricant de la carte graphique, et garde de la marge. Un PC de jeu classique demande souvent 650 à 850 W.</li>
          <li><strong>La certification 80 PLUS</strong> : elle indique le rendement. Bronze au minimum, Gold c’est mieux.</li>
          <li>Choisis une <strong>marque reconnue</strong>, jamais une alimentation sans marque.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={Zap} nom="Alimentation" surnom="le cœur" couleur="#ff9a6b" points={['Puissance (W)', '80 PLUS Bronze ou Gold', 'Marque reconnue']} />,
  },
  {
    titre: 'Le boîtier et le refroidissement',
    texte: (
      <>
        <p>Le boîtier est la <strong>maison</strong> du PC, et les ventilateurs son <strong>système d’aération</strong> : les pièces chauffent en travaillant.</p>
        <ul>
          <li>Le boîtier doit accepter le <strong>format de la carte mère</strong>, la <strong>longueur de la carte graphique</strong> et la <strong>hauteur du ventirad</strong> (indiqués dans sa fiche).</li>
          <li>Une façade en grille (« mesh ») laisse mieux passer l’air.</li>
          <li>Certains processeurs sont vendus sans ventilateur : prévois alors un <strong>ventirad</strong> (radiateur + ventilateur) ou un watercooling.</li>
        </ul>
      </>
    ),
    visuel: <Fiche icone={PcCase} nom="Boîtier" surnom="la maison" couleur="#8d95a6" points={['Format accepté', 'Longueur GPU max', 'Bonne aération']} />,
  },
  {
    titre: 'Vérifie que tout va ensemble',
    texte: (
      <>
        <p>Avant d’acheter, relis ta liste avec ces vérifications. Une seule erreur, et le PC peut refuser de démarrer.</p>
        <p>Des sites comme <strong>PCPartPicker</strong> (disponible en français) vérifient automatiquement la compatibilité de ta liste et comparent les prix.</p>
      </>
    ),
    astuce: 'Monter le PC toi-même ? Débranche toujours l’alimentation, et touche un objet en métal avant de manipuler les pièces pour évacuer l’électricité statique.',
    visuel: <Checklist />,
  },
]

export const pc: Partial<Tuto> = {
  intro: (
    <>
      <p>Un PC, c’est un peu comme une équipe : chaque pièce a son rôle, et elles doivent bien s’entendre. Ce tuto t’explique à quoi sert chacune, ce qu’il faut regarder, et comment éviter les erreurs de compatibilité.</p>
    </>
  ),
  materiel: ['Une idée de ce que tu veux faire avec le PC', 'Un budget', 'Un site de configuration pour vérifier ta liste'],
  etapes,
  conclusion: <p>Tu connais maintenant le rôle de chaque pièce. Prends le temps de comparer, demande conseil si tu hésites, et garde toujours un œil sur la compatibilité. Le plus important : que le PC corresponde à <strong>ton</strong> usage.</p>,
}

