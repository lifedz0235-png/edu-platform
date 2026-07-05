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
    .replace(/\.(mp4|pdf|docx?|pptx?)$/i, "")
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

  const exact = currentSupports.filter(s => norm(path.basename(s)) === videoKey);
  const moduleGeneral = currentSupports.filter(s => {
  if (!videoBase.includes("atelier")) return false;
  const base = norm(path.basename(s));
  return !base.includes(videoBase);
});

  const atelier = currentSupports.filter(s => {
    const base = norm(path.basename(s));
    const videoBase = norm(path.basename(videoFile));
    if (!videoBase.includes("atelier")) return false;
    if (!base.includes("atelier")) return false;

    const sNorm = norm(s);
    return sNorm.includes(norm(category)) || sNorm.includes(norm(moduleName));
  });

  const merged = [...exact, ...atelier, ...moduleGeneral];

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
    const files = walkFiles(modPath, [".mp4"]).sort((a, b) => {
  const aAtelier = norm(path.basename(a)).includes("atelier");
  const bAtelier = norm(path.basename(b)).includes("atelier");

  if (aAtelier && !bAtelier) return 1;
  if (!aAtelier && bAtelier) return -1;

  return a.localeCompare(b);
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
