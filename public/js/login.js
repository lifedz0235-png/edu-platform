const loginForm = document.getElementById("loginForm");

const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

function getDeviceId() {
  let deviceId = localStorage.getItem(
    "pcr_device_id"
  );

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

function setLoadingState(isLoading) {
  loginBtn.disabled = isLoading;

  loginBtn.textContent = isLoading
    ? "Connexion..."
    : "Se connecter";
}

loginForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      alert("Veuillez saisir votre email.");
      emailInput.focus();
      return;
    }

    if (!password) {
      alert(
        "Veuillez saisir votre mot de passe."
      );

      passwordInput.focus();
      return;
    }

    setLoadingState(true);

    try {
      const data = {
        email,
        password,
        deviceId: getDeviceId()
      };

      const res = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(data)
        }
      );

      const contentType =
        res.headers.get("content-type") || "";

      let result = {};

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        result = await res.json();
      } else {
        const responseText =
          await res.text();

        throw new Error(
          responseText ||
          "Réponse serveur invalide."
        );
      }

      if (!res.ok) {
        throw new Error(
          result.error ||
          "Connexion impossible."
        );
      }

      if (!result.accessToken) {
  throw new Error(
    "Token de sécurité manquant."
  );
}

localStorage.setItem(
  "pcr_access_token",
  result.accessToken
);

      localStorage.setItem(
        "pcr_current_user",
        JSON.stringify(result.user)
      );

      localStorage.setItem(
        "pcr_user_profile",
        JSON.stringify({
          name:
            result.user.name ||
            "Utilisateur PCR",

          role:
            result.user.role === "admin"
              ? "Admin"
              : "Étudiant",

          photoUrl:
            result.user.photoUrl || "",

          bio:
            result.user.bio || "",

          university:
            result.user.university || "",

          promotion:
            result.user.promotion || ""
        })
      );

      window.location.replace("/");

    } catch (error) {
  console.error(
    "Erreur de connexion:",
    error
  );

  localStorage.removeItem(
    "pcr_access_token"
  );

  alert(
    error.message ||
    "Connexion impossible."
  );

} finally {
  setLoadingState(false);
}
  }
);