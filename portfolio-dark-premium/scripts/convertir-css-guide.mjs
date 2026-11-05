// Convertit le CSS d'un guide « édition imprimable » (pensé pour l'A4) en CSS pour le site.
// Usage : node scripts/convertir-css-guide.mjs <style.css d'origine> <fichier de sortie>
// Exemple : node scripts/convertir-css-guide.mjs ~/Elden-Ring-Edition-Ultime-site/css/style.css src/guides/elden-ring/livre.css
//
// Ce que fait le script :
// - chaque règle est limitée au contenu du guide (préfixe .er-livre), html/body/:root deviennent .er-livre ;
// - les règles d'impression (@page, @media print), les polices locales (@font-face), la barre web et
//   les éléments que le site affiche lui-même (couverture, sommaire, intercalaires) sont retirés ;
// - les tailles en pt et en mm deviennent des px, agrandies pour l'écran (texte de 9,6 pt → 15 px) ;
// - les polices pointent vers celles du site (Fontsource).
import { readFileSync, writeFileSync } from 'node:fs'

const [source, sortie] = process.argv.slice(2)
if (!source || !sortie) {
  console.error('Usage : node scripts/convertir-css-guide.mjs <style.css> <sortie.css>')
  process.exit(1)
}

const PREFIXE = '.er-livre'
const PX_PAR_PT = 15 / 9.6 // le texte courant du PDF (9,6 pt) fait 15 px à l'écran
const PX_PAR_MM = PX_PAR_PT * (72 / 25.4)
const RETIRES = ['.cover', '.divider', '.toc', '.toc2', '.webnav', '.secmark']
const POLICES = {
  Cinzel: "'Cinzel Variable', Cinzel, serif",
  Garamond: "'EB Garamond Variable', 'EB Garamond', serif",
  Inter: "'Inter Variable', Inter, system-ui, sans-serif",
}

// Découpe une feuille de style en blocs de premier niveau { entete, corps }.
function blocs(css) {
  const res = []
  let i = 0
  while (i < css.length) {
    const ouvre = css.indexOf('{', i)
    if (ouvre === -1) break
    const entete = css.slice(i, ouvre).trim()
    let niveau = 1, j = ouvre + 1
    while (j < css.length && niveau > 0) {
      if (css[j] === '{') niveau++
      else if (css[j] === '}') niveau--
      j++
    }
    res.push({ entete, corps: css.slice(ouvre + 1, j - 1) })
    i = j
  }
  return res
}

const arrondi = (n) => String(Math.round(n * 100) / 100)
const unites = (texte) => texte
  .replace(/(-?\d*\.?\d+)pt\b/g, (_, n) => `${arrondi(parseFloat(n) * PX_PAR_PT)}px`)
  .replace(/(-?\d*\.?\d+)mm\b/g, (_, n) => `${arrondi(parseFloat(n) * PX_PAR_MM)}px`)

function declarations(corps) {
  return corps
    .split(';')
    .map(d => d.trim())
    .filter(d => d && !/^(page|break-(before|after))\s*:/.test(d))
    .map(d => {
      const m = d.match(/^font-family\s*:\s*['"]?([A-Za-z]+)/)
      if (m && POLICES[m[1]]) return `font-family: ${POLICES[m[1]]}`
      return unites(d)
    })
    .join('; ')
}

function selecteurs(entete) {
  const garde = entete
    .split(',')
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s && !RETIRES.some(r => s === r || s.startsWith(r + ' ') || s.startsWith(r + '.') || s.startsWith(r + ':')))
    .map(s => {
      if (/^(:root|html|body)$/.test(s)) return PREFIXE
      return `${PREFIXE} ${s}`
    })
  return [...new Set(garde)]
}

const css = readFileSync(source, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const lignes = [
  '/* Généré par scripts/convertir-css-guide.mjs à partir du CSS du guide imprimable. Ne pas modifier à la main :',
  '   les réglages pour l\'écran et le téléphone sont dans elden-ring.css. */',
]
for (const { entete, corps } of blocs(css)) {
  if (entete.startsWith('@')) continue // @page, @font-face, @media print / screen
  const sel = selecteurs(entete)
  const decl = declarations(corps)
  if (sel.length && decl) lignes.push(`${sel.join(', ')} { ${decl}; }`)
}
writeFileSync(sortie, lignes.join('\n') + '\n')
console.log(`${lignes.length - 2} règles écrites dans ${sortie}`)
