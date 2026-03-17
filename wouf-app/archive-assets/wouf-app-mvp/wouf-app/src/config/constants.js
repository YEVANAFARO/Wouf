/**
 * WOUF — Constants & Data
 */

// ── Races de chiens ────────────────────────────────────────
export const BREEDS = [
  "Akita Inu","American Staffordshire","Basenji","Basset Hound","Beagle","Beauceron",
  "Berger Allemand","Berger Australien","Berger Belge Malinois","Berger Blanc Suisse",
  "Bichon Frisé","Bichon Maltais","Border Collie","Boston Terrier","Bouledogue Anglais",
  "Bouledogue Français","Bouvier Bernois","Boxer","Braque Allemand","Bull Terrier",
  "Cairn Terrier","Cane Corso","Caniche","Carlin","Cavalier King Charles","Chihuahua",
  "Chow-Chow","Cocker Anglais","Colley","Corgi Pembroke","Dalmatien","Doberman",
  "Dogue Allemand","Épagneul Breton","Golden Retriever","Husky Sibérien",
  "Jack Russell Terrier","Labrador Retriever","Lhassa Apso","Loulou de Poméranie",
  "Malamute d'Alaska","Montagne des Pyrénées","Pit Bull","Rottweiler","Saint-Bernard",
  "Samoyède","Schnauzer","Setter Anglais","Shar Pei","Shiba Inu","Shih Tzu",
  "Spitz Japonais","Staffordshire Bull Terrier","Teckel","Terre-Neuve",
  "West Highland White Terrier","Whippet","Yorkshire Terrier",
].sort();

// ── Personnalités ──────────────────────────────────────────
export const PERSONALITIES = [
  "Calme","Anxieux","Joueur","Protecteur","Curieux","Réactif","Sociable",
  "Indépendant","Collant","Craintif","Dominant","Soumis","Gourmand",
  "Têtu","Sensible","Énergique","Affectueux","Peureux",
];

// ── Déclencheurs ───────────────────────────────────────────
export const TRIGGERS = [
  "Sonnette / Interphone","Porte d'entrée","Bruits de couloir","Autres chiens (vue)",
  "Autres chiens (son)","Chats","Voitures / Motos","Enfants qui crient",
  "Inconnus / Visiteurs","Orage / Tonnerre","Aspirateur","Feux d'artifice",
  "Solitude","Nourriture visible","Moment de la promenade","Facteur","Sirènes / Alarmes",
];

// ── Santé ──────────────────────────────────────────────────
export const HEALTH_SIGNS = [
  "Bave beaucoup","A vomi récemment","Problèmes digestifs","Boite ou se déplace difficilement",
  "Ne mange plus depuis plus de 24h","Tremble sans raison","Se gratte beaucoup",
  "Respire vite ou siffle","Tousse souvent","Prise/perte de poids","Aucun signe particulier",
];

// ── Spécificités physiques ─────────────────────────────────
export const PHYSICAL_SPECS = [
  "Queue coupée / courte","Oreilles coupées","Un œil / vision réduite",
  "Sourd / malentendant","Trois pattes","Cicatrice visible","Prothèse / handicap",
  "Embonpoint","Très mince","Poils longs","Poils ras","Aucune particularité",
];

// ── Activités ──────────────────────────────────────────────
export const ACTIVITIES = [
  "Promenades longues","Course / Jogging","Jeux de balle","Nage","Agility",
  "Jeux d'intelligence","Câlins sur le canapé","Jeux avec d'autres chiens",
  "Pistage / Flair","Tug / Corde","Frisbee",
];

// ── Gabarits (avec fourchettes) ────────────────────────────
export const SIZES = [
  "Très petit (< 5 kg)",
  "Petit (5-10 kg)",
  "Moyen (10-25 kg)",
  "Grand (25-45 kg)",
  "Très grand / Géant (> 45 kg)",
];

// ── Contexte (pour le scan) ────────────────────────────────
export const CONTEXTS = [
  "Sonnette ou quelqu'un à la porte","Bruit dehors","Un autre chien visible",
  "Un autre chien entendu","Un chat","Quelqu'un arrive","C'est l'heure du repas",
  "C'est l'heure de la promenade","Il est seul","Il jouait",
  "Fenêtre ou porte ouverte","Orage","Véhicule qui passe","Enfant qui joue",
  "Aspirateur ou appareil","Lieu nouveau","Rien de spécial",
];

