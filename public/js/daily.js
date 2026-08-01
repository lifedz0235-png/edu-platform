const DEFAULT_DAILY_TASKS = [
  {
    id: "videos",
    icon: "🎬",
    title: "Regarder 2 vidéos",
    description: "Avancer dans les cours programmés.",
    xp: 30,
    custom: false
  },
  {
    id: "pdf",
    icon: "📄",
    title: "Lire 1 support PDF",
    description: "Relire un support associé à votre module.",
    xp: 20,
    custom: false
  },
  {
    id: "qcm",
    icon: "📝",
    title: "Faire 30 QCM",
    description: "Tester vos connaissances et corriger vos erreurs.",
    xp: 40,
    custom: false
  },
  {
    id: "errors",
    icon: "🧠",
    title: "Revoir les erreurs",
    description: "Reprendre les réponses incorrectes.",
    xp: 30,
    custom: false
  },
  {
    id: "community",
    icon: "💬",
    title: "Participer à la communauté",
    description: "Publier, commenter ou aider un autre étudiant.",
    xp: 15,
    custom: false
  },
  {
    id: "study",
    icon: "⏱️",
    title: "Étudier au moins 4 heures",
    description: "Maintenir une séance de travail régulière.",
    xp: 50,
    custom: false
  },
  {
    id: "sport",
    icon: "🏃",
    title: "Pratiquer du sport",
    description: "Faire au moins 20 minutes d’activité physique.",
    xp: 25,
    custom: false
  }
];

const BADGES = [
  {
    id: "first_day",
    icon: "🌟",
    title: "Premier pas",
    description: "Terminer votre premier bilan.",
    condition: stats => stats.completedDays >= 1
  },
  {
    id: "streak_3",
    icon: "🔥",
    title: "Série de 3 jours",
    description: "Terminer 3 bilans consécutifs.",
    condition: stats => stats.streak >= 3
  },
  {
    id: "streak_7",
    icon: "⚡",
    title: "Semaine parfaite",
    description: "Maintenir une série de 7 jours.",
    condition: stats => stats.streak >= 7
  },
  {
    id: "xp_500",
    icon: "🏆",
    title: "500 XP",
    description: "Atteindre 500 points d’expérience.",
    condition: stats => stats.totalXp >= 500
  },
  {
    id: "sport_7",
    icon: "🏅",
    title: "Esprit sportif",
    description: "Valider le sport pendant 7 journées.",
    condition: stats => stats.sportDays >= 7
  },
  {
    id: "days_30",
    icon: "👑",
    title: "Discipline",
    description: "Terminer 30 bilans quotidiens.",
    condition: stats => stats.completedDays >= 30
  }
];

const dailyDate = document.getElementById("dailyDate");
const dailyTasks = document.getElementById("dailyTasks");
const completedTasks = document.getElementById("completedTasks");
const dailyProgressText = document.getElementById("dailyProgressText");
const dailyProgressBar = document.getElementById("dailyProgressBar");
const streakCount = document.getElementById("streakCount");
const totalXpElement = document.getElementById("totalXp");
const badgeCount = document.getElementById("badgeCount");
const dailySuccess = document.getElementById("dailySuccess");
const dailyCalendar = document.getElementById("dailyCalendar");
const calendarMonth = document.getElementById("calendarMonth");
const dailyBadges = document.getElementById("dailyBadges");
const xpToast = document.getElementById("xpToast");
const resetDailyBtn = document.getElementById("resetDailyBtn");
const addActivityBtn = document.getElementById("addActivityBtn");
const continuePlatformBtn =
  document.getElementById(
    "continuePlatformBtn"
  );

  const motivationModal =
  document.getElementById(
    "motivationModal"
  );

const motivationModalIcon =
  document.getElementById(
    "motivationModalIcon"
  );

const motivationModalTitle =
  document.getElementById(
    "motivationModalTitle"
  );

const motivationModalMessage =
  document.getElementById(
    "motivationModalMessage"
  );

const motivationModalPercent =
  document.getElementById(
    "motivationModalPercent"
  );

const motivationModalBtn =
  document.getElementById(
    "motivationModalBtn"
  );

function getCurrentUser() {
  const keys = [
    "pcr_current_user",
    "currentUser",
    "user"
  ];

  for (const key of keys) {
    try {
      const user = JSON.parse(
        localStorage.getItem(key) || "null"
      );

      if (user?.id) {
        return user;
      }
    } catch {
      // Ignorer les données invalides
    }
  }

  return null;
}

