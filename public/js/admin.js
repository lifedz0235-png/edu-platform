const usersTable = document.getElementById("usersTable");
const totalUsers = document.getElementById("totalUsers");
const pendingUsers = document.getElementById("pendingUsers");
const approvedUsers = document.getElementById("approvedUsers");
const userSearch = document.getElementById("userSearch");
const statusFilter = document.getElementById("statusFilter");

const communityReportsList = document.getElementById(
  "communityReportsList"
);
const communityReportsFilter = document.getElementById(
  "communityReportsFilter"
);
const communityReportsBadge = document.getElementById(
  "communityReportsBadge"
);
const refreshCommunityReports = document.getElementById(
  "refreshCommunityReports"
);


const notificationBell =
  document.getElementById(
    "notificationBell"
  );

const notificationBadge =
  document.getElementById(
    "notificationBadge"
  );

const notificationsPanel =
  document.getElementById(
    "notificationsPanel"
  );

const notificationsList =
  document.getElementById(
    "notificationsList"
  );

const markNotificationsRead =
  document.getElementById(
    "markNotificationsRead"
  );

let allUsers = [];

let allCommunityReports = [];

function getAdminCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("pcr_current_user") || "null"
    );
  } catch (error) {
    return null;
  }
}

function escapeAdminHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCommunityReportReason(reason) {
  const labels = {
    inappropriate: "Contenu inapproprié",
    harassment: "Harcèlement",
    spam: "Spam / publicité",
    misinformation: "Information trompeuse",
    other: "Autre"
  };

  return labels[reason] || "Non précisé";
}

function getCommunityReportStatus(status) {
  const labels = {
    open: "Ouvert",
    reviewing: "En cours",
    resolved: "Résolu",
    dismissed: "Ignoré"
  };

  return labels[status] || status;
}

function renderCommunityReports(reports) {
  if (!communityReportsList) return;

  const openCount = allCommunityReports.filter(
    report => ["open", "reviewing"].includes(report.status)
  ).length;

  if (communityReportsBadge) {
    communityReportsBadge.textContent =
      `${openCount} ouvert${openCount > 1 ? "s" : ""}`;
  }

  if (!reports.length) {
    communityReportsList.innerHTML = `
      <div class="reports-empty">
        Aucun signalement dans cette catégorie.
      </div>
    `;
    return;
  }

  communityReportsList.innerHTML = reports.map(report => `
    <article class="community-report-item status-${escapeAdminHtml(report.status)}">
      <div class="community-report-head">
        <div>
          <span class="report-status">
            ${getCommunityReportStatus(report.status)}
          </span>
          <strong>${getCommunityReportReason(report.reason)}</strong>
        </div>
        <time>
          ${report.createdAt
            ? new Date(report.createdAt).toLocaleString("fr-FR")
            : ""
          }
        </time>
      </div>

      <div class="community-report-grid">
        <div>
          <span>Signalé par</span>
          <strong>${escapeAdminHtml(report.reporterName)}</strong>
        </div>
        <div>
          <span>Auteur concerné</span>
          <strong>${escapeAdminHtml(report.snapshot?.authorName)}</strong>
        </div>
        <div>
          <span>Type</span>
          <strong>${escapeAdminHtml(report.targetType)}</strong>
        </div>
      </div>

      <blockquote>
        ${escapeAdminHtml(
          report.snapshot?.text || "Contenu non disponible"
        )}
      </blockquote>

      ${report.snapshot?.imageUrl ? `
        <a
          class="report-image-link"
          href="${escapeAdminHtml(report.snapshot.imageUrl)}"
          target="_blank"
          rel="noopener"
        >Voir l’image signalée</a>
      ` : ""}

      ${report.details ? `
        <p class="report-details">
          <strong>Précisions :</strong>
          ${escapeAdminHtml(report.details)}
        </p>
      ` : ""}

      <label class="report-note-label">
        Note administrateur
        <textarea
          id="report-note-${report.id}"
          maxlength="1000"
          placeholder="Note interne facultative..."
        >${escapeAdminHtml(report.adminNote || "")}</textarea>
      </label>

      <div class="community-report-actions">
        <button
          class="reset"
          onclick="handleCommunityReport('${report.id}', 'reviewing', 'none')"
        >Prendre en charge</button>

        ${report.targetType !== "user" ? `
          <button
            class="delete"
            onclick="handleCommunityReport('${report.id}', 'resolved', 'delete_content')"
          >Supprimer le contenu</button>
        ` : ""}

        <button
          class="suspend"
          onclick="handleCommunityReport('${report.id}', 'resolved', 'suspend_user')"
        >Suspendre l’auteur</button>

        <button
          class="report-dismiss"
          onclick="handleCommunityReport('${report.id}', 'dismissed', 'none')"
        >Ignorer</button>
      </div>
    </article>
  `).join("");
}