// ── Émotions (pour la correction) ──────────────────────────
export const EMOTIONS = [
  "Peur","Excitation","Frustration","Joie","Impatience","Colère","Douleur",
  "Ennui","Territorialité","Jalousie","Demande d'attention","Protection",
  "Envie de jouer","Anxiété de séparation","Inconfort","Curiosité","Faim / Soif",
  "Besoin de sortir",
];

// ── Questions Body Language ────────────────────────────────
export const BODY_QUESTIONS_QUICK = [
  { id: "queue", q: "La queue de {name} ?", icon: "🐕", options: ["Remue vite","Basse ou entre les pattes","Droite et rigide","Détendue"] },
  { id: "son", q: "Type de son ?", icon: "🔊", options: ["Aigu et rapide","Grave et espacé","Gémissement","Grognement","Hurlement","Mélange"] },
  { id: "habituel", q: "C'est habituel ?", icon: "🔄", options: ["Très fréquent","De temps en temps","Plutôt rare","Première fois"] },
];

export const BODY_QUESTIONS_PRECISE = [
  { id: "queue", q: "La queue de {name} ?", icon: "🐕", options: ["Remue vite, portée haute","Remue lentement, basse","Coincée entre les pattes","Droite et rigide","Poils hérissés","Détendue"] },
  { id: "oreilles", q: "Les oreilles ?", icon: "👂", options: ["Dressées en avant","Plaquées en arrière","Détendues","Bougent d'avant en arrière"] },
  { id: "posture", q: "Sa posture ?", icon: "🦴", options: ["Tendu, rigide","Recroquevillé","Poils du dos hérissés","Saute ou bondit","Position de jeu (avant bas)","Tremble","Détendu"] },
  { id: "babines", q: "{name} bave ou halète ?", icon: "🦷", options: ["Bave beaucoup","Halète fortement","Se lèche les babines","Babines retroussées","Gueule normale"] },
  { id: "son", q: "Type de son ?", icon: "🔊", options: ["Aigu et rapide","Grave et espacé","Un seul cri fort","Gémissement","Grognement","Hurlement","Mélange"] },
  { id: "mange", q: "Dernière fois que {name} a mangé ?", icon: "🍖", options: ["Moins d'1 heure","1 à 3 heures","Plus de 3 heures","Pas mangé aujourd'hui","Je ne sais pas"] },
  { id: "habituel", q: "Ce comportement est habituel ?", icon: "🔄", options: ["Quasi quotidien","1-2 fois/semaine","Quelques fois/mois","Première fois"] },
];

// ── Tips du jour ───────────────────────────────────────────
export const DAILY_TIPS = [
  "Les chiens ont 200 millions de récepteurs olfactifs — 40× plus que nous.",
  "Un aboiement aigu et rapide = souvent excitation ou frustration.",
  "Le bâillement chez le chien est un signal d'apaisement, pas de fatigue.",
  "Queue haute = confiance. Basse = soumission ou peur.",
  "Un chien qui se lèche les babines sans manger exprime souvent de l'anxiété.",
  "Les chiens distinguent environ 1000 expressions faciales humaines.",
  "Un grognement pendant le jeu est normal et sain — c'est de la communication.",
  "Les chiens voient principalement en bleu et jaune, pas en rouge.",
  "Un chien qui tourne sur lui-même avant de se coucher suit un instinct ancestral.",
  "Le contact visuel prolongé entre toi et ton chien libère de l'ocytocine chez les deux.",
];

// ── Plans d'abonnement ─────────────────────────────────────
export const PLANS = {
  free: {
    name: 'Free',
    scansPerDay: 3,
    maxDogs: 1,
    historyDays: 7,
    modes: ['quick'],
    features: ['3 scans/jour', '1 chien', '7j historique', 'Mode Rapide'],
  },
  plus: {
    name: 'Plus',
    priceMonthly: '4,99€',
    priceAnnual: '39,99€',
    scansPerDay: Infinity,
    maxDogs: 3,
    historyDays: 90,
    modes: ['quick', 'precise'],
    features: ['Scans illimités', '3 chiens', '90j historique', 'Mode Rapide + Précis', 'Empreinte sonore', 'Shop + Missions', 'Réductions partenaires'],
  },
  pro: {
    name: 'Pro',
    priceMonthly: '9,99€',
    priceAnnual: '79,99€',
    scansPerDay: Infinity,
    maxDogs: Infinity,
    historyDays: Infinity,
    modes: ['quick', 'precise'],
    features: ['Tout de Plus +', 'Chiens illimités', 'Historique illimité', 'Cartographie avancée + IA', 'Export PDF véto', 'Support prioritaire', 'Badges exclusifs'],
  },
};
