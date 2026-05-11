const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.env.HOME, "edu-platform", "public", "pdfs");
const OUTPUT = path.join(process.env.HOME, "edu-platform", "public", "js", "pdf-manifest.js");

function walk(dir) {
  const result = [];

  if (!fs.existsSync(dir)) {
    return result;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      result.push(fullPath);
    }
  }

  return result;
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/\.mp4$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function relativeWebPath(absPath) {
  const publicRoot = path.join(process.env.HOME, "edu-platform", "public");
  const rel = path.relative(publicRoot, absPath).split(path.sep).join("/");
  return `../../${rel}`;
}

function buildManifest() {
  const files = walk(ROOT);
  const manifest = {};

  for (const absPath of files) {
    const rel = path.relative(ROOT, absPath);
    const parts = rel.split(path.sep);

    if (parts.length < 3) continue;

    const [category, module, fileName] = parts;
    const key = `${category}/${module}`;

    if (!manifest[key]) {
      manifest[key] = [];
    }

    manifest[key].push({
      file: fileName,
      normalized: normalize(fileName),
      path: relativeWebPath(absPath)
    });
  }

  const content = `window.pdfManifest = ${JSON.stringify(manifest, null, 2)};`;

  fs.writeFileSync(OUTPUT, content, "utf8");
  console.log(`PDF manifest generated: ${OUTPUT}`);
  console.log(`Modules indexed: ${Object.keys(manifest).length}`);
  console.log(`PDF files indexed: ${files.length}`);
}

buildManifest();
