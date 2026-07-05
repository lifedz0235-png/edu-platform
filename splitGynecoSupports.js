import fs from "fs";
import path from "path";

const OUT_DIR = "./public/banque-qcm/chirurgie/gynecologie";

const supports = [
  {
    title: "Cancer du col utérin",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/Cancer du col utérin2_Password_Removed.pdf"
  },
  {
    title: "Hémorragies de la délivrance",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/HEMORRAGIES DE LA DELIVRANCE resid Password_Removed.pdf"
  },
  {
    title: "Hypertension artérielle et grossesse",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/Hypertension arterielle & grossesse résid_Password_Removed.pdf"
  },
  {
    title: "Hématome rétro-placentaire",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/L’ hématome rétro-placentaire.pdf"
  },
  {
    title: "Cancer de l’endomètre",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/cancer de l'endometre Password_Removed.pdf"
  },
  {
    title: "Cancer du sein",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/cancer du sein résid bis_Password_Removed.pdf"
  },
  {
    title: "Fibrome utérin",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/fibrome uterin_Password_Removed.pdf"
  },
  {
    title: "Placenta prævia",
    file: "/pdfs/chirurgie-pdf/GYNECO PDF/gynecobst-extracted/placenta praevia resid.pdf"
  }
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

for (const s of supports) {
  const outFile = path.join(OUT_DIR, `${slug(s.title)}.json`);

  const data = {
    category: "chirurgie",
    module: "gynecologie",
    courseId: null,
    courseTitle: "Gynécologie obstétrique",
    supportTitle: s.title,
    supportUrl: s.file,
    supportType: "pdf",
    questions: [],
    generated: {
      total: 0,
      qcm: 0,
      qcs: 0
    },
    status: "empty_text",
    error: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), "utf8");
  console.log("✅ Créé:", outFile);
}

console.log("\n✅ 8 supports gynécologie créés");