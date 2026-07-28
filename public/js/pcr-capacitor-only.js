(() => {
  "use strict";

  const COMMUNITY_PATH = "/pages/community/community.html";
  const FILE_REGEX = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx)(?:$|[?#])/i;
  let started = false;

  function currentUser() {
    for (const key of ["pcr_current_user", "currentUser", "user"]) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (value?.id) return value;
      } catch (_) {}
    }
    return null;
  }

  function isNative() {
    return Boolean(
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  }

  function waitForNative(attempt = 0) {
    if (isNative()) {
      start();
      return;
    }
    if (attempt < 50) {
      setTimeout(() => waitForNative(attempt + 1), 100);
    }
  }

  function isHome() {
    return location.pathname === "/" || location.pathname.endsWith("/index.html");
  }

  function isCommunity() {
    return location.pathname.includes("/pages/community/community") ||
      Boolean(document.getElementById("postsList"));
  }

  function isPlayer() {
    return location.pathname.includes("/pages/cours/player");
  }

  async function getPosts() {
    const response = await fetch("/api/community/posts", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Community indisponible");
    const data = await response.json();
    return Array.isArray(data) ? data : (Array.isArray(data?.posts) ? data.posts : []);
  }

  function marker(item) {
    const values = [];
    const id = Number(item?.id);
    if (Number.isFinite(id)) values.push(id);
    for (const date of [item?.createdAt, item?.updatedAt, item?.date, item?.timestamp]) {
      const parsed = Date.parse(date || "");
      if (Number.isFinite(parsed)) values.push(parsed);
    }
    return values.length ? Math.max(...values) : 0;
  }

  function authorId(item) {
    return String(item?.authorId || item?.userId || item?.author?.id || "");
  }

  function flatten(items, output = []) {
    if (!Array.isArray(items)) return output;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      output.push(item);
      flatten(item.comments, output);
      flatten(item.replies, output);
      flatten(item.children, output);
    }
    return output;
  }

  function readKey() {
    return `pcr_native_community_last_seen_${String(currentUser()?.id || "guest")}`;
  }

  function latestMarker(posts) {
    return flatten(posts).reduce((max, item) => Math.max(max, marker(item)), 0);
  }

  function communityButton() {
    return document.getElementById("mobileCommunityButton") ||
      document.querySelector(".mobile-community-button") ||
      document.querySelector(`a[href="${COMMUNITY_PATH}"]`);
  }

  function badge() {
    const button = communityButton();
    if (!button) return null;
    let element = document.getElementById("pcrNativeCommunityBadge");
    if (!element) {
      element = document.createElement("span");
      element.id = "pcrNativeCommunityBadge";
      element.className = "pcr-native-community-badge";
      element.hidden = true;
      element.setAttribute("aria-label", "Nouveaux messages dans la communauté");
      button.appendChild(element);
    }
    return element;
  }

  function showBadge(count) {
    const element = badge();
    if (!element) return;
    if (!count) {
      element.hidden = true;
      element.textContent = "";
      return;
    }
    element.hidden = false;
    element.textContent = count > 99 ? "99+" : String(count);
  }

  async function markRead() {
    try {
      const posts = await getPosts();
      localStorage.setItem(readKey(), String(latestMarker(posts) || Date.now()));
    } catch (_) {
      localStorage.setItem(readKey(), String(Date.now()));
    }
    showBadge(0);
  }

  async function refreshBadge() {
    if (!isHome()) return;
    try {
      const posts = await getPosts();
      const activity = flatten(posts);
      const key = readKey();
      const lastSeen = Number(localStorage.getItem(key) || 0);
      const latest = latestMarker(posts);

      if (!lastSeen) {
        localStorage.setItem(key, String(latest || Date.now()));
        showBadge(0);
        return;
      }

      const me = String(currentUser()?.id || "");
      const count = activity.filter(item => {
        return marker(item) > lastSeen && (!me || authorId(item) !== me);
      }).length;
      showBadge(count);
    } catch (error) {
      console.warn("Badge Communauté indisponible", error);
    }
  }

  function scrollLatest(smooth = false) {
    const list = document.getElementById("postsList");
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    const last = list.lastElementChild;
    if (last) {
      last.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }
  }

  function setupCommunity() {
    if (!isCommunity()) return;
    document.body.classList.add("pcr-community-page");
    const list = document.getElementById("postsList");
    if (!list) return;

    const observer = new MutationObserver(() => scrollLatest(false));
    observer.observe(list, { childList: true, subtree: true });
    [80, 250, 700, 1400, 2200].forEach(delay => setTimeout(() => scrollLatest(false), delay));

    document.getElementById("publishBtn")?.addEventListener("click", () => {
      setTimeout(() => scrollLatest(true), 400);
      setTimeout(() => scrollLatest(true), 1000);
    });

    const composer = document.querySelector(".composer");
    const input = document.getElementById("postText") || composer?.querySelector("textarea, input[type='text']");
    if (composer && input) {
      input.addEventListener("focus", () => {
        document.body.classList.add("pcr-native-keyboard-open");
        setTimeout(() => input.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      });
      input.addEventListener("blur", () => {
        setTimeout(() => document.body.classList.remove("pcr-native-keyboard-open"), 180);
      });
    }

    markRead();
    setTimeout(markRead, 1200);
  }

  function rawFileUrl(element) {
    if (!element) return "";
    for (const attribute of ["href", "data-url", "data-file", "data-pdf", "data-download", "data-support", "data-href"]) {
      const value = element.getAttribute(attribute);
      if (value && value !== "#" && !value.startsWith("javascript:")) return value;
    }
    const onclick = element.getAttribute("onclick") || "";
    const match = onclick.match(/["']([^"']+\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx)(?:\?[^"']*)?)["']/i);
    return match ? match[1] : "";
  }

  function looksLikeSupport(element, url) {
    const text = String(element?.textContent || "").toLowerCase();
    return /\/pdfs\//i.test(url) || FILE_REGEX.test(url) || element?.hasAttribute("download") ||
      /support|document|pdf|ppt|word|télécharger|telecharger/.test(text);
  }

  async function openOutside(url) {
    const Browser = window.Capacitor?.Plugins?.Browser;
    if (Browser?.open) {
      await Browser.open({ url });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function setupDownloads() {
    if (!isPlayer()) return;
    document.addEventListener("click", async event => {
      const trigger = event.target.closest("a, button, [data-file], [data-url], [data-pdf]");
      if (!trigger) return;
      const raw = rawFileUrl(trigger);
      if (!raw || !looksLikeSupport(trigger, raw)) return;

      let file;
      try {
        file = new URL(raw, location.href);
      } catch (_) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      let finalUrl = file.href;
      if (file.origin === location.origin && file.pathname.startsWith("/pdfs/")) {
        const download = new URL("/api/native-support-download", location.origin);
        download.searchParams.set("file", file.pathname + file.search);
        finalUrl = download.href;
      }

      try {
        await openOutside(finalUrl);
      } catch (error) {
        console.error("Téléchargement impossible", error);
        location.href = finalUrl;
      }
    }, true);
  }

  function start() {
    if (started) return;
    started = true;
    document.documentElement.classList.add("pcr-native-app");
    document.body.classList.add("pcr-native-app");
    setupDownloads();
    setupCommunity();
    if (isHome()) {
      badge();
      refreshBadge();
      setInterval(refreshBadge, 20000);
      window.addEventListener("focus", refreshBadge);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") refreshBadge();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => waitForNative());
  } else {
    waitForNative();
  }
})();
