const DATA_URL = "../../data/cours.json?v=" + Date.now();

const WATCHED_KEYS = ["watchedCourses", "watched_courses"];
const FAVORITE_KEYS = ["favoriteCourses"];

let appData = [];
let currentCategory = null;
let currentModuleName = null;
let currentCourseIndex = 0;
let currentModule = null;
let currentCourse = null;

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    try {
      readUrlParams();

      const trialAccess =
        window.PCRTrialReady
          ? await window.PCRTrialReady
          : null;

      if (
        trialAccess &&
        !trialAccess.isModuleAllowed(
          currentCategory,
          currentModuleName
        )
      ) {
        trialAccess.showBlockedOverlay();
        return;
      }

      await initPlayer();
    } catch (error) {
      console.error(
        "Erreur initialisation player:",
        error
      );
    }
  }
);

async function initPlayer() {
  await loadData();
  readUrlParams();
  findCurrentCourse();

  if (!currentCourse || !currentModule) {
    alert("Cours introuvable");
    return;
  }

  hideWatchedButton();
  renderVideo();
  renderSupports();
  renderSidebar();
  updateProgress();
  updateFavoriteButton();
  setupFavoriteButton();
  setupSearch();
  setupNextMiniature();
}

async function loadData() {
  const res = await fetch(DATA_URL);
  appData = await res.json();
}

function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  currentCategory = params.get("category");
  currentModuleName = params.get("module");
  currentCourseIndex = Number(params.get("course") || 0);
}

function findCurrentCourse() {
  const category = appData.find(c => c.category === currentCategory);
  currentModule = category?.modules.find(m => m.name === currentModuleName);
  currentCourse = currentModule?.courses[currentCourseIndex];
}

function renderVideo() {
  const video = document.getElementById("videoPlayer");
  const title = document.getElementById("moduleName");

  if (title) title.textContent = currentModuleName;
  if (video) {
    video.src = currentCourse.video;
    video.load();
  }
}

function hideWatchedButton() {
  const btn = document.getElementById("watchedBtn");
  if (btn) btn.style.display = "none";
}

/* ================= WATCHED ================= */

function getWatched() {
  let result = [];

  WATCHED_KEYS.forEach(key => {
    try {
      const data = getUserData(key, []);
      if (Array.isArray(data)) result = result.concat(data);
    } catch {}
  });

  return [...new Set(result)];
}

function saveWatched(courseId) {
  const watched = getWatched();

  if (!watched.includes(courseId)) {
    watched.push(courseId);
  }

  WATCHED_KEYS.forEach(key => {
    setUserData(key, watched);
  });
}

function isWatched(courseId) {
  return getWatched().includes(courseId);
}

/* ================= FAVORITES ================= */

