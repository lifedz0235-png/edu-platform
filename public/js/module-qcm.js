const params = new URLSearchParams(window.location.search);

const category = params.get("category");
const moduleName = params.get("module");

const moduleTitle = document.getElementById("moduleTitle");
const moduleInfo = document.getElementById("moduleInfo");
const stats = document.getElementById("stats");

const startBtn = document.getElementById("startBtn");
const showAllBtn = document.getElementById("showAllBtn");

const quizBox = document.getElementById("quizBox");
const questionCounter = document.getElementById("questionCounter");
const questionText = document.getElementById("questionText");
const choicesBox = document.getElementById("choicesBox");
const validateBtn = document.getElementById("validateBtn");
const nextBtn = document.getElementById("nextBtn");
const explanation = document.getElementById("explanation");
const resultBox = document.getElementById("resultBox");

let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function loadQcmManifest() {
  const basePath = `/banque-qcm/${category}/${moduleName}`;

  const response = await fetch(basePath + "/index.json");

  if (!response.ok) {
    throw new Error("index.json introuvable pour ce module");
  }

  const files = await response.json();

  const loaded = [];

  for (const file of files) {
    const res = await fetch(`${basePath}/${file}`);
    if (!res.ok) continue;

    const data = await res.json();

    if (Array.isArray(data.questions)) {
      loaded.push(...data.questions.map(q => ({
        ...q,
        supportTitle: data.supportTitle
      })));
    }
  }

  return loaded;
}

function renderStats() {
  const qcm = allQuestions.filter(q => q.type === "QCM").length;
  const qcs = allQuestions.filter(q => q.type === "QCS").length;

  stats.innerHTML = `
    <h3>Statistiques</h3>
    <p>Total questions : <strong>${allQuestions.length}</strong></p>
    <p>QCM : <strong>${qcm}</strong></p>
    <p>QCS : <strong>${qcs}</strong></p>
  `;
}

function startQuiz() {
  quizQuestions = shuffle([...allQuestions]); // كل الأسئلة، ليس 50 فقط
  currentIndex = 0;
  score = 0;

  resultBox.classList.add("hidden");
  quizBox.classList.remove("hidden");

  showQuestion();
}

function showQuestion() {
  const q = quizQuestions[currentIndex];

  questionCounter.textContent = `Question ${currentIndex + 1}/${quizQuestions.length}`;
  questionText.textContent = q.question;
  explanation.textContent = "";

  choicesBox.innerHTML = "";

  q.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice";

    label.innerHTML = `
      <input type="${String(q.type).toUpperCase() === "QCS" ? "radio" : "checkbox"}" name="choice" value="${index}">
      ${choice}
    `;

    choicesBox.appendChild(label);
  });

  validateBtn.classList.remove("hidden");
  nextBtn.classList.add("hidden");
}

function validateAnswer() {
  const q = quizQuestions[currentIndex];

  const selected = [...document.querySelectorAll("input[name='choice']:checked")]
    .map(input => Number(input.value));

  const correct = q.answers || [];

  const isCorrect =
    selected.length === correct.length &&
    selected.every(v => correct.includes(v));

  if (isCorrect) score++;

  [...document.querySelectorAll(".choice")].forEach((label, index) => {
    if (correct.includes(index)) label.classList.add("correct");
    if (selected.includes(index) && !correct.includes(index)) label.classList.add("wrong");
  });

  explanation.textContent = q.explanation || "";

  validateBtn.classList.add("hidden");
  nextBtn.classList.remove("hidden");
}

function nextQuestion() {
  currentIndex++;

  if (currentIndex >= quizQuestions.length) {
    endQuiz();
    return;
  }

  showQuestion();
}

function endQuiz() {
  quizBox.classList.add("hidden");
  resultBox.classList.remove("hidden");

  resultBox.innerHTML = `
    <h2>Résultat</h2>
    <p>Score : <strong>${score}/${quizQuestions.length}</strong></p>
    <button onclick="location.reload()">Recommencer</button>
  `;
}

function showAllQuestions() {
  quizQuestions = shuffle([...allQuestions]);
  currentIndex = 0;
  score = 0;

  resultBox.classList.add("hidden");
  quizBox.classList.remove("hidden");

  showQuestion();
}

async function init() {
  if (!category || !moduleName) {
    moduleInfo.textContent = "Module invalide.";
    return;
  }

  moduleTitle.textContent = `Banque QCM - ${moduleName}`;
  moduleInfo.textContent = `${category} / ${moduleName}`;

  try {
    allQuestions = await loadQcmManifest();

    if (!allQuestions.length) {
      moduleInfo.textContent = "Aucune question trouvée.";
      return;
    }

    // renderStats();
  } catch (err) {
    moduleInfo.textContent = "Erreur: " + err.message;
  }
}

startBtn.addEventListener("click", startQuiz);
showAllBtn.addEventListener("click", showAllQuestions);
validateBtn.addEventListener("click", validateAnswer);
nextBtn.addEventListener("click", nextQuestion);

init();