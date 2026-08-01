const communitySearch = document.getElementById("communitySearch");
let allCommunityPosts = [];
let blockedCommunityUsers = [];
let communityRulesAccepted = false;
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const publishBtn = document.getElementById("publishBtn");
const postsList = document.getElementById("postsList");
postsList.addEventListener("click", event => {
  const replyButton = event.target.closest(
    ".reply-post-btn"
  );

  if (!replyButton) {
    return;
  }

  const postId = replyButton.dataset.postId;

  const postText = decodeURIComponent(
    replyButton.dataset.postText || ""
  );

  const postImage = decodeURIComponent(
    replyButton.dataset.postImage || ""
  );

  const authorId =
    replyButton.dataset.authorId || null;

  startReply(
    postId,
    postText,
    postImage,
    authorId
  );
});
const notificationsBtn = document.getElementById("notificationsBtn");
const notificationsCount = document.getElementById("notificationsCount");
const notificationsPanel = document.getElementById("notificationsPanel");
const PROFILE_KEY = "pcr_user_profile";
const publicProfileModal = document.getElementById(
  "publicProfileModal"
);

const closePublicProfileModal = document.getElementById(
  "closePublicProfileModal"
);

const publicProfileAvatar = document.getElementById(
  "publicProfileAvatar"
);

const publicProfileName = document.getElementById(
  "publicProfileName"
);

const publicProfileRole = document.getElementById(
  "publicProfileRole"
);

const publicProfileEmail = document.getElementById(
  "publicProfileEmail"
);

const publicProfileBio = document.getElementById(
  "publicProfileBio"
);

const publicProfileUniversity = document.getElementById(
  "publicProfileUniversity"
);

const publicProfilePromotion = document.getElementById(
  "publicProfilePromotion"
);

const publicProfilePosts = document.getElementById(
  "publicProfilePosts"
);

const publicProfileComments = document.getElementById(
  "publicProfileComments"
);

const publicProfileLikes = document.getElementById(
  "publicProfileLikes"
);
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("pcr_current_user"));
  } catch (error) {
    return null;
  }
}

function canCurrentUserManage(authorId) {
  const currentUser = getCurrentUser();

  if (!currentUser) return false;

  const role = String(
    currentUser.role || ""
  ).toLowerCase();

  if (role === "admin") {
    return true;
  }

  return String(currentUser.id) === String(authorId);
}

function getCurrentProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {
    name: "Étudiant PCR",
    role: "Étudiant"
  };
}

let replyTo = null;
let isPublishing = false;

publishBtn.addEventListener("click", publishPost);

document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" || e.shiftKey) return;

  const active = document.activeElement;

  if (active.classList.contains("comment-input")) {
    e.preventDefault();
    addComment(active.dataset.postid, active);
    return;
  }

  const hasText = postText.value.trim().length > 0;
  const hasImage = postImage.files.length > 0;

  if (hasText || hasImage) {
    e.preventDefault();
    publishPost();
  }
});

postImage.addEventListener("change", showImagePreview);

async function loadNotifications() {
  const currentUser = JSON.parse(
    localStorage.getItem("pcr_current_user")
  );

  if (!currentUser) return;

  const res = await fetch(
    `/api/community/notifications?userId=${currentUser.id}`
  );

  const notifications = await res.json();

  const unread = notifications.filter(
    notification => !notification.read
  ).length;

  notificationsCount.textContent = unread;

  if (!notifications.length) {
    notificationsPanel.innerHTML = `
      <p>Aucune notification.</p>
    `;
    return;
  }

  notificationsPanel.innerHTML = notifications.map(notification => `
    <div class="notification-item ${notification.read ? "" : "unread"}">
      <span>
  ${
    notification.type === "like"
      ? "❤️"
      : notification.type === "reply"
        ? "↩️"
        : "💬"
  }
</span>

      <p>${notification.text}</p>
    </div>
  `).join("");
}

notificationsBtn.addEventListener("click", async () => {
  const currentUser = JSON.parse(
    localStorage.getItem("pcr_current_user")
  );

  notificationsPanel.classList.toggle("hidden");

  await fetch("/api/community/notifications/read", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      userId: currentUser.id
    })
  });

  await loadNotifications();
});

