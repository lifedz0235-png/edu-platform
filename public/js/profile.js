function getProfileAuthHeaders() {
  const accessToken =
    localStorage.getItem("pcr_access_token") ||
    sessionStorage.getItem("pcr_access_token");

  return accessToken
    ? {
        "Authorization":
          "Bearer " + accessToken
      }
    : {};
}

const profileForm = document.getElementById("profileForm");

const profilePhoto = document.getElementById("profilePhoto");
const profileInitial = document.getElementById("profileInitial");
const profilePhotoInput = document.getElementById("profilePhotoInput");

const deletePhotoBtn = document.getElementById("deletePhotoBtn");

const selectedPhotoPreview = document.getElementById(
  "selectedPhotoPreview"
);

const selectedPhotoImage = document.getElementById(
  "selectedPhotoImage"
);

const selectedPhotoName = document.getElementById(
  "selectedPhotoName"
);

const cancelSelectedPhoto = document.getElementById(
  "cancelSelectedPhoto"
);

const profileDisplayName = document.getElementById(
  "profileDisplayName"
);

const profileRole = document.getElementById("profileRole");
const profileEmail = document.getElementById("profileEmail");

const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const profileUniversity = document.getElementById(
  "profileUniversity"
);
const profilePromotion = document.getElementById(
  "profilePromotion"
);

const bioCount = document.getElementById("bioCount");

const publicationsCount = document.getElementById(
  "publicationsCount"
);

const commentsCount = document.getElementById(
  "commentsCount"
);

const likesReceivedCount = document.getElementById(
  "likesReceivedCount"
);

const saveProfileBtn = document.getElementById(
  "saveProfileBtn"
);

const profileMessage = document.getElementById(
  "profileMessage"
);

let currentUser = null;
let currentProfile = null;
let selectedPhotoUrl = "";

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("pcr_current_user")
    );
  } catch (error) {
    return null;
  }
}

function setMessage(message, type = "") {
  profileMessage.textContent = message;
  profileMessage.className = `profile-message ${type}`;
}

function getInitial(name) {
  return String(name || "P")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function displayProfilePhoto(photoUrl, name) {
  if (photoUrl) {
    profilePhoto.src = photoUrl;
    profilePhoto.classList.remove("hidden");
    profileInitial.classList.add("hidden");
    deletePhotoBtn.classList.remove("hidden");
  } else {
    profilePhoto.removeAttribute("src");
    profilePhoto.classList.add("hidden");

    profileInitial.textContent = getInitial(name);
    profileInitial.classList.remove("hidden");

    deletePhotoBtn.classList.add("hidden");
  }
}

function updateProfileInterface(profile) {
  currentProfile = profile;

  profileDisplayName.textContent =
    profile.name || "Utilisateur PCR";

  profileRole.textContent =
    String(profile.role || "").toLowerCase() === "admin"
      ? "Administrateur"
      : "Étudiant";

  profileEmail.textContent = profile.email || "";

  profileName.value = profile.name || "";
  profileBio.value = profile.bio || "";
  profileUniversity.value = profile.university || "";
  profilePromotion.value = profile.promotion || "";

  bioCount.textContent = profileBio.value.length;

  publicationsCount.textContent =
    profile.stats?.publications || 0;

  commentsCount.textContent =
    profile.stats?.comments || 0;

  likesReceivedCount.textContent =
    profile.stats?.likesReceived || 0;

  displayProfilePhoto(
    profile.photoUrl,
    profile.name
  );
}

async function loadProfile() {
  currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.replace(
      "/pages/auth/login.html"
    );
    return;
  }

  try {
    const res = await fetch(
      `/api/profile/${currentUser.id}`,
      {
        headers: getProfileAuthHeaders()
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result.error ||
        "Impossible de charger le profil."
      );
    }

    updateProfileInterface(result);

    } catch (error) {
    console.error("Erreur chargement profil :", error);

    setMessage(
      "Impossible de charger le profil pour le moment.",
      "error"
    );
  }
}

profileBio.addEventListener("input", () => {
  bioCount.textContent = profileBio.value.length;
});

profilePhotoInput.addEventListener("change", () => {
  const file = profilePhotoInput.files[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert(
      "Format non autorisé. Utilisez JPG, PNG ou WEBP."
    );

    profilePhotoInput.value = "";
    return;
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    alert(
      "La photo ne doit pas dépasser 5 Mo."
    );

    profilePhotoInput.value = "";
    return;
  }

  if (selectedPhotoUrl) {
    URL.revokeObjectURL(selectedPhotoUrl);
  }

  selectedPhotoUrl = URL.createObjectURL(file);

  selectedPhotoImage.src = selectedPhotoUrl;
  selectedPhotoName.textContent = file.name;

  selectedPhotoPreview.classList.remove("hidden");
});

