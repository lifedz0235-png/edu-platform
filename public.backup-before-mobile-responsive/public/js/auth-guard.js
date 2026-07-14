const currentPath = window.location.pathname;

const publicPages = [
  "/pages/auth/login.html",
  "/pages/auth/register.html"
];

const isPublicPage = publicPages.includes(currentPath);
const isAdminPage = currentPath.includes("/pages/admin/");

function clearSession() {
  localStorage.removeItem("pcr_current_user");
  localStorage.removeItem("pcr_user_profile");
}

function goToLogin() {
  window.location.replace("/pages/auth/login.html");
}

function goToHome() {
  window.location.replace("/");
}

async function verifySession() {
  if (isPublicPage) {
    document.body?.classList.remove("auth-checking");
    document.body?.classList.add("auth-allowed");
    return;
  }

  let currentUser = null;

  try {
    currentUser = JSON.parse(
      localStorage.getItem("pcr_current_user")
    );
  } catch (error) {
    clearSession();
  }

  if (!currentUser) {
    goToLogin();
    return;
  }

  const deviceId = localStorage.getItem("pcr_device_id");

  try {
    const res = await fetch("/api/auth/check-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        deviceId
      })
    });

    const result = await res.json();

    if (!res.ok || !result.valid) {
      clearSession();
      alert(result.error || "Session expirée.");
      goToLogin();
      return;
    }

    localStorage.setItem(
      "pcr_current_user",
      JSON.stringify(result.user)
    );

    const role = String(result.user.role || "").toLowerCase();

    if (isAdminPage && role !== "admin") {
      alert("Accès réservé à l’administrateur.");
      goToHome();
      return;
    }

    document.body?.classList.remove("auth-checking");
    document.body?.classList.add("auth-allowed");

  } catch (error) {
    console.error("Erreur de session :", error);
    clearSession();
    alert("Impossible de vérifier votre session.");
    goToLogin();
  }
}

verifySession();