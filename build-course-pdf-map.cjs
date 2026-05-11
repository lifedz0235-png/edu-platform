const fs = require("fs");
const path = require("path");

const HOME = process.env.HOME;
const PUBLIC_DIR = path.join(HOME, "edu-platform", "public");
const VIDEOS_DIR = path.join(PUBLIC_DIR, "videos");
const PDFS_DIR = path.join(PUBLIC_DIR, "pdfs");
const OUTPUT_MAP = path.join(PUBLIC_DIR, "js", "course-pdf-map.js");
const OUTPUT_REPORT = path.join(HOME, "edu-platform", "pdf-match-report.txt");

function walk(dir, extensions = []) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(fullPath, extensions));
    } else if (
      entry.isFile() &&
      extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))
    ) {
      result.push(fullPath);
    }
  }

  return result;
}

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/\.mp4$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(str) {
  return normalize(str).split(" ").filter(Boolean);
}

function relFromPublic(absPath) {
  return path.relative(PUBLIC_DIR, absPath).split(path.sep).join("/");
}

function relFromPdfs(absPath) {
  return path.relative(PDFS_DIR, absPath).split(path.sep).join("/");
}

function webPathFromPdf(absPath) {
  return "../../" + relFromPublic(absPath);
}

function scoreMatch(videoFile, pdfFile) {
  const vNorm = normalize(videoFile);
  const pNorm = normalize(pdfFile);

  const vWords = words(videoFile);
  const pWords = words(pdfFile);

  let score = 0;

  for (const word of vWords) {
    if (pWords.includes(word)) score += 4;
    else if (pNorm.includes(word)) score += 2;
  }

  if (pNorm.includes(vNorm)) score += 12;
  if (vNorm.includes(pNorm) && pNorm.length > 4) score += 8;

  if (vNorm.includes("atelier") && pNorm.includes("qcm")) score += 20;
  if ((vNorm.includes("seance") || vNorm.includes("orientation")) && !pNorm.includes("qcm")) score += 5;

  if (vNorm.includes("suite")) {
    const simplified = vNorm.replace("suite", "").trim();
    if (simplified && pNorm.includes(simplified)) score += 10;
  }

  if (vNorm.includes("glycemie") && pNorm.includes("glycemie")) score += 15;
  if (vNorm.includes("glucides") && pNorm.includes("glucides")) score += 15;
  if (vNorm.includes("lipides") && (pNorm.includes("lipides") || pNorm.includes("lipoproteines"))) score += 15;
  if (vNorm.includes("fer") && pNorm.includes("fer")) score += 15;
  if (vNorm.includes("proteines") && pNorm.includes("proteines")) score += 15;
  if (vNorm.includes("phospho") && pNorm.includes("phospho")) score += 15;
  if (vNorm.includes("equilibre") && pNorm.includes("acido")) score += 15;

  if (vNorm.includes("appendicite") && pNorm.includes("appendicite")) score += 15;
  if (vNorm.includes("peritonite") && pNorm.includes("peritonite")) score += 15;
  if (vNorm.includes("hernie") && pNorm.includes("hernie")) score += 15;
  if (vNorm.includes("hemorragie") && pNorm.includes("hemorragie")) score += 15;
  if (vNorm.includes("occlusif") && pNorm.includes("occlusif")) score += 15;
  if (vNorm.includes("oesophage") && pNorm.includes("oesophage")) score += 15;
  if (vNorm.includes("colo") && pNorm.includes("colorectal")) score += 15;
  if (vNorm.includes("brulures") && pNorm.includes("brulures")) score += 15;
  if (vNorm.includes("ischemie") && pNorm.includes("ischemie")) score += 15;

  if (vNorm.includes("immunoglobulines") && pNorm.includes("immunoglobulines")) score += 15;
  if (vNorm.includes("complement") && pNorm.includes("complement")) score += 15;
  if (vNorm.includes("hla") && pNorm.includes("hla")) score += 15;
  if (vNorm.includes("hypersensibilite") && pNorm.includes("hypersensibil")) score += 15;

  if (vNorm.includes("retention") && pNorm.includes("retention")) score += 15;
  if (vNorm.includes("prostate") && pNorm.includes("prostate")) score += 15;
  if (vNorm.includes("vessie") && pNorm.includes("vessie")) score += 15;
  if (vNorm.includes("rein") && pNorm.includes("rein")) score += 15;
  if (vNorm.includes("testicule") && pNorm.includes("testicule")) score += 15;

  if (vNorm === "hic" && (pNorm.includes("hypertension intracran") || pNorm.includes("hic"))) score += 25;
  if (vNorm === "hed" && (pNorm.includes("hematome extradural") || pNorm.includes("hed"))) score += 25;
  if (vNorm.includes("hemorragie meningee") && pNorm.includes("hemorragie mening")) score += 25;

  if (vNorm.includes("luxation") && pNorm.includes("luxation")) score += 20;
  if (vNorm.includes("hanche") && pNorm.includes("hanche")) score += 15;

  if (vNorm.includes("ventilation") && pNorm.includes("ventilation")) score += 15;
  if (vNorm.includes("alveolaire") && pNorm.includes("alveolaire")) score += 15;
  if (vNorm.includes("respiratoire") && pNorm.includes("respiratoire")) score += 15;

  return score;
}

