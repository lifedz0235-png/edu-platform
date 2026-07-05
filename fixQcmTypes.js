import fs from "fs";
import path from "path";

const ROOT = "./public/banque-qcm";

function findJson(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);

    if (st.isDirectory()) out.push(...findJson(p));
    else if (f.endsWith(".json") && f !== "index.json") out.push(p);
  }
  return out;
}

const files = findJson(ROOT);

let total = 0;
let qcm = 0;
let qcs = 0;

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  if (!Array.isArray(data.questions)) continue;

  data.questions = data.questions.map(q => {
    const answers = Array.isArray(q.answers) ? q.answers : [];

    // إذا جواب واحد = QCS
    // إذا أكثر من جواب = QCM
    q.type = answers.length === 1 ? "QCS" : "QCM";

    // تنظيف choix إذا فيهم A) B) C)
    q.choices = (q.choices || []).map(c =>
      String(c)
        .replace(/^[A-D][\)\.\-]\s*/i, "")
        .replace(/^[0-9][\)\.\-]\s*/i, "")
        .trim()
    );

    return q;
  });

  data.generated = {
    total: data.questions.length,
    qcm: data.questions.filter(q => q.type === "QCM").length,
    qcs: data.questions.filter(q => q.type === "QCS").length
  };

  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

  total += data.generated.total;
  qcm += data.generated.qcm;
  qcs += data.generated.qcs;
}

console.log("✅ Correction terminée");
console.log("Total:", total);
console.log("QCM:", qcm);
console.log("QCS:", qcs);