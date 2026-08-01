const forgotPasswordForm =
  document.getElementById(
    "forgotPasswordForm"
  );

const forgotEmail =
  document.getElementById(
    "forgotEmail"
  );

const forgotPasswordBtn =
  document.getElementById(
    "forgotPasswordBtn"
  );

const forgotMessage =
  document.getElementById(
    "forgotMessage"
  );

function showForgotMessage(
  message,
  type
) {
  forgotMessage.textContent =
    message;

  forgotMessage.className =
    `auth-message ${type}`;
}

function setForgotLoading(
  isLoading
) {
  forgotPasswordBtn.disabled =
    isLoading;

  forgotPasswordBtn.textContent =
    isLoading
      ? "Envoi..."
      : "Envoyer le lien";
}

forgotPasswordForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const email =
      forgotEmail.value
        .trim()
        .toLowerCase();

    if (!email) {
      showForgotMessage(
        "Veuillez saisir votre adresse e-mail.",
        "error"
      );

      forgotEmail.focus();
      return;
    }

    setForgotLoading(true);

    forgotMessage.className =
      "auth-message hidden";

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email
          })
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      const result =
        contentType.includes(
          "application/json"
        )
          ? await response.json()
          : {
              error:
                await response.text()
            };

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Impossible d'envoyer le lien."
        );
      }

      showForgotMessage(
        result.message,
        "success"
      );

      forgotPasswordForm.reset();

    } catch (error) {
      console.error(
        "Erreur forgot password:",
        error
      );

      showForgotMessage(
        error.message ||
        "Une erreur est survenue.",
        "error"
      );

    } finally {
      setForgotLoading(false);
    }
  }
);