async function loadPosts() {
  const currentUser = getCurrentUser();
  const query = currentUser
    ? `?userId=${encodeURIComponent(currentUser.id)}`
    : "";

  const res = await fetch(`/api/community/posts${query}`);
  const posts = await res.json();

  allCommunityPosts = posts.reverse();
  renderPosts(allCommunityPosts);

  setTimeout(() => {
    /*
      Sur ordinateur, on peut afficher la dernière
      publication automatiquement.

      Sur téléphone, on garde la page en haut afin
      que le titre, la recherche et les contrôles
      restent visibles après le chargement.
    */
    if (window.innerWidth > 768) {
      const lastPost =
        postsList.lastElementChild;

      if (lastPost) {
        lastPost.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      }
    }
  }, 150);
}

function showImagePreview() {
  const old = document.getElementById("imagePreview");
  if (old) old.remove();

  const file = postImage.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  const preview = document.createElement("div");
  preview.id = "imagePreview";
  preview.className = "composer-preview";
  preview.innerHTML = `
    <img src="${url}" />
    <button onclick="clearImagePreview()">×</button>
  `;

  document.querySelector(".composer").prepend(preview);
  postText.focus();
}

function clearImagePreview() {
  postImage.value = "";
  const preview = document.getElementById("imagePreview");
  if (preview) preview.remove();
}

function startReply(id, text, imageUrl, authorId) {
  replyTo = {
    id,
    text,
    imageUrl,
    authorId
  };

  const old = document.getElementById("replyPreview");
  if (old) old.remove();

  const preview = document.createElement("div");
  preview.id = "replyPreview";
  preview.className = "reply-preview";
  preview.innerHTML = `
    <div>
      <strong>Réponse à :</strong>
      ${imageUrl ? `<img src="${imageUrl}" />` : ""}
      <p>${text || "Photo"}</p>
    </div>
    <button onclick="cancelReply()">×</button>
  `;

  document.querySelector(".composer").prepend(preview);
  postText.focus();
}

function cancelReply() {
  replyTo = null;
  const preview = document.getElementById("replyPreview");
  if (preview) preview.remove();
}

async function publishPost() {
  if (isPublishing) return;

  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) {
    alert("Écrivez un message ou ajoutez une photo.");
    return;
  }

  isPublishing = true;
  publishBtn.disabled = true;
  publishBtn.textContent = "Publication...";

  try {
    const profile = getCurrentProfile();
const currentUser = getCurrentUser();

if (!currentUser) {
  alert("Utilisateur non connecté.");
  return;
}

const formData = new FormData();
    formData.append("text", text);
    formData.append(
  "authorName",
  currentUser.name || profile.name || "Étudiant PCR"
);

formData.append(
  "authorRole",
  currentUser.role || profile.role || "student"
);
    formData.append("authorId", currentUser.id);

    if (file) formData.append("image", file);

    
    if (replyTo) {
  formData.append("replyToId", replyTo.id);
  formData.append("replyToText", replyTo.text || "");
  formData.append("replyToImage", replyTo.imageUrl || "");
  formData.append("replyToAuthorId", replyTo.authorId || "");
}

    const res = await fetch("/api/community/posts", {
      method: "POST",
      body: formData
    });

    await readApiResponse(res);

    postText.value = "";
    postImage.value = "";
    clearImagePreview();
    cancelReply();

    await loadPosts();
    await loadNotifications();

  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    isPublishing = false;
    publishBtn.disabled = false;
    publishBtn.textContent = "Envoyer";
  }
}


function updateStoredCurrentUser(user) {
  if (!user) return;
  localStorage.setItem(
    "pcr_current_user",
    JSON.stringify(user)
  );
}

async function readApiResponse(res) {
  let result = {};

  try {
    result = await res.json();
  } catch (error) {
    result = {};
  }

  if (!res.ok) {
    throw new Error(
      result.error || "Une erreur est survenue."
    );
  }

  return result;
}

