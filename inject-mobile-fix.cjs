const fs = require("fs");
const path = require("path");

const publicDirectory = path.join(__dirname, "public");

const cssTag =
  '<link rel="stylesheet" href="/css/mobile-responsive.css">';

const jsTag =
  '<script src="/js/mobile-menu.js"></script>';

function getAllHtmlFiles(directory) {
  let htmlFiles = [];

  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      htmlFiles = htmlFiles.concat(getAllHtmlFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".html")
    ) {
      htmlFiles.push(fullPath);
    }
  }

  return htmlFiles;
}

function injectFiles(htmlFilePath) {
  let html = fs.readFileSync(htmlFilePath, "utf8");
  let modified = false;

  if (!html.includes("/css/mobile-responsive.css")) {
    if (html.includes("</head>")) {
      html = html.replace(
        "</head>",
        `  ${cssTag}\n</head>`
      );

      modified = true;
    }
  }

  if (!html.includes("/js/mobile-menu.js")) {
    if (html.includes("</body>")) {
      html = html.replace(
        "</body>",
        `  ${jsTag}\n</body>`
      );

      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(htmlFilePath, html, "utf8");

    console.log(
      `✅ Responsive ajouté : ${path.relative(
        __dirname,
        htmlFilePath
      )}`
    );
  } else {
    console.log(
      `ℹ️ Déjà configuré : ${path.relative(
        __dirname,
        htmlFilePath
      )}`
    );
  }
}

if (!fs.existsSync(publicDirectory)) {
  console.error("❌ Le dossier public est introuvable.");
  process.exit(1);
}

const htmlFiles = getAllHtmlFiles(publicDirectory);

if (htmlFiles.length === 0) {
  console.error("❌ Aucun fichier HTML trouvé.");
  process.exit(1);
}

htmlFiles.forEach(injectFiles);

console.log("");
console.log(`✅ Terminé : ${htmlFiles.length} pages vérifiées.`);
console.log("✅ CSS mobile ajouté.");
console.log("✅ Menu mobile ajouté.");