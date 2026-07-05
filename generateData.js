import fs from "fs";
import path from "path";

const videosRoot = "public/videos";
const pdfRoot = "public/pdfs";
const outFile = "public/data/cours.json";
const supportExts = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(mp4|pdf|docx?|pptx?|ppt)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


const moduleAliases = {
  microbiologie: ["microbiologie", "microbiolog"],
  neurophysiologie: ["neurophysio", "neurophysiologie"],
  physiologie: ["physiologie", "physio"],
  cci: ["cci"],
  "chirurgie-generale": ["chirurgie-general", "chirurgie-generale", "chirurgie general"],
  gynecologie: ["gyneco", "gynecologie", "gynecobst"],
  ophtalmologie: ["ophtalmo", "ophtalmologie"],
  cardiologie: ["cardiologie", "cardio"],
  epidemiologie: ["epidemio", "epidemiologie"],
  gastrologie: ["gastro", "gastrologie"],
  hematologie: ["hematologie", "hemato"],
  infectieux: ["infectieux", "infectiologie"],
  "medecine-travail": ["medecine-travail", "medecine de travaille", "medecine travail"],
  "medecine-legale": ["medecine-legal", "medecine legale", "medecine legal"],
  nephrologie: ["nephrologie", "nephro"],
  neurologie: ["neurologie", "neuro"],
  pediatrie: ["pediatrie"],
  psychiatrie: ["psychiatrie", "psy"],
  rhumatologie: ["rhumatologie", "rhumato"]
};
const manualOrder = {
  "anatomopathologie": [
    "les-metastases",
    "classification-des-tumeurs",
    "processus-inflammatoire",
    "les-amyloses-congestion",
    "aterosclerose",
    "la-cellule-cancereuse",
    "atelier"
  ],

  "biochimie": [
    "metabolisme-des-glucides",
    "glycemie",
    "metabolisme-des-lipides",
    "metabolisme-phospho-calcique",
    "metabolisme-de-fer",
    "metabolisme-des-proteines",
    "metabolisme-des-acides-gras",
    "equilibre-acide-base",
    "atelier-1",
    "atelier-2"
  ],

  "genetique": [
    "le-gene",
    "le-gene-suite",
    "genetique-mendelienne",
    "atelier-genetique"
  ],

  "histologie-embriologie": [
    "a-seance-orientation",
    "b-appareil-genital-feminin",
    "c-appareil-genital-masculin",
    "d-la-glande-surrenale",
    "e-la-thyroide",
    "f-hypophyse",
    "h-appareil-cardio-circulatoire",
    "j-tissu-musculaire",
    "k-oreille",
    "l-oeil",
    "atelier"
  ],

  "immunologie": [
    "a-seance-orientation",
    "b-immunologie-innee-a-immunologie-specifique",
    "c-les-immunoglobulines",
    "d-le-systeme-de-complement",
    "e-le-systeme-hla",
    "f-rimc",
    "j-les-etats-hypersensibilite",
    "h-les-etats-hypersensibilites-suite",
    "atelier-immunologie",
    "atelier-immunologie-suite"
  ],

  "microbiologie": [
    "seance-orientation-microbiologie",
    "les-micro-organismes",
    "les-micro-organismes-1",
    "les-micro-organismes-2",
    "prelevements",
    "diagnostique-virologique",
    "atelier"
  ],

  "neurophysiologie": [
    "influx-nerveux",
    "physiologie-du-muscle-strie",
    "physiologie-du-systeme-nerveux-autonome",
    "atelier"
  ],

  "physiologie": [
    "seance-orientation-physiologie",
    "les-compartiments-liquidienne",
    "les-compartiments-liquidienne-suite",
    "equilibre-acido-basique",
    "hemodynamique-intra-cardiaque",
    "le-debit-cardiaque",
    "pression-arteriel-et-sa-regulation",
    "physiologie-respiratoire",
    "la-ventilation-respiratoire",
    "le-ventilation-alveolaire",
    "les-etats-de-choc",
    "equilibre-acido-basique-qcm",
    "atelier"
  ],

  "cci": [
    "atresie-de-oesophage",
    "les-occlusions-neonatale",
    "lch",
    "osteomyelite",
    "atelier"
  ],

  "chirurgie-generale": [
    "seance-orientation-chirurgie-generale",
    "appendicite-aigue-peritonite-aigue",
    "syndrome-occlusif",
    "hernie-parietale-hemorragie-digestive",
    "lv-pancreatite-aigue",
    "ischemie-des-membres-inferieurs-brulures",
    "tumeur-oesophage",
    "cancer-colo-rectal",
    "cancer-pancreas-voies-biliaires",
    "khf",
    "atelier"
  ],

  "gynecologie": [
    "geu-fibrome-uterin",
    "hta-et-grossesse",
    "hemorragie-de-la-delivrance",
    "placenta-praevia",
    "cancer-du-col-uterin",
    "cancer-du-sein",
    "tumeurs-de-l-ovaire",
    "atelier"
  ],

  "neurochirurgie": [
    "hemorragie-meningee",
    "hed",
    "hic",
    "atelier-neurochirurgie",
    "atelier-neurochirurgie-suite"
  ],

  "ophtalmologie": [
    "cataracte",
    "les-glaucomes",
    "atelier"
  ],

  "orl": [
    "anatomie-naso-sinusienne",
    "otite-moyenne-aigue",
    "maladie-de-meniere",
    "cancer-de-cavum",
    "cancer-de-larynx",
    "atelier"
  ],

  "traumatologie": [
    "fracture-de-col-de-femure",
    "fracture-de-jambe",
    "luxation-traumatique-de-la-hanche",
    "polytrauma",
    "tumeurs-osseuses",
    "atelier"
  ],

  "urologie": [
    "a-adenome-de-prostate",
    "b-cancer-de-prostate",
    "c-cancer-de-vessie",
    "c-cancer-de-vessie-suite",
    "d-tumeurs-de-rein",
    "e-cancer-des-testicules",
    "f-retention-aigue-des-urines",
    "atelier"
  ],

  "cardiologie": [
    "pericardite-aigue",
    "insuffisance-mitrale",
    "insuffisance-aortique",
    "retressicement-aortique",
    "oap",
    "sca",
    "tvp",
    "embolie-pulmonaire",
    "endocardite-infectieuse",
    "atelier-cardiologie-1",
    "atelier-cardiologie-2",
    "atelier-cardiologie"
  ],

  "dermatologie": [
    "les-eczemas",
    "psoriasis",
    "les-mycoses-cutanees",
    "les-ist",
    "les-infections-bacteriennes",
    "la-tuberculose-cutanee",
    "atelier"
  ],

  "endocrinologie": [
    "diabete-et-ses-complications",
    "complication-du-diabete",
    "hyperthyroidie",
    "insuffisance-surrenale",
    "tumeur-hypophysaire"
  ],

  "epidemiologie": [
    "les-differents-indicateurs-de-sante",
    "epidemiologie-des-maladies-transmissible-et-non-transmissible",
    "vaccination",
    "atelier"
  ],

  "gastrologie": [
    "digestion-absorption",
    "secretion-biliaire",
    "ulcer-gastro-duodinale",
    "hepatite-c-et-b",
    "cirrhose-hepatique",
    "ascite",
    "ictere",
    "mici",
    "pancreatite-chronique",
    "atelier-gastrologie-1",
    "atelier-gastrologie-2",
    "atelier-gastrologie-3",
    "atelier-gastrologie"
  ],

  "hematologie": [
    "groupe-sanguin-et-transfusion",
    "anemie",
    "anemie-suite",
    "cat-devant-une-anemie",
    "cat-devant-une-anemie-suite",
    "hemostase-primaire-coagulation",
    "purpura-thrombopenique-immunologique",
    "lymphome-malin",
    "llc",
    "adp-spmg",
    "atelier-hematologie-1",
    "atelier-hematologie"
  ],

  "infectieux": [
    "diarrhee-aigue-infectieuse",
    "diarrhee-aigue-infectieuse-suite",
    "fievre-thyphoide",
    "la-brucelose",
    "les-meningites",
    "hiv-sida",
    "paludisme",
    "atelier"
  ],

  "medecine-legale": [
    "diagnostique-de-la-mort",
    "secret-medical-responsabilite-medicale",
    "atelier"
  ],

  "medecine-travail": [
    "accidents-de-travail",
    "intoxication-aux-metaux-lourds",
    "atelier"
  ],

  "nephrologie": [
    "insuffisance-renale-aigue",
    "insuffisance-renale-chronique",
    "syndrome-nephrotique",
    "syndrome-nephretique",
    "syndrome-nephretique-aigue",
    "atelier"
  ],

  "neurologie": [
    "avc",
    "hemorragie-meningee",
    "les-epilepsies",
    "cephalee-et-algie-de-la-face",
    "compression-medulaire-non-traumatique",
    "myastenie-auto-immune",
    "maladie-de-parkinson",
    "sclerose-en-plaque",
    "atelier-neurologie-1",
    "atelier-neurologie"
  ],

  "pediatrie": [
    "alimentation-de-lenfant-sain",
    "developpement-psychomoteur",
    "detresse-respiratoire-aigue-nouveau-ne",
    "icter-a-bilirubine-libre-du-nouveau-ne",
    "diarrhee-aigue-rachitisme",
    "diarrhee-chronique-enfant",
    "diarrhee-chronique-enfant-suite",
    "rougeole",
    "atelier-pediatrie-1",
    "atelier-pediatrie"
  ],

  "pneumologie": [
    "asthme-bronchique",
    "pneumonie-aigue-communitaire",
    "epanchement-pleural",
    "insuffisance-respiratoire-chronique",
    "tuberculose",
    "traitement-anti-tuberculeux",
    "cancer-broncho-pulmonaire",
    "atelier"
  ],

  "psychiatrie": [
    "delire-paranoique-etats-depressifs",
    "schizophrenie",
    "atelier-psychiatrie-1",
    "atelier-psychiatrie-2",
    "atelier-psychiatrie"
  ],

  "rhumatologie": [
    "poly-arthrite-rhumatoide",
    "connectivites",
    "syndrome-de-gogerot-sjogren",
    "ma-de-pott",
    "atelier"
  ]
};
const manualSupportMap = {
  cardiologie: {
    "insuffisance-aortique": ["insuffisance-aortique"],
    "retressicement-aortique": ["retrecissement-aortique", "retressicement-aortique", "retrecissement-aortique-externe-p6"],
    "insuffisance-mitrale": ["insuffisance-mitrale"],
    "retressicement-mitrale": ["retrecissement-mitrale", "retressicement-mitrale"]
  },
"chirurgie-generale": {
  "appendicite-aigue-peritonite-aigue": ["appendicite", "peritonite"],
  "cancer-pancreas-voies-biliaires": ["cancer-d-pancreas", "cancer-de-voies-biliaires"],
  "hernie-parietale-hemorragie-digestive": ["hernie-parietale", "hemorragies-digestives"],
  "ischemie-des-membres-inferieurs-brulures": ["ischemie-des-membres-inferieurs", "brulures"],
  "lv-pancreatite-aigue": ["lv"]
},
  "medecine-travail": {
    "accidents-de-travail": ["accidents-de-travail"],
    "intoxication-aux-metaux-lourds": ["intoxication-aux-metaux-lourds"]
  },
  "medecine-legale": {
    "diagnostique-de-la-mort": ["diagnostique-de-la-mort"],
    "secret-medical-responsabilite-medicale": ["secret-medical-responsabilite-medicale"]
  },
  psychiatrie: {
    "delire-paranoique-etats-depressifs": ["delire-paranoique", "etats-depressifs"],
    "schizophrenie": ["schizophrenie"]
  }
};