async function loadCommunityReports() {
  if (!communityReportsList) return;

  const admin = getAdminCurrentUser();
  if (!admin) return;

  try {
    const res = await fetch(
      `/api/admin/community/reports?adminId=${encodeURIComponent(admin.id)}&status=all`
    );
    const result = await res.json();

    if (!res.ok || !Array.isArray(result)) {
      throw new Error(
        result.error || "Impossible de charger les signalements."
      );
    }

    allCommunityReports = result;
    applyCommunityReportsFilter();
  } catch (error) {
    console.error(error);
    communityReportsList.innerHTML = `
      <div class="reports-empty reports-error">
        ${escapeAdminHtml(error.message)}
      </div>
    `;
  }
}

function applyCommunityReportsFilter() {
  const status = communityReportsFilter?.value || "all";
  const reports = status === "all"
    ? allCommunityReports
    : allCommunityReports.filter(
        report => report.status === status
      );

  renderCommunityReports(reports);
}

async function handleCommunityReport(reportId, status, action) {
  const admin = getAdminCurrentUser();
  if (!admin) return;

  if (
    action === "delete_content" &&
    !confirm("Supprimer définitivement le contenu signalé ?")
  ) {
    return;
  }

  if (
    action === "suspend_user" &&
    !confirm("Suspendre le compte de l’auteur signalé ?")
  ) {
    return;
  }

  const note = document.getElementById(
    `report-note-${reportId}`
  )?.value || "";

  try {
    const res = await fetch(
      `/api/admin/community/reports/${reportId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adminId: admin.id,
          status,
          action,
          adminNote: note
        })
      }
    );

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Action impossible.");
    }

    await loadCommunityReports();
    if (action === "suspend_user") {
      await loadUsers();
    }
  } catch (error) {
    alert(error.message);
  }
}

if (communityReportsFilter) {
  communityReportsFilter.addEventListener(
    "change",
    applyCommunityReportsFilter
  );
}

if (refreshCommunityReports) {
  refreshCommunityReports.addEventListener(
    "click",
    loadCommunityReports
  );
}

window.handleCommunityReport = handleCommunityReport;


async function loadUsers() {
  const res = await fetch("/api/admin/users");
  allUsers = await res.json();

  totalUsers.textContent = allUsers.length;
  pendingUsers.textContent = allUsers.filter(u => u.status === "pending").length;
  approvedUsers.textContent = allUsers.filter(u => u.status === "approved").length;

  applyFilters();
}

function applyFilters() {
  const q = userSearch.value.toLowerCase().trim();
  const status = statusFilter.value;

  let users = [...allUsers];

  if (status !== "all") {
    users = users.filter(u => u.status === status);
  }

  if (q) {
    users = users.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.university || "").toLowerCase().includes(q) ||
      (u.promotion || "").toLowerCase().includes(q)
    );
  }

  renderUsers(users);
}

function renderUsers(users) {
  if (!users.length) {
    usersTable.innerHTML = `<p>Aucun utilisateur trouvé.</p>`;
    return;
  }

  usersTable.innerHTML = `
    <table>
      <thead>
        <tr>

        
<th>Nom</th>
<th>Email</th>
<th>Téléphone</th>
<th>Université</th>
<th>Promotion</th>
<th>Pack</th>
<th>Prix</th>
<th>Payé</th>
<th>Reste</th>
<th>Paiement</th>
<th>Fin abonnement</th>
<th>Statut</th>
<th>Actions</th>


        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>
  <button class="user-link" onclick="openUserDetails(${user.id})">
    ${user.name || ""}
  </button>
</td>
            <td>${user.email || ""}</td>
            <td>${user.phone || ""}</td>
            <td>${user.university || ""}</td>
            <td>${user.promotion || ""}</td>

<td>
  <span class="admin-plan-badge ${user.plan || "unknown"}">
    ${
      user.plan === "gold"
        ? "Gold"
        : user.plan === "platinum"
          ? "Platinum"
          : "Non défini"
    }
  </span>
</td>

<td>

<td>
  ${
    user.subscriptionPrice
      ? `${Number(
          user.subscriptionPrice
        ).toLocaleString("fr-FR")} DA`
      : "—"
  }
</td>

<td>
  ${
    Number(
      user.totalPaid || 0
    ).toLocaleString("fr-FR")
  } DA
</td>

<td>
  ${
    Math.max(
      Number(user.subscriptionPrice || 0) -
      Number(user.totalPaid || 0),
      0
    ).toLocaleString("fr-FR")
  } DA
</td>

  <span class="payment-status ${user.paymentStatus || "pending"}">
    ${
      user.paymentStatus === "paid"
        ? "Payé complet"
        : user.paymentStatus === "partial"
          ? "Paiement partiel"
          : "En attente"
    }
  </span>
</td>

<td>
  <span class="status ${user.status}">
    ${user.status}
  </span>
</td>
            
<td class="actions">

  ${
    user.paymentStatus !== "paid"
      ? `
        <button
          class="confirm-payment"
          onclick="confirmPaymentAndActivate(${user.id})"
        >
          Paiement confirmé
        </button>
      `
      : `
        <span class="payment-already-confirmed">
          ✅ Paiement validé
        </span>
      `
  }

  <button
    class="refuse"
    onclick="refuseUser(${user.id})"
  >
    Refuser
  </button>

  <button
    class="suspend"
    onclick="suspendUser(${user.id})"
  >
    Suspendre
  </button>

  <button
    class="delete"
    onclick="deleteUser(${user.id})"
  >
    Supprimer
  </button>

</td>


          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}


async function confirmPaymentAndActivate(id) {
  const user = allUsers.find(
    item =>
      String(item.id) === String(id)
  );

  if (!user) {
    alert("Utilisateur introuvable.");
    return;
  }

  const price =
    Number(user.subscriptionPrice || 0);

  const totalPaid =
  user.plan === "platinum" &&
  user.paymentStatus === "expired"
    ? 0
    : Number(user.totalPaid || 0);

  const remaining =
    Math.max(price - totalPaid, 0);

  if (!price) {
    alert(
      "Aucun prix défini pour cet utilisateur."
    );
    return;
  }

  const amountText = prompt(
    [
      `Pack : ${user.planLabel || user.plan || "Non défini"}`,
      `Prix total : ${price.toLocaleString("fr-FR")} DA`,
      `Déjà payé : ${totalPaid.toLocaleString("fr-FR")} DA`,
      `Reste : ${remaining.toLocaleString("fr-FR")} DA`,
      "",
      "Montant payé maintenant :"
    ].join("\n"),
    remaining || ""
  );

  if (amountText === null) {
    return;
  }

  const paidAmount = Number(
    String(amountText)
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  if (
    !Number.isFinite(paidAmount) ||
    paidAmount <= 0
  ) {
    alert("Montant invalide.");
    return;
  }

  if (paidAmount > remaining) {
    alert(
      `Le montant dépasse le reste à payer : ${remaining.toLocaleString("fr-FR")} DA.`
    );
    return;
  }

  const res = await fetch(
    `/api/admin/users/${id}/confirm-payment`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        paidAmount
      })
    }
  );

  const result = await res.json();

  if (!res.ok) {
    alert(
      result.error ||
      "Erreur pendant l’enregistrement du paiement."
    );
    return;
  }

  alert(result.message);

  await loadUsers();
}

