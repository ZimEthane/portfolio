import { useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Github, Linkedin, Mail, Menu, X, Code2, Layers3, Terminal, ExternalLink } from 'lucide-react'

const projects = [
  { n: '01', title: 'Grand R', type: 'CMS · Projet de groupe', description: 'Conception d’un site de gestion de contenu dans le cadre du BTS SIO.', tags: ['CMS', 'Web', 'Travail d’équipe'], image: '/img/projets/logo-grand-r.webp', pdf: '/pdf/projet-1/documention_project_Grand_R(Ethane,Isaac,Mathew).pdf' },
  { n: '02', title: 'Netto', type: 'Application métier', description: 'Projet applicatif réalisé dans le cadre de la formation, avec documentation technique.', tags: ['Développement', 'Documentation'], image: '/img/projets/logo-netto.webp', pdf: '/pdf/projet-2/AP2DOC.pdf' },
  { n: '03', title: 'Sport Extrême', type: 'Site web · Projet scolaire', description: 'Site éditorial autour des sports extrêmes, avec contenus multimédias et plusieurs pages thématiques.', tags: ['HTML', 'CSS', 'JavaScript'], image: '/img/projets/sport-extreme.webp', pdf: '/pdf/projet-3/Rapport_Site_Sports_Extremes.pdf', demo: '/site_web_sport_extreme/index.html' },
  { n: '04', title: 'AMSET', type: 'Projet applicatif', description: 'Projet développé en formation, accompagné d’un rapport de réalisation.', tags: ['Application', 'BTS SIO'], image: '/img/projets/logo-amset.webp', pdf: '/pdf/projet-4/rapport-amset.pdf' },
  { n: '05', title: 'Java / NetBeans', type: 'Développement logiciel', description: 'Projet de développement réalisé avec Java et NetBeans, avec documentation associée.', tags: ['Java', 'NetBeans'], image: '/img/projets/logo-java.webp', pdf: '/pdf/projet-5/AP4_Netbeans_doc_Ethane_-_Stephan_-_Mateo.pdf' },
  { n: '06', title: 'Stages en entreprise', type: 'Expérience professionnelle', description: 'Rapports de stage de première et deuxième année chez Microsphères Informatique.', tags: ['Stage', 'Expérience'], image: '/img/projets/logo-microspheres-informatique-caussade.webp', pdf: '/pdf/projet-6/Rapport_de_Stage_BTS_S.I.O_Microspheres_1_annee.pdf', extraPdf: '/pdf/projet-7/Rapport_de_Stage_BTS_S.I.O_Microsphéres_2_annee.pdf' },
  { n: '07', title: 'Infrastructure Azure', type: 'Cloud · Base de données', description: 'Travail de documentation autour de la réplication MariaDB sur Azure.', tags: ['Azure', 'MariaDB', 'Cloud'], image: '/img/projets/Azure.webp', pdf: '/pdf/projet-8/Replication_MariaDB_sur_AZURE_-_Zimmermann_Ethane.pdf' },
]

