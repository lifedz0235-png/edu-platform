import fs from "fs";
import pdf from "pdf-parse";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function extractPdf(filePath) {
  // ---------- المحاولة الأولى : pdf-parse ----------
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);

    const text = (data.text || "").trim();

    if (text.length > 300) {
      console.log("✅ PDF lu avec pdf-parse");
      return text;
    }

    console.log("⚠️ pdf-parse a retourné peu de texte.");
  } catch (err) {
    console.log("⚠️ pdf-parse:", err.message);
  }

  // ---------- المحاولة الثانية : pdftotext ----------
  try {
  console.log("🔄 Fallback → pdftotext...");

  const { stdout, stderr } = await execFileAsync("pdftotext", [
    "-layout",
    filePath,
    "-"
  ]);

  console.log("STDOUT length :", stdout.length);
  console.log("STDERR :", stderr);

  const text = stdout.trim();

  if (text.length > 300) {
    console.log("✅ PDF lu avec pdftotext");
    return text;
  }

  console.log("⚠️ pdftotext a retourné peu de texte.");
} catch (err) {
  console.log("❌ execFile:", err);
}

  // ---------- échec ----------
  return "";
}