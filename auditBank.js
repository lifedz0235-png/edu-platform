import fs from "fs";
import path from "path";

const BANK_DIR = "./public/banque-qcm";
const TARGET_TOTAL = 200;

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
let emptyText = 0;
let pdfMissing = 0;
let invalidPdf = 0;
let pptxError = 0;
let pptOld = 0;
let otherErrors = 0;

const problemRows = [];
const allRows = [];

for (const file of files) {
  const bank = readJson(file);
  if (!bank) continue;

  const questions = Array.isArray(bank.questions) ? bank.questions : [];
  const qcm = questions.filter(q => q.type === "QCM").length;
  const qcs = questions.filter(q => q.type === "QCS").length;

  totalQuestions += questions.length;
  totalQcm += qcm;
  totalQcs += qcs;

  const status = bank.status || "unknown";
  const error = bank.error || "";

  const row = {
    file,
    category: bank.category || "",
    module: bank.module || "",
    support: bank.supportTitle || "",
    total: questions.length,
    qcm,
    qcs,
    status,
    error
  };

  allRows.push(row);

  if (status === "done" && questions.length >= TARGET_TOTAL) {
    done++;
    continue;
  }

  if (questions.length > 0 && questions.length < TARGET_TOTAL) incomplete++;

  if (status === "empty_text") emptyText++;
  else if (status === "pdf_missing" || status === "file_missing") pdfMissing++;
  else if (error === "Invalid PDF structure") invalidPdf++;
  else if (String(error).includes("PPTX2Json")) pptxError++;
  else if (String(error).includes("PPT ancien")) pptOld++;
  else if (status === "error") otherErrors++;

  problemRows.push(row);
}

console.log("\n================ AUDIT BANQUE QCM ================");
console.log("Supports total:", files.length);
console.log("Supports terminés:", done);
console.log("Supports incomplets:", incomplete);
console.log("Empty text:", emptyText);
console.log("PDF/File missing:", pdfMissing);
console.log("Invalid PDF structure:", invalidPdf);
console.log("PPTX2Json errors:", pptxError);
console.log("PPT ancien:", pptOld);
console.log("Autres erreurs:", otherErrors);
console.log("--------------------------------------------------");
console.log("TOTAL QUESTIONS:", totalQuestions);
console.log("TOTAL QCM:", totalQcm);
console.log("TOTAL QCS:", totalQcs);
console.log("==================================================\n");

console.log("========== SUPPORTS À CORRIGER ==========");
console.table(problemRows);

fs.writeFileSync(
  "./qcm-audit.json",
  JSON.stringify(
    {
      summary: {
        supportsTotal: files.length,
        done,
        incomplete,
        emptyText,
        pdfMissing,
        invalidPdf,
        pptxError,
        pptOld,
        otherErrors,
        totalQuestions,
        totalQcm,
        totalQcs
      },
      problems: problemRows,
      all: allRows
    },
    null,
    2
  ),
  "utf8"
);

console.log("✅ Audit sauvegardé: ./qcm-audit.json");