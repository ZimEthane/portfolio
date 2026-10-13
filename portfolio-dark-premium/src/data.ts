export const CONTACT_EMAIL = 'ethan.zim@hotmail.com'
export const GITHUB_URL = 'https://github.com/ZimEthane'
export const LINKEDIN_URL = 'https://www.linkedin.com/in/ethane-zimmermann-509884326/'

export type Project = {
  n: string
  title: string
  type: string
  description: string
  tags: string[]
  image: string
  pdf: string
  demo?: string
  extraPdf?: { label: string; href: string }[]
}

export const projects: Project[] = [
  { n: '01', title: 'Grand R', type: 'CMS · Projet de groupe', description: 'Conception d’un site de gestion de contenu dans le cadre du BTS SIO.', tags: ['CMS', 'Web', 'Travail d’équipe'], image: '/img/projets/logo-grand-r.webp', pdf: '/pdf/projet-1/documention_project_Grand_R(Ethane,Isaac,Mathew).pdf' },
  { n: '02', title: 'Netto', type: 'Application métier', description: 'Projet applicatif réalisé dans le cadre de la formation, avec documentation technique.', tags: ['Développement', 'Documentation'], image: '/img/projets/logo-netto.webp', pdf: '/pdf/projet-2/AP2DOC.pdf' },
  { n: '03', title: 'Sport Extrême', type: 'Site web · Projet scolaire', description: 'Site éditorial autour des sports extrêmes, avec contenus multimédias et plusieurs pages thématiques.', tags: ['HTML', 'CSS', 'JavaScript'], image: '/img/projets/sport-extreme.webp', pdf: '/pdf/projet-3/Rapport_Site_Sports_Extremes.pdf', demo: '/site_web_sport_extreme/index.html' },
  { n: '04', title: 'AMSET', type: 'Projet applicatif', description: 'Projet développé en formation, accompagné d’un rapport de réalisation.', tags: ['Application', 'BTS SIO'], image: '/img/projets/logo-amset.webp', pdf: '/pdf/projet-4/rapport-amset.pdf' },
  { n: '05', title: 'Java / NetBeans', type: 'Développement logiciel', description: 'Projet de développement réalisé avec Java et NetBeans, avec documentation associée.', tags: ['Java', 'NetBeans'], image: '/img/projets/logo-java.webp', pdf: '/pdf/projet-5/AP4_Netbeans_doc_Ethane_-_Stephan_-_Mateo.pdf' },
  {
    n: '06', title: 'Stages en entreprise', type: 'Expérience professionnelle',
    description: 'Maintenance informatique en première année, puis création du site internet de Microsphères Informatique en seconde année.',
    tags: ['Stage', 'Maintenance', 'Site web'], image: '/img/projets/logo-microspheres-informatique-caussade.webp',
    pdf: '/pdf/projet-6/Rapport_de_Stage_BTS_S.I.O_Microspheres_1_annee.pdf',
    extraPdf: [
      { label: 'Stage année 2', href: '/pdf/projet-7/Rapport_de_Stage_BTS_S.I.O_Microsphéres_2_annee.pdf' },
      { label: 'Back-office', href: '/pdf/projet-7/documentation_back-office_Microspheres.pdf' },
    ],
  },
  { n: '07', title: 'Infrastructure Azure', type: 'Cloud · Base de données', description: 'Travail de documentation autour de la réplication MariaDB sur Azure.', tags: ['Azure', 'MariaDB', 'Cloud'], image: '/img/projets/Azure.webp', pdf: '/pdf/projet-8/Replication_MariaDB_sur_AZURE_-_Zimmermann_Ethane.pdf' },
]

export const skills = [
  { name: 'HTML & CSS', image: '/img/competence/html.webp', group: 'Frontend' },
  { name: 'JavaScript', image: '/img/competence/js.webp', group: 'Frontend' },
  { name: 'PHP', image: '/img/competence/php.webp', group: 'Backend' },
  { name: 'Python', image: '/img/competence/python.webp', group: 'Développement' },
  { name: 'C#', image: '/img/competence/csharp.webp', group: 'Développement' },
  { name: 'Java', image: '/img/competence/java.webp', group: 'Développement' },
  { name: 'SQL Server', image: '/img/competence/sql-server.webp', group: 'Données' },
  { name: 'CodeIgniter', image: '/img/competence/codeigniter.webp', group: 'Backend' },
]

