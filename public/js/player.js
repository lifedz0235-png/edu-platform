const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const videoPlayer = document.getElementById("videoPlayer");
const videoList = document.getElementById("videoList");
const pdfBtn = document.getElementById("pdfBtn");
const favBtn = document.getElementById("favBtn");

let currentCourse = null;
let currentModule = null;

// 🔥 تحميل البيانات
fetch("/data/cours.json")
  .then(res => res.json())
  .then(data => {

    data.forEach(category => {
      category.modules.forEach(module => {
        module.courses.forEach(course => {
          if (course.id == id) {
            currentCourse = course;
            currentModule = module;
          }
        });
      });
    });

    if (!currentCourse) {
      alert("Course not found ❌");
      return;
    }

    // 🎬 video
    videoPlayer.src = currentCourse.video;

    // 📄 PDF
    pdfBtn.href = currentCourse.pdf || "#";

    // ⭐ afficher bouton favoris
    favBtn.style.display = "block";

    // 📚 liste cours
    currentModule.courses.forEach(course => {
      const div = document.createElement("div");
      div.classList.add("video-item");
      div.textContent = course.title;

      div.onclick = () => {
        window.location.href = `player.html?id=${course.id}`;
      };

      videoList.appendChild(div);
    });

  });

// ✔️ déjà vu
function markAsWatched() {
  alert("✔️ Marqué comme vu");
}

// ⭐ favoris
function addToFavorites() {
  alert("⭐ Ajouté aux favoris");
}
