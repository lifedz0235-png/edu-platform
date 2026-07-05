import fs from "fs";
import path from "path";

const root = "public/pdfs";
const out = "public/data/pdf-manifest.json";
const exts = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    if (item.startsWith(".~lock")) continue;
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (exts.includes(path.extname(full).toLowerCase())) {
      files.push("/" + full.replace(/^public\//, "").replaceAll("\\", "/"));
    }
  }
  return files;
}

fs.writeFileSync(out, JSON.stringify(walk(root).sort(), null, 2));
console.log("✅ pdf-manifest généré:", out);
