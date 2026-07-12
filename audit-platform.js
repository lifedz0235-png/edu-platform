import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();

let errors = 0;
let warnings = 0;

function success(message) {
  console.log(`✅ ${message}`);
}

function warning(message) {
  warnings += 1;
  console.log(`⚠️  ${message}`);
}

function error(message) {
  errors += 1;
  console.log(`❌ ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function fileExists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readFile(relativePath) {
  return fs.readFileSync(
    absolute(relativePath),
    "utf-8"
  );
}

function getAllFiles(directory, extensions = []) {
  const result = [];
  const directoryPath = absolute(directory);

  if (!fs.existsSync(directoryPath)) {
    return result;
  }

  function walk(currentDirectory) {
    const entries = fs.readdirSync(
      currentDirectory,
      { withFileTypes: true }
    );

    entries.forEach(entry => {
      const entryPath = path.join(
        currentDirectory,
        entry.name
      );

      if (entry.isDirectory()) {
        walk(entryPath);
        return;
      }

      const extension = path
        .extname(entry.name)
        .toLowerCase();

      if (
        !extensions.length ||
        extensions.includes(extension)
      ) {
        result.push(entryPath);
      }
    });
  }

  walk(directoryPath);

  return result;
}

console.log(`
========================================
 PCR PLATFORM — AUDIT FINAL
========================================
`);

const requiredFiles = [
  "server.js",
  "package.json",
  ".gitignore",

  "public/index.html",

  "public/data/users.json",
  "public/data/community-posts.json",
  "public/data/community-notifications.json",
  "public/data/cours.json",

  "public/js/app.js",
  "public/js/auth-guard.js",
  "public/js/login.js",
  "public/js/register.js",
  "public/js/community.js",
  "public/js/profile.js",
  "public/js/dashboard.js",
  "public/js/player.js",
  "public/js/favoris.js",
  "public/js/user-storage.js",

  "public/pages/auth/login.html",
  "public/pages/auth/register.html",
  "public/pages/admin/admin.html",
  "public/pages/community/community.html",
  "public/pages/profile/profile.html",
  "public/pages/dashboard/dashboard.html",
  "public/pages/cours/player.html"
];

const requiredDirectories = [
  "public/data",
  "public/uploads",
  "public/uploads/community",
  "public/uploads/profiles",
  "public/videos",
  "public/pdfs"
];

console.log("\n1. FICHIERS OBLIGATOIRES\n");

requiredFiles.forEach(relativePath => {
  if (fileExists(relativePath)) {
    success(relativePath);
  } else {
    error(`Fichier absent : ${relativePath}`);
  }
});

console.log("\n2. DOSSIERS OBLIGATOIRES\n");

requiredDirectories.forEach(relativePath => {
  if (fileExists(relativePath)) {
    success(`${relativePath}/`);
  } else {
    error(`Dossier absent : ${relativePath}/`);
  }
});

console.log("\n3. VALIDATION JSON\n");

const jsonFiles = getAllFiles(
  "public/data",
  [".json"]
);

jsonFiles.forEach(filePath => {
  const relativePath = path.relative(
    ROOT,
    filePath
  );

  try {
    const content = fs
      .readFileSync(filePath, "utf-8")
      .trim();

    if (!content) {
      warning(`JSON vide : ${relativePath}`);
      return;
    }

    JSON.parse(content);
    success(`JSON valide : ${relativePath}`);

  } catch (auditError) {
    error(
      `JSON invalide : ${relativePath} — ${auditError.message}`
    );
  }
});

console.log("\n4. SYNTAXE JAVASCRIPT\n");

const jsFiles = [
  "server.js",
  "check-production.js",
  ...getAllFiles("public/js", [".js"])
    .map(filePath => path.relative(ROOT, filePath))
];

jsFiles
  .filter((value, index, array) =>
    array.indexOf(value) === index
  )
  .forEach(relativePath => {
    if (!fileExists(relativePath)) return;

    try {
      execSync(
        `node --check "${relativePath}"`,
        {
          cwd: ROOT,
          stdio: "pipe"
        }
      );

      success(`Syntaxe valide : ${relativePath}`);

    } catch (auditError) {
      error(`Erreur JS : ${relativePath}`);

      const output =
        auditError.stderr?.toString() ||
        auditError.stdout?.toString() ||
        auditError.message;

      console.log(output);
    }
  });

console.log("\n5. SÉCURITÉ DES FICHIERS\n");

if (fileExists(".gitignore")) {
  const gitignore = readFile(".gitignore");

  if (
    gitignore
      .split(/\r?\n/)
      .map(line => line.trim())
      .includes(".env")
  ) {
    success(".env est protégé par .gitignore");
  } else {
    error(".env n’est pas protégé par .gitignore");
  }
}

try {
  const trackedFiles = execSync(
    "git ls-files",
    {
      cwd: ROOT,
      encoding: "utf-8"
    }
  )
    .split(/\r?\n/)
    .filter(Boolean);

  if (trackedFiles.includes(".env")) {
    error(".env est suivi par Git !");
  } else {
    success(".env n’est pas suivi par Git");
  }

  const trackedBackups = trackedFiles.filter(
    file =>
      file.includes(".backup") ||
      file.includes("backup-before")
  );

  if (trackedBackups.length) {
    warning(
      `Fichiers backup suivis par Git : ${trackedBackups.join(", ")}`
    );
  } else {
    success("Aucun backup suivi par Git");
  }

} catch (auditError) {
  warning("Impossible de vérifier les fichiers Git");
}

console.log("\n6. ROUTES EXPRESS DUPLIQUÉES\n");

if (fileExists("server.js")) {
  const serverCode = readFile("server.js");

  const routeRegex =
    /app\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;

  const routes = [];
  let match;

  while (
    (match = routeRegex.exec(serverCode)) !== null
  ) {
    routes.push({
      method: match[1].toUpperCase(),
      route: match[2]
    });
  }

  const routeCount = new Map();

  routes.forEach(item => {
    const key = `${item.method} ${item.route}`;

    routeCount.set(
      key,
      (routeCount.get(key) || 0) + 1
    );
  });

  const duplicates = [...routeCount.entries()]
    .filter(([, count]) => count > 1);

  if (!duplicates.length) {
    success("Aucune route Express dupliquée");
  } else {
    duplicates.forEach(([route, count]) => {
      error(
        `Route dupliquée ${count} fois : ${route}`
      );
    });
  }

  success(`${routes.length} routes API détectées`);
}

console.log("\n7. IDS HTML DUPLIQUÉS\n");

const htmlFiles = getAllFiles(
  "public",
  [".html"]
);

htmlFiles.forEach(filePath => {
  const relativePath = path.relative(
    ROOT,
    filePath
  );

  const html = fs.readFileSync(
    filePath,
    "utf-8"
  );

  const idRegex = /\sid=["']([^"']+)["']/g;
  const ids = [];
  let match;

  while ((match = idRegex.exec(html)) !== null) {
    ids.push(match[1]);
  }

  const duplicates = ids.filter(
    (id, index) => ids.indexOf(id) !== index
  );

  const uniqueDuplicates = [
    ...new Set(duplicates)
  ];

  if (uniqueDuplicates.length) {
    error(
      `IDs dupliqués dans ${relativePath} : ${uniqueDuplicates.join(", ")}`
    );
  }
});

if (!errors) {
  success("Aucun ID HTML dupliqué");
}

console.log("\n8. AUTH-GUARD DANS LES PAGES\n");

const publicAuthPages = [
  "public/pages/auth/login.html",
  "public/pages/auth/register.html"
];

htmlFiles.forEach(filePath => {
  const relativePath = path.relative(
    ROOT,
    filePath
  );

  if (
    publicAuthPages.includes(relativePath)
  ) {
    return;
  }

  const html = fs.readFileSync(
    filePath,
    "utf-8"
  );

  if (
    html.includes("/js/auth-guard.js")
  ) {
    success(`Page protégée : ${relativePath}`);
  } else {
    warning(
      `auth-guard absent : ${relativePath}`
    );
  }
});

console.log("\n9. CLÉS LOCALSTORAGE PARTAGÉES\n");

const userDataKeys = [
  "favoriteCourses",
  "favorites",
  "watchedCourses",
  "watched_courses",
  "completedModules",
  "qcmResults"
];

const frontJsFiles = getAllFiles(
  "public/js",
  [".js"]
);

frontJsFiles.forEach(filePath => {
  const relativePath = path.relative(
    ROOT,
    filePath
  );

  if (
    relativePath.endsWith("user-storage.js") ||
    relativePath.includes("backup")
  ) {
    return;
  }

  const code = fs.readFileSync(
    filePath,
    "utf-8"
  );

  userDataKeys.forEach(key => {
    const getPattern =
      new RegExp(
        `localStorage\\.getItem\\(["'\`]${key}["'\`]\\)`
      );

    const setPattern =
      new RegExp(
        `localStorage\\.setItem\\(["'\`]${key}["'\`]`
      );

    if (
      getPattern.test(code) ||
      setPattern.test(code)
    ) {
      warning(
        `Stockage potentiellement partagé dans ${relativePath} : ${key}`
      );
    }
  });
});

console.log("\n10. TAILLE DES MÉDIAS\n");

[
  "public/videos",
  "public/pdfs",
  "public/uploads"
].forEach(relativePath => {
  if (!fileExists(relativePath)) return;

  try {
    const size = execSync(
      `du -sh "${relativePath}"`,
      {
        cwd: ROOT,
        encoding: "utf-8"
      }
    ).trim();

    success(size);
  } catch {
    warning(
      `Impossible de calculer la taille : ${relativePath}`
    );
  }
});

console.log(`
========================================
 RÉSULTAT FINAL
========================================
`);

console.log(`Erreurs   : ${errors}`);
console.log(`Warnings  : ${warnings}`);

if (errors > 0) {
  console.log(`
❌ La plateforme n’est pas encore prête.
Corrigez les erreurs avant le déploiement.
`);

  process.exit(1);
}

if (warnings > 0) {
  console.log(`
⚠️ La plateforme fonctionne, mais les warnings
doivent être vérifiés avant le déploiement.
`);

  process.exit(0);
}

console.log(`
✅ PCR Platform est prête pour le déploiement.
`);

process.exit(0);