function injectCommunityModerationUi() {
  if (!document.getElementById("communityModerationToolbar")) {
    const toolbar = document.createElement("div");
    toolbar.id = "communityModerationToolbar";
    toolbar.className = "community-moderation-toolbar";
    toolbar.innerHTML = `
      <button type="button" onclick="openBlockedUsersModal()">
        🚫 Utilisateurs bloqués
        <span id="blockedUsersCount">0</span>
      </button>
      <button type="button" onclick="openCommunityRulesModal(false)">
        📜 Règles de la communauté
      </button>
    `;

    const anchor =
      document.querySelector(".community-search") ||
      postsList;

    anchor.parentNode.insertBefore(
      toolbar,
      anchor.nextSibling
    );
  }

  const publicProfileCard = document.querySelector(
    ".public-profile-card"
  );

  if (
    publicProfileCard &&
    !document.getElementById("publicProfileModerationActions")
  ) {
    const actions = document.createElement("div");
    actions.id = "publicProfileModerationActions";
    actions.className = "public-profile-moderation-actions";
    publicProfileCard.appendChild(actions);
  }

  if (!document.getElementById("communityModerationModal")) {
    const modal = document.createElement("div");
    modal.id = "communityModerationModal";
    modal.className = "community-moderation-modal hidden";
    modal.innerHTML = `
      <div class="community-moderation-card">
        <button
          id="closeCommunityModerationModal"
          class="community-modal-close"
          type="button"
          aria-label="Fermer"
        >×</button>
        <div id="communityModerationModalContent"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeCommunityModerationModal();
      }
    });

    modal.querySelector(
      "#closeCommunityModerationModal"
    ).addEventListener(
      "click",
      closeCommunityModerationModal
    );
  }
}

function closeCommunityModerationModal(force = false) {
  if (!communityRulesAccepted && !force) return;

  const modal = document.getElementById(
    "communityModerationModal"
  );

  modal?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function showCommunityModal(content) {
  injectCommunityModerationUi();

  const modal = document.getElementById(
    "communityModerationModal"
  );
  const container = document.getElementById(
    "communityModerationModalContent"
  );

  container.innerHTML = content;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function openCommunityRulesModal(mandatory = false) {
  showCommunityModal(`
    <div class="community-rules-content">
      <span class="community-modal-icon">📜</span>
      <h2>Règles de la communauté PCR</h2>
      <p>
        Cet espace est réservé aux échanges pédagogiques respectueux.
      </p>
      <ul>
        <li>Aucun harcèlement, insulte, menace ou discrimination.</li>
        <li>Aucun spam, contenu trompeur ou publicité non autorisée.</li>
        <li>Aucun contenu sexuel, violent ou illégal.</li>
        <li>
          Ne publiez jamais d’informations nominatives ou confidentielles
          concernant des patients.
        </li>
        <li>
          Tout contenu peut être signalé, supprimé et son auteur suspendu.
        </li>
      </ul>
      ${mandatory ? `
        <label class="community-rules-check">
          <input id="acceptCommunityRulesCheck" type="checkbox">
          <span>J’ai lu et j’accepte les règles de la communauté.</span>
        </label>
        <button
          id="acceptCommunityRulesBtn"
          class="community-primary-action"
          type="button"
          disabled
        >Accepter et continuer</button>
      ` : `
        <button
          class="community-primary-action"
          type="button"
          onclick="closeCommunityModerationModal(true)"
        >Fermer</button>
      `}
    </div>
  `);

  const closeButton = document.getElementById(
    "closeCommunityModerationModal"
  );
  closeButton.style.display = mandatory ? "none" : "grid";

  if (mandatory) {
    const checkbox = document.getElementById(
      "acceptCommunityRulesCheck"
    );
    const acceptButton = document.getElementById(
      "acceptCommunityRulesBtn"
    );

    checkbox.addEventListener("change", () => {
      acceptButton.disabled = !checkbox.checked;
    });

    acceptButton.addEventListener("click", acceptCommunityRules);
  }
}

async function acceptCommunityRules() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  try {
    const res = await fetch("/api/community/rules/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id
      })
    });

    const result = await readApiResponse(res);
    communityRulesAccepted = true;
    updateStoredCurrentUser(result.user);
    closeCommunityModerationModal(true);
  } catch (error) {
    alert(error.message);
  }
}

async function loadCommunityModerationStatus() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const res = await fetch(
    `/api/community/moderation/status?userId=${encodeURIComponent(currentUser.id)}`
  );
  const result = await readApiResponse(res);

  communityRulesAccepted = result.rulesAccepted === true;
  blockedCommunityUsers = Array.isArray(result.blockedUsers)
    ? result.blockedUsers
    : [];

  const count = document.getElementById("blockedUsersCount");
  if (count) count.textContent = blockedCommunityUsers.length;

  if (!communityRulesAccepted) {
    openCommunityRulesModal(true);
  }
}

function openReportModal(targetType, postId, commentId, targetUserId) {
  showCommunityModal(`
    <div class="community-report-content">
      <span class="community-modal-icon">🚩</span>
      <h2>Signaler un contenu</h2>
      <p>
        Votre signalement sera transmis à l’administrateur PCR.
      </p>
      <label>
        Motif
        <select id="communityReportReason">
          <option value="inappropriate">Contenu inapproprié</option>
          <option value="harassment">Harcèlement ou intimidation</option>
          <option value="spam">Spam ou publicité</option>
          <option value="misinformation">Information trompeuse</option>
          <option value="other">Autre</option>
        </select>
      </label>
      <label>
        Précisions facultatives
        <textarea
          id="communityReportDetails"
          maxlength="1000"
          placeholder="Expliquez brièvement le problème..."
        ></textarea>
      </label>
      <button
        class="community-danger-action"
        type="button"
        onclick="submitCommunityReport(
          '${targetType}',
          '${postId || ""}',
          '${commentId || ""}',
          '${targetUserId || ""}'
        )"
      >Envoyer le signalement</button>
    </div>
  `);
}

async function submitCommunityReport(
  targetType,
  postId,
  commentId,
  targetUserId
) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const reason = document.getElementById(
    "communityReportReason"
  ).value;
  const details = document.getElementById(
    "communityReportDetails"
  ).value.trim();

  try {
    const res = await fetch("/api/community/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reporterId: currentUser.id,
        targetType,
        postId: postId || null,
        commentId: commentId || null,
        targetUserId: targetUserId || null,
        reason,
        details
      })
    });

    const result = await readApiResponse(res);
    closeCommunityModerationModal(true);
    alert(result.message || "Signalement envoyé.");
  } catch (error) {
    alert(error.message);
  }
}

async function blockCommunityUser(userId) {
  const currentUser = getCurrentUser();
  if (!currentUser || !userId) return;

  const confirmation = confirm(
    "Bloquer cet utilisateur ? Ses contenus seront masqués et toute interaction entre vos comptes sera empêchée."
  );

  if (!confirmation) return;

  try {
    const res = await fetch("/api/community/blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        blockedUserId: userId
      })
    });

    await readApiResponse(res);
    await loadCommunityModerationStatus();
    await loadPosts();
  } catch (error) {
    alert(error.message);
  }
}

async function unblockCommunityUser(userId) {
  const currentUser = getCurrentUser();
  if (!currentUser || !userId) return;

  try {
    const res = await fetch(
      `/api/community/blocks/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      }
    );

    await readApiResponse(res);
    await loadCommunityModerationStatus();
    openBlockedUsersModal();
    await loadPosts();
  } catch (error) {
    alert(error.message);
  }
}