async function refuseUser(id) {
  await fetch(`/api/admin/users/${id}/refuse`, { method: "POST" });
  await loadUsers();
}

async function suspendUser(id) {
  await fetch(`/api/admin/users/${id}/suspend`, { method: "POST" });
  await loadUsers();
}

userSearch.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);

async function deleteUser(id) {
  if (!confirm("Supprimer cet utilisateur définitivement ?")) return;

  await fetch(`/api/admin/users/${id}`, {
    method: "DELETE"
  });

  await loadUsers();
}




window.refuseUser = refuseUser;
window.suspendUser = suspendUser;

window.deleteUser = deleteUser;


const userModal = document.getElementById("userModal");
const closeUserModal = document.getElementById("closeUserModal");

let selectedUserId = null;

async function openUserDetails(id) {
  selectedUserId = id;

  const res = await fetch(`/api/admin/users/${id}/details`);
  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  const user = data.user;
  const stats = data.stats;

  document.getElementById("modalAvatar").textContent =
    (user.name || "P").charAt(0).toUpperCase();

  document.getElementById("modalName").textContent = user.name || "";
  document.getElementById("modalEmail").textContent = user.email || "";
  document.getElementById("modalPhone").textContent = user.phone || "-";
  document.getElementById("modalUniversity").textContent = user.university || "-";
  document.getElementById("modalPromotion").textContent = user.promotion || "-";
  document.getElementById("modalPlan").textContent =
  user.planLabel ||
  (
    user.plan === "gold"
      ? "Pack Gold"
      : user.plan === "platinum"
        ? "Pack Platinum"
        : "Non défini"
  );
  

document.getElementById("modalPrice").textContent =
  user.subscriptionPrice
    ? `${Number(
        user.subscriptionPrice
      ).toLocaleString("fr-FR")} DA${
        user.paymentType === "monthly"
          ? " / mois"
          : ""
      }`
    : "-";

    document.getElementById(
  "modalPaidAmount"
).textContent =
  `${Number(
    user.totalPaid || 0
  ).toLocaleString("fr-FR")} DA`;

document.getElementById(
  "modalRemainingAmount"
).textContent =
  `${Math.max(
    Number(user.subscriptionPrice || 0) -
    Number(user.totalPaid || 0),
    0
  ).toLocaleString("fr-FR")} DA`;

document.getElementById(
  "modalPayment"
).textContent =
  user.paymentStatus === "paid"
    ? "Payé complet"
    : user.paymentStatus === "partial"
      ? "Paiement partiel"
      : "En attente";

  document.getElementById("modalStatus").textContent = user.status || "-";

  document.getElementById("modalPosts").textContent = stats.posts;
  document.getElementById("modalComments").textContent = stats.comments;
  document.getElementById("modalLikes").textContent = stats.likesReceived;
  document.getElementById("modalDevice").textContent = stats.activeDevice;

  userModal.classList.remove("hidden");
}

