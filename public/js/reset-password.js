const resetPasswordForm =
  document.getElementById(
    "resetPasswordForm"
  );

const newPassword =
  document.getElementById(
    "newPassword"
  );

const confirmPassword =
  document.getElementById(
    "confirmPassword"
  );

const resetPasswordBtn =
  document.getElementById(
    "resetPasswordBtn"
  );

const resetLoading =
  document.getElementById(
    "resetLoading"
  );

const resetMessage =
  document.getElementById(
    "resetMessage"
  );

const params =
  new URLSearchParams(
    window.location.search
  );

const resetToken =
  params.get("token") || "";

function showResetMessage(
  message,
  type
) {
  resetMessage.textContent =
    message;

  resetMessage.className =
    `auth-message ${type}`;
}

function setResetLoading(
  isLoading
) {
  resetPasswordBtn.disabled =
    isLoading;

  resetPasswordBtn.textContent =
    isLoading
      ? "Modification..."
      : "Modifier le mot de passe";
}

async function validateResetLink() {
  if (!resetToken) {
    resetLoading.className =
      "auth-message error";

    resetLoading.textContent =
      "Lien de réinitialisation invalide.";

    return;
  }

  try {
    const response = await fetch(
      `/api/auth/reset-password/validate?token=${
        encodeURIComponent(
          resetToken
        )
      }`
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.valid
    ) {
      throw new Error(
        result.error ||
        "Ce lien est invalide ou a expiré."
      );
    }

    resetLoading.classList.add(
      "hidden"
    );

    resetPasswordForm.classList.remove(
      "hidden"
    );

    newPassword.focus();

  } catch (error) {
    resetLoading.className =
      "auth-message error";

    resetLoading.textContent =
      error.message;
  }
}

resetPasswordForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const password =
      newPassword.value;

    const confirmation =
      confirmPassword.value;

    if (password.length < 8) {
      showResetMessage(
        "Le mot de passe doit contenir au moins 8 caractères.",
        "error"
      );

      return;
    }

    if (
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      showResetMessage(
        "Ajoutez au moins une lettre et un chiffre.",
        "error"
      );

      return;
    }

    if (
      password !==
      confirmation
    ) {
      showResetMessage(
        "Les mots de passe ne correspondent pas.",
        "error"
      );

      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch(
        "/api/auth/reset-password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            token: resetToken,
            password,
            confirmPassword:
              confirmation
          })
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Modification impossible."
        );
      }

      resetPasswordForm.classList.add(
        "hidden"
      );

      showResetMessage(
        result.message,
        "success"
      );

      window.setTimeout(
        () => {
          window.location.replace(
            "/pages/auth/login.html"
          );
        },
        2500
      );

    } catch (error) {
      console.error(
        "Erreur reset password:",
        error
      );

      showResetMessage(
        error.message ||
        "Une erreur est survenue.",
        "error"
      );

      setResetLoading(false);
    }
  }
);

validateResetLink();