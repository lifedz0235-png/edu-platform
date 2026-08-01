document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const loginBtn = document.getElementById("loginBtn");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!loginBtn || !emailInput || !passwordInput) {
    console.error("Champs de connexion introuvables.");
    return;
  }

  let loginInProgress = false;

  function getDeviceId() {
    let deviceId =
      localStorage.getItem("pcr_device_id");

    if (!deviceId) {
      deviceId =
        "device-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2);

      localStorage.setItem(
        "pcr_device_id",
        deviceId
      );
    }

    return deviceId;
  }

  function showLoginMessage(message, type = "error") {
    let box =
      document.getElementById("loginMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "loginMessage";

      loginBtn.parentElement?.insertBefore(
        box,
        loginBtn
      );
    }

    box.textContent = message;
    box.style.display = "block";
    box.style.margin = "12px 0";
    box.style.padding = "11px 13px";
    box.style.borderRadius = "12px";
    box.style.fontSize = "14px";
    box.style.textAlign = "center";

    if (type === "success") {
      box.style.color = "#bbf7d0";
      box.style.background =
        "rgba(34, 197, 94, 0.12)";
      box.style.border =
        "1px solid rgba(34, 197, 94, 0.4)";
      return;
    }

    if (type === "info") {
      box.style.color = "#bfdbfe";
      box.style.background =
        "rgba(59, 130, 246, 0.12)";
      box.style.border =
        "1px solid rgba(59, 130, 246, 0.4)";
      return;
    }

    box.style.color = "#fecaca";
    box.style.background =
      "rgba(239, 68, 68, 0.12)";
    box.style.border =
      "1px solid rgba(239, 68, 68, 0.4)";
  }

  async function handleLogin(event) {
    event?.preventDefault();

    if (loginInProgress) {
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showLoginMessage(
        "Veuillez saisir votre e-mail et votre mot de passe."
      );
      return;
    }

    loginInProgress = true;
    loginBtn.disabled = true;

    const originalText = loginBtn.textContent;
    loginBtn.textContent = "Connexion en cours…";

    showLoginMessage(
      "Vérification de votre compte…",
      "info"
    );

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password,
            deviceId: getDeviceId()
          })
        }
      );

      const responseText = await response.text();
      let result = {};

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        result = {
          error: "Réponse serveur invalide."
        };
      }

      if (!response.ok) {
        throw new Error(
          result.error || "Connexion impossible."
        );
      }

      if (!result.user?.id) {
        throw new Error(
          "Informations utilisateur manquantes."
        );
      }

      localStorage.setItem(
        "pcr_current_user",
        JSON.stringify(result.user)
      );

      if (result.accessToken) {
        localStorage.setItem(
          "pcr_access_token",
          result.accessToken
        );
      } else {
        localStorage.removeItem(
          "pcr_access_token"
        );
      }

      localStorage.setItem(
        "pcr_user_profile",
        JSON.stringify({
          name: result.user.name || "",
          role:
            result.user.role === "admin"
              ? "Admin"
              : "Étudiant",
          bio: "",
          promotion: ""
        })
      );

      showLoginMessage(
        "Connexion réussie. Ouverture de la plateforme…",
        "success"
      );

      window.location.replace("/");
    } catch (error) {
      console.error("Erreur connexion:", error);

      showLoginMessage(
        error.message ||
        "Impossible de vous connecter."
      );

      loginInProgress = false;
      loginBtn.disabled = false;
      loginBtn.textContent = originalText;
    }
  }

  loginBtn.addEventListener("click", handleLogin);

  if (form) {
    form.addEventListener("submit", handleLogin);
  }
});