function moduleMatch(file, moduleName) {
  const f = norm(file);
  const aliases = moduleAliases[moduleName] || [moduleName];
  return aliases.some(alias => f.includes(norm(alias)));
}

function titleFromFile(file) {
  return path.basename(file, path.extname(file))
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function cleanModuleName(dir) {
  return dir.trim().toLowerCase();
}

function cleanCategoryName(dir) {
  return dir.trim().toLowerCase();
}

function walkFiles(dir, exts) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  for (const item of fs.readdirSync(dir)) {
    if (item.startsWith(".~lock")) continue;

    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walkFiles(full, exts));
    } else {
      const ext = path.extname(full).toLowerCase();
      if (exts.includes(ext)) files.push(full.replaceAll("\\", "/"));
    }
  }

  return files;
}

function toUrl(file) {
  return "/" + file.replace(/^public\//, "").replaceAll("\\", "/");
}

function isQcmFile(file) {
  return file.replaceAll("\\", "/").includes("/QCM ");
}

const supportFiles = walkFiles(pdfRoot, supportExts).filter(f => !isQcmFile(f));
const moduleSupportIndex = {};

for (const file of supportFiles) {
  const p = file.replaceAll("\\", "/").toLowerCase();

  const modules = [
    "anatomopathologie",
    "biochimie",
    "genetique",
    "histologie-embriologie",
    "immunologie",
    "microbiologie",
    "neurophysio",
    "physiologie",

    "cci",
    "chirurgie-generale",
    "gynecologie",
    "neurochirurgie",
    "ophtalmologie",
    "orl",
    "traumatologie",
    "urologie",

    "cardiologie",
    "dermatologie",
    "endocrinologie",
    "epidemiologie",
    "gastrologie",
    "hematologie",
    "infectieux",
    "medecine-travail",
    "medecine-legale",
    "nephrologie",
    "neurologie",
    "pediatrie",
    "pneumologie",
    "psychiatrie",
    "rhumatologie"
  ];

  const moduleFound = modules.find(m =>
    p.includes(m.replace("-", " "))
    || p.includes(m.replace("-", ""))
    || p.includes(m)
  );

  if (!moduleFound) continue;

  if (!moduleSupportIndex[moduleFound])
    moduleSupportIndex[moduleFound] = [];

  moduleSupportIndex[moduleFound].push(file);
}

function supportObject(file) {
  const ext = path.extname(file).toLowerCase().replace(".", "");
  return {
    type: ext,
    title: path.basename(file, path.extname(file)),
    url: toUrl(file)
  };
}


function wordsOf(text) {
  return norm(text)
    .split("-")
    .map(w => w.replace(/s$/i, "").replace(/e$/i, ""))
    .filter(w =>
      w.length >= 3 &&
      !["les","des","une","un","avec","sans","suite","cours","qcm","cat","devant"].includes(w)
    );
}

function overlapScore(a, b) {
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  return wa.filter(x => wb.includes(x)).length;
}

function findSupportsForVideo(videoFile) {
  const videoKey = norm(path.basename(videoFile));
  const videoParts = videoFile.replaceAll("\\", "/").split("/");
  const category = videoParts[2];
  const moduleName = videoParts[3];

  let currentSupports = [
    ...(moduleSupportIndex[moduleName] || []),
    ...supportFiles.filter(s => moduleMatch(s, moduleName))
  ];

  currentSupports = [...new Map(currentSupports.map(f => [f, f])).values()];

  const videoBase = norm(path.basename(videoFile));
  const manual = currentSupports.filter(s => {
  const rules = manualSupportMap[moduleName] || {};
  const wanted = rules[videoBase] || [];
  const base = norm(path.basename(s));
  return wanted.some(w => base.includes(norm(w)));
});
if (manual.length > 0) {
  return manual.map(supportObject);
}

  const exact = currentSupports.filter(s => {
    const base = norm(path.basename(s));
    return base === videoKey || base.includes(videoBase) || videoBase.includes(base);
  });

  const related = currentSupports.filter(s => {
    const base = norm(path.basename(s));

    if (base.includes("atelier") && !videoBase.includes("atelier")) return false;

    if (videoBase.includes("atelier")) {
      return base.includes("atelier");
    }

    if (base === videoKey || base.includes(videoBase) || videoBase.includes(base)) return true;

    return overlapScore(videoBase, base) >= 1;
  });

  const moduleGeneral = currentSupports.filter(s => {
    if (moduleName === "gynecologie") return true;
    if (!videoBase.includes("atelier")) return false;

    const base = norm(path.basename(s));
    return !base.includes(videoBase);
  });

  const merged = [...manual, ...exact, ...related, ...moduleGeneral];
  const unique = [...new Map(merged.map(f => [f, f])).values()];

  return unique.map(supportObject);
}

let id = 1;
const data = [];

for (const catDir of fs.readdirSync(videosRoot)) {
  const catPath = path.join(videosRoot, catDir);
  if (!fs.statSync(catPath).isDirectory()) continue;

  const category = cleanCategoryName(catDir);
  const modules = [];

  for (const modDir of fs.readdirSync(catPath)) {
    const modPath = path.join(catPath, modDir);
    if (!fs.statSync(modPath).isDirectory()) continue;
const moduleName = cleanModuleName(modDir);
const order = manualOrder[moduleName] || [];
const files = walkFiles(modPath, [".mp4"]).sort((a, b) => {
  const aKey = norm(path.basename(a));
  const bKey = norm(path.basename(b));

  const order = manualOrder[moduleName] || [];

  const aIndex = order.findIndex(x => aKey === norm(x));
  const bIndex = order.findIndex(x => bKey === norm(x));

  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;

  const score = (key) => {
    let s = 1000;

    if (key.includes("orientation") || key.includes("seance-orientation")) s -= 900;
    if (key.includes("atelier")) s += 900;
    if (key.includes("qcm")) s += 700;
    if (key.includes("suite")) s += 50;

    return s;
  };

  const aBase = aKey.replace(/-suite$/, "");
  const bBase = bKey.replace(/-suite$/, "");

  if (aBase === bBase) {
    if (!aKey.includes("suite") && bKey.includes("suite")) return -1;
    if (aKey.includes("suite") && !bKey.includes("suite")) return 1;
  }

  const aScore = score(aKey);
  const bScore = score(bKey);

  if (aScore !== bScore) return aScore - bScore;

  return aKey.localeCompare(bKey);
});

    modules.push({
      name: moduleName,
      courses: files.map(file => {
        const supports = findSupportsForVideo(file);
        const mainPdf = supports.find(s => s.type === "pdf");

        return {
          id: id++,
          title: titleFromFile(file),
          video: toUrl(file),
          pdf: mainPdf ? mainPdf.url : null,
          supports
        };
      })
    });
  }

  data.push({ category, modules });
}

fs.writeFileSync(outFile, JSON.stringify(data, null, 2), "utf8");

console.log("✅ cours.json généré:", outFile);
console.log("✅ Total cours:", id - 1);
console.log("✅ Supports scannés:", supportFiles.length);