const manualAliases = {
  "biologie/biochimie/atelier-1.mp4": "biologie/biochimie/QCM BIOCHIMIE.pdf",
  "biologie/biochimie/atelier-2.mp4": "biologie/biochimie/QCM BIOCHIMIE.pdf",

  "biologie/genetique/atelier-genetique.mp4": "biologie/genetique/QCM génétique.pdf",

  "biologie/histologie-embriologie/ATELIER.mp4": "biologie/histologie-embriologie/QCM histologie.pdf",
  "biologie/histologie-embriologie/a-seance-orientation.mp4": "biologie/histologie-embriologie/QCM histologie.pdf",
  "biologie/histologie-embriologie/b-appareil-genital-feminin.mp4": "biologie/histologie-embriologie/Les appareils génitaux.pdf",
  "biologie/histologie-embriologie/c-appareil-genital-masculin.mp4": "biologie/histologie-embriologie/Les appareils génitaux.pdf",
  "biologie/histologie-embriologie/d-la-glande-surrenale.mp4": "biologie/histologie-embriologie/558Glandes surrénales.pdf",
  "biologie/histologie-embriologie/e-la-thyroide.mp4": "biologie/histologie-embriologie/559Thyroïde.pdf",
  "biologie/histologie-embriologie/f-hypophyse.mp4": "biologie/histologie-embriologie/560Hypophyse.pdf",
  "biologie/histologie-embriologie/h-appareil-cardio-circulatoire.mp4": "biologie/histologie-embriologie/562ACC.pdf",
  "biologie/histologie-embriologie/j-tissu-musculaire.mp4": "biologie/histologie-embriologie/561Tissu musculaire.pdf",
  "biologie/histologie-embriologie/k-oreille.mp4": "biologie/histologie-embriologie/l’oreille 22 (1).pdf",

  "biologie/immunologie/a-seance-orientation.mp4": "biologie/immunologie/549immunoglobulines.pdf",
  "biologie/immunologie/c-les-immunoglobulines.mp4": "biologie/immunologie/549immunoglobulines.pdf",
  "biologie/immunologie/d-le-systeme-de-complement.mp4": "biologie/immunologie/550Système du complément.pdf",
  "biologie/immunologie/e-le-systeme-hla.mp4": "biologie/immunologie/551Le système HLA.pdf",
  "biologie/immunologie/f-rimc.mp4": "biologie/immunologie/Les réactions immunitaires à médiation cellulaire 2023.pdf",
  "biologie/immunologie/h-les-etats-hypersensibilites-suite.mp4": "biologie/immunologie/les états d'hypersensibilité 2023 (1).pdf",
  "biologie/immunologie/j-les-etats-hypersensibilite.mp4": "biologie/immunologie/les états d'hypersensibilité 2023 (1).pdf",
  "biologie/immunologie/atelier-immunologie.mp4": "biologie/immunologie/QCM immunologie.pdf",
  "biologie/immunologie/atelier-immunologie-suite.mp4": "biologie/immunologie/QCM immunologie.pdf",

  "biologie/microbiologie/atelier-immunologie.mp4": "biologie/microbiologie/QCM microbiologie.pdf",
  "biologie/microbiologie/seance-orientation-microbiologie.mp4": "biologie/microbiologie/QCM microbiologie.pdf",

  "biologie/neurophysiologie/atelier-neurophysiologie.mp4": "biologie/neurophysiologie/QCM neurophysiologie.pdf",

  "biologie/physiologie/atelier-physiologie.mp4": "biologie/physiologie/QCM physiologie.pdf",
  "biologie/physiologie/equilibre-acido-basique-qcm.mp4": "biologie/physiologie/QCM équilibe acido-basique.pdf",

  "chirurgie/cci/atelier-cci.mp4": "chirurgie/cci/QCM CCI.pdf",

  "chirurgie/chirurgie-generale/appendicite-aigue-peritonite-aigue.mp4": "chirurgie/chirurgie-generale/575Appendicite (2).pdf",
  "chirurgie/chirurgie-generale/hernie-parietale-hemorragie-digestive.mp4": "chirurgie/chirurgie-generale/576Hernie pariétale (1).pdf",
  "chirurgie/chirurgie-generale/syndrome-occlusif.mp4": "chirurgie/chirurgie-generale/578Syndrome occlusif (1).pdf",
  "chirurgie/chirurgie-generale/tumeur-oesophage.mp4": "chirurgie/chirurgie-generale/Tumeur de l'oesophage.pdf",
  "chirurgie/chirurgie-generale/cancer-pancreas-voies-biliaires.mp4": "chirurgie/chirurgie-generale/581Cancer du pancréas (1).pdf",
  "chirurgie/chirurgie-generale/cancer-colo-rectal.mp4": "chirurgie/chirurgie-generale/582Cancer colorectal (1).pdf",
  "chirurgie/chirurgie-generale/khf.mp4": "chirurgie/chirurgie-generale/579khf (1).pdf",
  "chirurgie/chirurgie-generale/atelier-chirurgie-generale.mp4": "chirurgie/chirurgie-generale/582Cancer colorectal (1).pdf",

  "chirurgie/gynecologie/atelier-gynecologie.mp4": "chirurgie/gynecologie/QCM gynécologie.pdf",

  "chirurgie/neurochirurgie/atelier-neurochirurgie.mp4": "chirurgie/neurochirurgie/QCM neurochirurgie.pdf",
  "chirurgie/neurochirurgie/atelier-neurochirurgie-suite.mp4": "chirurgie/neurochirurgie/QCM neurochirurgie.pdf",

  "chirurgie/ophtalmologie/atelier-ophtalmologie.mp4": "chirurgie/ophtalmologie/QCM ophtalmologie.pdf",

  "chirurgie/traumatologie/atelier-traumatologie.mp4": "chirurgie/traumatologie/QCM traumatologie.pdf",

  "chirurgie/urologie/a-adenome-de-prostate.mp4": "chirurgie/urologie/Adénome de la prostate.pdf",
  "chirurgie/urologie/b-cancer-de-prostate.mp4": "chirurgie/urologie/Cancer de la prostate.pdf",
  "chirurgie/urologie/c-cancer-de-vessie.mp4": "chirurgie/urologie/Cancer de la vessie.pdf",
  "chirurgie/urologie/c-cancer-de-vessie-suite.mp4": "chirurgie/urologie/Cancer de la vessie.pdf",
  "chirurgie/urologie/d-tumeurs-de-rein.mp4": "chirurgie/urologie/Tumeurs du rein.pdf",
  "chirurgie/urologie/e-cancer-des-testicules.mp4": "chirurgie/urologie/Cancer du testicule.pdf",
  "chirurgie/urologie/f-retention-aigue-des-urines.mp4": "chirurgie/urologie/Rétention aigue des urines.pdf",
  "chirurgie/urologie/atelier-urologie.mp4": "chirurgie/urologie/QCM urologie.pdf",

  "medicale/cardiologie/pericardite-aigue.mp4": "medicale/cardiologie/PERICARDITE AIGUE P6.pdf",
  "medicale/cardiologie/insuffisance-mitrale.mp4": "medicale/cardiologie/QCM Valvulopathies.pdf",
  "medicale/cardiologie/retressicement-aortique.mp4": "medicale/cardiologie/Rétrécissement Aortique externe P6.pdf",
  "medicale/cardiologie/insuffisance-aortique.mp4": "medicale/cardiologie/QCM Valvulopathies.pdf",
  "medicale/cardiologie/endocardite-infectieuse.mp4": "medicale/cardiologie/QCM endocardite infectieuse.pdf",
  "medicale/cardiologie/oap.mp4": "medicale/cardiologie/INSUFFISANCE CARDIAQUE CHRONIQUE.pdf",
  "medicale/cardiologie/embolie-pulmonaire.mp4": "medicale/cardiologie/QCM Thrombose veineuse-embolie pulmonaire-insuffisance veineuse chronique.pdf",
  "medicale/cardiologie/tvp.mp4": "medicale/cardiologie/QCM Thrombose veineuse-embolie pulmonaire-insuffisance veineuse chronique.pdf",
  "medicale/cardiologie/sca.mp4": "medicale/cardiologie/QCM syndromes coronariens aigus.pdf",
  "medicale/cardiologie/atelier-cardiologie.mp4": "medicale/cardiologie/QCM Péricardite aigue-douleur thoracique.pdf",
  "medicale/cardiologie/atelier-cardiologie-1.mp4": "medicale/cardiologie/QCM insuffisance cardiaque.pdf",
  "medicale/cardiologie/atelier-cardiologie-2.mp4": "medicale/cardiologie/QCM Hypertension artérielle.pdf",
  "biologie/immunologie/f-rimc.mp4": "biologie/immunologie/552RIMC IMMUNOLOGIE.pdf",
  "biologie/immunologie/h-les-etats-hypersensibilites-suite.mp4": "biologie/immunologie/553Les états d hypersensibilités.pdf",
  "biologie/immunologie/j-les-etats-hypersensibilite.mp4": "biologie/immunologie/553Les états d hypersensibilités.pdf",

  "biologie/microbiologie/diagnostique-virologique.mp4": "biologie/microbiologie/540Prélèvement et diagnostic en microbiologie.pdf",
  "biologie/microbiologie/prelevements.mp4": "biologie/microbiologie/540Prélèvement et diagnostic en microbiologie.pdf",
  "biologie/microbiologie/les-micro-organismes.mp4": "biologie/microbiologie/532Les micro-organismes.pdf",
  "biologie/microbiologie/les-micro-organismes-1.mp4": "biologie/microbiologie/532Les micro-organismes.pdf",
  "biologie/microbiologie/les-micro-organismes-2.mp4": "biologie/microbiologie/532Les micro-organismes.pdf",
  "biologie/microbiologie/atelier-immunologie.mp4": "biologie/microbiologie/QCM MICROBIO.pdf",
  "biologie/microbiologie/seance-orientation-microbiologie.mp4": "biologie/microbiologie/QCM MICROBIO.pdf",

  "biologie/neurophysiologie/influx-nerveux.mp4": "biologie/neurophysiologie/593Influx nerveux (1).pdf",
  "biologie/neurophysiologie/physiologie-du-muscle-strie.mp4": "biologie/neurophysiologie/595physiologie du muscle strié.pdf",

  "biologie/physiologie/hemodynamique-intra-cardiaque.mp4": "biologie/physiologie/506Hémodynamique intracardiaque (1).pdf",
  "biologie/physiologie/le-debit-cardiaque.mp4": "biologie/physiologie/507Débit cardiaque (1).pdf",
  "biologie/physiologie/pression-arteriel-et-sa-regulation.mp4": "biologie/physiologie/513PA et sa régulation (1).pdf",
  "biologie/physiologie/equilibre-acido-basique.mp4": "biologie/physiologie/515Equilibre A B (1).pdf",
  "biologie/physiologie/equilibre-acido-basique-qcm.mp4": "biologie/physiologie/ACID BASE - COMPARTIMENT LIQUIDIEN QCM_unlocked.pdf",
  "biologie/physiologie/physiologie-respiratoire.mp4": "biologie/physiologie/526Physiologie respiratoire.pdf",
  "biologie/physiologie/les-compartiments-liquidienne.mp4": "biologie/physiologie/les compartiments liquidiens de l'organisme.pdf",
  "biologie/physiologie/les-compartiments-liquidienne-suite.mp4": "biologie/physiologie/les compartiments liquidiens de l'organisme.pdf",

  "chirurgie/gynecologie/geu-fibrome-uterin.mp4": "chirurgie/gynecologie/Atelier-fibrome utérin.pdf",
  "chirurgie/gynecologie/hta-et-grossesse.mp4": "chirurgie/gynecologie/gynecobst 1.pdf",
  "chirurgie/gynecologie/hemorragie-de-la-delivrance.mp4": "chirurgie/gynecologie/gynecobst 1.pdf",
  "chirurgie/gynecologie/cancer-du-col-uterin.mp4": "chirurgie/gynecologie/QCM tumeurs du col utérin.pdf",
  "chirurgie/gynecologie/tumeurs-de-l-ovaire.mp4": "chirurgie/gynecologie/Atelier-kyste de l'ovaire.pdf",
  "chirurgie/gynecologie/cancer-du-sein.mp4": "chirurgie/gynecologie/QCM tumeurs du sein.pdf",
  "chirurgie/gynecologie/placenta-praevia.mp4": "chirurgie/gynecologie/gynecobst 1.pdf",
  "chirurgie/gynecologie/atelier-gynecologie.mp4": "chirurgie/gynecologie/QCM tuméfaction pelvienne.pdf",

  "chirurgie/ophtalmologie/les-glaucomes.mp4": "chirurgie/ophtalmologie/glaucome externes (1).pdf",
  "chirurgie/ophtalmologie/cataracte.mp4": "chirurgie/ophtalmologie/Atelier-cataractes.pdf",
  "chirurgie/ophtalmologie/atelier-ophtalmologie.mp4": "chirurgie/ophtalmologie/Atelier-glaucome.pdf",
};