export type Tool = { name: string; image: string }
export const toolGroups: { title: string; items: Tool[] }[] = [
  {
    title: 'Développement',
    items: [
      { name: 'Visual Studio Code', image: '/img/logiciel/Visual_Studio_Code.webp' },
      { name: 'Apache NetBeans', image: '/img/logiciel/Apache_NetBeans.webp' },
      { name: 'WampServer', image: '/img/logiciel/WampServer.webp' },
      { name: 'phpMyAdmin', image: '/img/logiciel/PhpMyAdmin.webp' },
      { name: 'pgAdmin', image: '/img/logiciel/pgadmin.webp' },
      { name: 'FileZilla', image: '/img/logiciel/FileZilla.webp' },
      { name: 'PuTTY', image: '/img/logiciel/PuTTY_Icon.svg.webp' },
    ],
  },
  {
    title: 'Systèmes, réseau et cloud',
    items: [
      { name: 'Proxmox', image: '/img/logiciel/proxmox.webp' },
      { name: 'VirtualBox', image: '/img/logiciel/Virtualbox.webp' },
      { name: 'Cisco Packet Tracer', image: '/img/logiciel/Cisco_Packet_Tracer.webp' },
      { name: 'Azure', image: '/img/logiciel/Azur.webp' },
    ],
  },
  {
    title: 'Systèmes d’exploitation',
    items: [
      { name: 'Debian', image: '/img/os/debian.webp' },
      { name: 'Kali Linux', image: '/img/os/Kali_linux.webp' },
      { name: 'Windows', image: '/img/os/Windows.webp' },
    ],
  },
  {
    title: 'Bureautique, modélisation et CMS',
    items: [
      { name: 'Word', image: '/img/logiciel/Microsoft_Word.webp' },
      { name: 'Excel', image: '/img/logiciel/Microsoft_Exel.webp' },
      { name: 'PowerPoint', image: '/img/logiciel/Microsoft_PowerPoint.webp' },
      { name: 'WinDesign', image: '/img/logiciel/windesing.webp' },
      { name: 'WordPress', image: '/img/cms/WordPress.webp' },
    ],
  },
]

export type TimelineEntry = {
  kind: string
  date: string
  title: string
  place?: string
  text: string
  links?: { label: string; href: string }[]
  logos?: { alt: string; image: string }[]
}

export const timeline: TimelineEntry[] = [
  {
    kind: 'STAGE', date: '2025', title: 'Stage 2, Microsphères Informatique', place: 'Monteils',
    text: 'Conception et développement du site internet de l’entreprise, qui n’en avait pas. Une mise en pratique complète des compétences web, avec les exigences d’un client réel.',
    links: [
      { label: 'Rapport année 2', href: '/pdf/projet-7/Rapport_de_Stage_BTS_S.I.O_Microsphéres_2_annee.pdf' },
      { label: 'Documentation back-office', href: '/pdf/projet-7/documentation_back-office_Microspheres.pdf' },
    ],
  },
  {
    kind: 'STAGE', date: '2024', title: 'Stage 1, Microsphères Informatique', place: 'Monteils',
    text: 'Maintenance informatique, logicielle et matérielle, sur des ordinateurs portables et fixes. Découverte des méthodes de travail en entreprise.',
    links: [{ label: 'Rapport année 1', href: '/pdf/projet-6/Rapport_de_Stage_BTS_S.I.O_Microspheres_1_annee.pdf' }],
  },
  {
    kind: 'DIPLÔME', date: '2023 – 2025', title: 'BTS SIO, option SLAM', place: 'Lycée Claude Nougaro',
    text: 'Services Informatiques aux Organisations, option Solutions Logicielles et Applications Métiers : conception, développement et maintenance d’applications.',
    links: [{ label: 'Tableau de synthèse E4', href: '/pdf/BTS_SIO_-_Annexe_8-1_-_Tableau_de_synthe_se_-_Epreuve_E4-_BTS_SIO_2024_-_Zimmermann_Ethane.pdf' }],
  },
  {
    kind: 'FORMATION', date: 'Oct. 2022 – mars 2023', title: 'Projet Professionnel Numérique', place: 'ADRAR, Montauban',
    text: 'Les fondamentaux du numérique avec une initiation pratique au développement web, au hardware, aux réseaux et à la cybersécurité. Elle m’a permis de préciser mon projet dans l’informatique.',
  },
  {
    kind: 'CERTIFICATIONS', date: 'Pix : janvier 2025', title: 'Pix et sensibilisation à la cybersécurité',
    text: 'Certification Pix et attestation de suivi du MOOC SecNumacadémie de l’ANSSI.',
    links: [
      { label: 'Certification Pix', href: '/pdf/attestation-pix-20250131.pdf' },
      { label: 'Attestation ANSSI', href: '/pdf/atestation_mooc_anssi_Zimmermann_Ethane.pdf' },
    ],
    logos: [
      { alt: 'Pix', image: '/img/certifications/Pix.webp' },
      { alt: 'SecNumacadémie', image: '/img/certifications/secNum academie.webp' },
    ],
  },
  {
    kind: 'DIPLÔME', date: '2019 – 2021', title: 'Baccalauréat STMG, spécialité Mercatique', place: 'Lycée Claude Nougaro',
    text: 'Sciences et technologies du management et de la gestion.',
  },
]

