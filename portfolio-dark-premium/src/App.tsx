import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, Code2, ExternalLink, Github, Linkedin, Mail, Menu, X } from 'lucide-react'
import ContactForm from './ContactForm'
import Veille from './Veille'
import { scrollToId, scrollToTop } from './scroll'
import { btsOptions, CONTACT_EMAIL, GITHUB_URL, LINKEDIN_URL, projects, skills, timeline, toolGroups } from './data'

const CV_URL = '/pdf/CV_Zimmermann_Ethane_2026.pdf'
const GRID_URL = '/pdf/BTS_SIO_-_Annexe_8-1_-_Tableau_de_synthe_se_-_Epreuve_E4-_BTS_SIO_2024_-_Zimmermann_Ethane.pdf'

const navItems = [['À propos', '#apropos'], ['Projets', '#projets'], ['Compétences', '#competences'], ['Parcours', '#parcours'], ['Veille', '#veille']]

// Routage minimal par hash : "#veille" affiche la page de veille, tout le reste affiche l'accueil.
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// Bouton flottant en bas à droite : apparaît après un peu de défilement et ramène tout en haut.
function ScrollTopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <button
    type="button"
    className={visible ? 'to-top is-visible' : 'to-top'}
    aria-label="Remonter en haut de la page"
    title="Remonter en haut"
    tabIndex={visible ? 0 : -1}
    onClick={scrollToTop}
  ><ArrowUp size={20} /></button>
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const hash = useHash()
  const page = hash === '#veille' ? 'veille' : 'home'
  const closeMenu = () => setMenuOpen(false)

  // Clic sur un lien d'ancre de l'accueil (menu, boutons) : défilement doux au lieu du saut brusque.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]')
      if (!link || window.location.hash === '#veille') return
      const href = link.getAttribute('href') || ''
      if (href === '#veille' || href.length < 2) return
      if (scrollToId(href.slice(1))) {
        event.preventDefault()
        history.pushState(null, '', href)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (page === 'veille') {
      window.scrollTo({ top: 0 })
      return
    }
    const id = hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
  }, [hash, page])

  return <div className="site-shell">
    <ScrollTopButton />
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <a href="#accueil" className="brand" onClick={closeMenu}><span className="brand-mark">EZ</span><span>ETHANE<span className="brand-dot">.</span></span></a>
      <button className="menu-toggle" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
        {navItems.map(([label, href]) => <a key={href} href={href} onClick={closeMenu} aria-current={href === '#veille' && page === 'veille' ? 'page' : undefined}>{label}</a>)}
        <a className="nav-contact" href="#contact" onClick={closeMenu}>Me contacter <ArrowUpRight size={15} /></a>
      </nav>
    </header>

    {page === 'veille' ? <Veille /> : <main>
      <section className="hero section-wrap" id="accueil">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> PORTFOLIO · 2026</div>
          <h1>Construire des<br />expériences <span className="gradient-text">numériques.</span></h1>
          <p className="hero-lead">Bonjour, moi c’est Ethane Zimmermann.<br />Développeur web, curieux de nature et motivé par les projets concrets.</p>
          <div className="hero-actions"><a className="button button-primary" href="#projets">Découvrir mes projets <ArrowDownRight size={17} /></a><a className="button button-ghost" href={CV_URL} target="_blank" rel="noreferrer">Voir mon CV <ArrowUpRight size={16} /></a></div>
          <div className="hero-meta"><span><span className="tiny-dot" /> Ouvert aux opportunités</span><span>Développement web · Full stack</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-grid" />
          <div className="profile-frame"><img src="/img/photo_profil.webp" alt="Portrait d’Ethane Zimmermann" /></div>
          <div className="floating-card code-card"><div className="card-dots"><i /><i /><i /></div><code><span className="code-purple">const</span> developer = {'{'}<br />&nbsp; passion: <span className="code-green">'création'</span>,<br />&nbsp; mindset: <span className="code-green">'progression'</span><br />{'}'}</code></div>
          <div className="floating-card availability"><span className="availability-icon"><Code2 size={16} /></span><div><strong>En recherche</strong><small>Alternance ou poste</small></div></div>
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
        </div>
        <a href="#apropos" className="scroll-cue"><span /> DÉFILER POUR EXPLORER</a>
      </section>

      <section className="intro section-wrap" id="apropos">
        <div className="section-kicker"><span>01</span> / À PROPOS</div>
        <div className="intro-content"><h2>La curiosité comme moteur.<br /><span className="muted">Le code comme terrain de jeu.</span></h2><div className="intro-text"><p>Titulaire d’un BTS SIO, spécialité SLAM, je recherche une alternance en développement web full stack. Je m’intéresse à la programmation et aux nouvelles technologies, et j’aime transformer une idée en réalisation concrète.</p><p>Curieux et motivé, j’aime relever des défis et apprendre en continu. En dehors du code, je cultive ma polyvalence avec les jeux vidéo et le sport, que je pratique régulièrement.</p><a className="text-link" href="#contact">Parlons de votre projet <ArrowRight size={16} /></a></div></div>
      </section>

      <section className="projects section-wrap" id="projets">
        <div className="section-heading"><div><div className="section-kicker"><span>02</span> / SÉLECTION</div><h2>Des projets, du <span className="gradient-text">concret.</span></h2></div><a className="text-link" href={GRID_URL} target="_blank" rel="noreferrer">Grille de compétences <ArrowUpRight size={16} /></a></div>
        <div className="project-grid">{projects.map(p => <article className="project-card" key={p.n}>
          <div className="project-art"><span className="project-number">{p.n} / {String(projects.length).padStart(2, '0')}</span><img src={p.image} alt="" loading="lazy" /><span className="project-art-glow" /></div>
          <div className="project-info"><span className="project-type">{p.type}</span><h3>{p.title}</h3><p>{p.description}</p><div className="tags">{p.tags.map(t => <span key={t}>{t}</span>)}</div><div className="project-links"><a href={p.pdf} target="_blank" rel="noreferrer">Documentation <ExternalLink size={14} /></a>{p.demo && <a href={p.demo} target="_blank" rel="noreferrer">Voir le site <ArrowUpRight size={14} /></a>}{p.extraPdf?.map(l => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} <ExternalLink size={14} /></a>)}</div></div>
        </article>)}</div>
      </section>

      <section className="skills-section section-wrap" id="competences">
        <div className="section-kicker"><span>03</span> / BOÎTE À OUTILS</div><div className="skills-heading"><h2>Les outils pour<br /><span className="muted">donner vie aux idées.</span></h2><p>Un socle technique construit au fil de la formation, des projets et des expériences.</p></div>
        <div className="skills-grid">{skills.map(s => <div className="skill-card" key={s.name}><div className="skill-icon"><img src={s.image} alt="" loading="lazy" /></div><div><strong>{s.name}</strong><small>{s.group}</small></div><ArrowUpRight className="skill-arrow" size={16} /></div>)}</div>
        <p className="skills-note">Cette liste reflète les technologies présentes dans mes projets de formation. Je continue à les approfondir au fil de ma pratique.</p>

        <div className="tools" aria-label="Logiciels et systèmes">
          <h3 className="tools-title">Logiciels et systèmes que j’utilise</h3>
          <div className="tools-grid">{toolGroups.map(g => <div className="tool-group" key={g.title}>
            <span className="mini-label">{g.title}</span>
            <ul>{g.items.map(t => <li key={t.name}><img src={t.image} alt="" loading="lazy" /><span>{t.name}</span></li>)}</ul>
          </div>)}</div>
        </div>
      </section>

      <section className="journey section-wrap" id="parcours">
        <div className="section-kicker"><span>04</span> / PARCOURS</div>
        <div className="journey-layout">
          <h2>Apprendre.<br /><span className="gradient-text">Pratiquer.</span><br />Progresser.</h2>
          <div className="timeline">{timeline.map(e => <div className="timeline-item" key={e.title}><span className="timeline-point" /><div>
            <span className="timeline-date">{e.kind} · {e.date}</span>
            <h3>{e.title}</h3>
            {e.place && <span className="timeline-place">{e.place}</span>}
            <p>{e.text}</p>
            {e.logos && <div className="cert-logos">{e.logos.map(l => <img key={l.alt} src={l.image} alt={l.alt} loading="lazy" />)}</div>}
            {e.links && <div className="timeline-links">{e.links.map(l => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} <ArrowUpRight size={13} /></a>)}</div>}
          </div></div>)}</div>
        </div>

        <div className="bts">
          <div className="bts-head"><span className="mini-label">Le BTS SIO en bref</span><p>Une formation en deux ans, avec deux options. J’ai suivi SLAM.</p></div>
          <div className="bts-grid">{btsOptions.map(o => <article className={o.mine ? 'bts-card bts-mine' : 'bts-card'} key={o.code}>
            <div className="bts-top"><h3>{o.code}</h3>{o.mine && <span className="bts-badge">Mon option</span>}</div>
            <strong>{o.full}</strong>
            <p>{o.text}</p>
            <span className="mini-label">Au programme</span>
            <ul>{o.content.map(c => <li key={c}>{c}</li>)}</ul>
            <span className="mini-label">Débouchés</span>
            <ul>{o.jobs.map(c => <li key={c}>{c}</li>)}</ul>
            <a className="text-link" href={o.link} target="_blank" rel="noreferrer">Fiche Onisep <ArrowUpRight size={14} /></a>
          </article>)}</div>
        </div>
      </section>

      <section className="contact section-wrap" id="contact"><div className="contact-panel"><div className="contact-orb" />
        <div className="contact-layout">
          <div className="contact-intro">
            <div className="section-kicker"><span>05</span> / CONTACT</div>
            <h2>Un projet en tête ?<br /><span className="gradient-text">Faisons connaissance.</span></h2>
            <p>Je recherche une alternance en développement web et reste ouvert aux échanges autour de projets numériques.</p>
            <ul className="contact-links">
              <li><a href={`mailto:${CONTACT_EMAIL}`}><Mail size={16} /> {CONTACT_EMAIL}</a></li>
              <li><a href={LINKEDIN_URL} target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer"><Github size={16} /> GitHub</a></li>
            </ul>
          </div>
          <ContactForm />
        </div>
        <div className="contact-foot"><span>ETHANE ZIMMERMANN</span><span>Développeur web · Portfolio</span></div>
      </div></section>
    </main>}

    <footer className="footer section-wrap"><a href="#accueil" className="brand"><span className="brand-mark">EZ</span><span>ETHANE<span className="brand-dot">.</span></span></a><span>Conçu avec soin · React & TypeScript</span><div className="footer-links"><a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17} /></a><a href={LINKEDIN_URL} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={17} /></a><a href={`mailto:${CONTACT_EMAIL}`} aria-label="E-mail"><Mail size={17} /></a></div></footer>
  </div>
}
export default App