function build() {
  const videoFiles = walk(VIDEOS_DIR, [".mp4"]);
  const pdfFiles = walk(PDFS_DIR, [".pdf"]);

  const pdfByModule = {};
  for (const pdfAbs of pdfFiles) {
    const rel = relFromPdfs(pdfAbs);
    const parts = rel.split("/");
    if (parts.length < 3) continue;

    const key = `${parts[0]}/${parts[1]}`;
    if (!pdfByModule[key]) pdfByModule[key] = [];

    pdfByModule[key].push({
      abs: pdfAbs,
      rel,
      file: parts.slice(2).join("/"),
      normalized: normalize(parts.slice(2).join(" "))
    });
  }

  const map = {};
  const reportLines = [];

  for (const videoAbs of videoFiles) {
    const rel = relFromPublic(videoAbs).replace(/^videos\//, "");
    const parts = rel.split("/");
    if (parts.length < 3) continue;

    const [category, module] = parts;
    const videoFile = parts.slice(2).join("/");
    const mapKey = `${category}/${module}/${videoFile}`;

    if (manualAliases[mapKey]) {
      const pdfRel = manualAliases[mapKey];
      const pdfAbs = path.join(PDFS_DIR, pdfRel);

      if (fs.existsSync(pdfAbs)) {
        map[mapKey] = webPathFromPdf(pdfAbs);
        reportLines.push(`MANUAL OK  | ${mapKey} => ${pdfRel}`);
        continue;
      }
    }

    const candidates = pdfByModule[`${category}/${module}`] || [];
    let best = null;
    let bestScore = -1;

    for (const candidate of candidates) {
      const score = scoreMatch(videoFile, candidate.file);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best && bestScore >= 4) {
      map[mapKey] = webPathFromPdf(best.abs);
      reportLines.push(`AUTO OK    | ${mapKey} => ${best.rel} | score=${bestScore}`);
    } else {
      map[mapKey] = null;
      reportLines.push(`NO MATCH   | ${mapKey}`);
    }
  }

  fs.writeFileSync(
    OUTPUT_MAP,
    `window.coursePdfMap = ${JSON.stringify(map, null, 2)};`,
    "utf8"
  );

  fs.writeFileSync(OUTPUT_REPORT, reportLines.join("\n"), "utf8");

  console.log(`Course PDF map generated: ${OUTPUT_MAP}`);
  console.log(`Report generated: ${OUTPUT_REPORT}`);
  console.log(`Total videos mapped: ${Object.keys(map).length}`);
}

build();