function openBlockedUsersModal() {
  const rows = blockedCommunityUsers.length
    ? blockedCommunityUsers.map(user => `
        <div class="blocked-user-row">
          <div class="blocked-user-avatar">
            ${user.photoUrl
              ? `<img src="${escapeHtml(user.photoUrl)}" alt="">`
              : `<span>${escapeHtml(user.name).charAt(0).toUpperCase()}</span>`
            }
          </div>
          <strong>${escapeHtml(user.name)}</strong>
          <button
            type="button"
            onclick="unblockCommunityUser('${user.id}')"
          >Débloquer</button>
        </div>
      `).join("")
    : `<p class="community-empty-state">Aucun utilisateur bloqué.</p>`;

  showCommunityModal(`
    <div class="blocked-users-content">
      <span class="community-modal-icon">🚫</span>
      <h2>Utilisateurs bloqués</h2>
      <div class="blocked-users-list">${rows}</div>
    </div>
  `);
}

function moderationButtons(targetType, postId, commentId, authorId) {
  const currentUser = getCurrentUser();

  if (
    !currentUser ||
    !authorId ||
    String(currentUser.id) === String(authorId) ||
    String(currentUser.role || "").toLowerCase() === "admin"
  ) {
    return "";
  }

  return `
    <button
      class="community-report-btn"
      type="button"
      onclick="openReportModal(
        '${targetType}',
        '${postId || ""}',
        '${commentId || ""}',
        '${authorId}'
      )"
    >🚩 Signaler</button>
    <button
      class="community-block-btn"
      type="button"
      onclick="blockCommunityUser('${authorId}')"
    >🚫 Bloquer</button>
  `;
}

