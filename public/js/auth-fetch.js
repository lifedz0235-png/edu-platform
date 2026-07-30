(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (
    input,
    options = {}
  ) {
    const token = localStorage.getItem(
      "pcr_access_token"
    );

    const url =
      typeof input === "string"
        ? input
        : input?.url || "";

    const isApiRequest =
      url.startsWith("/api/") ||
      url.includes("/api/");

    if (token && isApiRequest) {
      const headers = new Headers(
        options.headers ||
        (input instanceof Request
          ? input.headers
          : undefined)
      );

      headers.set(
        "Authorization",
        `Bearer ${token}`
      );

      options = {
        ...options,
        headers
      };
    }

    const response = await originalFetch(
      input,
      options
    );

    if (
      response.status === 401 &&
      isApiRequest
    ) {
      localStorage.removeItem(
        "pcr_access_token"
      );

      localStorage.removeItem(
        "pcr_current_user"
      );

      localStorage.removeItem(
        "pcr_user_profile"
      );

      if (
        !window.location.pathname.includes(
          "/pages/auth/login.html"
        )
      ) {
        window.location.replace(
          "/pages/auth/login.html"
        );
      }
    }

    return response;
  };
})();