import fs from "fs";
import path from "path";
import { extractPdf } from "./extractPdf.js";
import { cleanMedicalAI } from "./cleanMedicalAI.js";
import { generateChunkQuestions } from "./generateChunkQuestions.js";
import { saveQuestions } from "./saveQuestions.js";

const BANK_DIR = "./public/banque-qcm";
const PDF_ROOT = "./public";

const TARGET_TOTAL = 200;
const BATCH_TOTAL = 10;
const CHUNK_SIZE = 6000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, tries = 3) {
  let lastError;

  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(`⚠️ Retry ${i}/${tries}: ${err.message}`);
      await sleep(10000);
    }
  }

  throw lastError;
}

function findJsonFiles(dir) {
  let results = [];

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) results.push(...findJsonFiles(fullPath));
    else if (file.endsWith(".json")) results.push(fullPath);
  }

  return results;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function resolvePdfPath(bank) {
  if (!bank.supportUrl) return null;
  const cleanUrl = bank.supportUrl.replace(/^\/+/, "");
  return path.join(PDF_ROOT, cleanUrl);
}

function cleanMedicalText(text) {
  return text.replace(/\r/g, " ").replace(/\n+/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function splitText(text, size = CHUNK_SIZE) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];

  for (let i = 0; i < clean.length; i += size) {
    chunks.push(clean.slice(i, i + size));
  }

  return chunks.length ? chunks : [clean];
}

function updateGeneratedStats(bank) {
  bank.generated = {
    total: bank.questions.length,
    qcm: bank.questions.filter(q => q.type === "QCM").length,
    qcs: bank.questions.filter(q => q.type === "QCS").length
  };
}

async function processOneSupport(file, index, total) {
  let bank = readJson(file);

  bank.questions = Array.isArray(bank.questions) ? bank.questions : [];
  updateGeneratedStats(bank);

  if (bank.questions.length >= TARGET_TOTAL) {
    bank.status = "done";
    saveQuestions(file, bank);
    console.log(`⏭️ Déjà terminé: ${file}`);
    return;
  }

  if (bank.status === "pdf_missing") {
    console.log(`⏭️ PDF manquant, ignoré: ${file}`);
    return;
  }

  const pdfPath = resolvePdfPath(bank);

  console.log("\n====================================");
  console.log(`📘 Support ${index + 1}/${total}`);
  console.log("Module:", bank.category, "/", bank.module);
  console.log("Support:", bank.supportTitle);
  console.log("PDF:", pdfPath);
  console.log("Déjà généré:", bank.questions.length, "/", TARGET_TOTAL);
  console.log("====================================");

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.log("❌ PDF introuvable");
    bank.status = "pdf_missing";
    bank.updatedAt = new Date().toISOString();
    saveQuestions(file, bank);
    return;
  }

  try {
    let text = await extractPdf(pdfPath);

    console.log("🧠 Nettoyage IA...");
    text = await retry(() => cleanMedicalAI(text), 3);
    text = cleanMedicalText(text);

    if (!text || text.length < 100) {
      console.log("❌ Texte vide ou insuffisant");
      bank.status = "empty_text";
      bank.updatedAt = new Date().toISOString();
      saveQuestions(file, bank);
      return;
    }

    const chunks = splitText(text);

    console.log("✅ Texte nettoyé:", text.length, "caractères");
    console.log("✅ Chunks:", chunks.length);

    let batchStart = Math.floor(bank.questions.length / 20) + 1;

    for (let batch = batchStart; batch <= BATCH_TOTAL; batch++) {
      if (bank.questions.length >= TARGET_TOTAL) break;

      const chunk = chunks[(batch - 1) % chunks.length];

      console.log(`\n🤖 Batch ${batch}/${BATCH_TOTAL}`);
      console.log(`Avant: ${bank.questions.length}/${TARGET_TOTAL}`);

      const newQuestions = await retry(
        () => generateChunkQuestions(chunk, bank.questions, batch),
        3
      );

      bank.questions.push(...newQuestions);

      if (bank.questions.length > TARGET_TOTAL) {
        bank.questions = bank.questions.slice(0, TARGET_TOTAL);
      }

      updateGeneratedStats(bank);

      bank.status = bank.questions.length >= TARGET_TOTAL ? "done" : "in_progress";
      bank.error = "";
      bank.updatedAt = new Date().toISOString();

      saveQuestions(file, bank);

      console.log(`✅ Après: ${bank.questions.length}/${TARGET_TOTAL}`);
      console.log(`QCM: ${bank.generated.qcm} | QCS: ${bank.generated.qcs}`);
    }

    if (bank.questions.length >= TARGET_TOTAL) {
      bank.status = "done";
      bank.error = "";
      updateGeneratedStats(bank);
      saveQuestions(file, bank);
      console.log("🎉 Support terminé");
    }

  } catch (err) {
    console.log("❌ Erreur:", err.message);
    bank.status = "error";
    bank.error = err.message;
    bank.updatedAt = new Date().toISOString();
    updateGeneratedStats(bank);
    saveQuestions(file, bank);
  }
}

async function main() {
  const bankFiles = findJsonFiles(BANK_DIR);

  console.log("====================================");
  console.log("Supports trouvés:", bankFiles.length);
  console.log("Objectif:", TARGET_TOTAL, "questions/support");
  console.log("====================================");

  for (let i = 0; i < bankFiles.length; i++) {
    await processOneSupport(bankFiles[i], i, bankFiles.length);
  }

  console.log("\n🎉 Génération complète terminée !");
}

main().catch(err => {
  console.error("❌ Erreur fatale:", err.message);
});