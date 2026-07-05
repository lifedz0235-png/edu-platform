const WATCHED_KEYS = ["watched_courses", "watchedCourses", "watched_courses_v1"];
const FAVORITE_KEYS = ["favoriteCourses", "favorite_courses", "favorites", "favorite_courses_v1"];

function getMergedStorageArray(keys) {
  let result = [];

  keys.forEach((key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(data)) result = result.concat(data);
    } catch {}
  });

  return [...new Set(result.map(item => typeof item === "object" ? item.id : item).filter(Boolean))];
}

function getStorageArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalizeFavoriteIds(favorites) {
  return favorites.map(f => typeof f === "object" ? f.id : f);
}

async function loadDashboard() {
  const res = await fetch("../../data/cours.json?v=" + Date.now());
  const data = await res.json();

  const watched = getMergedStorageArray(WATCHED_KEYS);
const favorites = getMergedStorageArray(FAVORITE_KEYS);

  let allCourses = [];
  data.forEach(cat => {
    cat.modules.forEach(mod => {
      mod.courses.forEach((course, index) => {
        allCourses.push({
          ...course,
          category: cat.category,
          module: mod.name,
          index
        });
      });
    });
  });

  const total = allCourses.length;
  const watchedCount = allCourses.filter(c => watched.includes(c.id)).length;
  const favCount = allCourses.filter(c => favorites.includes(c.id)).length;
  const remaining = total - watchedCount;
  const percent = total ? Math.round((watchedCount / total) * 100) : 0;

  document.getElementById("totalCourses").textContent = total;
  document.getElementById("watchedCourses").textContent = watchedCount;
  document.getElementById("favoriteCourses").textContent = favCount;
  document.getElementById("remainingCourses").textContent = remaining;
  document.getElementById("globalPercent").textContent = percent + "%";
  document.querySelector(".dash-circle").style.setProperty("--progress", percent + "%");
  updateRank(percent);

  renderCategoryProgress(data, watched);
  renderFavorites(allCourses, favorites);
}

function renderCategoryProgress(data, watched) {
  const box = document.getElementById("categoryProgress");
  box.innerHTML = "";

  data.forEach(cat => {
    const courses = cat.modules.flatMap(m => m.courses);
    const total = courses.length;
    const done = courses.filter(c => watched.includes(c.id)).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const div = document.createElement("div");
    div.className = "progress-row";
    div.innerHTML = `
      <header>
        <span>${cat.category}</span>
        <span>${done}/${total} - ${percent}%</span>
      </header>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${percent}%"></div>
      </div>
    `;

    box.appendChild(div);
  });
}

function renderFavorites(allCourses, favorites) {
  const box = document.getElementById("favoriteList");
  const favCourses = allCourses.filter(c => favorites.includes(c.id)).slice(0, 8);

  if (!favCourses.length) {
    box.innerHTML = `<p class="empty">Aucun favori pour le moment.</p>`;
    return;
  }

  box.innerHTML = favCourses.map(c => `
    <div class="favorite-item">
      <a href="../cours/player.html?category=${c.category}&module=${c.module}&course=${c.index}">
        ⭐ ${c.title}
      </a>
      <p>${c.category} / ${c.module}</p>
    </div>
  `).join("");
}

loadDashboard();

function updateRank(percent) {

    const logo = document.getElementById("rankLogo");
   

    if (!logo) return;

    let rank = {
        name: "Metal",
        img: "../../images/logo-metal.png",
        text: "Début du parcours"
    };

    if (percent >= 25 && percent < 50) {
        rank = {
            name: "Silver",
            img: "../../images/logo-silver.png",
            text: "Vous progressez bien"
        };
    }

    if (percent >= 50 && percent < 75) {
        rank = {
            name: "Argent",
            img: "../../images/logo-argent.png",
            text: "Excellent niveau"
        };
    }

    if (percent >= 75 && percent < 100) {
        rank = {
            name: "Gold",
            img: "../../images/logo-gold.png",
            text: "Presque Premium"
        };
    }

    if (percent >= 100) {
        rank = {
            name: "Premium",
            img: "../../images/pcr-logo.png",
            text: "Félicitations ! PCR Master"
        };
    }

    logo.src = rank.img;
    
}