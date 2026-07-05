import fs from "fs";
import path from "path";

const BANK_DIR = "./public/banque-qcm";
const PUBLIC_DIR = "./public";

const TARGET_MODULES = ["urologie", "gynecologie"];
const EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

const GYNECO_FIXED_URL =
  "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/Cancer du col utérin2_Password_Removed.pdf";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(pdf|docx|doc|pptx|ppt)$/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function findJsonFiles(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...findJsonFiles(p));
    else if (f.endsWith(".json")) out.push(p);
  }
  return out;
}

function findSupportFiles(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);

    if (st.isDirectory()) out.push(...findSupportFiles(p));
    else if (EXTENSIONS.includes(path.extname(f).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

const jsonFiles = findJsonFiles(BANK_DIR);
const supportFiles = findSupportFiles(PUBLIC_DIR);

for (const jsonFile of jsonFiles) {
  const bank = readJson(jsonFile);

  if (!TARGET_MODULES.includes(bank.module)) continue;
  if (bank.status === "done" && bank.questions?.length >= 200) continue;

  console.log("\n-----------------------------");
  console.log("Module:", bank.module);
  console.log("Support:", bank.supportTitle);

  // ✅ Cas spécial gynecobst
  if (
    bank.module === "gynecologie" &&
    norm(bank.supportTitle).includes("gynecobst")
  ) {
    bank.supportUrl = GYNECO_FIXED_URL;
    bank.status = "empty_text";
    bank.error = "";
    bank.questions = [];
    bank.generated = { total: 0, qcm: 0, qcs: 0 };
    bank.updatedAt = new Date().toISOString();

    saveJson(jsonFile, bank);

    console.log("✅ Gyneco corrigé:", GYNECO_FIXED_URL);
    continue;
  }

  const wanted = norm(bank.supportTitle);
  const jsonName = norm(path.basename(jsonFile, ".json"));

  const found = supportFiles.find(f => {
    const base = norm(path.basename(f));
    return (
      base.includes(wanted) ||
      wanted.includes(base) ||
      base.includes(jsonName) ||
      jsonName.includes(base)
    );
  });

  if (!found) {
    console.log("❌ Aucun fichier trouvé");
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

console.log("\n✅ Réparation urologie + gynécologie terminée");