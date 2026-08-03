(() => {
  "use strict";

  function clearLocalSession() {
    localStorage.removeItem(
      "pcr_current_user"
    );

    localStorage.removeItem(
      "pcr_user_profile"
    );

    localStorage.removeItem(
      "pcr_access_token"
    );

    try {
      sessionStorage.removeItem(
        "pcr_session_message"
      );
    } catch (error) {
      console.warn(
        "Nettoyage sessionStorage impossible :",
        error
      );
    }
  }

  function notifyServerLogout(
    user,
    deviceId
  ) {
    if (!user?.id || !deviceId) {
      return;
    }

    /*
      keepalive permet au navigateur d’envoyer
      la requête même après la redirection.
      On ne bloque jamais l’utilisateur en attendant.
    */
    fetch(
      "/api/auth/logout-device",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          userId: user.id,
          deviceId
        }),

        keepalive: true
      }
    ).catch((error) => {
      console.warn(
        "Déconnexion serveur incomplète :",
        error
      );
    });
  }

  function performSecureLogout() {
    if (window.__pcrLogoutRunning) {
      return;
    }

    window.__pcrLogoutRunning = true;

    let user = null;

    try {
      user = JSON.parse(
        localStorage.getItem(
          "pcr_current_user"
        ) || "null"
      );
    } catch (error) {
      console.warn(
        "Session locale invalide :",
        error
      );
    }

    const deviceId =
      localStorage.getItem(
        "pcr_device_id"
      ) || "";

    clearLocalSession();
    notifyServerLogout(user, deviceId);

    window.location.replace(
      "/pages/auth/login.html"
    );
  }

  window.pcrSecureLogout =
    performSecureLogout;

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "#logoutBtn, .logout-btn, [data-logout]"
        );

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      performSecureLogout();
    },
    true
  );
})();