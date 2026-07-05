import fs from "fs";
import path from "path";

const BANK_DIR = "./public/banque-qcm";
const PUBLIC_DIR = "./public";
const TARGET_STATUSES = ["pdf_missing", "file_missing"];

const EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/&/g, "et")
    .replace(/\.(pdf|docx|doc|pptx|ppt)$/g, "")
    .replace(/password_removed/g, "")
    .replace(/resid|résid|resident|résidanat/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function findFiles(dir, filter) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);

    if (st.isDirectory()) out.push(...findFiles(p, filter));
    else if (filter(p)) out.push(p);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

const bankFiles = findFiles(BANK_DIR, p => p.endsWith(".json"));
const supportFiles = findFiles(PUBLIC_DIR, p =>
  EXTENSIONS.includes(path.extname(p).toLowerCase())
);

console.log("JSON:", bankFiles.length);
console.log("Supports:", supportFiles.length);

for (const jsonFile of bankFiles) {
  const bank = readJson(jsonFile);

  if (!TARGET_STATUSES.includes(bank.status)) continue;

  const wanted1 = norm(bank.supportTitle);
  const wanted2 = norm(path.basename(jsonFile, ".json"));

  const found = supportFiles.find(f => {
    const base = norm(path.basename(f));
    return (
      base.includes(wanted1) ||
      wanted1.includes(base) ||
      base.includes(wanted2) ||
      wanted2.includes(base)
    );
  });

  console.log("\n----------------------------");
  console.log("Module:", bank.module);
  console.log("Support:", bank.supportTitle);

  if (!found) {
    console.log("❌ Non trouvé");
    continue;
  }

  const relative = "/" + path.relative(PUBLIC_DIR, found).replaceAll("\\", "/");

  bank.supportUrl = relative;
  bank.status = "empty_text";
  bank.error = "";
  bank.questions = [];
  bank.generated = { total: 0, qcm: 0, qcs: 0 };
  bank.updatedAt = new Date().toISOString();

  saveJson(jsonFile, bank);

  console.log("✅ Corrigé:", relative);
}

console.log("\n✅ Réparation fichiers manquants terminée");