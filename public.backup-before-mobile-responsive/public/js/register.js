document.addEventListener("DOMContentLoaded", () => {
  const registerBtn =
    document.getElementById("registerBtn");

  if (!registerBtn) {
    console.error(
      "Bouton registerBtn introuvable."
    );
    return;
  }

  registerBtn.addEventListener(
    "click",
    async event => {
      event.preventDefault();

      const selectedPlan =
        document.querySelector(
          'input[name="subscriptionPlan"]:checked'
        );

      const data = {
        name:
          document
            .getElementById("name")
            ?.value.trim() || "",

        email:
          document
            .getElementById("email")
            ?.value.trim()
            .toLowerCase() || "",

        password:
          document
            .getElementById("password")
            ?.value.trim() || "",

        phone:
          document
            .getElementById("phone")
            ?.value.trim() || "",

        university:
          document
            .getElementById("university")
            ?.value.trim() || "",

        promotion:
          document
            .getElementById("promotion")
            ?.value.trim() || "",

        plan: selectedPlan?.value || ""
      };

      console.log(
        "Données envoyées :",
        data
      );

      if (
  !data.name ||
  !data.email ||
  !data.password ||
  !data.phone ||
  !data.university ||
  !data.promotion
) {
  alert(
    "Veuillez remplir tous les champs obligatoires."
  );

  return;
}

if (!data.plan) {
  alert(
    "Veuillez choisir Pack Platinum ou Pack Gold."
  );

  return;
}

      if (!data.plan) {
        alert(
          "Veuillez choisir Pack Platinum ou Pack Gold."
        );
        return;
      }

      registerBtn.disabled = true;
      registerBtn.textContent =
        "Envoi en cours...";

      try {
        const response = await fetch(
          "/api/auth/register",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify(data)
          }
        );

        const result =
          await response.json();

        console.log(
          "Réponse serveur :",
          result
        );

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Erreur pendant la pré-inscription."
          );
        }

        alert(
          result.message ||
          "Pré-inscription envoyée."
        );

        window.location.href =
          "/pages/auth/login.html";

      } catch (error) {
        console.error(
          "Erreur inscription :",
          error
        );

        alert(error.message);

      } finally {
        registerBtn.disabled = false;
        registerBtn.textContent =
          "Envoyer la demande";
      }
    }
  );
});