function getFavorites() {
  try {
    const data = getUserData("favoriteCourses", []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function isFavorite(courseId) {
  return getFavorites().some(f => f.id === courseId || f === courseId);
}

function setupFavoriteButton() {
  const btn = document.getElementById("favoriteBtn");
  if (!btn) return;

  btn.onclick = () => {
    let favs = getFavorites();

    if (isFavorite(currentCourse.id)) {
      favs = favs.filter(f => (f.id || f) !== currentCourse.id);
    } else {
      favs.push({
        id: currentCourse.id,
        title: currentCourse.title,
        category: currentCategory,
        module: currentModuleName,
        course: currentCourseIndex
      });
    }

    setUserData("favoriteCourses", favs);
    updateFavoriteButton();
    renderSidebar();
  };
}

function updateFavoriteButton() {
  const btn = document.getElementById("favoriteBtn");
  if (!btn) return;

  if (isFavorite(currentCourse.id)) {
    btn.textContent = "⭐ Favori";
    btn.classList.add("btn-favorite-active");
  } else {
    btn.textContent = "⭐ Favoris";
    btn.classList.remove("btn-favorite-active");
  }
}

/* ================= SUPPORTS ================= */

function renderSupports() {
  const pdfLink = document.getElementById("pdfLink");
  const supportsList = document.getElementById("supportsList");
  const pdfUnavailable = document.getElementById("pdfUnavailable");
  const pdfViewer = document.getElementById("pdfViewer");
  const togglePdfBtn = document.getElementById("togglePdfBtn");

  const supports = currentCourse.supports || [];
  const mainPdf = supports.find(s => s.type === "pdf");

  if (pdfLink) {
    if (mainPdf) {
      pdfLink.href = mainPdf.url;
      pdfLink.style.display = "inline-flex";
    } else {
      pdfLink.style.display = "none";
    }
  }

  if (supportsList) {
    supportsList.innerHTML = "";

    supports.forEach((s, index) => {
      const a = document.createElement("a");
      a.className = "support-item";
      a.href = s.url;
      a.target = "_blank";
      a.textContent = `📄 Support ${index + 1}`;
      supportsList.appendChild(a);
    });
  }

  if (pdfUnavailable) {
    pdfUnavailable.classList.toggle("hidden", supports.length > 0);
  }

  if (togglePdfBtn && pdfViewer && mainPdf) {
    togglePdfBtn.onclick = () => {
      pdfViewer.src = mainPdf.url;
      pdfViewer.classList.toggle("hidden");
    };
  }
}

/* ================= SIDEBAR ================= */

function renderSidebar(filteredCourses = currentModule.courses) {
  const list = document.getElementById("videoList");
  if (!list) return;

  list.innerHTML = "";

  filteredCourses.forEach(course => {
    const realIndex = currentModule.courses.findIndex(c => c.id === course.id);

    const a = document.createElement("a");
    a.className = "course-item";
    a.href = `player.html?category=${currentCategory}&module=${currentModuleName}&course=${realIndex}`;
    a.textContent = course.title;

    if (realIndex === currentCourseIndex) a.classList.add("active");
    if (isWatched(course.id)) a.classList.add("done");
    if (isFavorite(course.id)) a.classList.add("favorite-item");

    list.appendChild(a);
  });
}

function setupSearch() {
  const input = document.getElementById("courseSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();

    const filtered = currentModule.courses.filter(c =>
      c.title.toLowerCase().includes(q)
    );

    renderSidebar(filtered);
  });
}

function updateProgress() {
  const watched = getWatched();
  const total = currentModule.courses.length;
  const done = currentModule.courses.filter(c => watched.includes(c.id)).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const text = document.getElementById("progressText");
  const fill = document.getElementById("progressFill");

  if (text) text.textContent = `${done} / ${total} cours vus - ${percent}%`;
  if (fill) fill.style.width = `${percent}%`;
}

/* ================= NETFLIX NEXT MINIATURE ================= */

function setupNextMiniature() {
  const video = document.getElementById("videoPlayer");
  if (!video) return;

  let box = document.getElementById("nextMiniature");

  if (!box) {
    box = document.createElement("div");
    box.id = "nextMiniature";
    box.className = "next-miniature";
    box.innerHTML = `
      <div class="mini-thumb">▶</div>
      <div class="mini-info">
        <strong>Vidéo suivante</strong>
        <p id="nextMiniTitle"></p>
        <small>Démarrage dans <span id="nextMiniCountdown">5</span>s</small>
      </div>
      <button id="cancelNextMini">Annuler</button>
    `;

    video.parentElement.style.position = "relative";
    video.parentElement.appendChild(box);
  }

  const title = document.getElementById("nextMiniTitle");
  const count = document.getElementById("nextMiniCountdown");
  const cancel = document.getElementById("cancelNextMini");

  const nextCourse = currentModule.courses[currentCourseIndex + 1];

  let shown = false;
  let seconds = 5;
  let timer = null;
  let cancelled = false;

  function goNext() {
    saveWatched(currentCourse.id);

    if (nextCourse) {
      window.location.href =
        `player.html?category=${currentCategory}&module=${currentModuleName}&course=${currentCourseIndex + 1}`;
    } else {
      showModuleCompletedCelebration();
    }
  }

  function showMiniature() {
    if (shown || cancelled) return;
    shown = true;

    saveWatched(currentCourse.id);
    updateProgress();
    renderSidebar();

    if (!nextCourse) {
      showModuleCompletedCelebration();
      return;
    }

    title.textContent = nextCourse.title;
    seconds = 5;
    count.textContent = seconds;
    box.classList.add("show");

    timer = setInterval(() => {
      seconds--;
      count.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(timer);
        goNext();
      }
    }, 1000);
  }

  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;

    const remaining = video.duration - video.currentTime;

    if (remaining <= 5) {
      showMiniature();
    }
  });

  cancel.onclick = () => {
    cancelled = true;
    clearInterval(timer);
    box.classList.remove("show");
  };
}

/* ================= MODULE COMPLETED ================= */

function showModuleCompletedCelebration() {
  saveWatched(currentCourse.id);

  const overlay = document.createElement("div");
  overlay.className = "module-complete-overlay";
  overlay.innerHTML = `
    <div class="module-complete-box">
      <h1>🎉 Module terminé !</h1>
      <p>Bravo, vous avez terminé ce module à 100%.</p>
      <p>Retour vers les modules...</p>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    window.location.href =
      `../modules/modules.html?category=${currentCategory}`;
  }, 3500);
}