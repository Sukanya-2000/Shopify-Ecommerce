(function () {
  const apiBase = "http://localhost:5000/api";
  const tokenKey = "cybernest_token";
  const userKey = "cybernest_user";
  const defaultCurrencySettings = { currency: "USD", currencyRate: 1, baseCurrency: "USD" };
  let currencySettings = defaultCurrencySettings;
  let settingsPromise = null;

  const loadSettings = async () => {
    if (settingsPromise) return settingsPromise;
    settingsPromise = fetch(`${apiBase}/settings`)
      .then((response) => (response.ok ? response.json() : defaultCurrencySettings))
      .then((settings) => {
        currencySettings = { ...defaultCurrencySettings, ...settings };
        window.dispatchEvent(new CustomEvent("cybernest:settings", { detail: currencySettings }));
        return currencySettings;
      })
      .catch(() => currencySettings);
    return settingsPromise;
  };

  const money = (value) => {
    const currency = currencySettings.currency || defaultCurrencySettings.currency;
    const rate = Number(currencySettings.currencyRate || defaultCurrencySettings.currencyRate);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(Number(value || 0) * rate);
  };

  const readToken = () => localStorage.getItem(tokenKey);
  const readUser = () => {
    try {
      return JSON.parse(localStorage.getItem(userKey) || "null");
    } catch (_error) {
      return null;
    }
  };

  const setSession = (payload) => {
    localStorage.setItem(tokenKey, payload.token);
    localStorage.setItem(userKey, JSON.stringify(payload.user));
    window.dispatchEvent(new CustomEvent("cybernest:auth", { detail: payload.user }));
  };

  const clearSession = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    window.dispatchEvent(new CustomEvent("cybernest:logout"));
  };

  const updateHeader = () => {
    const user = readUser();
    document.querySelectorAll("[data-account-greeting]").forEach((node) => {
      node.textContent = user ? `Hi, ${user.name || "Customer"}` : "";
      node.hidden = !user;
    });
    document.querySelectorAll("[data-account-logout]").forEach((button) => {
      button.hidden = !user;
    });
    document.querySelectorAll("[data-account-label]").forEach((link) => {
      link.textContent = user ? "Account" : "Login";
    });
  };

  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${apiBase}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Request failed");
    return payload;
  }

  function modal() {
    let node = document.querySelector("[data-account-modal]");
    if (node) return node;
    node = document.createElement("div");
    node.className = "account-modal";
    node.dataset.accountModal = "";
    node.hidden = true;
    node.innerHTML = `
      <div class="account-modal__panel">
        <button class="account-modal__close" type="button" data-account-close aria-label="Close">x</button>
        <h2 data-account-title>Login required</h2>
        <p class="account-modal__message">Log in or create an account to use cart and wishlist.</p>
        <div class="account-modal__tabs" role="tablist" aria-label="Account mode">
          <button class="account-modal__tab is-active" type="button" data-account-tab="login">Login</button>
          <button class="account-modal__tab" type="button" data-account-tab="register">Signup</button>
        </div>
        <form class="account-modal__form" data-account-form>
          <input class="input" name="name" placeholder="Name" data-account-name hidden>
          <input class="input" name="email" type="email" placeholder="Email" required>
          <input class="input" name="password" type="password" placeholder="Password" required>
          <button class="btn btn--sm" type="submit" data-account-submit>Login</button>
          <p class="account-modal__error" data-account-error hidden></p>
        </form>
      </div>
    `;
    document.body.appendChild(node);
    let mode = "login";
    const setMode = (nextMode) => {
      mode = nextMode;
      const isSignup = mode === "register";
      node.querySelector("[data-account-title]").textContent = isSignup ? "Create account" : "Login required";
      node.querySelector("[data-account-name]").hidden = !isSignup;
      node.querySelector("[data-account-name]").required = isSignup;
      node.querySelector("[data-account-submit]").textContent = isSignup ? "Signup" : "Login";
      node.querySelectorAll("[data-account-tab]").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.accountTab === mode);
      });
    };
    node.addEventListener("click", async (event) => {
      if (event.target === node || event.target.closest("[data-account-close]")) node.hidden = true;
      const tab = event.target.closest("[data-account-tab]");
      if (tab) setMode(tab.dataset.accountTab);
    });
    node.querySelector("[data-account-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const error = node.querySelector("[data-account-error]");
      error.hidden = true;
      try {
        const payload = await request(`/auth/${mode}`, {
          method: "POST",
          body: JSON.stringify({
            name: form.get("name") || "CyberNest Customer",
            email: form.get("email"),
            password: form.get("password")
          })
        });
        setSession(payload);
        node.hidden = true;
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
      }
    });
    return node;
  }

  function requireLogin() {
    if (readToken()) return Promise.resolve(readUser());
    const node = modal();
    node.hidden = false;
    return new Promise((resolve) => {
      const done = (event) => {
        window.removeEventListener("cybernest:auth", done);
        resolve(event.detail);
      };
      window.addEventListener("cybernest:auth", done);
    });
  }

  window.CyberNestMoney = {
    loadSettings,
    money,
    settings: () => currencySettings
  };

  window.CyberNestAccount = {
    apiBase,
    clearSession,
    request,
    requireLogin,
    setSession,
    token: readToken,
    updateHeader,
    user: readUser
  };

  document.addEventListener("click", (event) => {
    const logout = event.target.closest("[data-account-logout]");
    if (!logout) return;
    clearSession();
  });

  document.addEventListener("DOMContentLoaded", () => { loadSettings(); updateHeader(); });
  window.addEventListener("cybernest:auth", updateHeader);
  window.addEventListener("cybernest:logout", updateHeader);
})();


