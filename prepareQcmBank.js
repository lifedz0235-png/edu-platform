import fs from "fs";
import path from "path";

const coursFile = "public/data/cours.json";
const outRoot = "public/banque-qcm";

const TARGET = {
  total: 500,
  qcm: 350,
  qcs: 150
};

const missingSupports = [
  // Cardiologie
  ["medicale", "cardiologie", "endocardite.pdf"],
  ["medicale", "cardiologie", "embolie-pulmonaire.pdf"],
  ["medicale", "cardiologie", "tvp.pdf"],
  ["medicale", "cardiologie", "oap.pdf"],
  ["medicale", "cardiologie", "Syndromes_coronariens_aigus_Pr_F_BOUKERCHE.pdf"],

  // Pneumologie
  ["medicale", "pneumologie", "cancer_broncho_pulmonaire.pdf"],
  ["medicale", "pneumologie", "traitement-tuberculose.pdf"],
  ["medicale", "pneumologie", "tuberculose-pulmonaire.pdf"],

  // Infectiologie
  ["medicale", "infectieux", "paludisme.pdf"],
  ["medicale", "infectieux", "ist.pdf"],
  ["medicale", "infectieux", "vih-sida.pdf"],

  // Hématologie
  ["medicale", "hematologie", "splenomegalie.pdf"],

  // Neurochirurgie
  ["chirurgie", "neurochirurgie", "hic.pdf"],
  ["chirurgie", "neurochirurgie", "hematome-extra-dural-etude-epidemiologique-a-propos-de-35-cas....pdf"],

  // Urologie
  ["chirurgie", "urologie", "cancer_de_vessie.pdf"],
  ["chirurgie", "urologie", "hypertrophie_benigne_de_la_prostate.pdf"],
  ["chirurgie", "urologie", "retention_aigue_des_urines.pdf"],
  ["chirurgie", "urologie", "cancer_de_prostate.pdf"],
  ["chirurgie", "urologie", "tumeurs_de_rein.pdf"],
  ["chirurgie", "urologie", "cancer_de_rein.pdf"],
  ["chirurgie", "urologie", "tumeurs_testicules.pdf"],

  // Physiologie
  ["biologie", "physiologie", "les_etats_de_choc.pdf"],
  ["biologie", "physiologie", "10._Etats_de_choc.pdf"],

  // Dermatologie
  ["medicale", "dermatologie", "psoriasis.pdf"],
  ["medicale", "dermatologie", "11.1.Psoriasis-CEDEF.pdf"],
  ["medicale", "dermatologie", "eczema.pdf"],
  ["medicale", "dermatologie", "infections_cutanees_bacteriennes.pdf"],
  ["medicale", "dermatologie", "La_tuberculose_cutanee.pdf"],

  // Autres
  ["chirurgie", "ophtalmologie", "cataracte.pdf"],
  ["chirurgie", "traumatologie", "luxation_traumatique_de_la_hanche.pdf"],
  ["medicale", "endocrinologie", "goitre.pdf"],
  ["medicale", "gastrologie", "secretion_biliaire.pdf"],
  ["medicale", "pediatrie", "ictere_a_bilirubine_libre_de_nouveau_ne.pdf"]
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(pdf|docx?|pptx?)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const blocked = {
  "biologie/physiologie": [
    "influx", "muscle-strie", "systeme-nerveux-autonome", "atelie-neurophysiologie"
  ],
  "chirurgie/cci": [
    "vaccination", "calendrier-vaccinal", "accidents-de-travail"
  ],
  "chirurgie/urologie": [
    "avc", "cephalee", "compression-medulaire", "hemorragie-meningee",
    "epilepsies", "parkinson", "myastenie", "sclerose"
  ],
  "medicale/cardiologie": [
    "appareil-cardio-circulatoire"
  ],
  "medicale/epidemiologie": [
    "hematome-extra-dural"
  ],
  "medicale/hematologie": [
    "hematome-extra-dural"
  ],
  "medicale/neurologie": [
    "influx", "muscle-strie", "systeme-nerveux-autonome", "atelie-neurophysiologie"
  ],
  "medicale/psychiatrie": [
    "developpement-psychomoteur"
  ]
};

function norm(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

function isBlocked(category, module, supportName) {
  const key = `${slug(category)}/${slug(module)}`;
  const rules = blocked[key] || [];
  const n = norm(supportName);
  return rules.some(rule => n.includes(norm(rule)));
}

function createBankFile({ category, module, courseId = null, courseTitle = null, supportTitle, supportUrl, supportType = "pdf" }) {
  const dir = path.join(outRoot, slug(category), slug(module));
  ensureDir(dir);

  const outFile = path.join(dir, `${slug(supportTitle)}.json`);

  if (fs.existsSync(outFile)) return false;

  const bank = {
    category: slug(category),
    module: slug(module),
    courseId,
    courseTitle,
    supportTitle,
    supportType,
    supportUrl,
    target: TARGET,
    generated: {
      total: 0,
      qcm: 0,
      qcs: 0
    },
    questions: []
  };

  fs.writeFileSync(outFile, JSON.stringify(bank, null, 2), "utf8");
  return true;
}

let created = 0;

// 1) Supports déjà موجودين في cours.json
const data = JSON.parse(fs.readFileSync(coursFile, "utf8"));

for (const cat of data) {
  for (const mod of cat.modules) {
    for (const course of mod.courses) {
      const supports = course.supports || [];

      for (const support of supports) {

  if (isBlocked(cat.category, mod.name, support.title || path.basename(support.url))) {
    continue;
  }

  const ok = createBankFile({
    category: cat.category,
    module: mod.name,
    courseId: course.id,
    courseTitle: course.title,
    supportTitle: support.title || path.basename(support.url),
    supportType: support.type || "pdf",
    supportUrl: support.url
  });

  if (ok) created++;
}
    }
  }
}

// 2) Supports الناقصين اللي زدناهم يدويًا
for (const [category, module, filename] of missingSupports) {
  const ok = createBankFile({
    category,
    module,
    supportTitle: filename,
    supportType: "pdf",
    supportUrl: `/pdfs/${filename}`
  });

  if (ok) created++;
}

console.log("✅ Banque QCM préparée");
console.log("✅ Nouveaux fichiers créés:", created);
console.log("📁 Dossier:", outRoot);
console.log("🎯 Objectif par support:", TARGET.total, "questions =", TARGET.qcm, "QCM +", TARGET.qcs, "QCS");