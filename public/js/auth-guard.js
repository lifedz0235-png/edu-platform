const currentPath = window.location.pathname;

const publicPages = [
  "/pages/auth/login.html",
  "/pages/auth/register.html"
];

const isPublicPage = publicPages.includes(currentPath);
const isAdminPage =
  currentPath.includes("/pages/admin/");

const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

let sessionCheckInProgress = false;
let redirectingToLogin = false;

function stopProtectedMedia() {
  document
    .querySelectorAll("video, audio")
    .forEach((media) => {
      try {
        media.pause();
        media.removeAttribute("src");
        media.load();
      } catch (error) {
        console.warn(
          "Impossible d’arrêter le média :",
          error
        );
      }
    });
}

function clearSession() {
  stopProtectedMedia();

  localStorage.removeItem("pcr_current_user");
  localStorage.removeItem("pcr_user_profile");
  localStorage.removeItem("pcr_access_token");
}

function goToLogin(message = "") {
  if (redirectingToLogin) {
    return;
  }

  redirectingToLogin = true;

  if (message) {
    try {
      sessionStorage.setItem(
        "pcr_session_message",
        message
      );
    } catch (error) {
      console.warn(
        "Impossible d’enregistrer le message :",
        error
      );
    }
  }

  window.location.replace(
    "/pages/auth/login.html"
  );
}

function goToHome() {
  window.location.replace("/");
}

async function verifySession() {
  if (isPublicPage) {
    document.body?.classList.remove(
      "auth-checking"
    );

    document.body?.classList.add(
      "auth-allowed"
    );

    return;
  }

  if (
    sessionCheckInProgress ||
    redirectingToLogin
  ) {
    return;
  }

  sessionCheckInProgress = true;

  try {
    let currentUser = null;

    try {
      currentUser = JSON.parse(
        localStorage.getItem(
          "pcr_current_user"
        )
      );
    } catch (error) {
      clearSession();
    }

    if (!currentUser?.id) {
      clearSession();
      goToLogin();
      return;
    }

    const deviceId =
      localStorage.getItem("pcr_device_id");

    if (!deviceId) {
      clearSession();

      goToLogin(
        "Session invalide. Veuillez vous reconnecter."
      );

      return;
    }

    const res = await fetch(
      "/api/auth/check-session",
      {
        method: "POST",

        cache: "no-store",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          userId: currentUser.id,
          deviceId
        })
      }
    );

    let result = {};

    try {
      result = await res.json();
    } catch (error) {
      result = {};
    }

    if (!res.ok || !result.valid) {
      clearSession();

      goToLogin(
        result.error ||
        "Session expirée. Veuillez vous reconnecter."
      );

      return;
    }

    localStorage.setItem(
      "pcr_current_user",
      JSON.stringify(result.user)
    );

    const role = String(
      result.user.role || ""
    ).toLowerCase();

    if (
      isAdminPage &&
      role !== "admin"
    ) {
      goToHome();
      return;
    }

    document.body?.classList.remove(
      "auth-checking"
    );

    document.body?.classList.add(
      "auth-allowed"
    );

  } catch (error) {
    console.error(
      "Erreur temporaire de vérification :",
      error
    );

    /*
      Une coupure réseau temporaire ne doit pas
      déconnecter l’utilisateur ni supprimer sa session.
    */
    document.body?.classList.remove(
      "auth-checking"
    );

    document.body?.classList.add(
      "auth-allowed"
    );

  } finally {
    sessionCheckInProgress = false;
  }
}

verifySession();

if (!isPublicPage) {
  window.setInterval(() => {
    if (!document.hidden) {
      verifySession();
    }
  }, SESSION_CHECK_INTERVAL_MS);

  window.addEventListener(
    "focus",
    verifySession
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        verifySession();
      }
    }
  );
}