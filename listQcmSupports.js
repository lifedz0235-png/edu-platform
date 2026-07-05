import fs from "fs";

const data = JSON.parse(fs.readFileSync("public/data/cours.json", "utf8"));

const missingSupports = [
  ["medicale", "cardiologie", "endocardite.pdf"],
  ["medicale", "cardiologie", "embolie-pulmonaire.pdf"],
  ["medicale", "cardiologie", "tvp.pdf"],
  ["medicale", "cardiologie", "oap.pdf"],
  ["medicale", "cardiologie", "Syndromes_coronariens_aigus_Pr_F_BOUKERCHE.pdf"],

  ["medicale", "pneumologie", "cancer_broncho_pulmonaire.pdf"],
  ["medicale", "pneumologie", "traitement-tuberculose.pdf"],
  ["medicale", "pneumologie", "tuberculose-pulmonaire.pdf"],

  ["medicale", "infectieux", "paludisme.pdf"],
  ["medicale", "infectieux", "ist.pdf"],
  ["medicale", "infectieux", "vih-sida.pdf"],

  ["medicale", "hematologie", "splenomegalie.pdf"],

  ["chirurgie", "neurochirurgie", "hic.pdf"],
  ["chirurgie", "neurochirurgie", "hematome-extra-dural-etude-epidemiologique-a-propos-de-35-cas....pdf"],

  ["chirurgie", "urologie", "cancer_de_vessie.pdf"],
  ["chirurgie", "urologie", "hypertrophie_benigne_de_la_prostate.pdf"],
  ["chirurgie", "urologie", "retention_aigue_des_urines.pdf"],
  ["chirurgie", "urologie", "cancer_de_prostate.pdf"],
  ["chirurgie", "urologie", "tumeurs_de_rein.pdf"],
  ["chirurgie", "urologie", "cancer_de_rein.pdf"],
  ["chirurgie", "urologie", "tumeurs_testicules.pdf"],

  ["biologie", "physiologie", "les_etats_de_choc.pdf"],
  ["biologie", "physiologie", "10._Etats_de_choc.pdf"],

  ["medicale", "dermatologie", "psoriasis.pdf"],
  ["medicale", "dermatologie", "11.1.Psoriasis-CEDEF.pdf"],
  ["medicale", "dermatologie", "eczema.pdf"],
  ["medicale", "dermatologie", "infections_cutanees_bacteriennes.pdf"],
  ["medicale", "dermatologie", "La_tuberculose_cutanee.pdf"],

  ["chirurgie", "ophtalmologie", "cataracte.pdf"],
  ["chirurgie", "traumatologie", "luxation_traumatique_de_la_hanche.pdf"],
  ["medicale", "endocrinologie", "goitre.pdf"],
  ["medicale", "gastrologie", "secretion_biliaire.pdf"],
  ["medicale", "pediatrie", "ictere_a_bilirubine_libre_de_nouveau_ne.pdf"]
];

const report = {};

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
  const key = `${category}/${module}`;
  const rules = blocked[key] || [];
  const n = norm(supportName);
  return rules.some(rule => n.includes(norm(rule)));
}

function addSupport(category, module, support, source = "cours.json") {
  if (!report[category]) report[category] = {};
  if (!report[category][module]) report[category][module] = [];

  const name = support.title || support;
  if (source === "cours.json" && isBlocked(category, module, name)) {
  return;
}
  const url = support.url || `/pdfs/${support}`;

  const exists = report[category][module].some(s => s.name === name);
  if (!exists) {
    report[category][module].push({
      name,
      url,
      source
    });
  }
}

for (const cat of data) {
  for (const mod of cat.modules) {
    for (const course of mod.courses) {
      for (const support of course.supports || []) {
        addSupport(cat.category, mod.name, support, "cours.json");
      }
    }
  }
}

for (const [category, module, filename] of missingSupports) {
  addSupport(category, module, filename, "pdf-manque");
}

let total = 0;

for (const category of Object.keys(report)) {
  console.log("\n================ " + category.toUpperCase() + " ================");

  for (const module of Object.keys(report[category])) {
    const supports = report[category][module];
    total += supports.length;

    console.log(`\n--- ${module} (${supports.length} supports) ---`);

    supports.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name}  [${s.source}]`);
    });
  }
}

console.log("\n====================================");
console.log("TOTAL SUPPORTS POUR BANQUE QCM:", total);
console.log("OBJECTIF:", total * 500, "questions");
console.log("QCM:", total * 350);
console.log("QCS:", total * 150);
console.log("====================================");