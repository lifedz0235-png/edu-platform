import { extractPdf } from "./extractPdf.js";

const filePath = process.argv[2];

if (!filePath) {
  console.log("❌ Donne le chemin du PDF");
  process.exit(1);
}

const text = await extractPdf(filePath);

console.log("Longueur :", text.length);
console.log("\n========================\n");
console.log(text.slice(0, 2000));