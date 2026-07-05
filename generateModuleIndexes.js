import fs from "fs";
import path from "path";

const ROOT = "./public/banque-qcm";

function scan(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  const jsonFiles = items
    .filter(f => f.isFile() && f.name.endsWith(".json") && f.name !== "index.json")
    .map(f => f.name)
    .sort();

  if (jsonFiles.length) {
    fs.writeFileSync(
      path.join(dir, "index.json"),
      JSON.stringify(jsonFiles, null, 2),
      "utf8"
    );

    console.log("✅", dir, "->", jsonFiles.length, "supports");
  }

  for (const item of items) {
    if (item.isDirectory()) {
      scan(path.join(dir, item.name));
    }
  }
}

scan(ROOT);

console.log("\n🎉 Tous les index.json ont été générés.");