async function likePost(id) {
  const currentUser = getCurrentUser();

  if (!currentUser) return;

  try {
    const res = await fetch(`/api/community/posts/${id}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name
      })
    });

    await readApiResponse(res);
    await loadPosts();
  } catch (error) {
    alert(error.message);
  }
  await loadNotifications();
}

async function addComment(id, input) {
  const text = input.value.trim();
  if (!text) return;

  const currentUser = getCurrentUser();

  if (!currentUser) return;

  try {
    const res = await fetch(`/api/community/posts/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role
      })
    });

    await readApiResponse(res);
    input.value = "";
    await loadPosts();
    await loadNotifications();
  } catch (error) {
    alert(error.message);
  }
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

async function likeComment(postId, commentId) {
  const currentUser = getCurrentUser();

  if (!currentUser) return;

  try {
    const res = await fetch(
      `/api/community/posts/${postId}/comments/${commentId}/like`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name
        })
      }
    );

    await readApiResponse(res);
    await loadPosts();
  } catch (error) {
    alert(error.message);
  }
}

function getCommentsCount(post) {
  return (post.comments || []).length;
}

function searchCommunity(query) {
  const q = query.toLowerCase().trim();

  if (!q) {
    renderPosts(allCommunityPosts);
    return;
  }

  const filtered = allCommunityPosts.filter(post => {
    const postText = (post.text || "").toLowerCase();
    const author = (post.authorName || "").toLowerCase();
    const comments = (post.comments || [])
      .map(c => `${c.authorName || ""} ${c.text || ""}`)
      .join(" ")
      .toLowerCase();

    return (
      postText.includes(q) ||
      author.includes(q) ||
      comments.includes(q)
    );
  });

  renderPosts(filtered);
}

async function deletePost(postId) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    alert("Utilisateur non connecté.");
    return;
  }

  const confirmation = confirm(
    "Supprimer définitivement cette publication ?"
  );

  if (!confirmation) return;

  try {
    const res = await fetch(
      `/api/community/posts/${postId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      }
    );

    const result = await res.json();

    if (!res.ok) {
      alert(
        result.error ||
        "Impossible de supprimer la publication."
      );
      return;
    }

    await loadPosts();

  } catch (error) {
    console.error(error);

    alert(
      "Erreur pendant la suppression de la publication."
    );
  }
}

async function deleteComment(postId, commentId) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    alert("Utilisateur non connecté.");
    return;
  }

  const confirmation = confirm(
    "Supprimer définitivement ce commentaire ?"
  );

  if (!confirmation) return;

  try {
    const res = await fetch(
      `/api/community/posts/${postId}/comments/${commentId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      }
    );

    const result = await res.json();

    if (!res.ok) {
      alert(
        result.error ||
        "Impossible de supprimer le commentaire."
      );
      return;
    }

    await loadPosts();

  } catch (error) {
    console.error(error);

    alert(
      "Erreur pendant la suppression du commentaire."
    );
  }
}

