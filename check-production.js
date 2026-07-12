import fs from "fs";
import path from "path";

const root = process.cwd();

const requiredFiles = [
  "server.js",
  "package.json",
  "public/index.html",
  "public/data/users.json",
  "public/data/community-posts.json",
  "public/data/community-notifications.json",
  "public/js/auth-guard.js",
  "public/js/login.js",
  "public/js/community.js",
  "public/js/profile.js",
  "public/js/dashboard.js",
  "public/pages/auth/login.html",
  "public/pages/profile/profile.html",
  "public/pages/community/community.html",
  "public/pages/dashboard/dashboard.html"
];

const requiredDirectories = [
  "public/uploads",
  "public/uploads/community",
  "public/uploads/profiles",
  "public/videos",
  "public/pdfs"
];

let errors = 0;

console.log("\nPCR — Vérification avant déploiement\n");

requiredFiles.forEach(relativePath => {
  const absolutePath = path.join(root, relativePath);

  if (fs.existsSync(absolutePath)) {
    console.log(`✅ ${relativePath}`);
  } else {
    console.log(`❌ ${relativePath}`);
    errors += 1;
  }
});

requiredDirectories.forEach(relativePath => {
  const absolutePath = path.join(root, relativePath);

  if (fs.existsSync(absolutePath)) {
    console.log(`✅ ${relativePath}/`);
  } else {
    console.log(`❌ ${relativePath}/`);
    errors += 1;
  }
});

const jsonFiles = [
  "public/data/users.json",
  "public/data/community-posts.json",
  "public/data/community-notifications.json"
];

jsonFiles.forEach(relativePath => {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) return;

  try {
    const parsed = JSON.parse(
      fs.readFileSync(absolutePath, "utf-8")
    );

    if (!Array.isArray(parsed)) {
      throw new Error("Le fichier doit contenir un tableau.");
    }

    console.log(`✅ JSON valide: ${relativePath}`);
  } catch (error) {
    console.log(
      `❌ JSON invalide: ${relativePath} — ${error.message}`
    );

    errors += 1;
  }
});

if (errors > 0) {
  console.error(
    `\n❌ Vérification terminée avec ${errors} problème(s).\n`
  );

  process.exit(1);
}

console.log(
  "\n✅ Projet prêt pour les tests avant déploiement.\n"
);