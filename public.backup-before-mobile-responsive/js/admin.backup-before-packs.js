const usersTable = document.getElementById("usersTable");
const totalUsers = document.getElementById("totalUsers");
const pendingUsers = document.getElementById("pendingUsers");
const approvedUsers = document.getElementById("approvedUsers");
const userSearch = document.getElementById("userSearch");
const statusFilter = document.getElementById("statusFilter");

let allUsers = [];

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
            <td><span class="status ${user.status}">${user.status}</span></td>
            <td class="actions">
  <button class="approve" onclick="approveUser(${user.id})">Approuver</button>
  <button class="refuse" onclick="refuseUser(${user.id})">Refuser</button>
  <button class="suspend" onclick="suspendUser(${user.id})">Suspendre</button>
  <button class="reset" onclick="resetPassword(${user.id})">Mot de passe</button>
  <button class="delete" onclick="deleteUser(${user.id})">Supprimer</button>
</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function approveUser(id) {
  await fetch(`/api/admin/users/${id}/approve`, { method: "POST" });
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

async function resetPassword(id) {
  const password = prompt("Nouveau mot de passe :");

  if (!password) return;

  const res = await fetch(`/api/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error);
    return;
  }

  alert("Mot de passe modifié.");
  await loadUsers();
}

window.approveUser = approveUser;
window.refuseUser = refuseUser;
window.suspendUser = suspendUser;

window.deleteUser = deleteUser;
window.resetPassword = resetPassword;

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

document.getElementById("modalApprove").addEventListener("click", async () => {
  await approveUser(selectedUserId);
  userModal.classList.add("hidden");
});

document.getElementById("modalSuspend").addEventListener("click", async () => {
  await suspendUser(selectedUserId);
  userModal.classList.add("hidden");
});

document.getElementById("modalReset").addEventListener("click", async () => {
  await resetPassword(selectedUserId);
});

document.getElementById("modalDelete").addEventListener("click", async () => {
  await deleteUser(selectedUserId);
  userModal.classList.add("hidden");
});

window.openUserDetails = openUserDetails;

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
              <button class="reset" onclick="editCourse(${course.id})">Modifier</button>
              <button class="delete" onclick="deleteCourse(${course.id})">Supprimer</button>
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

window.editCourse = editCourse;
window.deleteCourse = deleteCourse;

loadCourses();

