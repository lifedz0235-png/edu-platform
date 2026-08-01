(() => {
  "use strict";

  document.addEventListener(
    "click",
    async event => {
      const button = event.target.closest(
        "#logoutBtn, .logout-btn, [data-logout]"
      );

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (window.__pcrLogoutRunning) return;
      window.__pcrLogoutRunning = true;

      let user = null;

      try {
        user = JSON.parse(
          localStorage.getItem("pcr_current_user") || "null"
        );
      } catch {}

      const deviceId =
        localStorage.getItem("pcr_device_id") || "";

      localStorage.removeItem("pcr_current_user");
      localStorage.removeItem("pcr_user_profile");
      localStorage.removeItem("pcr_access_token");

      try {
        if (user?.id && deviceId) {
          await fetch("/api/auth/logout-device", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userId: user.id,
              deviceId
            }),
            keepalive: true
          });
        }
      } catch (error) {
        console.warn("Déconnexion serveur incomplète:", error);
      }

      location.replace("/pages/auth/login.html");
    },
    true
  );
})();
