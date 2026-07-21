/* =========================================================
   PCR — MENU MOBILE GLOBAL
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("pcr-mobile-menu-button")) {
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    #pcr-mobile-menu-button {
      position: fixed;
      right: 18px;
      bottom: 24px;
      z-index: 99998;

      width: 62px;
      height: 62px;

      display: flex;
      align-items: center;
      justify-content: center;

      border: 1px solid rgba(255, 215, 0, 0.55);
      border-radius: 22px;

      background:
        linear-gradient(
          145deg,
          rgba(32, 35, 45, 0.98),
          rgba(8, 10, 18, 0.98)
        );

      box-shadow:
        0 14px 40px rgba(0, 0, 0, 0.55),
        0 0 25px rgba(255, 215, 0, 0.18);

      color: #ffd500;
      font-size: 27px;
      cursor: pointer;

      -webkit-tap-highlight-color: transparent;
    }

    #pcr-mobile-menu-button:active {
      transform: scale(0.94);
    }

    #pcr-mobile-menu-overlay {
      position: fixed;
      inset: 0;
      z-index: 99996;

      visibility: hidden;
      opacity: 0;

      background: rgba(0, 0, 0, 0.68);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);

      transition:
        opacity 0.25s ease,
        visibility 0.25s ease;
    }

    #pcr-mobile-menu-overlay.is-open {
      visibility: visible;
      opacity: 1;
    }

    #pcr-mobile-menu-panel {
      position: fixed;
      left: 14px;
      right: 14px;
      bottom: 14px;
      z-index: 99999;

      visibility: hidden;
      opacity: 0;

      transform: translateY(35px);

      padding: 18px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;

      background:
        linear-gradient(
          145deg,
          rgba(27, 30, 42, 0.99),
          rgba(7, 9, 16, 0.99)
        );

      box-shadow:
        0 25px 80px rgba(0, 0, 0, 0.72),
        0 0 30px rgba(126, 45, 255, 0.16);

      transition:
        opacity 0.25s ease,
        transform 0.25s ease,
        visibility 0.25s ease;
    }

    #pcr-mobile-menu-panel.is-open {
      visibility: visible;
      opacity: 1;
      transform: translateY(0);
    }

    .pcr-mobile-menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      margin-bottom: 17px;
      padding: 4px 4px 14px;

      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .pcr-mobile-menu-brand {
      color: #ffd500;
      font-size: 23px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }

    .pcr-mobile-menu-close {
      width: 42px;
      height: 42px;

      display: flex;
      align-items: center;
      justify-content: center;

      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;

      background: rgba(255, 255, 255, 0.07);
      color: white;

      font-size: 21px;
      cursor: pointer;
    }

    .pcr-mobile-menu-links {
      display: grid;
      gap: 10px;
    }

    .pcr-mobile-menu-link {
      width: 100%;
      min-height: 58px;

      display: flex;
      align-items: center;
      gap: 14px;

      padding: 13px 16px;

      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;

      background: rgba(255, 255, 255, 0.055);
      color: white;

      font-family: inherit;
      font-size: 17px;
      font-weight: 750;
      text-decoration: none;
      text-align: left;
      cursor: pointer;
    }

    .pcr-mobile-menu-link:active {
      transform: scale(0.98);
    }

    .pcr-mobile-menu-icon {
      width: 34px;
      flex: 0 0 34px;
      text-align: center;
      font-size: 23px;
    }

    .pcr-mobile-menu-logout {
      margin-top: 5px;

      border-color: rgba(255, 71, 87, 0.35);
      background: rgba(255, 71, 87, 0.1);
      color: #ff8c98;
    }

    @media screen and (min-width: 769px) {
      #pcr-mobile-menu-button,
      #pcr-mobile-menu-overlay,
      #pcr-mobile-menu-panel {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "pcr-mobile-menu-overlay";

  const menuButton = document.createElement("button");
  menuButton.id = "pcr-mobile-menu-button";
  menuButton.type = "button";
  menuButton.setAttribute("aria-label", "Ouvrir le menu");
  menuButton.innerHTML = "☰";

  const panel = document.createElement("aside");
  panel.id = "pcr-mobile-menu-panel";

  panel.innerHTML = `
    <div class="pcr-mobile-menu-header">
      <div class="pcr-mobile-menu-brand">🧬 PCR</div>

      <button
        type="button"
        class="pcr-mobile-menu-close"
        aria-label="Fermer le menu"
      >
        ✕
      </button>
    </div>

    <div class="pcr-mobile-menu-links">
      <a class="pcr-mobile-menu-link" href="/">
        <span class="pcr-mobile-menu-icon">🏠</span>
        <span>Accueil</span>
      </a>

      <a
        class="pcr-mobile-menu-link"
        href="/pages/dashboard/dashboard.html"
      >
        <span class="pcr-mobile-menu-icon">📊</span>
        <span>Dashboard</span>
      </a>

      <a
  class="pcr-mobile-menu-link"
  href="/pages/profile/profile.html"
>
  <span class="pcr-mobile-menu-icon">👤</span>
  <span>Mon profil</span>
</a>

      <a
        class="pcr-mobile-menu-link"
        href="/pages/favoris/favoris.html"
      >
        <span class="pcr-mobile-menu-icon">⭐</span>
        <span>Favoris</span>
      </a>

      <button
        type="button"
        class="pcr-mobile-menu-link pcr-mobile-menu-logout"
        id="pcr-mobile-logout"
      >
        <span class="pcr-mobile-menu-icon">🚪</span>
        <span>Déconnexion</span>
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(menuButton);
  document.body.appendChild(panel);

  const closeButton = panel.querySelector(".pcr-mobile-menu-close");
  const logoutButton = panel.querySelector("#pcr-mobile-logout");

  function openMenu() {
    overlay.classList.add("is-open");
    panel.classList.add("is-open");
    menuButton.style.visibility = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    overlay.classList.remove("is-open");
    panel.classList.remove("is-open");
    menuButton.style.visibility = "visible";
    document.body.style.overflow = "";
  }

  function removeAuthenticationData() {
    /*
      نحذف معلومات تسجيل الدخول فقط.
      لا نحذف progression ولا favoris.
    */

    const localStorageKeys = [
      "currentUser",
      "loggedUser",
      "loggedInUser",
      "authUser",
      "pcrUser",
      "pcr_user",
      "userSession",
      "authToken",
      "token",
      "accessToken"
    ];

    const sessionStorageKeys = [
      "currentUser",
      "loggedUser",
      "loggedInUser",
      "authUser",
      "pcrUser",
      "pcr_user",
      "userSession",
      "authToken",
      "token",
      "accessToken"
    ];

    localStorageKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    sessionStorageKeys.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  }
  async function logout() {
    let currentUser = null;

    const storages = [
      localStorage,
      sessionStorage
    ];

    /*
      البحث عن المستخدم في جميع بيانات المتصفح،
      مهما كان اسم المفتاح المستعمل في login.js
    */
    for (const storage of storages) {
      for (
        let index = 0;
        index < storage.length;
        index += 1
      ) {
        const key = storage.key(index);

        if (!key) continue;

        const rawValue = storage.getItem(key);

        if (!rawValue) continue;

        try {
          const parsedValue = JSON.parse(rawValue);

          const candidates = [
            parsedValue,
            parsedValue?.user,
            parsedValue?.currentUser,
            parsedValue?.data?.user
          ];

          const matchedUser = candidates.find(candidate =>
            candidate &&
            typeof candidate === "object" &&
            (
              candidate.id ||
              candidate.email
            )
          );

          if (matchedUser) {
            currentUser = matchedUser;
            break;
          }
        } catch (error) {
          // Valeur non JSON : on continue.
        }
      }

      if (currentUser) {
        break;
      }
    }

    if (!currentUser?.id && !currentUser?.email) {
      alert(
        "Session utilisateur introuvable. Rechargez la page puis réessayez."
      );

      return;
    }

    try {
      const response = await fetch(
        "/api/auth/logout",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            userId: currentUser.id || null,
            email: currentUser.email || ""
          })
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
          "La déconnexion du serveur a échoué."
        );
      }

      /*
        نمسح بيانات المصادقة فقط بعد نجاح Logout في السيرفر.
        Favoris وProgression يبقاو محفوظين.
      */
      const authenticationKeys = [
        "currentUser",
        "loggedUser",
        "loggedInUser",
        "authUser",
        "pcrUser",
        "pcr_user",
        "userSession",
        "user",
        "deviceId",
        "pcrDeviceId",
        "pcr_device_id",
        "authToken",
        "token",
        "accessToken"
      ];

      authenticationKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      window.location.replace(
        "/pages/auth/login.html"
      );
    } catch (error) {
      console.error(
        "Erreur logout serveur:",
        error
      );

      alert(
        error.message ||
        "Impossible de fermer la session."
      );
    }
  }

   menuButton.addEventListener("click", openMenu);
  closeButton.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);
  logoutButton.addEventListener("click", logout);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
});