async function openPublicProfile(userId) {
  if (!userId) {
    alert("Profil utilisateur indisponible.");
    return;
  }

  publicProfileModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  publicProfileAvatar.innerHTML = `
    <span class="public-profile-loading">...</span>
  `;

  publicProfileName.textContent = "Chargement...";
  publicProfileRole.textContent = "";
  publicProfileEmail.textContent = "";
  publicProfileBio.textContent = "";
  publicProfileUniversity.textContent = "—";
  publicProfilePromotion.textContent = "—";
  publicProfilePosts.textContent = "0";
  publicProfileComments.textContent = "0";
  publicProfileLikes.textContent = "0";

  try {
    const res = await fetch(`/api/profile/${userId}`);
    const profile = await res.json();

    if (!res.ok) {
      throw new Error(
        profile.error ||
        "Impossible de charger ce profil."
      );
    }

    publicProfileName.textContent =
      profile.name || "Utilisateur PCR";

    publicProfileRole.textContent =
      String(profile.role || "").toLowerCase() === "admin"
        ? "Administrateur"
        : "Étudiant";

    publicProfileEmail.textContent =
      profile.email || "";

    publicProfileBio.textContent =
      profile.bio || "Aucune bio renseignée.";

    publicProfileUniversity.textContent =
      profile.university || "Non renseignée";

    publicProfilePromotion.textContent =
      profile.promotion || "Non renseignée";

    publicProfilePosts.textContent =
      profile.stats?.publications || 0;

    publicProfileComments.textContent =
      profile.stats?.comments || 0;

    publicProfileLikes.textContent =
      profile.stats?.likesReceived || 0;

    const profileModerationActions = document.getElementById(
      "publicProfileModerationActions"
    );
    const currentUser = getCurrentUser();

    if (profileModerationActions) {
      const canModerateProfile =
        currentUser &&
        String(currentUser.id) !== String(profile.id) &&
        String(currentUser.role || "").toLowerCase() !== "admin";

      profileModerationActions.innerHTML = canModerateProfile
        ? `
          <button
            class="community-report-btn"
            type="button"
            onclick="openReportModal('user', '', '', '${profile.id}')"
          >🚩 Signaler l’utilisateur</button>
          <button
            class="community-block-btn"
            type="button"
            onclick="blockCommunityUser('${profile.id}')"
          >🚫 Bloquer l’utilisateur</button>
        `
        : "";
    }

    if (profile.photoUrl) {
      publicProfileAvatar.innerHTML = `
        <img
          src="${profile.photoUrl}"
          alt="${escapeHtml(profile.name || "Utilisateur PCR")}"
        >
      `;
    } else {
      publicProfileAvatar.innerHTML = `
        <span>
          ${(profile.name || "P")
            .charAt(0)
            .toUpperCase()}
        </span>
      `;
    }

  } catch (error) {
    console.error(error);

    publicProfileName.textContent =
      "Profil indisponible";

    publicProfileBio.textContent =
      error.message;
  }
}

function closePublicProfile() {
  if (!publicProfileModal) return;

  publicProfileModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

if (closePublicProfileModal) {
  closePublicProfileModal.addEventListener(
    "click",
    closePublicProfile
  );
}

if (publicProfileModal) {
  publicProfileModal.addEventListener("click", event => {
    if (event.target === publicProfileModal) {
      closePublicProfile();
    }
  });
}

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    publicProfileModal &&
    !publicProfileModal.classList.contains("hidden")
  ) {
    closePublicProfile();
  }
});

function renderPosts(posts) {
  if (!posts.length) {
    postsList.innerHTML = `
      <article class="post-card">
        <p>Aucune publication pour le moment.</p>
      </article>
    `;
    return;
  }

  postsList.innerHTML = posts.map(post => `
    <article class="post-card">

      <div class="post-header">

  <div
    class="post-author-area clickable-profile"
    onclick="openPublicProfile(${post.authorId || "null"})"
    title="Voir le profil"
  >

    <div class="avatar">
      ${
        post.authorPhotoUrl
          ? `
            <img
              src="${post.authorPhotoUrl}"
              alt="${escapeHtml(
                post.authorName || "Utilisateur PCR"
              )}"
              class="avatar-image"
            >
          `
          : `
            <span>
              ${(post.authorName || "Étudiant PCR")
                .charAt(0)
                .toUpperCase()}
            </span>
          `
      }
    </div>

    <div class="post-author-info">
      <strong>
        ${escapeHtml(
          post.authorName || "Étudiant PCR"
        )}
      </strong>

      <p>
        ${
          String(post.authorRole || "")
            .toLowerCase() === "admin"
            ? "Administrateur"
            : "Étudiant"
        }
      </p>

      ${
        post.authorUniversity ||
        post.authorPromotion
          ? `
            <small>
              ${escapeHtml(
                post.authorUniversity || ""
              )}

              ${
                post.authorUniversity &&
                post.authorPromotion
                  ? " • "
                  : ""
              }

              ${escapeHtml(
                post.authorPromotion || ""
              )}
            </small>
          `
          : ""
      }
    </div>

  </div>

  ${
    canCurrentUserManage(post.authorId)
      ? `
        <button
          class="post-delete-btn"
          onclick="deletePost(${post.id})"
          title="Supprimer la publication"
        >
          🗑
        </button>
      `
      : ""
  }

</div>

      ${post.replyTo ? `
        <div class="quoted-post">
          <strong>Réponse à :</strong>
          ${post.replyTo.imageUrl ? `<img src="${post.replyTo.imageUrl}" />` : ""}
          <p>${escapeHtml(post.replyTo.text || "Photo")}</p>
        </div>
      ` : ""}

      ${post.text ? `<p class="post-text">${escapeHtml(post.text)}</p>` : ""}

      ${post.imageUrl ? `<img class="post-image" src="${post.imageUrl}" />` : ""}

      <div class="post-actions">

  <button onclick="likePost(${post.id})">
    ❤️ ${post.likes || 0}
  </button>

  <span class="comment-counter">
  💬 ${getCommentsCount(post)} commentaire${getCommentsCount(post) > 1 ? "s" : ""}
</span>

 <button
  type="button"
  class="reply-post-btn"
  data-post-id="${post.id}"
  data-post-text="${encodeURIComponent(post.text || "")}"
  data-post-image="${encodeURIComponent(post.imageUrl || "")}"
  data-author-id="${post.authorId ?? ""}"
>
  ↩️ Répondre
</button>
  ${moderationButtons(
    "post",
    post.id,
    null,
    post.authorId
  )}

</div>

      <div class="comments-list">
  ${(post.comments || []).map(c => `
    <div class="comment-item">

      <div
  class="comment-avatar clickable-profile"
  onclick="openPublicProfile(${c.authorId || "null"})"
  title="Voir le profil"