const currentUser = getCurrentUser();

function getUserPrefix() {
  return currentUser?.id
    ? `pcr_daily_${currentUser.id}_`
    : "pcr_daily_guest_";
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(
      localStorage.getItem(
        getUserPrefix() + key
      ) || "null"
    );

    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(
    getUserPrefix() + key,
    JSON.stringify(value)
  );
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getYesterdayDate() {
  const date = new Date();

  date.setDate(date.getDate() - 1);

  return date;
}

function getPreviousDateKey(dateKey, numberOfDays = 1) {
  const date = new Date(`${dateKey}T12:00:00`);

  date.setDate(
    date.getDate() - numberOfDays
  );

  return getLocalDateKey(date);
}

function getAllTasks() {
  const customTasks = readJson(
    "customTasks",
    []
  );

  return [
    ...DEFAULT_DAILY_TASKS,
    ...customTasks
  ];
}

function getDailyData() {
  const allDays = readJson("days", {});
  const reviewDate = getYesterdayDate();
  const reviewKey = getLocalDateKey(reviewDate);

  if (!allDays[reviewKey]) {
    allDays[reviewKey] = {
      tasks: {},
      completed: false,
      bonusGranted: false,
      updatedAt: new Date().toISOString()
    };

    writeJson("days", allDays);
  }

  return {
    allDays,
    reviewKey,
    reviewDay: allDays[reviewKey]
  };
}

function getTotalXp() {
  return Number(
    readJson("totalXp", 0)
  );
}

function setTotalXp(value) {
  const cleanValue = Math.max(
    0,
    Number(value) || 0
  );

  writeJson("totalXp", cleanValue);
}

function showXpToast(amount) {
  if (!xpToast) {
    return;
  }

  xpToast.textContent =
    `${amount > 0 ? "+" : ""}${amount} XP`;

  xpToast.classList.remove("hidden");

  clearTimeout(showXpToast.timeout);

  showXpToast.timeout = setTimeout(() => {
    xpToast.classList.add("hidden");
  }, 1700);
}

function formatReviewDate() {
  if (!dailyDate) {
    return;
  }

  const formatter = new Intl.DateTimeFormat(
    "fr-FR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

  const text = formatter.format(
    getYesterdayDate()
  );

  dailyDate.textContent =
    `Bilan du ${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMotivation(percent, checkedCount, totalTasks) {
  if (percent === 100) {
    return {
      title: "🏆 Une discipline remarquable",
      message:
        `Vous avez réalisé ${checkedCount} objectifs sur ${totalTasks}.\n\n` +
        "Vous venez de prouver que vous êtes capable d’aller jusqu’au bout de vos engagements.\n\n" +
        "Le résidanat ne se gagne pas en un jour : il se construit par des journées comme celle-ci. Continuez."
    };
  }

  if (percent >= 85) {
    return {
      title: "🔥 Vous êtes proche de l’excellence",
      message:
        `Vous avez réalisé ${checkedCount} objectifs sur ${totalTasks}, soit ${percent} %.\n\n` +
        "Votre travail est solide, mais les quelques tâches abandonnées peuvent faire la différence le jour du concours.\n\n" +
        "Ne vous contentez pas d’être proche de votre objectif. Allez le chercher."
    };
  }

  if (percent >= 70) {
    return {
      title: "💪 Un bon résultat, mais vous pouvez aller plus loin",
      message:
        `Vous avez réalisé ${checkedCount} objectifs sur ${totalTasks}, soit ${percent} %.\n\n` +
        "Vous progressez, mais votre potentiel est supérieur à ce résultat.\n\n" +
        "La réussite appartient à ceux qui terminent ce qu’ils commencent. Faites mieux aujourd’hui."
    };
  }

  if (percent >= 50) {
    return {
      title: "📈 Vous avez fait la moitié du chemin",
      message:
        `Vous avez réalisé ${checkedCount} objectifs sur ${totalTasks}, soit ${percent} %.\n\n` +
        "Ce résultat montre que vous avez commencé, mais pas encore que vous êtes déterminé à réussir.\n\n" +
        "Chaque tâche abandonnée aujourd’hui devient une difficulté supplémentaire demain. Reprenez le contrôle."
    };
  }

  if (percent >= 25) {
    return {
      title: "⚠️ Votre implication doit changer",
      message:
        `Vous avez réalisé seulement ${checkedCount} objectifs sur ${totalTasks}, soit ${percent} %.\n\n` +
        "Ce niveau d’effort ne correspond pas à l’ambition de réussir le résidanat.\n\n" +
        "Votre objectif mérite plus que des intentions. Il exige des actes, de la régularité et une vraie discipline."
    };
  }

  return {
    title: "🚨 Il est temps de réagir",
    message:
      `Vous avez réalisé seulement ${checkedCount} objectif sur ${totalTasks}, soit ${percent} %.\n\n` +
      "Le temps perdu ne revient pas, et le concours n’attendra pas que vous soyez prêt.\n\n" +
      "Votre avenir dépend des décisions que vous prenez aujourd’hui. Recommencez avec sérieux et refusez de perdre une autre journée."
  };
}

function showMotivationModal({
  icon = "🔥",
  title,
  message,
  percent = null,
  buttonText = "Continuer",
  onConfirm = null
}) {
  if (
    !motivationModal ||
    !motivationModalTitle ||
    !motivationModalMessage ||
    !motivationModalBtn
  ) {
    return;
  }

  motivationModal.classList.remove(
    "theme-danger",
    "theme-warning",
    "theme-success",
    "theme-perfect"
  );

  if (percent === 100) {
    motivationModal.classList.add(
      "theme-perfect"
    );
  } else if (percent >= 70) {
    motivationModal.classList.add(
      "theme-success"
    );
  } else if (percent >= 25) {
    motivationModal.classList.add(
      "theme-warning"
    );
  } else {
    motivationModal.classList.add(
      "theme-danger"
    );
  }

  motivationModalIcon.textContent = icon;
  motivationModalTitle.textContent = title;
  motivationModalMessage.textContent = message;
  motivationModalBtn.textContent = buttonText;

  if (percent === null) {
    motivationModalPercent.classList.add(
      "hidden"
    );
  } else {
    motivationModalPercent.textContent =
      `${percent} %`;

    motivationModalPercent.classList.remove(
      "hidden"
    );
  }

  motivationModal.classList.remove("hidden");

  document.body.classList.add(
    "motivation-modal-open"
  );

  if ("vibrate" in navigator) {
    if (percent === 100) {
      navigator.vibrate([80, 60, 120]);
    } else if (percent !== null && percent < 25) {
      navigator.vibrate([120, 70, 120]);
    } else {
      navigator.vibrate(70);
    }
  }

  if (percent === 100) {
    launchMotivationConfetti();
  } else {
    clearMotivationConfetti();
  }

  motivationModalBtn.onclick = () => {
    motivationModal.classList.add("hidden");

    document.body.classList.remove(
      "motivation-modal-open"
    );

    clearMotivationConfetti();

    if (typeof onConfirm === "function") {
      onConfirm();
    }
  };
}

function clearMotivationConfetti() {
  document
    .querySelectorAll(
      ".motivation-confetti-piece"
    )
    .forEach(piece => piece.remove());
}

function launchMotivationConfetti() {
  clearMotivationConfetti();

  if (!motivationModal) {
    return;
  }

  const symbols = [
    "✦",
    "★",
    "●",
    "◆",
    "✧"
  ];

  for (let index = 0; index < 42; index += 1) {
    const piece =
      document.createElement("span");

    piece.className =
      "motivation-confetti-piece";

    piece.textContent =
      symbols[
        Math.floor(
          Math.random() * symbols.length
        )
      ];

    piece.style.left =
      `${Math.random() * 100}%`;

    piece.style.animationDelay =
      `${Math.random() * 0.8}s`;

    piece.style.animationDuration =
      `${2.4 + Math.random() * 1.8}s`;

    piece.style.setProperty(
      "--confetti-drift",
      `${-80 + Math.random() * 160}px`
    );

    piece.style.setProperty(
      "--confetti-rotation",
      `${180 + Math.random() * 720}deg`
    );

    motivationModal.appendChild(piece);
  }

  window.setTimeout(
    clearMotivationConfetti,
    5000
  );
}

function renderTasks() {
  if (!dailyTasks) {
    return;
  }

  const { reviewDay } = getDailyData();
  const tasks = getAllTasks();

  dailyTasks.innerHTML = tasks
    .map(task => {
      const checked =
        reviewDay.tasks?.[task.id] === true;

      return `
        <div
          class="daily-task ${checked ? "completed" : ""}"
          data-task-container="${escapeHtml(task.id)}"
        >
          <label class="daily-task-main">
            <input
              type="checkbox"
              data-task-id="${escapeHtml(task.id)}"
              ${checked ? "checked" : ""}
            />

            <span class="daily-task-check">✓</span>

            <span class="daily-task-icon">
              ${task.icon}
            </span>

            <span class="daily-task-content">
              <strong>${escapeHtml(task.title)}</strong>
              <small>${escapeHtml(task.description)}</small>
            </span>

            <span class="daily-task-xp">
              +${Number(task.xp || 10)} XP
            </span>
          </label>

          ${
            task.custom
              ? `
                <button
                  type="button"
                  class="delete-custom-task"
                  data-delete-task="${escapeHtml(task.id)}"
                  title="Supprimer cette activité"
                >
                  ×
                </button>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");

  dailyTasks
    .querySelectorAll(
      'input[type="checkbox"][data-task-id]'
    )
    .forEach(input => {
      input.addEventListener(
        "change",
        handleTaskChange
      );
    });

  dailyTasks
    .querySelectorAll("[data-delete-task]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          deleteCustomTask(
            button.dataset.deleteTask
          );
        }
      );
    });
}

function handleTaskChange(event) {
  const taskId = event.target.dataset.taskId;

  const task = getAllTasks().find(
    item => item.id === taskId
  );

  if (!task) {
    return;
  }

  const {
    allDays,
    reviewKey,
    reviewDay
  } = getDailyData();

  const wasChecked =
    reviewDay.tasks?.[taskId] === true;

  const isChecked = event.target.checked;

  reviewDay.tasks = {
    ...(reviewDay.tasks || {}),
    [taskId]: isChecked
  };

  reviewDay.updatedAt =
    new Date().toISOString();

  allDays[reviewKey] = reviewDay;

  writeJson("days", allDays);

  if (isChecked && !wasChecked) {
    const xp = Number(task.xp || 10);

    setTotalXp(
      getTotalXp() + xp
    );

    showXpToast(xp);
  }

  if (!isChecked && wasChecked) {
    const xp = Number(task.xp || 10);

    setTotalXp(
      getTotalXp() - xp
    );

    showXpToast(-xp);
  }

  updateDailyState();
}

function calculateStreak(allDays) {
  let streak = 0;
  let cursor = getLocalDateKey(
    getYesterdayDate()
  );

  while (
    allDays[cursor]?.completed === true
  ) {
    streak += 1;
    cursor = getPreviousDateKey(cursor, 1);
  }

  return streak;
}

function getCompletedDaysCount(allDays) {
  return Object.values(allDays).filter(
    day => day?.completed === true
  ).length;
}

function getSportDaysCount(allDays) {
  return Object.values(allDays).filter(
    day => day?.tasks?.sport === true
  ).length;
}

function updateBadges(allDays, streak, currentXp) {
  const stats = {
    completedDays:
      getCompletedDaysCount(allDays),

    sportDays:
      getSportDaysCount(allDays),

    streak,

    totalXp: currentXp
  };

  const unlockedBadges = readJson(
    "unlockedBadges",
    []
  );

  let changed = false;

  BADGES.forEach(badge => {
    if (
      badge.condition(stats) &&
      !unlockedBadges.includes(badge.id)
    ) {
      unlockedBadges.push(badge.id);
      changed = true;
    }
  });

  if (changed) {
    writeJson(
      "unlockedBadges",
      unlockedBadges
    );
  }

  renderBadges(unlockedBadges);

  if (badgeCount) {
    badgeCount.textContent =
      String(unlockedBadges.length);
  }
}

function renderBadges(unlockedBadges) {
  if (!dailyBadges) {
    return;
  }

  dailyBadges.innerHTML = BADGES
    .map(badge => {
      const unlocked =
        unlockedBadges.includes(badge.id);

      return `
        <article
          class="daily-badge ${
            unlocked ? "unlocked" : "locked"
          }"
        >
          <span class="daily-badge-icon">
            ${unlocked ? badge.icon : "🔒"}
          </span>

          <div>
            <strong>${badge.title}</strong>
            <small>${badge.description}</small>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCalendar(allDays) {
  if (!dailyCalendar || !calendarMonth) {
    return;
  }

  const reviewDate = getYesterdayDate();

  const year = reviewDate.getFullYear();
  const month = reviewDate.getMonth();

  const monthName = new Intl.DateTimeFormat(
    "fr-FR",
    {
      month: "long",
      year: "numeric"
    }
  ).format(reviewDate);

  calendarMonth.textContent =
    `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;

  const firstDay =
    new Date(year, month, 1);

  const lastDay =
    new Date(year, month + 1, 0);

  const totalDays =
    lastDay.getDate();

  let startOffset = firstDay.getDay();

  startOffset =
    startOffset === 0
      ? 6
      : startOffset - 1;

  const cells = [];

  for (
    let index = 0;
    index < startOffset;
    index += 1
  ) {
    cells.push(
      '<span class="calendar-day empty"></span>'
    );
  }

  const reviewKey =
    getLocalDateKey(reviewDate);

  for (
    let day = 1;
    day <= totalDays;
    day += 1
  ) {
    const date =
      new Date(year, month, day);

    const dateKey =
      getLocalDateKey(date);

    const completed =
      allDays[dateKey]?.completed === true;

    const isReviewDay =
      dateKey === reviewKey;

    cells.push(`
      <span
        class="calendar-day
          ${completed ? "completed" : ""}
          ${isReviewDay ? "today" : ""}
        "
        title="${
          completed
            ? "Bilan terminé"
            : isReviewDay
              ? "Bilan actuel"
              : ""
        }"
      >
        ${day}
      </span>
    `);
  }

  dailyCalendar.innerHTML =
    cells.join("");
}

function updateDailyState() {
  const {
    allDays,
    reviewKey,
    reviewDay
  } = getDailyData();

  const tasks = getAllTasks();

  const checkedCount = tasks.filter(
    task =>
      reviewDay.tasks?.[task.id] === true
  ).length;

  const progress = tasks.length
    ? Math.round(
        checkedCount / tasks.length * 100
      )
    : 0;

  const isComplete =
    tasks.length > 0 &&
    checkedCount === tasks.length;

  if (
    isComplete &&
    reviewDay.bonusGranted !== true
  ) {
    reviewDay.bonusGranted = true;

    setTotalXp(
      getTotalXp() + 150
    );

    showXpToast(150);
  }

  reviewDay.completed = isComplete;

  if (isComplete && !reviewDay.completedAt) {
    reviewDay.completedAt =
      new Date().toISOString();
  }

  allDays[reviewKey] = reviewDay;

  writeJson("days", allDays);

  if (completedTasks) {
    completedTasks.textContent =
      `${checkedCount} / ${tasks.length}`;
  }

  if (dailyProgressText) {
    dailyProgressText.textContent =
      `${progress}%`;
  }

  if (dailyProgressBar) {
    dailyProgressBar.style.width =
      `${progress}%`;
  }

  if (dailySuccess) {
    dailySuccess.classList.toggle(
      "hidden",
      !isComplete
    );
  }

  const streak =
    calculateStreak(allDays);

  if (streakCount) {
    streakCount.textContent =
      String(streak);
  }

  const currentXp = getTotalXp();

  if (totalXpElement) {
    totalXpElement.textContent =
      `${currentXp.toLocaleString("fr-FR")} XP`;
  }

  updateBadges(
    allDays,
    streak,
    currentXp
  );

  renderCalendar(allDays);
  renderTasks();
}

function addCustomActivity() {
  const title = prompt(
    "Nom de l’activité quotidienne :",
    "Réviser un chapitre"
  );

  if (title === null) {
    return;
  }

  const cleanTitle = title.trim();

  if (!cleanTitle) {
    alert("Veuillez écrire le nom de l’activité.");
    return;
  }

  const description = prompt(
    "Description facultative :",
    "Activité personnelle quotidienne"
  );

  if (description === null) {
    return;
  }

  const customTasks = readJson(
    "customTasks",
    []
  );

  const newTask = {
    id:
      `custom_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`,

    icon: "➕",
    title: cleanTitle,

    description:
      description.trim() ||
      "Activité personnelle quotidienne.",

    xp: 20,
    custom: true
  };

  customTasks.push(newTask);

  writeJson(
    "customTasks",
    customTasks
  );

  updateDailyState();
}

function deleteCustomTask(taskId) {
  const confirmed = confirm(
    "Supprimer cette activité quotidienne ?"
  );

  if (!confirmed) {
    return;
  }

  const customTasks = readJson(
    "customTasks",
    []
  ).filter(task => task.id !== taskId);

  writeJson(
    "customTasks",
    customTasks
  );

  const {
    allDays,
    reviewKey,
    reviewDay
  } = getDailyData();

  const removedTask =
    getAllTasks().find(
      task => task.id === taskId
    );

  if (
    reviewDay.tasks?.[taskId] === true &&
    removedTask
  ) {
    setTotalXp(
      getTotalXp() -
      Number(removedTask.xp || 20)
    );
  }

  if (reviewDay.tasks) {
    delete reviewDay.tasks[taskId];
  }

  allDays[reviewKey] = reviewDay;

  writeJson("days", allDays);

  updateDailyState();
}

function resetCurrentReview() {
  const confirmed = confirm(
    "Réinitialiser les réponses du bilan d’hier ?"
  );

  if (!confirmed) {
    return;
  }

  const {
    allDays,
    reviewKey,
    reviewDay
  } = getDailyData();

  let xpToRemove = 0;

  getAllTasks().forEach(task => {
    if (
      reviewDay.tasks?.[task.id] === true
    ) {
      xpToRemove += Number(task.xp || 10);
    }
  });

  if (reviewDay.bonusGranted === true) {
    xpToRemove += 150;
  }

  allDays[reviewKey] = {
    tasks: {},
    completed: false,
    bonusGranted: false,
    updatedAt: new Date().toISOString()
  };

  writeJson("days", allDays);

  setTotalXp(
    getTotalXp() - xpToRemove
  );

  updateDailyState();
}

function markDailyReviewAsOpened() {
  if (!currentUser?.id) {
    return;
  }

  const todayKey = getLocalDateKey();

  localStorage.setItem(
    `pcr_daily_review_opened_${currentUser.id}_${todayKey}`,
    "true"
  );
}

function continueToPlatform() {
  const {
    allDays,
    reviewKey,
    reviewDay
  } = getDailyData();

  const tasks = getAllTasks();

  const checkedCount = tasks.filter(
    task =>
      reviewDay.tasks?.[task.id] === true
  ).length;

  const percent = tasks.length
    ? Math.round(
        checkedCount / tasks.length * 100
      )
    : 0;

  if (checkedCount === 0) {
    showMotivationModal({
      icon: "🚨",
      title: "Bilan obligatoire",
      message:
        "Vous n’avez validé aucune activité réalisée hier.\n\n" +
        "Vous devez répondre honnêtement à votre bilan avant d’accéder à la plateforme.\n\n" +
        "La discipline commence par le courage d’évaluer son propre travail.",
      percent: 0,
      buttonText: "Compléter mon bilan"
    });

    return;
  }

  const motivation =
    getMotivation(
      percent,
      checkedCount,
      tasks.length
    );

  reviewDay.reviewSubmitted = true;
  reviewDay.reviewSubmittedAt =
    new Date().toISOString();

  reviewDay.reviewPercent = percent;
  reviewDay.checkedCount = checkedCount;
  reviewDay.totalTasks = tasks.length;

  allDays[reviewKey] = reviewDay;

  writeJson("days", allDays);

  markDailyReviewAsOpened();

  let icon = "🔥";

  if (percent === 100) {
    icon = "🏆";
  } else if (percent >= 70) {
    icon = "💪";
  } else if (percent >= 25) {
    icon = "⚠️";
  } else {
    icon = "🚨";
  }

  showMotivationModal({
    icon,
    title: motivation.title.replace(
      /^[^\s]+\s/,
      ""
    ),
    message: motivation.message,
    percent,
    buttonText:
      "Continuer vers la plateforme",
    onConfirm: () => {
      window.location.href = "/";
    }
  });
}

if (resetDailyBtn) {
  resetDailyBtn.addEventListener(
    "click",
    resetCurrentReview
  );
}

if (addActivityBtn) {
  addActivityBtn.addEventListener(
    "click",
    addCustomActivity
  );
}

if (continuePlatformBtn) {
  continuePlatformBtn.addEventListener(
    "click",
    continueToPlatform
  );
}

formatReviewDate();
updateDailyState();

