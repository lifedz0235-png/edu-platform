const SESSION_SIZE = 50;

const params = new URLSearchParams(window.location.search);
const category = params.get("category");
const moduleName = params.get("module");

const pcrTrialGate =
  window.PCRTrialReady ||
  Promise.resolve(null);

const moduleTitle = document.getElementById("moduleTitle");
const moduleInfo = document.getElementById("moduleInfo");

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
const lockBox = document.getElementById("lockBox");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;
let wrongCount = 0;
let consecutiveWrong = 0;

let selectedAnswers = [];

const storageKey = `qcm_progress_${category}_${moduleName}`;
const lockKey = `qcm_lock_${category}_${moduleName}`;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function getProgress() {
  return JSON.parse(localStorage.getItem(storageKey)) || {
    done: 0,
    scores: [],
    errors: []
  };
}

function saveProgress(progress) {
  localStorage.setItem(storageKey, JSON.stringify(progress));
}

function getLock() {
  return Number(localStorage.getItem(lockKey)) || 0;
}

function setLock(hours) {
  const until = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem(lockKey, until);
}

function clearLock() {
  localStorage.removeItem(lockKey);
}

function formatTime(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}min`;
}

function goToCourses() {
  window.location.href = `/pages/cours/player.html?category=${category}&module=${moduleName}`;
}

function checkLock() {
  const lockedUntil = getLock();

  if (Date.now() < lockedUntil) {
    const remaining = lockedUntil - Date.now();

    lockBox.classList.remove("hidden");
    lockBox.innerHTML = `
      <h2>🔒 QCM bloqués temporairement</h2>
      <p>Veuillez revenir aux cours avant de continuer.</p>
      <p>Temps restant : <strong>${formatTime(remaining)}</strong></p>
      <button class="continue-btn" onclick="goToCourses()">Revenir aux cours</button>
    `;

    quizBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    startBtn.disabled = true;
    showAllBtn.disabled = true;

    return true;
  }

  clearLock();
  lockBox.classList.add("hidden");
  startBtn.disabled = false;
  showAllBtn.disabled = false;
  return false;
}

async function loadQcmManifest() {
  const trialAccess =
    await pcrTrialGate;

  if (
    trialAccess &&
    !trialAccess.isModuleAllowed(
      category,
      moduleName
    )
  ) {
    trialAccess.showBlockedOverlay();
    throw new Error(
      "TRIAL_ACCESS_DENIED"
    );
  }

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

function updateProgressBar() {
  const progress = getProgress();
  const done = progress.done;
  const total = allQuestions.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  progressText.textContent = `${done} / ${total} QCM réalisés - ${percent}%`;
  progressFill.style.width = `${percent}%`;
}

function startQuiz() {
  if (checkLock()) return;

  const progress = getProgress();

  if (progress.done >= allQuestions.length) {
    showBankCompleted();
    return;
  }

  quizQuestions = allQuestions.slice(progress.done, progress.done + SESSION_SIZE);

  currentIndex = 0;
  score = 0;
  wrongCount = 0;
  consecutiveWrong = 0;

  resultBox.classList.add("hidden");
  quizBox.classList.remove("hidden");

  showQuestion();
}

function showAllQuestions() {
  if (checkLock()) return;

  quizQuestions = shuffle([...allQuestions]).slice(0, SESSION_SIZE);

  currentIndex = 0;
  score = 0;
  wrongCount = 0;
  consecutiveWrong = 0;

  resultBox.classList.add("hidden");
  quizBox.classList.remove("hidden");

  showQuestion();
}

function showQuestion() {
  const q = quizQuestions[currentIndex];
  selectedAnswers = [];

  questionCounter.textContent = `Question ${currentIndex + 1}/${quizQuestions.length}`;
  questionText.textContent = q.question;
  explanation.textContent = "";
  choicesBox.innerHTML = "";

  const inputType = String(q.type).toUpperCase() === "QCS" ? "radio" : "checkbox";

  q.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice";

    label.innerHTML = `
      <input type="${inputType}" name="choice" value="${index}">
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

  if (isCorrect) {
    score++;
    consecutiveWrong = 0;
  } else {
    wrongCount++;
    consecutiveWrong++;

    const progress = getProgress();
    progress.errors.push({
      module: moduleName,
      category,
      question: q.question,
      correctAnswers: correct.map(i => q.choices[i]),
      date: new Date().toISOString()
    });
    saveProgress(progress);
  }

  [...document.querySelectorAll(".choice")].forEach((label, index) => {
    if (correct.includes(index)) label.classList.add("correct");
    if (selected.includes(index) && !correct.includes(index)) label.classList.add("wrong");
  });

  explanation.textContent = q.explanation || "";

  validateBtn.classList.add("hidden");
  nextBtn.classList.remove("hidden");

  if (consecutiveWrong >= 5) {
    setLock(5);
    showBlockedMessage(5, "Vous avez fait 5 réponses fausses consécutives");
    return;
  }

  if (currentIndex + 1 >= 20 && wrongCount >= 5) {
    setLock(2);
    showBlockedMessage(2, "Vous avez fait 5 erreurs dans les 20 premières questions");
    return;
  }
}