export const btsOptions = [
  {
    code: 'SLAM',
    full: 'Solutions Logicielles et Applications Métiers',
    mine: true,
    text: 'Conception, développement et maintenance d’applications répondant aux besoins des entreprises.',
    content: ['Programmation (Java, C#, PHP)', 'Conception et tests d’applications', 'Bases de données relationnelles', 'Développement web', 'Gestion de projet, cycle en V et agile', 'Anglais technique'],
    jobs: ['Développeur d’applications', 'Analyste-programmeur', 'Intégrateur web', 'Chef de projet junior'],
    link: 'https://www.onisep.fr/ressources/univers-formation/formations/post-bac/bts-services-informatiques-aux-organisations-option-b-solutions-logicielles-et-applications-metiers',
  },
  {
    code: 'SISR',
    full: 'Solutions d’Infrastructure, Systèmes et Réseaux',
    mine: false,
    text: 'Conception, mise en place, sécurisation et maintenance des équipements et des réseaux.',
    content: ['Administration des systèmes (Windows, Linux)', 'Administration et sécurisation des réseaux', 'Virtualisation', 'Bases de données relationnelles', 'Gestion de projet', 'Anglais technique'],
    jobs: ['Administrateur systèmes et réseaux', 'Technicien support et déploiement', 'Ingénieur système et réseau junior', 'Consultant en sécurité'],
    link: 'https://www.onisep.fr/ressources/univers-formation/formations/post-bac/bts-services-informatiques-aux-organisations-option-a-solutions-d-infrastructure-systemes-et-reseaux',
  },
]

/* ---------- Veille technologique : Visual Studio Code ---------- */

