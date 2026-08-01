(() => {
  "use strict";

  const ALLOWED_MODULES = [
    {
      category: "biologie",
      module: "genetique",
      label: "Génétique"
    },
    {
      category: "chirurgie",
      module: "cci",
      label: "CCI"
    },
    {
      category: "medicale",
      module: "medecine-travail",
      label: "Médecine du travail"
    }
  ];

  let currentState = null;
  let bannerTimer = null;

  function readUser() {
    try {
      return JSON.parse(
        localStorage.getItem(
          "pcr_current_user"
        ) || "null"
      );
    } catch {
      return null;
    }
  }

  function writeUserPatch(patch) {
    const user = readUser();

    if (!user) {
      return;
    }

    localStorage.setItem(
      "pcr_current_user",
      JSON.stringify({
        ...user,
        ...patch
      })
    );
  }

  function localFallbackState() {
    const user = readUser();

    if (!user) {
      return null;
    }

    const role = String(
      user.role || ""
    ).toLowerCase();

    if (role === "admin") {
      return {
        accessMode: "admin",
        hasFullAccess: true,
        trialActive: false,
        trialExpired: false,
        trialStatus: "unlimited",
        trialStartDate: null,
        trialEndDate: null,
        trialRemainingMs: null,
        allowedTrialModules:
          ALLOWED_MODULES
      };
    }

    if (user.hasFullAccess === true) {
      return {
        accessMode:
          user.accessMode || "paid",
        hasFullAccess: true,
        trialActive: false,
        trialExpired: false,
        trialStatus:
          user.trialStatus || "converted",
        trialStartDate:
          user.trialStartDate || null,
        trialEndDate:
          user.trialEndDate || null,
        trialRemainingMs: null,
        allowedTrialModules:
          ALLOWED_MODULES
      };
    }

    const endTime = new Date(
      user.trialEndDate || ""
    ).getTime();

    const remaining =
      Number.isFinite(endTime)
        ? Math.max(
            0,
            endTime - Date.now()
          )
        : null;

    return {
      accessMode:
        remaining > 0
          ? "trial_active"
          : (
              remaining === 0
                ? "trial_expired"
                : (
                    user.accessMode ||
                    "trial_pending"
                  )
            ),

      hasFullAccess: false,
      trialActive: remaining > 0,
      trialExpired: remaining === 0,
      trialStatus:
        remaining > 0
          ? "active"
          : (
              remaining === 0
                ? "expired"
                : (
                    user.trialStatus ||
                    "pending"
                  )
            ),

      trialStartDate:
        user.trialStartDate || null,

      trialEndDate:
        user.trialEndDate || null,

      trialRemainingMs: remaining,

      allowedTrialModules:
        user.allowedTrialModules ||
        ALLOWED_MODULES
    };
  }

  async function fetchState() {
    const user = readUser();

    if (!user?.id) {
      return null;
    }

    const deviceId =
      localStorage.getItem(
        "pcr_device_id"
      ) || "";

    const token =
      localStorage.getItem(
        "pcr_access_token"
      ) || "";

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const response = await fetch(
      "/api/trial/access",
      {
        method: "POST",
        headers,
        cache: "no-store",

        body: JSON.stringify({
          userId: user.id,
          deviceId
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Impossible de vérifier l’accès."
      );
    }

    writeUserPatch({
      accessMode: result.accessMode,
      hasFullAccess:
        result.hasFullAccess,
      trialActive:
        result.trialActive,
      trialExpired:
        result.trialExpired,
      trialStatus:
        result.trialStatus,
      trialStartDate:
        result.trialStartDate,
      trialEndDate:
        result.trialEndDate,
      trialRemainingMs:
        result.trialRemainingMs,
      allowedTrialModules:
        result.allowedTrialModules
    });

    return result;
  }

  function allowedKeySet() {
    const modules =
      currentState
        ?.allowedTrialModules ||
      ALLOWED_MODULES;

    return new Set(
      modules.map(
        item =>
          `${item.category}:${item.module}`
      )
    );
  }

  function hasFullAccess() {
    return Boolean(
      currentState?.hasFullAccess
    );
  }

  function isTrialActive() {
    if (
      currentState?.accessMode !==
      "trial_active"
    ) {
      return false;
    }

    const endTime = new Date(
      currentState.trialEndDate || ""
    ).getTime();

    return (
      Number.isFinite(endTime) &&
      endTime > Date.now()
    );
  }

  function isTrialExpired() {
    if (hasFullAccess()) {
      return false;
    }

    const endTime = new Date(
      currentState?.trialEndDate || ""
    ).getTime();

    return (
      currentState?.accessMode ===
        "trial_expired" ||
      (
        Number.isFinite(endTime) &&
        endTime <= Date.now()
      )
    );
  }

  function isModuleAllowed(
    category,
    moduleName
  ) {
    if (hasFullAccess()) {
      return true;
    }

    if (!isTrialActive()) {
      return false;
    }

    return allowedKeySet().has(
      `${category}:${moduleName}`
    );
  }

  function formatRemaining(ms) {
    const safe = Math.max(
      0,
      Number(ms || 0)
    );

    const totalSeconds =
      Math.floor(safe / 1000);

    const hours =
      Math.floor(totalSeconds / 3600);

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      totalSeconds % 60;

    return (
      `${hours} h ` +
      `${String(minutes).padStart(2, "0")} min ` +
      `${String(seconds).padStart(2, "0")} s`
    );
  }

  function ensureBanner() {
    let banner =
      document.getElementById(
        "pcrTrialBanner"
      );

    if (banner) {
      return banner;
    }

    banner =
      document.createElement(
        "section"
      );

    banner.id = "pcrTrialBanner";
    banner.className =
      "pcr-trial-banner";

    banner.innerHTML = `
      <div class="pcr-trial-banner__icon">
        🎁
      </div>

      <div class="pcr-trial-banner__content">
        <strong id="pcrTrialTitle"></strong>
        <span id="pcrTrialMessage"></span>
      </div>

      <a
        class="pcr-trial-banner__action"
        href="https://wa.me/213771739206?text=Bonjour%20PCR%2C%20je%20souhaite%20activer%20mon%20abonnement."
        target="_blank"
        rel="noopener noreferrer"
      >
        S’abonner
      </a>
    `;

    document.body.prepend(banner);

    return banner;
  }

  function updateBanner() {
    if (
      !currentState ||
      hasFullAccess()
    ) {
      document
        .getElementById(
          "pcrTrialBanner"
        )
        ?.remove();

      return;
    }

    const banner = ensureBanner();

    const title =
      banner.querySelector(
        "#pcrTrialTitle"
      );

    const message =
      banner.querySelector(
        "#pcrTrialMessage"
      );

    if (isTrialActive()) {
      const remaining =
        new Date(
          currentState.trialEndDate
        ).getTime() -
        Date.now();

      title.textContent =
        "Essai gratuit 48 h";

      message.textContent =
        `${formatRemaining(remaining)} restantes — ` +
        "Génétique, CCI et Médecine du travail.";

      banner.classList.remove(
        "is-expired"
      );

      if (remaining <= 0) {
        currentState = {
          ...currentState,
          accessMode: "trial_expired",
          trialActive: false,
          trialExpired: true,
          trialStatus: "expired",
          trialRemainingMs: 0
        };

        writeUserPatch(currentState);
        location.reload();
      }

      return;
    }

    title.textContent =
      "Essai gratuit terminé";

    message.textContent =
      "Les contenus sont verrouillés. Activez un abonnement pour continuer.";

    banner.classList.add(
      "is-expired"
    );
  }

  function showBlockedOverlay() {
    if (
      document.getElementById(
        "pcrTrialBlockedOverlay"
      )
    ) {
      return;
    }

    const video =
      document.querySelector("video");

    if (video) {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}
    }

    const message =
      isTrialActive()
        ? (
            "Ce module n’est pas inclus dans l’essai gratuit. " +
            "Modules ouverts : Génétique, CCI et Médecine du travail."
          )
        : (
            "Votre essai gratuit de 48 heures est terminé. " +
            "Votre compte reste accessible."
          );

    const overlay =
      document.createElement("div");

    overlay.id =
      "pcrTrialBlockedOverlay";

    overlay.className =
      "pcr-trial-overlay";

    overlay.innerHTML = `
      <div class="pcr-trial-overlay__card">
        <div class="pcr-trial-overlay__lock">
          🔒
        </div>

        <h2>Accès verrouillé</h2>
        <p>${message}</p>

        <div class="pcr-trial-overlay__actions">
          <a href="/">
            Retour à l’accueil
          </a>

          <a
            class="is-gold"
            href="https://wa.me/213771739206?text=Bonjour%20PCR%2C%20je%20souhaite%20activer%20mon%20abonnement."
            target="_blank"
            rel="noopener noreferrer"
          >
            Activer mon abonnement
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(
      overlay
    );
  }

  function pageTarget() {
    const params =
      new URLSearchParams(
        location.search
      );

    return {
      path: location.pathname,
      category:
        params.get("category"),
      module:
        params.get("module")
    };
  }

  function protectCurrentPage() {
    const target = pageTarget();

    if (
      target.path ===
        "/pages/cours/player.html" ||
      target.path ===
        "/pages/qcm/module-qcm.html"
    ) {
      if (
        !isModuleAllowed(
          target.category,
          target.module
        )
      ) {
        showBlockedOverlay();
      }

      return;
    }

    if (
      target.path.includes(
        "/pages/qcm/"
      )
    ) {
      if (!hasFullAccess()) {
        showBlockedOverlay();
      }
    }
  }

  function decorateModuleCard(card) {
    const link =
      card.querySelector(
        "a.module-course-btn"
      );

    if (!link) {
      return;
    }

    let url;

    try {
      url = new URL(
        link.getAttribute("href"),
        location.origin
      );
    } catch {
      return;
    }

    const category =
      url.searchParams.get(
        "category"
      );

    const moduleName =
      url.searchParams.get(
        "module"
      );

    const allowed =
      isModuleAllowed(
        category,
        moduleName
      );

    card.classList.toggle(
      "pcr-trial-module-locked",
      !allowed
    );

    card.classList.toggle(
      "pcr-trial-module-open",
      allowed &&
      isTrialActive()
    );

    card
      .querySelector(
        ".pcr-trial-card-badge"
      )
      ?.remove();

    if (
      hasFullAccess()
    ) {
      return;
    }

    const badge =
      document.createElement("span");

    badge.className =
      "pcr-trial-card-badge";

    badge.textContent =
      allowed
        ? "🎁 Essai gratuit"
        : "🔒 Abonnement requis";

    card.appendChild(badge);

    if (!allowed) {
      link.textContent =
        "🔒 Module verrouillé";

      link.setAttribute(
        "aria-disabled",
        "true"
      );

      const qcm =
        card.querySelector(
          ".module-qcm-btn"
        );

      if (qcm) {
        qcm.textContent =
          "🔒 Banque QCM";

        qcm.classList.add(
          "locked"
        );
      }
    }
  }

  function decorateModuleCards() {
    document
      .querySelectorAll(
        "#modulesList .module-card"
      )
      .forEach(
        decorateModuleCard
      );
  }

  function watchModuleCards() {
    const list =
      document.getElementById(
        "modulesList"
      );

    if (!list) {
      return;
    }

    new MutationObserver(
      decorateModuleCards
    ).observe(
      list,
      {
        childList: true,
        subtree: false
      }
    );

    decorateModuleCards();
  }

  function installClickGuard() {
    document.addEventListener(
      "click",
      event => {
        const lockedCard =
          event.target.closest(
            ".pcr-trial-module-locked"
          );

        if (lockedCard) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          showBlockedOverlay();
          return;
        }

        const anchor =
          event.target.closest(
            "a[href]"
          );

        if (!anchor) {
          return;
        }

        let url;

        try {
          url = new URL(
            anchor.getAttribute("href"),
            location.origin
          );
        } catch {
          return;
        }

        if (
          url.pathname ===
            "/pages/cours/player.html" ||
          url.pathname ===
            "/pages/qcm/module-qcm.html"
        ) {
          const category =
            url.searchParams.get(
              "category"
            );

          const moduleName =
            url.searchParams.get(
              "module"
            );

          if (
            !isModuleAllowed(
              category,
              moduleName
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            showBlockedOverlay();
          }
        }
      },
      true
    );
  }

  async function initialize() {
    try {
      currentState =
        await fetchState();
    } catch (error) {
      console.error(
        "Erreur contrôle essai gratuit:",
        error
      );

      currentState =
        localFallbackState();
    }

    if (!currentState) {
      return null;
    }

    const api = {
      getState: () => ({
        ...currentState
      }),

      hasFullAccess,
      isTrialActive,
      isTrialExpired,
      isModuleAllowed,
      showBlockedOverlay
    };

    window.PCRTrialAccess = api;

    const runUi = () => {
      updateBanner();
      protectCurrentPage();
      watchModuleCards();
      installClickGuard();

      if (!bannerTimer) {
        bannerTimer =
          setInterval(
            updateBanner,
            1000
          );
      }
    };

    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        runUi,
        { once: true }
      );
    } else {
      runUi();
    }

    return api;
  }

  window.PCRTrialReady =
    initialize();
})();
