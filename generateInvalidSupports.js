import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { extractPptx } from "./extractPptx.js";

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

function resolvePath(bank) {
  if (!bank.supportUrl) return null;
  return path.join(PDF_ROOT, bank.supportUrl.replace(/^\/+/, ""));
}

async function extractDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") return await extractPdf(filePath);

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === ".doc") {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(filePath);
    return doc.getBody();
  }

  if (ext === ".pptx") {
  return await extractPptx(filePath);
}

  if (ext === ".ppt") {
    throw new Error("PPT ancien non supporté directement. Convertis-le en PPTX.");
  }

  throw new Error(`Extension non supportée: ${ext}`);
}

function cleanMedicalText(text) {
  return text
    .replace(/\r/g, " ")
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
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

async function processFile(file, index, total) {
  let bank = readJson(file);

  bank.questions = Array.isArray(bank.questions) ? bank.questions : [];
  updateGeneratedStats(bank);

  if (bank.questions.length >= TARGET_TOTAL) {
    console.log(`⏭️ Déjà terminé: ${file}`);
    return;
  }

  const err = String(bank.error || "");
const status = String(bank.status || "");

const shouldRepair =
  err.includes("PPTX2Json") ||
  err.includes("Invalid PDF structure") ||
  err.includes("Connectionerror") ||
  status === "empty_text";

if (!shouldRepair) {
  return;
}

  const supportPath = resolvePath(bank);

  console.log("\n====================================");
  console.log(`📘 Invalid support ${index + 1}/${total}`);
  console.log("Module:", bank.category, "/", bank.module);
  console.log("Support:", bank.supportTitle);
  console.log("Fichier:", supportPath);
  console.log("Déjà généré:", bank.questions.length, "/", TARGET_TOTAL);
  console.log("====================================");

  if (!supportPath || !fs.existsSync(supportPath)) {
    console.log("❌ Fichier introuvable");
    bank.status = "file_missing";
    saveQuestions(file, bank);
    return;
  }

  try {
    let text = await extractDocument(supportPath);

    console.log("🧠 Nettoyage IA...");
    text = await retry(() => cleanMedicalAI(text), 3);
    text = cleanMedicalText(text);

    if (!text || text.length < 100) {
      console.log("❌ Texte vide");
      bank.status = "empty_text";
      bank.error = "";
      saveQuestions(file, bank);
      return;
    }

    const chunks = splitText(text);

    console.log("✅ Texte extrait:", text.length, "caractères");
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
  const files = findJsonFiles(BANK_DIR);
  console.log("Supports trouvés:", files.length);
  console.log("Traitement: Invalid PDF structure فقط");

  for (let i = 0; i < files.length; i++) {
    await processFile(files[i], i, files.length);
  }

  console.log("\n🎉 Traitement Invalid terminé !");
}

main().catch(err => {
  console.error("❌ Erreur fatale:", err.message);
});