export const veille = {
  intro: [
    'Visual Studio Code est un éditeur de code open source développé par Microsoft. Il est gratuit, multiplateforme et très personnalisable. Son succès repose sur un écosystème riche et sur des fonctions intégrées : intelligence artificielle, Git, cloud et un large choix d’extensions.',
    'Compatible avec Windows, Linux et macOS, il a été conçu pour offrir une expérience de développement moderne et efficace.',
  ],
  evolutions: [
    { icon: 'ia', title: 'Intégration de l’IA', points: ['GitHub Copilot intégré pour générer du code.', 'Copilot Chat (2024) pour dialoguer en langage naturel.', 'Extensions IA : CodeGPT, Tabnine, Continue.'], source: { label: 'GitHub Blog', href: 'https://github.blog/news-insights/product-news/github-copilot-chat-beta-now-available-for-all-individuals/' } },
    { icon: 'cloud', title: 'Développement cloud et distant', points: ['GitHub Codespaces : un environnement prêt dans le cloud.', 'Remote SSH et Containers : travail à distance optimisé.'], source: { label: 'VS Code Docs', href: 'https://code.visualstudio.com/docs/remote/remote-overview' } },
    { icon: 'ext', title: 'Extensions et personnalisation', points: ['Extensions : Python, Docker, Jupyter, etc.', 'Thèmes : One Dark Pro, Dracula, Monokai.', 'Configuration fine par fichiers JSON.'], source: { label: 'Marketplace', href: 'https://marketplace.visualstudio.com/VSCode' } },
    { icon: 'devops', title: 'DevOps et CI/CD', points: ['Git intégré, gestion visuelle des conflits.', 'Extensions pour GitHub Actions et Azure Pipelines.'], source: { label: 'VS Code GitHub', href: 'https://code.visualstudio.com/docs/sourcecontrol/github' } },
    { icon: 'perf', title: 'Performance et télémétrie', points: ['Mode performance activé automatiquement.', 'Optimisé pour les gros projets, WebAssembly et Rust.'], source: { label: 'Release Notes', href: 'https://code.visualstudio.com/updates' } },
  ],
  accounts: [
    { handle: '@code', note: 'Compte officiel VS Code', href: 'https://twitter.com/code' },
    { handle: '@github', note: 'Annonces Copilot et Codespaces', href: 'https://twitter.com/github' },
    { handle: '@burkeholland', note: 'Microsoft Developer', href: 'https://twitter.com/burkeholland' },
    { handle: '@ThePrimeagen', note: 'YouTubeur et outils de dev', href: 'https://twitter.com/ThePrimeagen' },
  ],
  communities: [
    { label: 'YouTube, VS Code', href: 'https://www.youtube.com/@code' },
    { label: 'Reddit, r/vscode', href: 'https://www.reddit.com/r/vscode/' },
    { label: 'Dev.to, #vscode', href: 'https://dev.to/t/vscode' },
  ],
  timeline: [
    { year: '2015', text: 'Lancement initial de Visual Studio Code' },
    { year: '2017', text: 'Passage à l’open source, support multiplateforme' },
    { year: '2021', text: 'GitHub Copilot intégré en version bêta' },
    { year: '2022', text: 'Lancement de Codespaces et de VS Code Web' },
    { year: '2024', text: 'Copilot Chat intégré dans VS Code' },
  ],
  languages: ['C', 'C#', 'C++', 'COBOL', 'D', 'Delphi', 'Django', 'Go', 'Groovy', 'HCL', 'HTML', 'Java', 'JavaScript', 'JSON', 'Kotlin', 'Lua', 'Markdown', 'MATLAB', 'Nim', 'Objective-C', 'Perl', 'PHP', 'Python', 'R', 'Ruby', 'Rust', 'SAS', 'Scala', 'Scheme', 'Shell', 'SQL', 'TypeScript', 'XAML'],
  languagesSource: { label: 'Wikipédia, Visual Studio Code', href: 'https://fr.wikipedia.org/wiki/Visual_Studio_Code' },
  pros: ['Gratuit et open source', 'Très rapide et léger', 'Immense bibliothèque d’extensions', 'Support de nombreux langages', 'Interface moderne et personnalisable', 'Intégration Git et Copilot'],
  cons: ['Pas un IDE complet sans extensions', 'Peut nécessiter une configuration initiale', 'Parfois instable avec trop d’extensions', 'Pas adapté aux projets Java lourds par défaut', 'Interface moins intuitive pour les débutants', 'Copilot et le cloud demandent une bonne connexion'],
  prosConsSources: [
    { label: 'Documentation officielle de VS Code', href: 'https://code.visualstudio.com/docs' },
    { label: 'StackShare', href: 'https://stackshare.io/visual-studio-code' },
    { label: 'TrustRadius', href: 'https://www.trustradius.com/products/microsoft-visual-studio-code/reviews' },
    { label: 'G2', href: 'https://www.g2.com/products/visual-studio-code/reviews' },
  ],
  /* niveau : good = point fort, mid = selon le contexte, bad = limite */
  compare: [
    { criterion: 'Type', vscode: ['good', 'Éditeur de code léger'], netbeans: ['good', 'IDE complet'] },
    { criterion: 'Performances', vscode: ['good', 'Très rapide'], netbeans: ['bad', 'Plus lourd à l’exécution'] },
    { criterion: 'Extensibilité', vscode: ['good', 'Excellente, via extensions'], netbeans: ['mid', 'Limitée comparée à VS Code'] },
    { criterion: 'Support Java', vscode: ['mid', 'Via extensions (Java Extension Pack)'], netbeans: ['good', 'Support natif et robuste'] },
    { criterion: 'Langages supportés', vscode: ['good', 'Multilangage via extensions'], netbeans: ['mid', 'Java, PHP, C/C++ principalement'] },
    { criterion: 'Interface', vscode: ['good', 'Moderne et personnalisable'], netbeans: ['bad', 'Classique, parfois datée'] },
    { criterion: 'Débogage', vscode: ['mid', 'Excellent, avec extensions'], netbeans: ['good', 'Intégré pour Java'] },
    { criterion: 'Intégration Git', vscode: ['good', 'Native et fluide'], netbeans: ['mid', 'Moins fluide'] },
    { criterion: 'Utilisation cloud', vscode: ['good', 'Compatible (GitHub Codespaces)'], netbeans: ['bad', 'Peu adapté au cloud'] },
  ] as { criterion: string; vscode: ['good' | 'mid' | 'bad', string]; netbeans: ['good' | 'mid' | 'bad', string] }[],
  compareSources: [
    { label: 'StackShare, VS Code', href: 'https://stackshare.io/visual-studio-code' },
    { label: 'StackShare, NetBeans', href: 'https://stackshare.io/netbeans' },
    { label: 'StackShare, comparatif détaillé', href: 'https://stackshare.io/stackups/netbeans-vs-visual-studio-code' },
    { label: 'TrustRadius, comparatif', href: 'https://www.trustradius.com/compare-products/microsoft-visual-studio-code-vs-netbeans' },
    { label: 'Software Advice, avis NetBeans', href: 'https://www.softwareadvice.com/app-development/apache-netbeans-profile/reviews/' },
  ],
  conclusion: 'Visual Studio Code est aujourd’hui un outil indispensable dans l’écosystème du développement logiciel. Grâce à son adaptabilité, son ouverture à l’IA et ses fonctions cloud, il évolue en continu pour répondre aux besoins des développeurs. Une veille active sur les extensions et les annonces officielles permet d’en tirer le meilleur parti.',
  resources: [
    { label: 'Télécharger VS Code', href: 'https://code.visualstudio.com/' },
    { label: 'Documentation officielle', href: 'https://code.visualstudio.com/docs' },
  ],
}
