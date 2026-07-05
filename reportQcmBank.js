import fs from "fs";
import path from "path";

const BANK_DIR = "./public/banque-qcm";

function findJsonFiles(dir) {
  let results = [];

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (file.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const files = findJsonFiles(BANK_DIR);

let totalQuestions = 0;
let totalQcm = 0;
let totalQcs = 0;
let done = 0;
let incomplete = 0;
let errors = 0;
let missing = 0;

const rows = [];

for (const file of files) {
  const bank = readJson(file);
  if (!bank) continue;

  const questions = Array.isArray(bank.questions) ? bank.questions : [];
  const qcm = questions.filter(q => q.type === "QCM").length;
  const qcs = questions.filter(q => q.type === "QCS").length;

  totalQuestions += questions.length;
  totalQcm += qcm;
  totalQcs += qcs;

  if (bank.status === "done" && questions.length >= 200) done++;
  else if (bank.status === "pdf_missing") missing++;
  else if (bank.status === "error") errors++;
  else incomplete++;

  rows.push({
    category: bank.category,
    module: bank.module,
    support: bank.supportTitle,
    total: questions.length,
    qcm,
    qcs,
    status: bank.status || "unknown",
    error: bank.error || ""
  });
}

console.log("\n================ RAPPORT BANQUE QCM ================");
console.log("Supports total:", files.length);
console.log("Supports terminés:", done);
console.log("Supports incomplets:", incomplete);
console.log("PDF introuvables:", missing);
console.log("Erreurs:", errors);
console.log("---------------------------------------------------");
console.log("TOTAL QUESTIONS:", totalQuestions);
console.log("TOTAL QCM:", totalQcm);
console.log("TOTAL QCS:", totalQcs);
console.log("===================================================\n");

console.table(rows);

const reportPath = "./qcm-bank-report.json";
fs.writeFileSync(reportPath, JSON.stringify({
  summary: {
    supportsTotal: files.length,
    done,
    incomplete,
    missing,
    errors,
    totalQuestions,
    totalQcm,
    totalQcs
  },
  supports: rows
}, null, 2), "utf8");

console.log("✅ Rapport sauvegardé:", reportPath);