const skills = [
  { name: 'HTML & CSS', image: '/img/competence/html.webp', group: 'Frontend' },
  { name: 'JavaScript', image: '/img/competence/js.webp', group: 'Frontend' },
  { name: 'PHP', image: '/img/competence/php.webp', group: 'Backend' },
  { name: 'Python', image: '/img/competence/python.webp', group: 'Développement' },
  { name: 'C#', image: '/img/competence/csharp.webp', group: 'Développement' },
  { name: 'Java', image: '/img/competence/java.webp', group: 'Développement' },
  { name: 'SQL Server', image: '/img/competence/sql-server.webp', group: 'Données' },
  { name: 'CodeIgniter', image: '/img/competence/codeigniter.webp', group: 'Backend' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  return <div className="site-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <a href="#accueil" className="brand" onClick={closeMenu}><span className="brand-mark">EZ</span><span>ETHANE<span className="brand-dot">.</span></span></a>
      <button className="menu-toggle" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
        {[['À propos','#apropos'],['Projets','#projets'],['Compétences','#competences'],['Parcours','#parcours']].map(([label, href]) => <a key={href} href={href} onClick={closeMenu}>{label}</a>)}
        <a className="nav-contact" href="#contact" onClick={closeMenu}>Me contacter <ArrowUpRight size={15}/></a>
      </nav>
    </header>

    <main>
      <section className="hero section-wrap" id="accueil">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> PORTFOLIO · 2026</div>
          <h1>Construire des<br/>expériences <span className="gradient-text">numériques.</span></h1>
          <p className="hero-lead">Bonjour, moi c’est Ethane Zimmermann.<br/>Développeur web, curieux de nature et motivé par les projets concrets.</p>
          <div className="hero-actions"><a className="button button-primary" href="#projets">Découvrir mes projets <ArrowDownRight size={17}/></a><a className="button button-ghost" href="/pdf/CVZimmermann_Ethane_2025.pdf.pdf" target="_blank" rel="noreferrer">Voir mon CV <ArrowUpRight size={16}/></a></div>
          <div className="hero-meta"><span><span className="tiny-dot"/> Ouvert aux opportunités</span><span>Développement web · Full stack</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-grid" />
          <div className="profile-frame"><img src="/img/photo_profil.webp" alt="Portrait d’Ethane Zimmermann" /></div>
          <div className="floating-card code-card"><div className="card-dots"><i/><i/><i/></div><code><span className="code-purple">const</span> developer = {'{'}<br/>&nbsp; passion: <span className="code-green">'création'</span>,<br/>&nbsp; mindset: <span className="code-green">'progression'</span><br/>{'}'}</code></div>
          <div className="floating-card availability"><span className="availability-icon"><Code2 size={16}/></span><div><strong>En recherche</strong><small>Emploi · Alternance</small></div></div>
          <div className="orbit orbit-a"/><div className="orbit orbit-b"/>
        </div>
        <a href="#apropos" className="scroll-cue"><span/> DÉFILER POUR EXPLORER</a>
      </section>

      <section className="intro section-wrap" id="apropos">
        <div className="section-kicker"><span>01</span> / À PROPOS</div>
        <div className="intro-content"><h2>La curiosité comme moteur.<br/><span className="muted">Le code comme terrain de jeu.</span></h2><div className="intro-text"><p>Titulaire d’un BTS SIO, spécialité SLAM, je m’intéresse au développement d’applications et à la création de solutions web utiles. J’aime apprendre, comprendre comment les choses fonctionnent et transformer une idée en réalisation concrète.</p><p>Je cherche aujourd’hui à continuer à progresser au sein d’une équipe, contribuer à des projets réels et développer mes compétences techniques.</p><a className="text-link" href="#contact">Parlons de votre projet <ArrowRight size={16}/></a></div></div>
      </section>

      <section className="projects section-wrap" id="projets">
        <div className="section-heading"><div><div className="section-kicker"><span>02</span> / SÉLECTION</div><h2>Des projets, du <span className="gradient-text">concret.</span></h2></div><a className="text-link" href="/pdf/BTS_SIO_-_Annexe_8-1_-_Tableau_de_synthe_se_-_Epreuve_E4-_BTS_SIO_2024_-_Zimmermann_Ethane.pdf" target="_blank" rel="noreferrer">Grille de compétences <ArrowUpRight size={16}/></a></div>
        <div className="project-grid">{projects.map(p => <article className="project-card" key={p.n}>
          <div className="project-art"><span className="project-number">{p.n} / 07</span><img src={p.image} alt="" loading="lazy"/><span className="project-art-glow"/></div>
          <div className="project-info"><span className="project-type">{p.type}</span><h3>{p.title}</h3><p>{p.description}</p><div className="tags">{p.tags.map(t => <span key={t}>{t}</span>)}</div><div className="project-links"><a href={p.pdf} target="_blank" rel="noreferrer">Documentation <ExternalLink size={14}/></a>{p.demo && <a href={p.demo} target="_blank" rel="noreferrer">Voir le site <ArrowUpRight size={14}/></a>}{p.extraPdf && <a href={p.extraPdf} target="_blank" rel="noreferrer">Stage année 2 <ExternalLink size={14}/></a>}</div></div>
        </article>)}</div>
      </section>

      <section className="skills-section section-wrap" id="competences">
        <div className="section-kicker"><span>03</span> / BOÎTE À OUTILS</div><div className="skills-heading"><h2>Les outils pour<br/><span className="muted">donner vie aux idées.</span></h2><p>Un socle technique construit au fil de la formation, des projets et des expériences.</p></div>
        <div className="skills-grid">{skills.map(s => <div className="skill-card" key={s.name}><div className="skill-icon"><img src={s.image} alt="" loading="lazy"/></div><div><strong>{s.name}</strong><small>{s.group}</small></div><ArrowUpRight className="skill-arrow" size={16}/></div>)}</div>
        <p className="skills-note">Cette liste reflète les technologies présentes dans mes projets de formation. Je continue à les approfondir au fil de ma pratique.</p>
      </section>

      <section className="journey section-wrap" id="parcours">
        <div className="section-kicker"><span>04</span> / PARCOURS</div><div className="journey-layout"><h2>Apprendre.<br/><span className="gradient-text">Pratiquer.</span><br/>Progresser.</h2><div className="timeline">
          <div className="timeline-item"><span className="timeline-point"/><div><span className="timeline-date">FORMATION</span><h3>BTS Services Informatiques aux Organisations</h3><p>Spécialité SLAM — Solutions Logicielles et Applications Métiers.</p></div></div>
          <div className="timeline-item"><span className="timeline-point"/><div><span className="timeline-date">EXPÉRIENCE</span><h3>Stages chez Microsphères Informatique</h3><p>Deux expériences documentées dans le cadre du BTS, avec rapports disponibles.</p><div className="timeline-links"><a href="/pdf/projet-6/Rapport_de_Stage_BTS_S.I.O_Microspheres_1_annee.pdf" target="_blank" rel="noreferrer">Rapport année 1 <ArrowUpRight size={13}/></a><a href="/pdf/projet-7/Rapport_de_Stage_BTS_S.I.O_Microsphéres_2_annee.pdf" target="_blank" rel="noreferrer">Rapport année 2 <ArrowUpRight size={13}/></a></div></div></div>
          <div className="timeline-item"><span className="timeline-point"/><div><span className="timeline-date">CERTIFICATIONS</span><h3>Certifications & sensibilisation numérique</h3><p>Documents disponibles : Pix et sensibilisation à la cybersécurité ANSSI.</p><div className="timeline-links"><a href="/pdf/attestation-pix-20250131.pdf" target="_blank" rel="noreferrer">Certification Pix <ArrowUpRight size={13}/></a><a href="/pdf/atestation_mooc_anssi_Zimmermann_Ethane.pdf" target="_blank" rel="noreferrer">MOOC ANSSI <ArrowUpRight size={13}/></a></div></div></div>
        </div></div>
      </section>

      <section className="contact section-wrap" id="contact"><div className="contact-panel"><div className="contact-orb"/><div className="section-kicker"><span>05</span> / CONTACT</div><h2>Un projet en tête ?<br/><span className="gradient-text">Faisons connaissance.</span></h2><p>Je suis ouvert aux opportunités en développement web et aux échanges autour de projets numériques.</p><a className="button button-primary" href="mailto:contact@exemple.fr?subject=Contact%20depuis%20le%20portfolio">Me contacter <Mail size={16}/></a><div className="contact-foot"><span>ETHANE ZIMMERMANN</span><span>Développeur web · Portfolio</span></div></div></section>
    </main>
    <footer className="footer section-wrap"><a href="#accueil" className="brand"><span className="brand-mark">EZ</span><span>ETHANE<span className="brand-dot">.</span></span></a><span>Conçu avec soin · React & TypeScript</span><div className="footer-links"><a href="https://github.com/ZimEthane" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17}/></a><a href="#contact" aria-label="Contact"><Mail size={17}/></a></div></footer>
  </div>
}
export default App