>
  ${
    c.authorPhotoUrl
      ? `
        <img
          src="${c.authorPhotoUrl}"
          alt="${escapeHtml(c.authorName || "Utilisateur PCR")}"
          class="comment-avatar-image"
        >
      `
      : `
        <span>
          ${
            c.authorName
              ? c.authorName.charAt(0).toUpperCase()
              : "P"
          }
        </span>
      `
  }
</div>

      <div class="comment-content">
        <strong
  class="comment-author-name clickable-profile"
  onclick="openPublicProfile(${c.authorId || "null"})"
>
  ${escapeHtml(c.authorName || "Étudiant PCR")}
</strong>

${
  c.authorUniversity || c.authorPromotion
    ? `
      <small class="comment-author-meta">
        ${c.authorUniversity || ""}
        ${
          c.authorUniversity && c.authorPromotion
            ? " • "
            : ""
        }
        ${c.authorPromotion || ""}
      </small>
    `
    : ""
}

<p>${escapeHtml(c.text)}</p>

<span>${formatDate(c.createdAt)}</span>

<div class="comment-actions">

  <button onclick="likeComment(${post.id}, ${c.id})">
    ❤️ ${c.likes || 0}
  </button>

  ${
    canCurrentUserManage(c.authorId)
      ? `
        <button
          class="comment-delete-btn"
          onclick="deleteComment(${post.id}, ${c.id})"
          title="Supprimer le commentaire"
        >
          🗑 Supprimer
        </button>
      `
      : ""
  }

  ${moderationButtons(
    "comment",
    post.id,
    c.id,
    c.authorId
  )}

</div>
      </div>

    </div>
  `).join("")}
</div>

      <div class="comment-input-box">
        <input
          class="comment-input"
          data-postid="${post.id}"
          placeholder="Écrire un commentaire..."
        >
        <button onclick="addComment(${post.id}, this.previousElementSibling)">Commenter</button>
      </div>

    </article>
  `).join("");
}



function escapeText(text) {
  return text.replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.likePost = likePost;
window.startReply = startReply;
window.clearImagePreview = clearImagePreview;
window.cancelReply = cancelReply;
window.publishPost = publishPost;
window.addComment = addComment;
window.likeComment = likeComment;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.openPublicProfile = openPublicProfile;
window.openCommunityRulesModal = openCommunityRulesModal;
window.closeCommunityModerationModal = closeCommunityModerationModal;
window.openReportModal = openReportModal;
window.submitCommunityReport = submitCommunityReport;
window.blockCommunityUser = blockCommunityUser;
window.unblockCommunityUser = unblockCommunityUser;
window.openBlockedUsersModal = openBlockedUsersModal;

communitySearch.addEventListener("input", e => {
  searchCommunity(e.target.value);
});
async function initializeCommunity() {
  injectCommunityModerationUi();

  try {
    await loadCommunityModerationStatus();
    await loadPosts();
    await loadNotifications();
  } catch (error) {
    console.error("Erreur initialisation communauté:", error);
    alert(error.message || "Impossible de charger la communauté.");
  }
}

initializeCommunity();