cancelSelectedPhoto.addEventListener("click", () => {
  profilePhotoInput.value = "";

  if (selectedPhotoUrl) {
    URL.revokeObjectURL(selectedPhotoUrl);
    selectedPhotoUrl = "";
  }

  selectedPhotoImage.removeAttribute("src");
  selectedPhotoName.textContent = "";

  selectedPhotoPreview.classList.add("hidden");
});

profileForm.addEventListener("submit", async event => {
  event.preventDefault();

  currentUser = getCurrentUser();

  if (!currentUser) {
    alert("Utilisateur non connecté.");
    return;
  }

  const cleanName = profileName.value.trim();

  if (!cleanName) {
    setMessage(
      "Le nom complet est obligatoire.",
      "error"
    );

    profileName.focus();
    return;
  }

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Enregistrement...";

  setMessage("");

  try {
    const formData = new FormData();

    formData.append("name", cleanName);
    formData.append("bio", profileBio.value.trim());

    formData.append(
      "university",
      profileUniversity.value.trim()
    );

    formData.append(
      "promotion",
      profilePromotion.value.trim()
    );

    const photoFile = profilePhotoInput.files[0];

    if (photoFile) {
      formData.append("photo", photoFile);
    }

    const res = await fetch(
      `/api/profile/${currentUser.id}`,
      {
        method: "PUT",
        headers: getProfileAuthHeaders(),
        body: formData
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result.error ||
        "Impossible d’enregistrer le profil."
      );
    }

    updateProfileInterface(result.user);

    const updatedCurrentUser = {
  ...currentUser,

  name: result.user.name,
  role: result.user.role,
  status: result.user.status,

  photoUrl: result.user.photoUrl || "",
  bio: result.user.bio || "",
  university: result.user.university || "",
  promotion: result.user.promotion || ""
};

    localStorage.setItem(
      "pcr_current_user",
      JSON.stringify(updatedCurrentUser)
    );

    localStorage.setItem(
      "pcr_user_profile",
      JSON.stringify({
        name: result.user.name,
        role: result.user.role,
        photoUrl: result.user.photoUrl || "",
        bio: result.user.bio || "",
        university: result.user.university || "",
        promotion: result.user.promotion || ""
      })
    );

    profilePhotoInput.value = "";

    if (selectedPhotoUrl) {
      URL.revokeObjectURL(selectedPhotoUrl);
      selectedPhotoUrl = "";
    }

    selectedPhotoPreview.classList.add("hidden");

    setMessage(
      "Profil enregistré avec succès.",
      "success"
    );

    } catch (error) {
    console.error("Erreur enregistrement profil :", error);

    setMessage(
      "Impossible d’enregistrer le profil pour le moment.",
      "error"
    );

  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent =
      "Enregistrer le profil";
  }
});

deletePhotoBtn.addEventListener("click", async () => {
  currentUser = getCurrentUser();

  if (!currentUser) return;

  const confirmation = confirm(
    "Supprimer votre photo de profil ?"
  );

  if (!confirmation) return;

  deletePhotoBtn.disabled = true;

  try {
    const res = await fetch(
      `/api/profile/${currentUser.id}/photo`,
      {
        method: "DELETE",
        headers: getProfileAuthHeaders()
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result.error ||
        "Impossible de supprimer la photo."
      );
    }

    displayProfilePhoto(
      "",
      profileName.value
    );

    const updatedCurrentUser = {
      ...currentUser,
      photoUrl: ""
    };

    localStorage.setItem(
      "pcr_current_user",
      JSON.stringify(updatedCurrentUser)
    );

    const localProfile = JSON.parse(
      localStorage.getItem("pcr_user_profile") ||
      "{}"
    );

    localProfile.photoUrl = "";

    localStorage.setItem(
      "pcr_user_profile",
      JSON.stringify(localProfile)
    );

    setMessage(
      "Photo supprimée.",
      "success"
    );

    } catch (error) {
    console.error("Erreur suppression photo :", error);

    setMessage(
      "Impossible de supprimer la photo pour le moment.",
      "error"
    );

  } finally {
    deletePhotoBtn.disabled = false;
  }
});

loadProfile();