function slugToTitle(slug) {
  if (!slug) return "";
  return slug
    .replace(/\.mp4$/i, "")
    .replace(/\.pdf$/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makePdfPathFromVideo(videoPath) {
  const directPdf = videoPath 
   .replace("/videos/", "/pdfs/")
    .replace(/\.mp4$/i, ".pdf");

  const map = window.coursePdfMap || {};
  const mapKey = videoPath
    .replace(/^(\.\.\/)+videos\//, "")
    .replace(/^\/?videos\//, "");

  return map[mapKey] || directPdf;
}

function makeCourseList(names, baseVideoPath) {
  return names.map((fileName, index) => {
    const baseName = fileName.replace(/\.mp4$/i, "");
    const video = `${baseVideoPath}/${fileName}`;
    const pdf = makePdfPathFromVideo(video);

    return {
      id: `${baseVideoPath}-${baseName}-${index + 1}`.replace(/[^a-zA-Z0-9-]/g, "-"),
      title: slugToTitle(baseName),
      video,
      pdf
    };
  });
}
const platformData = {
  categories: [
    {
      id: "biologie",
      title: "Biologie",
      icon: "🧬",
      modules: [
        {
          id: "anatomopathologie",
          title: "Anatomopathologie",
          courses: makeCourseList(
            [
              "les-metastases.mp4",
              "classification-des-tumeurs.mp4",
              "processus-inflammatoire.mp4",
              "les-amyloses-congestion.mp4",
              "aterosclerose.mp4",
              "la-cellule-cancereuse.mp4",
              "atelier.mp4"
            ],
            "../../videos/biologie/anatomopathologie"
          )
        },
        {
          id: "biochimie",
          title: "Biochimie",
          courses: makeCourseList(
            [
              "metabolisme-des-glucides.mp4",
              "glycemie.mp4",
              "metabolisme-des-lipides.mp4",
              "metabolisme-phospho-calcique.mp4",
              "metabolisme-de-fer.mp4",
              "metabolisme-des-proteines.mp4",
              "metabolisme-des-acides-gras.mp4",
              "equilibre-acide-base.mp4",
              "atelier-1.mp4",
              "atelier-2.mp4"
            ],
            "../../videos/biologie/biochimie"
          )
        },
        {
          id: "genetique",
          title: "Génétique",
          courses: makeCourseList(
            [
              "le-gene.mp4",
              "le-gene-suite.mp4",
              "genetique-mendelienne.mp4",
              "atelier-genetique.mp4"
            ],
            "../../videos/biologie/genetique"
          )
        },
        {
          id: "histologie-embriologie",
          title: "Histologie Embriologie",
          courses: makeCourseList(
            [
              "a-seance-orientation.mp4",
              "b-appareil-genital-feminin.mp4",
              "c-appareil-genital-masculin.mp4",
              "d-la-glande-surrenale.mp4",
              "e-la-thyroide.mp4",
              "f-hypophyse.mp4",
              "j-tissu-musculaire.mp4",
              "h-appareil-cardio-circulatoire.mp4",
              "k-oreille.mp4",
              "l-oeil.mp4",
              "atelier-histologie-embriologie.mp4" 
            ],
            "../../videos/biologie/histologie-embriologie"
           )
        },
        {
          id: "immunologie",
          title: "Immunologie",
          courses: makeCourseList(
            [
              "a-seance-orientation.mp4",
              "b-immunologie-innee-a-immunologie-specifique.mp4",
              "c-les-immunoglobulines.mp4",
              "d-le-systeme-de-complement.mp4",
              "e-le-systeme-hla.mp4",
              "f-rimc.mp4",
              "j-les-etats-hypersensibilite.mp4",
              "h-les-etats-hypersensibilites-suite.mp4",
              "atelier-immunologie.mp4",
              "atelier-immunologie-suite.mp4"
            ],
            "../../videos/biologie/immunologie"
          )
        },
        {
          id: "microbiologie",
          title: "Microbiologie",
          courses: makeCourseList(
            [
              "seance-orientation-microbiologie.mp4",
              "les-micro-organismes.mp4",
              "les-micro-organismes-1.mp4",
              "les-micro-organismes-2.mp4",
              "prelevements.mp4",
              "diagnostique-virologique.mp4",
              "atelier-immunologie.mp4"
            ],
            "../../videos/biologie/microbiologie"
          )
        },
        {
          id: "neurophysiologie",
          title: "Neurophysiologie",
          courses: makeCourseList(
            [
              "influx-nerveux.mp4",
              "physiologie-du-systeme-nerveux-autonome.mp4",
              "physiologie-du-muscle-strie.mp4",
              "atelier-neurophysiologie.mp4"
            ],
            "../../videos/biologie/neurophysiologie"
          )
        },
        {
          id: "physiologie",
          title: "Physiologie",
          courses: makeCourseList(
            [
              "seance-orientation-physiologie.mp4",
              "hemodynamique-intra-cardiaque.mp4",
              "le-debit-cardiaque.mp4",
              "les-compartiments-liquidienne.mp4",
              "les-compartiments-liquidienne-suite.mp4",
              "pression-arteriel-et-sa-regulation.mp4",
              "equilibre-acido-basique.mp4",
              "equilibre-acido-basique-qcm.mp4",
              "les-etats-de-choc.mp4",
              "physiologie-respiratoire.mp4",
              "la-ventilation-respiratoire.mp4",
              "le-ventilation-alveolaire.mp4",
              "atelier-physiologie.mp4"
            ],
            "../../videos/biologie/physiologie"
          )
        }
      ]
    },
    {
      id: "chirurgie",
      title: "Chirurgie",
      icon: "🔪",
      modules: [
        {
          id: "cci",
          title: "CCI",
          courses: makeCourseList(
            [
              "les-occlusions-neonatale.mp4",
              "atresie-de-oesophage.mp4",
              "lch.mp4",
              "osteomyelite.mp4",
              "atelier-cci.mp4"
            ],
            "../../videos/chirurgie/cci"
          )
        },
        {
          id: "chirurgie-generale",
          title: "Chirurgie générale",
          courses: makeCourseList(
            [
              "seance-orientation-chirurgie-generale.mp4",
              "appendicite-aigue-peritonite-aigue.mp4",
              "hernie-parietale-hemorragie-digestive.mp4",
              "lv-pancreatite-aigue.mp4",
              "syndrome-occlusif.mp4",
              "tumeur-oesophage.mp4",
              "cancer-pancreas-voies-biliaires.mp4",
              "cancer-colo-rectal.mp4",
              "ischemie-des-membres-inferieurs-brulures.mp4",
              "khf.mp4",
              "atelier-chirurgie-generale.mp4"
            ],
            "../../videos/chirurgie/chirurgie-generale"
          )
        },
        {
          id: "gynecologie",
          title: "Gynécologie",
          courses: makeCourseList(
            [
              "geu-fibrome-uterin.mp4",
              "hta-et-grossesse.mp4",
              "hemorragie-de-la-delivrance.mp4",
              "cancer-du-col-uterin.mp4",
              "tumeurs-de-l-ovaire.mp4",
              "cancer-du-sein.mp4",
              "placenta-praevia.mp4",
              "atelier-gynecologie.mp4"
            ],
            "../../videos/chirurgie/gynecologie"
          )
        },
        {
          id: "neurochirurgie",
          title: "Neurochirurgie",
          courses: makeCourseList(
            [
              "hic.mp4",
              "hemorragie-meningee.mp4",
              "hed.mp4",
              "atelier-neurochirurgie.mp4",
              "atelier-neurochirurgie-suite.mp4"
            ],
            "../../videos/chirurgie/neurochirurgie"
          )
        },
        {
          id: "ophtalmologie",
          title: "Ophtalmologie",
          courses: makeCourseList(
            [
              "les-glaucomes.mp4",
              "cataracte.mp4",
              "atelier-ophtalmologie.mp4"
            ],
            "../../videos/chirurgie/ophtalmologie"
          )
        },
        {
          id: "orl",
          title: "ORL",
          courses: makeCourseList(
            [
              "otite-moyenne-aigue.mp4",
              "maladie-de-meniere.mp4",
              "anatomie-naso-sinusienne.mp4",
              "cancer-de-larynx.mp4",
              "cancer-de-cavum.mp4",
              "atelier-ORL.mp4"
            ],
            "../../videos/chirurgie/orl"
          )
        },
        {
          id: "traumatologie",
          title: "Traumatologie",
          courses: makeCourseList(
            [
              "luxation-traumatique-de-la-hanche.mp4",
              "fracture-de-col-de-femure.mp4",
              "fracture-de-jambe.mp4",
              "polytrauma.mp4",
              "tumeurs-osseuses.mp4",
              "atelier-traumatologie.mp4"
            ],
            "../../videos/chirurgie/traumatologie"
          )
        },
        {
          id: "urologie",
          title: "Urologie",
          courses: makeCourseList(
            [
              "a-adenome-de-prostate.mp4",
              "b-cancer-de-prostate.mp4",
              "c-cancer-de-vessie.mp4",
              "c-cancer-de-vessie-suite.mp4",
              "d-tumeurs-de-rein.mp4",
              "e-cancer-des-testicules.mp4",
              "f-retention-aigue-des-urines.mp4",
              "atelier-urologie.mp4"
            ],
            "../../videos/chirurgie/urologie"
          )
        }
      ]
    },
    {
      id: "medicale",
      title: "Médicale",
      icon: "🏥",
      modules: [
        {
          id: "cardiologie",
          title: "Cardiologie",
          courses: makeCourseList(
            [
              "pericardite-aigue.mp4",
              "insuffisance-mitrale.mp4",
              "retressicement-aortique.mp4",
              "insuffisance-aortique.mp4",
              "endocardite-infectieuse.mp4",
              "oap.mp4",
              "embolie-pulmonaire.mp4",
              "tvp.mp4",
              "sca.mp4",
              "atelier-cardiologie.mp4",
              "atelier-cardiologie-1.mp4",
              "atelier-cardiologie-2.mp4"
            ],
            "../../videos/medicale/cardiologie"
          )
        },
        {
          id: "dermatologie",
          title: "Dermatologie",
          courses: makeCourseList(
            [
              "psoriasis.mp4",
              "les-eczemas.mp4",
              "les-mycoses-cutanees.mp4",
              "les-infections-bacteriennes.mp4",
              "la-tuberculose-cutanee.mp4",
              "les-ist.mp4",
              "atelier-dermatologie.mp4"
            ],
            "../../videos/medicale/dermatologie"
          )
        },
        {
          id: "endocrinologie",
          title: "Endocrinologie",
          courses: makeCourseList(
            [
              "tumeur-hypophysaire.mp4",
              "hyperthyroidie.mp4",
              "insuffisance-surrenale.mp4",
              "diabete-et-ses-complications.mp4",
              "complication-du-diabete.mp4"
            ],
            "../../videos/medicale/endocrinologie"
          )
        },
        {
          id: "epidemiologie",
          title: "Epidémiologie",
          courses: makeCourseList(
            [
              "les-differents-indicateurs-de-sante.mp4",
              "epidemiologie-des-maladies-transmissible-et-non-transmissible.mp4",
              "vaccination.mp4",
              "atelier-epidemiologie.mp4"
            ],
            "../../videos/medicale/epidemiologie"
          )
        },
        {
          id: "gastrologie",
          title: "Gastrologie",
          courses: makeCourseList(
            [
              "cirrhose-hepatique.mp4",
              "ascite.mp4",
              "pancreatite-chronique.mp4",
              "ictere.mp4",
              "hepatite-c-et-b.mp4",
              "ulcer-gastro-duodinale.mp4",
              "mici.mp4",
              "digestion-absorption.mp4",
              "secretion-biliaire.mp4",
              "atelier-gastrologie.mp4",
              "atelier-gastrologie-1.mp4",
              "atelier-gastrologie-2.mp4",
              "atelier-gastrologie-3.mp4"
            ],
            "../../videos/medicale/gastrologie"
          )
        },
        {
          id: "hematologie",
          title: "Hématologie",
          courses: makeCourseList(
            [
              "anemie.mp4",
              "anemie-suite.mp4",
              "cat-devant-une-anemie.mp4",
              "cat-devant-une-anemie-suite.mp4",
              "groupe-sanguin-et-transfusion.mp4",
              "hemostase-primaire-coagulation.mp4",
              "purpura-thrombopenique-immunologique.mp4",
              "lymphome-malin.mp4",
              "llc.mp4",
              "adp-spmg.mp4",
              "atelier-hematologie.mp4",
              "atelier-hematologie-1.mp4"
            ],
            "../../videos/medicale/hematologie"
          )
        },
        {
          id: "infectieux",
          title: "Infectieux",
          courses: makeCourseList(
            [
              "la-brucelose.mp4",
              "fievre-thyphoide.mp4",
              "les-meningites.mp4",
              "hiv-sida.mp4",
              "paludisme.mp4",
              "diarrhee-aigue-infectieuse.mp4",
              "diarrhee-aigue-infectieuse-suite.mp4",
              "atelier-infectiologie.mp4"
            ],
            "../../videos/medicale/infectieux"
          )
        },
        {
          id: "medecine-travail",
          title: "Médecine de travail",
          courses: makeCourseList(
            [
              "intoxication-aux-metaux-lourds.mp4",
              "accidents-de-travail.mp4",
              "atelier-medecine-de-travail.mp4"
            ],
            "../../videos/medicale/medecine-travail"
          )
        },
        {
          id: "medecine-legale",
          title: "Médecine légale",
          courses: makeCourseList(
            [
              "diagnostique-de-la-mort.mp4",
              "secret-medical-responsabilite-medicale.mp4",
              "atelier-medecine-legale.mp4"
            ],
            "../../videos/medicale/medecine-legale"
          )
        },
        {
          id: "nephrologie",
          title: "Néphrologie",
          courses: makeCourseList(
            [
              "insuffisance-renale-chronique.mp4",
              "insuffisance-renale-aigue.mp4",
              "syndrome-nephretique.mp4",
              "syndrome-nephretique-aigue.mp4",
              "syndrome-nephrotique.mp4",
              "atelier-nephrologie.mp4"
            ],
            "../../videos/medicale/nephrologie"
          )
        },
        {
          id: "neurologie",
          title: "Neurologie",
          courses: makeCourseList(
            [
              "myastenie-auto-immune.mp4",
              "cephalee-et-algie-de-la-face.mp4",
              "maladie-de-parkinson.mp4",
              "sclerose-en-plaque.mp4",
              "avc.mp4",
              "les-epilepsies.mp4",
              "compression-medulaire-non-traumatique.mp4",
              "hemorragie-meningee.mp4",
              "atelier-neurologie.mp4",
              "atelier-neurologie-1.mp4"
            ],
            "../../videos/medicale/neurologie"
          )
        },
        {
          id: "pediatrie",
          title: "Pédiatrie",
          courses: makeCourseList(
            [
              "developpement-psychomoteur.mp4",
              "alimentation-de-lenfant-sain.mp4",
              "icter-a-bilirubine-libre-du-nouveau-ne.mp4",
              "diarrhee-aigue-rachitisme.mp4",
              "detresse-respiratoire-aigue-nouveau-ne.mp4",
              "diarrhee-chronique-enfant.mp4",
              "diarrhee-chronique-enfant-suite.mp4",
              "rougeole.mp4",
              "atelier-pediatrie.mp4",
              "atelier-pediatrie-1.mp4"
            ],
            "../../videos/medicale/pediatrie"
          )
        },
        {
          id: "pneumologie",
          title: "Pneumologie",
          courses: makeCourseList(
            [
              "pneumonie-aigue-communitaire.mp4",
              "epanchement-pleural.mp4",
              "tuberculose.mp4",
              "traitement-anti-tuberculeux.mp4",
              "insuffisance-respiratoire-chronique.mp4",
              "cancer-broncho-pulmonaire.mp4",
              "asthme-bronchique.mp4",
              "atelier-pneumologie.mp4"
            ],
            "../../videos/medicale/pneumologie"
          )
        },
        {
          id: "psychiatrie",
          title: "Psychiatrie",
          courses: makeCourseList(
            [
              "schizophrenie.mp4",
              "delire-paranoique-etats-depressifs.mp4",
              "atelier-psychiatrie.mp4",
              "atelier-psychiatrie-1.mp4",
              "atelier-psychiatrie-2.mp4"
            ],
            "../../videos/medicale/psychiatrie"
          )
        },
        {
          id: "rhumatologie",
          title: "Rhumatologie",
          courses: makeCourseList(
            [
              "poly-arthrite-rhumatoide.mp4",
              "syndrome-de-gogerot-sjogren.mp4",
              "connectivites.mp4",
              "ma-de-pott.mp4",
              "atelier-rhumatologie.mp4"
            ],
            "../../videos/medicale/rhumatologie"
          )
        }
      ]
    }
  ]
};

function getCategoryFromUrl() {
  return new URLSearchParams(window.location.search).get("category");
}

function getModuleFromUrl() {
  return new URLSearchParams(window.location.search).get("module");
}

function getCourseFromUrl() {
  return new URLSearchParams(window.location.search).get("course");
}

function getWatchedCourses() {
  return JSON.parse(localStorage.getItem("watchedCourses") || "[]");
}

function setWatchedCourses(data) {
  localStorage.setItem("watchedCourses", JSON.stringify(data));
}

function getFavoriteCourses() {
  return JSON.parse(localStorage.getItem("favoriteCourses") || "[]");
}

function setFavoriteCourses(data) {
  localStorage.setItem("favoriteCourses", JSON.stringify(data));
}

function isWatched(courseId) {
  return getWatchedCourses().includes(courseId);
}

function isFavorite(courseId) {
  return getFavoriteCourses().includes(courseId);
}

function toggleWatched(courseId) {
  const watched = getWatchedCourses();
  const index = watched.indexOf(courseId);

  if (index === -1) watched.push(courseId);
  else watched.splice(index, 1);

  setWatchedCourses(watched);
}

function toggleFavorite(courseId) {
  const favorites = getFavoriteCourses();
  const index = favorites.indexOf(courseId);

  if (index === -1) favorites.push(courseId);
  else favorites.splice(index, 1);

  setFavoriteCourses(favorites);
}

function findCategory(categoryId) {
  return platformData.categories.find((cat) => cat.id === categoryId);
}

function findModule(categoryId, moduleId) {
  const category = findCategory(categoryId);
  if (!category) return null;
  return category.modules.find((mod) => mod.id === moduleId);
}

function getAllCoursesFlat() {
  const result = [];

  platformData.categories.forEach((category) => {
    category.modules.forEach((module) => {
      module.courses.forEach((course, index) => {
        result.push({
          ...course,
          categoryId: category.id,
          categoryTitle: category.title,
          moduleId: module.id,
          moduleTitle: module.title,
          courseIndex: index
        });
      });
    });
  });

  return result;
}

function loadModulesPage() {
  const categoryId = getCategoryFromUrl();
  const category = findCategory(categoryId);

  const title = document.getElementById("categoryTitle");
  const list = document.getElementById("modulesList");

  if (!title || !list) return;

  if (!category) {
    title.textContent = "Catégorie introuvable";
    list.innerHTML = `
      <div class="module-card">
        <div class="module-card-title">Erreur</div>
        <div class="module-card-count">La catégorie demandée n'existe pas.</div>
      </div>
    `;
    return;
  }

  title.textContent = category.title;
  renderModules(category.modules, categoryId);
}

function renderModules(modules, categoryId) {
  const list = document.getElementById("modulesList");
  if (!list) return;

  if (!modules || !modules.length) {
    list.innerHTML = `
      <div class="module-card">
        <div class="module-card-title">Aucun module disponible</div>
        <div class="module-card-count">Cette catégorie est vide pour le moment.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = modules
    .map(
      (module) => `
        <a class="module-card" href="../cours/player.html?category=${categoryId}&module=${module.id}&course=0">
          <div class="module-card-title">${module.title}</div>
          <div class="module-card-count">${module.courses.length} cours</div>
        </a>
      `
    )
    .join("");
}

function filterModules() {
  const categoryId = getCategoryFromUrl();
  const category = findCategory(categoryId);
  const input = document.getElementById("moduleSearch");

  if (!category || !input) return;

  const value = input.value.toLowerCase().trim();
  const filtered = category.modules.filter((module) =>
    module.title.toLowerCase().includes(value)
  );

  renderModules(filtered, categoryId);
}

function renderUpdatedSidebar(module, categoryId, moduleId, currentIndex) {
  const videoList = document.getElementById("videoList");
  if (!videoList) return;

  videoList.innerHTML = module.courses
    .map((course, index) => {
      const activeClass = index === currentIndex ? "active" : "";
      const watchedClass = isWatched(course.id) ? "done" : "";
      const favoriteClass = isFavorite(course.id) ? "favorite-item" : "";

      return `
        <a
          class="course-item ${activeClass} ${watchedClass} ${favoriteClass}"
          href="../cours/player.html?category=${categoryId}&module=${moduleId}&course=${index}"
        >
          ${course.title}
        </a>
      `;
    })
    .join("");
}

function updateProgress(module) {
  const watched = getWatchedCourses();
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");

  if (!progressText || !progressFill || !module) return;

  const watchedCount = module.courses.filter((course) =>
    watched.includes(course.id)
  ).length;
  const total = module.courses.length;
  const percent = total === 0 ? 0 : Math.round((watchedCount / total) * 100);

  progressText.textContent = `${watchedCount} / ${total} cours vus - ${percent}%`;
  progressFill.style.width = `${percent}%`;
}

function filterCourses() {
  const categoryId = getCategoryFromUrl();
  const moduleId = getModuleFromUrl();
  const currentIndex = parseInt(getCourseFromUrl() || "0", 10);
  const module = findModule(categoryId, moduleId);
  const input = document.getElementById("courseSearch");
  const videoList = document.getElementById("videoList");

  if (!module || !input || !videoList) return;

  const value = input.value.toLowerCase().trim();

  videoList.innerHTML = module.courses
    .map((course, index) => ({ course, index }))
    .filter((item) => item.course.title.toLowerCase().includes(value))
    .map((item) => {
      const activeClass = item.index === currentIndex ? "active" : "";
      const watchedClass = isWatched(item.course.id) ? "done" : "";
      const favoriteClass = isFavorite(item.course.id) ? "favorite-item" : "";

      return `
        <a
          class="course-item ${activeClass} ${watchedClass} ${favoriteClass}"
          href="../cours/player.html?category=${categoryId}&module=${moduleId}&course=${item.index}"
        >
          ${item.course.title}
        </a>
      `;
    })
    .join("");
}

function loadFavoritesPage() {
  const favoritesList = document.getElementById("favoritesList");
  if (!favoritesList) return;

  const favoriteIds = getFavoriteCourses();
  const allCourses = getAllCoursesFlat();

  const favorites = allCourses.filter((course) =>
    favoriteIds.includes(course.id)
  );

  if (!favorites.length) {
    favoritesList.innerHTML = `
      <div class="empty-state">
        Aucun favori pour le moment. Ajoute des cours depuis le lecteur.
      </div>
    `;
    return;
  }

  favoritesList.innerHTML = favorites
    .map(
      (course) => `
        <a
          class="favorite-course-card"
          href="../cours/player.html?category=${course.categoryId}&module=${course.moduleId}&course=${course.courseIndex}"
        >
          <div class="favorite-course-title">${course.title}</div>
          <div class="favorite-course-meta">${course.categoryTitle} → ${course.moduleTitle}</div>
        </a>
      `
    )
    .join("");
}

function loadDashboardPage() {
  const totalCoursesEl = document.getElementById("totalCourses");
  const watchedCoursesCountEl = document.getElementById("watchedCoursesCount");
  const favoriteCoursesCountEl = document.getElementById("favoriteCoursesCount");
  const globalProgressEl = document.getElementById("globalProgress");
  const categoryProgressList = document.getElementById("categoryProgressList");

  if (
    !totalCoursesEl ||
    !watchedCoursesCountEl ||
    !favoriteCoursesCountEl ||
    !globalProgressEl ||
    !categoryProgressList
  ) return;

  const allCourses = getAllCoursesFlat();
  const watchedIds = getWatchedCourses();
  const favoriteIds = getFavoriteCourses();

  const totalCourses = allCourses.length;
  const watchedCount = allCourses.filter((course) => watchedIds.includes(course.id)).length;
  const favoriteCount = allCourses.filter((course) => favoriteIds.includes(course.id)).length;
  const globalPercent = totalCourses === 0 ? 0 : Math.round((watchedCount / totalCourses) * 100);

  totalCoursesEl.textContent = totalCourses;
  watchedCoursesCountEl.textContent = watchedCount;
  favoriteCoursesCountEl.textContent = favoriteCount;
  globalProgressEl.textContent = `${globalPercent}%`;

  categoryProgressList.innerHTML = platformData.categories
    .map((category) => {
      const categoryCourses = category.modules.flatMap((module) => module.courses);
      const categoryWatched = categoryCourses.filter((course) => watchedIds.includes(course.id)).length;
      const categoryTotal = categoryCourses.length;
      const categoryPercent = categoryTotal === 0 ? 0 : Math.round((categoryWatched / categoryTotal) * 100);

      return `
        <div class="category-progress-card">
          <div class="category-progress-header">
            <span>${category.icon} ${category.title}</span>
            <span>${categoryPercent}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${categoryPercent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function loadPlayerPage() {
  const categoryId = getCategoryFromUrl();
  const moduleId = getModuleFromUrl();
  const courseIndex = parseInt(getCourseFromUrl() || "0", 10);

  const module = findModule(categoryId, moduleId);
  if (!module || !module.courses[courseIndex]) return;

  const currentCourse = module.courses[courseIndex];
  const video = document.getElementById("videoPlayer");
  const moduleName = document.getElementById("moduleName");
  const pdfLink = document.getElementById("pdfLink");
  const togglePdfBtn = document.getElementById("togglePdfBtn");
  const pdfSection = document.getElementById("pdfSection");
  const pdfViewer = document.getElementById("pdfViewer");
  const pdfUnavailable = document.getElementById("pdfUnavailable");
  const watchedBtn = document.getElementById("watchedBtn");
  const favoriteBtn = document.getElementById("favoriteBtn");
  const backToModules = document.getElementById("backToModules");
  const backToModuleBtn = document.getElementById("backToModuleBtn");
  const nextCourseBtn = document.getElementById("nextCourseBtn");
  const courseEndBox = document.getElementById("courseEndBox");
  const courseEndTitle = document.getElementById("courseEndTitle");
  const courseEndText = document.getElementById("courseEndText");
  const autoNextInfo = document.getElementById("autoNextInfo");
  const autoNextCountdown = document.getElementById("autoNextCountdown");

  if (!video || !moduleName || !watchedBtn || !favoriteBtn) return;

  let autoNextTimer = null;
  let countdownTimer = null;
  let pdfVisible = false;

  function clearAutoNextTimers() {
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    if (autoNextInfo) autoNextInfo.classList.add("hidden");
  }

  function startAutoNext(nextIndex) {
    clearAutoNextTimers();

    let secondsLeft = 5;

    if (autoNextInfo && autoNextCountdown) {
      autoNextInfo.classList.remove("hidden");
      autoNextCountdown.textContent = String(secondsLeft);
    }

    countdownTimer = setInterval(() => {
      secondsLeft -= 1;

      if (autoNextCountdown) {
        autoNextCountdown.textContent = String(Math.max(secondsLeft, 0));
      }

      if (secondsLeft <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);

    autoNextTimer = setTimeout(() => {
      window.location.href = `../cours/player.html?category=${categoryId}&module=${moduleId}&course=${nextIndex}`;
    }, 5000);
  }

  function hidePdfPanel() {
    pdfVisible = false;

    if (pdfSection) pdfSection.classList.add("hidden");
    if (pdfViewer) {
      pdfViewer.classList.add("hidden");
      pdfViewer.src = "";
    }
    if (pdfUnavailable) pdfUnavailable.classList.add("hidden");
    if (togglePdfBtn) togglePdfBtn.textContent = "📘 Afficher PDF";
  }

  async function checkPdfExists(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function showPdfPanel() {
    if (!pdfSection || !pdfViewer || !pdfUnavailable || !togglePdfBtn) return;

    pdfVisible = true;
    pdfSection.classList.remove("hidden");
    togglePdfBtn.textContent = "📕 Masquer PDF";

    if (!currentCourse.pdf) {
      pdfViewer.classList.add("hidden");
      pdfUnavailable.classList.remove("hidden");
      return;
    }

    const exists = await checkPdfExists(currentCourse.pdf);

    if (!exists) {
      pdfViewer.classList.add("hidden");
      pdfUnavailable.classList.remove("hidden");
      return;
    }

    pdfUnavailable.classList.add("hidden");
    pdfViewer.classList.remove("hidden");
    pdfViewer.src = currentCourse.pdf;
  }

  moduleName.textContent = module.title;
  video.src = currentCourse.video;
  video.setAttribute("controlsList", "nodownload noremoteplayback");
  video.setAttribute("disablePictureInPicture", "");
  video.setAttribute("playsinline", "");
  video.oncontextmenu = () => false;

  if (backToModules) backToModules.href = `../modules/modules.html?category=${categoryId}`;
  if (backToModuleBtn) backToModuleBtn.href = `../modules/modules.html?category=${categoryId}`;

  watchedBtn.textContent = isWatched(currentCourse.id) ? "✔ Déjà vu" : "Marquer comme vu";
  watchedBtn.className = isWatched(currentCourse.id) ? "btn btn-success" : "btn btn-gold";

  favoriteBtn.textContent = isFavorite(currentCourse.id) ? "⭐ Retirer des favoris" : "⭐ Favoris";
  favoriteBtn.className = isFavorite(currentCourse.id) ? "btn btn-favorite-active" : "btn btn-dark";

  watchedBtn.onclick = () => {
    toggleWatched(currentCourse.id);
    loadPlayerPage();
  };

  favoriteBtn.onclick = () => {
    toggleFavorite(currentCourse.id);
    loadPlayerPage();
  };

  if (pdfLink) {
    pdfLink.href = currentCourse.pdf || "#";
    pdfLink.onclick = async (event) => {
      if (!currentCourse.pdf) {
        event.preventDefault();
        alert("PDF indisponible pour ce cours.");
        return;
      }

      const exists = await checkPdfExists(currentCourse.pdf);
      if (!exists) {
        event.preventDefault();
        alert("PDF indisponible pour ce cours.");
      }
    };
  }

  if (togglePdfBtn) {
    hidePdfPanel();

    togglePdfBtn.onclick = async () => {
      if (pdfVisible) hidePdfPanel();
      else await showPdfPanel();
    };
  }

  renderUpdatedSidebar(module, categoryId, moduleId, courseIndex);
  updateProgress(module);

  if (courseEndBox) courseEndBox.classList.add("hidden");

  clearAutoNextTimers();

  video.onplay = () => {
    clearAutoNextTimers();
    if (courseEndBox) courseEndBox.classList.add("hidden");
  };

  video.onended = () => {
    if (!isWatched(currentCourse.id)) toggleWatched(currentCourse.id);

    updateProgress(module);

    const nextIndex = courseIndex + 1;
    const hasNextCourse = nextIndex < module.courses.length;

    if (courseEndBox) courseEndBox.classList.remove("hidden");

    if (hasNextCourse) {
      if (courseEndTitle) courseEndTitle.textContent = "Cours terminé";
      if (courseEndText) {
        courseEndText.textContent = "Tu peux passer au cours suivant ou attendre le passage automatique.";
      }

      if (nextCourseBtn) {
        nextCourseBtn.style.display = "inline-flex";
        nextCourseBtn.onclick = () => {
          clearAutoNextTimers();
          window.location.href = `../cours/player.html?category=${categoryId}&module=${moduleId}&course=${nextIndex}`;
        };
      }

      startAutoNext(nextIndex);
    } else {
      clearAutoNextTimers();

      if (courseEndTitle) courseEndTitle.textContent = "🎉 Module terminé";
      if (courseEndText) courseEndText.textContent = "Bravo, tu as terminé ce module.";
      if (nextCourseBtn) nextCourseBtn.style.display = "none";
    }

    renderUpdatedSidebar(module, categoryId, moduleId, courseIndex);
  };
}