function showBlockedMessage(hours, reason) {
  quizBox.classList.add("hidden");
  resultBox.classList.add("hidden");

  lockBox.classList.remove("hidden");
  lockBox.innerHTML = `
    <h2>⚠️ Revenir aux cours</h2>
    <p>${reason}.</p>
    <p>Les QCM sont bloqués pendant <strong>${hours} heures</strong>.</p>
    <button class="continue-btn" onclick="goToCourses()">Revenir aux cours</button>
  `;
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
  const progress = getProgress();

  progress.done += quizQuestions.length;
  progress.scores.push({
    score,
    total: quizQuestions.length,
    date: new Date().toISOString()
  });

  if (progress.done > allQuestions.length) {
    progress.done = allQuestions.length;
  }

  saveProgress(progress);
  updateProgressBar();

  const remaining = allQuestions.length - progress.done;
  const percent = Math.round((score / quizQuestions.length) * 100);

  quizBox.classList.add("hidden");
  resultBox.classList.remove("hidden");

  resultBox.innerHTML = `
    <h2>🎉 Session terminée</h2>

    <p>Score : <strong>${score}/${quizQuestions.length}</strong></p>
    <p>Pourcentage : <strong>${percent}%</strong></p>

    <hr>

    <p>Vous avez terminé <strong>${progress.done}</strong> QCM sur <strong>${allQuestions.length}</strong>.</p>
    <p>Il reste encore <strong>${remaining}</strong> QCM à découvrir.</p>

    ${
      remaining > 0
        ? `<button class="continue-btn" onclick="startQuiz()">▶ Continuer la série</button>`
        : `<button class="continue-btn" onclick="showBankCompleted()">Voir le bilan final</button>`
    }

    <button class="continue-btn" onclick="goToCourses()">Revenir aux cours</button>
  `;
}

function showBankCompleted() {
  const progress = getProgress();

  const totalSessions = progress.scores.length;
  const totalScore = progress.scores.reduce((sum, s) => sum + s.score, 0);
  const totalQuestions = progress.scores.reduce((sum, s) => sum + s.total, 0);
  const average = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

  quizBox.classList.add("hidden");
  resultBox.classList.remove("hidden");

  resultBox.innerHTML = `
    <h2>🏆 Banque QCM terminée</h2>

    <p>Vous avez terminé toute la banque : <strong>${allQuestions.length} QCM</strong>.</p>
    <p>Nombre de sessions : <strong>${totalSessions}</strong></p>
    <p>Moyenne générale : <strong>${average}%</strong></p>

    <button class="continue-btn" onclick="restartBank()">Nouvelle série</button>
    <button class="continue-btn" onclick="goToCourses()">Revenir aux cours</button>
  `;
}

function restartBank() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(lockKey);
  window.location.reload();
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

    updateProgressBar();
    checkLock();

  } catch (err) {
    moduleInfo.textContent = "Erreur: " + err.message;
  }
}

startBtn.addEventListener("click", startQuiz);
showAllBtn.addEventListener("click", showAllQuestions);
validateBtn.addEventListener("click", validateAnswer);
nextBtn.addEventListener("click", nextQuestion);

const backToModules = document.getElementById("backToModules");
if (backToModules) {
 backToModules.href = `/pages/cours/player.html?category=${category}&module=${moduleName}`; 
}

init();