closeUserModal.addEventListener("click", () => {
  userModal.classList.add("hidden");
});

document
  .getElementById("modalConfirmPayment")
  .addEventListener(
    "click",
    async () => {
      await confirmPaymentAndActivate(
        selectedUserId
      );

      userModal.classList.add("hidden");
    }
  );

document
  .getElementById("modalRefuse")
  .addEventListener(
    "click",
    async () => {
      await refuseUser(selectedUserId);

      userModal.classList.add("hidden");
    }
  );

document
  .getElementById("modalSuspend")
  .addEventListener(
    "click",
    async () => {
      await suspendUser(selectedUserId);

      userModal.classList.add("hidden");
    }
  );

document
  .getElementById("modalDelete")
  .addEventListener(
    "click",
    async () => {
      await deleteUser(selectedUserId);

      userModal.classList.add("hidden");
    }
  );

window.openUserDetails = openUserDetails;

function getNotificationIcon(type) {
  const icons = {
    new_registration: "🆕",
    partial_payment: "💳",
    payment_completed: "✅",
    subscription_renewed: "🔄",
    subscription_expired: "⛔",
    subscription_expiring_7: "⚠️",
    subscription_expiring_6: "⚠️",
    subscription_expiring_5: "⚠️",
    subscription_expiring_4: "⚠️",
    subscription_expiring_3: "⚠️",
    subscription_expiring_2: "⚠️",
    subscription_expiring_1: "⚠️"
  };

  return icons[type] || "🔔";
}

function getNotificationTitle(type) {
  if (type === "new_registration") {
    return "Nouvelle demande";
  }

  if (type === "partial_payment") {
    return "Paiement partiel";
  }

  if (type === "payment_completed") {
    return "Paiement confirmé";
  }

  if (type === "subscription_renewed") {
    return "Abonnement renouvelé";
  }

  if (type === "subscription_expired") {
    return "Abonnement expiré";
  }

  if (
    String(type || "").startsWith(
      "subscription_expiring_"
    )
  ) {
    return "Expiration proche";
  }

  return "Notification";
}

