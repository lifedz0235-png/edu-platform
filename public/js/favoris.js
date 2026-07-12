const FAVORITE_KEYS = ["favoriteCourses", "favorite_courses", "favorites", "favorite_courses_v1"];

function getMergedFavorites() {
  let result = [];

  FAVORITE_KEYS.forEach((key) => {
    try {
      const data = getUserData(key, []);
      if (Array.isArray(data)) result = result.concat(data);
    } catch {}
  });

  return [...new Set(result.map(item => typeof item === "object" ? item.id : item).filter(Boolean))];
}

async function loadFavoritesPage() {
  const box = document.getElementById("favoritesList");
  if (!box) return;

  const res = await fetch("../../data/cours.json?v=" + Date.now());
  const data = await res.json();

  const favorites = getMergedFavorites();

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

  const favCourses = allCourses.filter(c => favorites.includes(c.id));

  if (!favCourses.length) {
    box.innerHTML = `
      <div class="module-card">
        <h3>Aucun favori pour le moment.</h3>
        <p>Ajoute des cours depuis le lecteur.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = favCourses.map(c => `
    <a class="module-card" href="../cours/player.html?category=${c.category}&module=${c.module}&course=${c.index}">
      <span class="category-icon">⭐</span>
      <span class="module-card-title">${c.title}</span>
      <span class="module-card-count">${c.category} / ${c.module}</span>
    </a>
  `).join("");
}

loadFavoritesPage();