async function loadAdminNotifications() {
  try {
    const res = await fetch(
      "/api/admin/subscription-notifications"
    );

    const notifications =
      await res.json();

    if (
      !res.ok ||
      !Array.isArray(notifications)
    ) {
      throw new Error(
        "Erreur notifications"
      );
    }

    const unreadCount =
      notifications.filter(
        notification =>
          notification.read !== true
      ).length;

    notificationBadge.textContent =
      unreadCount;

    notificationBadge.classList.toggle(
      "hidden",
      unreadCount === 0
    );

    if (!notifications.length) {
      notificationsList.innerHTML = `
        <div class="notification-empty">
          Aucune notification.
        </div>
      `;

      return;
    }

    notificationsList.innerHTML =
  notifications
    .slice(0, 50)
    .map(notification => `
      <button
        type="button"
        class="admin-notification ${
          notification.read
            ? "read"
            : "unread"
        }"
        onclick="openNotificationUser(
          '${notification.id}',
          '${notification.userId || ""}'
        )"
      >

        <span class="admin-notification-icon">
          ${getNotificationIcon(
            notification.type
          )}
        </span>

        <span class="admin-notification-content">

          <span class="admin-notification-head">

            <strong>
              ${getNotificationTitle(
                notification.type
              )}
            </strong>

            ${
              notification.read
                ? ""
                : `
                  <span class="notification-new">
                    Nouveau
                  </span>
                `
            }

          </span>

          <span class="admin-notification-user">
            ${notification.userName || "Utilisateur"}
          </span>

          <span class="admin-notification-message">
            ${notification.message || ""}
          </span>

          <span class="admin-notification-footer">

            <small>
              ${
                notification.createdAt
                  ? new Date(
                      notification.createdAt
                    ).toLocaleString("fr-FR")
                  : ""
              }
            </small>

            <span class="notification-manage">
              Gérer le compte →
            </span>

          </span>

        </span>

      </button>
    `)
    .join("");

  } catch (error) {
    console.error(
      "Erreur notifications:",
      error
    );

    notificationsList.innerHTML = `
      <div class="notification-empty">
        Impossible de charger les notifications.
      </div>
    `;
  }
}

async function openNotificationUser(
  notificationId,
  userId
) {
  try {
    await fetch(
      `/api/admin/subscription-notifications/${notificationId}/read`,
      {
        method: "POST"
      }
    );

    await loadAdminNotifications();

    if (!userId) {
      alert(
        "Aucun utilisateur associé à cette notification."
      );

      return;
    }

    await openUserDetails(userId);

  } catch (error) {
    console.error(
      "Erreur ouverture notification:",
      error
    );

    alert(
      "Impossible d’ouvrir cette notification."
    );
  }
}

window.openNotificationUser =
  openNotificationUser;

notificationBell.addEventListener(
  "click",
  () => {
    notificationsPanel.classList.toggle(
      "hidden"
    );

    if (
      !notificationsPanel.classList.contains(
        "hidden"
      )
    ) {
      loadAdminNotifications();
    }
  }
);

markNotificationsRead.addEventListener(
  "click",
  async () => {
    const res = await fetch(
      "/api/admin/subscription-notifications/read",
      {
        method: "POST"
      }
    );

    if (!res.ok) {
      alert(
        "Impossible de marquer les notifications comme lues."
      );

      return;
    }

    await loadAdminNotifications();
  }
);

loadUsers();

const openCourseModalBtn = document.getElementById("openCourseModalBtn");
const courseModal = document.getElementById("courseModal");
const closeCourseModal = document.getElementById("closeCourseModal");
const courseModalTitle = document.getElementById("courseModalTitle");

const courseTitle = document.getElementById("courseTitle");
const courseCategory = document.getElementById("courseCategory");
const courseModule = document.getElementById("courseModule");
const courseDescription = document.getElementById("courseDescription");

const MODULES_BY_CATEGORY = {
  biologie: [
    "Anatomopathologie",
    "Biochimie",
    "Génétique",
    "Histologie Embryologie",
    "Immunologie",
    "Microbiologie",
    "Physiologie",
    "Neurophysiologie"
  ],

  medicale: [
    "Cardiologie",
    "Dermatologie",
    "Endocrinologie",
    "Gastrologie",
    "Hématologie",
    "Infectieux",
    "Néphrologie",
    "Neurologie",
    "Pédiatrie",
    "Pneumologie",
    "Psychiatrie",
    "Rhumatologie",
    "Médecine du travail",
    "Épidémiologie",
    "Médecine légale",
    
  ],

  chirurgie: [
    "CCI",
    "Chirurgie générale",
    "Neurochirurgie",
    "Ophtalmologie",
    "ORL",
    "Urologie",
    "Gynécologie",
    "Traumatologie"
  ]
};

function updateModuleOptions() {
  const category = courseCategory.value;
  const modules = MODULES_BY_CATEGORY[category] || [];

  courseModule.innerHTML = modules.map(module => `
    <option value="${module}">${module}</option>
  `).join("");
}

courseCategory.addEventListener("change", updateModuleOptions);
updateModuleOptions();

const courseVideo = document.getElementById("courseVideo");
courseVideo.addEventListener("change", () => {
  const file = courseVideo.files[0];

  if (!file) return;

  const cleanName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();

  courseTitle.value = cleanName;
});
const coursePdf = document.getElementById("coursePdf");
const saveCourseBtn = document.getElementById("saveCourseBtn");
const coursesList = document.getElementById("coursesList");

let allCourses = [];
let editingCourseId = null;

openCourseModalBtn.addEventListener("click", () => {
  editingCourseId = null;
  courseModalTitle.textContent = "Ajouter un cours";

  courseTitle.value = "";
  courseCategory.value = "biologie";
  updateModuleOptions();
  courseVideo.value = "";
  coursePdf.value = "";

  courseModal.classList.remove("hidden");
});

closeCourseModal.addEventListener("click", () => {
  courseModal.classList.add("hidden");
});

async function loadCourses() {
  const res = await fetch("/api/admin/courses");
  allCourses = await res.json();

  if (!allCourses.length) {
    coursesList.innerHTML = `<p>Aucun cours ajouté.</p>`;
    return;
  }

  coursesList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Titre</th>
          <th>Catégorie</th>
          <th>Module</th>
          <th>Vidéo</th>
          <th>PDF</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        ${allCourses.map(course => `
          <tr>
            <td>${course.title || ""}</td>
            <td>${course.category || ""}</td>
            <td>${course.module || ""}</td>
            <td>${course.videoUrl ? "✅" : "❌"}</td>
            <td>${course.pdfUrl ? "✅" : "❌"}</td>

<td class="actions">

  <button
    class="reset"
    onclick="editCourse(${course.id})"
  >
    Modifier
  </button>

  <button
    class="delete"
    onclick="deleteCourse(${course.id})"
  >
    Supprimer
  </button>

</td>
            

          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function saveCourse() {
  const formData = new FormData();

  formData.append("title", courseTitle.value.trim());
  formData.append("category", courseCategory.value);
  formData.append("module", courseModule.value.trim());
  

  if (courseVideo.files[0]) formData.append("video", courseVideo.files[0]);
  if (coursePdf.files[0]) formData.append("pdf", coursePdf.files[0]);

  const url = editingCourseId
    ? `/api/admin/courses/${editingCourseId}`
    : "/api/admin/courses";

  const method = editingCourseId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    body: formData
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Erreur cours");
    return;
  }

  courseModal.classList.add("hidden");
  await loadCourses();
}

function editCourse(id) {
  const course = allCourses.find(c => c.id == id);
  if (!course) return;

  editingCourseId = id;
  courseModalTitle.textContent = "Modifier le cours";

  courseTitle.value = course.title || "";
  courseCategory.value = course.category || "biologie";
  courseModule.value = course.module || "";
  updateModuleOptions();
  courseVideo.value = "";
  coursePdf.value = "";

  courseModal.classList.remove("hidden");
}

async function deleteCourse(id) {
  if (!confirm("Supprimer ce cours ?")) return;

  await fetch(`/api/admin/courses/${id}`, {
    method: "DELETE"
  });

  await loadCourses();
}

saveCourseBtn.addEventListener("click", saveCourse);

window.refuseUser = refuseUser;
window.suspendUser = suspendUser;
window.deleteUser = deleteUser;
window.confirmPaymentAndActivate =
  confirmPaymentAndActivate;

loadCourses();

loadAdminNotifications();

setInterval(() => {
  loadAdminNotifications();
}, 30000);

loadCommunityReports();

setInterval(() => {
  loadCommunityReports();
}, 60000);
