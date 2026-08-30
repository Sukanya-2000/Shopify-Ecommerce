(() => {
  const account = () => window.CyberNestAccount;

  const escapeHtml = (value) => {
    const element = document.createElement("span");
    element.textContent = value || "";
    return element.innerHTML;
  };

  const money = (value) => window.CyberNestMoney?.money(value) || new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));

  const image = (product) => {
    if (!product?.image?.src) return "";
    return `<img src="${product.image.src}" alt="${escapeHtml(product.image.alt || product.title)}" loading="lazy">`;
  };

  const panel = (name, title) => {
    let node = document.querySelector(`[data-${name}-panel]`);
    if (node) return node;
    node = document.createElement("div");
    node.className = "account-modal app-panel";
    const datasetKey = `${name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Panel`;
    node.dataset[datasetKey] = "";
    node.hidden = true;
    node.innerHTML = `
      <div class="account-modal__panel app-panel__panel">
        <button class="account-modal__close" type="button" data-panel-close aria-label="Close">x</button>
        <h2>${title}</h2>
        <div data-panel-content></div>
      </div>
    `;
    document.body.appendChild(node);
    node.addEventListener("click", (event) => {
      if (event.target === node || event.target.closest("[data-panel-close]")) node.hidden = true;
    });
    return node;
  };

  const cartLine = (item, context) => `
    <div class="${context}__item" data-cart-item>
      <a class="${context}__media" href="/collections/all">${image(item.product)}</a>
      <div class="${context}__details">
        <a href="/collections/all">${escapeHtml(item.product.title)}</a>
        <button class="cart-link-button" type="button" data-backend-cart-remove data-product-id="${item.product._id}">Remove</button>
      </div>
      <label class="${context}__quantity">
        <span class="visually-hidden">Quantity for ${escapeHtml(item.product.title)}</span>
        <input class="input" type="number" min="0" max="${Number(item.product.inventory?.quantity || item.quantity || 0)}" value="${item.quantity}" data-backend-cart-quantity data-product-id="${item.product._id}">
      </label>
      <p class="${context}__price">${money(item.lineTotal)}</p>
    </div>
  `;

  const updateCartCount = (cart) => {
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = cart?.itemCount || 0;
    });
  };

  const renderCart = (cart) => {
    updateCartCount(cart);

    const drawer = document.querySelector("cart-drawer");
    if (drawer) {
      const items = drawer.querySelector("[data-cart-items]");
      const empty = drawer.querySelector("[data-cart-empty]");
      const subtotal = drawer.querySelector("[data-cart-subtotal]");
      const error = drawer.querySelector("[data-cart-error]");
      if (error) error.hidden = true;
      if (items) {
        items.innerHTML = (cart.items || []).map((item) => cartLine(item, "cart-drawer")).join("");
        items.hidden = !cart.itemCount;
      }
      if (empty) empty.hidden = cart.itemCount > 0;
      if (subtotal) subtotal.textContent = money(cart.subtotal);
    }

    const page = document.querySelector("[data-cart-page]");
    if (page) {
      const items = page.querySelector("[data-cart-page-items]");
      const empty = page.querySelector("[data-cart-page-empty]");
      const content = page.querySelector("[data-cart-page-content]");
      const subtotal = page.querySelector("[data-cart-page-subtotal]");
      if (items) items.innerHTML = (cart.items || []).map((item) => cartLine(item, "cart-page")).join("");
      if (empty) empty.hidden = cart.itemCount > 0;
      if (content) content.hidden = cart.itemCount === 0;
      if (subtotal) subtotal.textContent = money(cart.subtotal);
    }
  };

  const openCart = async () => {
    const cart = await account().request("/cart");
    renderCart(cart);
    const drawer = document.querySelector("cart-drawer");
    if (drawer) {
      drawer.hidden = false;
      document.documentElement.classList.add("cart-drawer-open");
    }
  };

  const showCartError = (message) => {
    const drawer = document.querySelector("cart-drawer");
    const error = drawer?.querySelector("[data-cart-error]");
    if (drawer) {
      drawer.hidden = false;
      document.documentElement.classList.add("cart-drawer-open");
    }
    if (error) {
      error.textContent = message;
      error.hidden = false;
    } else {
      window.alert(message);
    }
  };

  const loadCart = async () => {
    if (!account()?.token()) return;
    renderCart(await account().request("/cart"));
  };

  const updateWishlistButtons = async () => {
    if (!account()?.token()) return;
    const wishlist = await account().request("/wishlist");
    const ids = new Set((wishlist.items || []).map((product) => String(product._id)));
    document.querySelectorAll("[data-backend-wishlist]").forEach((button) => {
      const id = button.dataset.productId;
      const active = id && ids.has(String(id));
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Remove from wishlist" : "Add to wishlist");
    });
  };

  const renderWishlistPage = async () => {
    const page = document.querySelector("[data-wishlist-page]");
    if (!page || !account()?.token()) return;
    const wishlist = await account().request("/wishlist");
    const grid = page.querySelector("[data-wishlist-items]");
    const empty = page.querySelector("[data-wishlist-empty]");
    if (empty) empty.hidden = wishlist.total > 0;
    if (!grid) return;
    grid.innerHTML = (wishlist.items || [])
      .map((product) => `
        <article class="wishlist-card wishlist-card--row">
          <a class="wishlist-card__media" href="/collections/all">
            ${image(product)}
          </a>
          <div class="wishlist-card__details">
            <a href="/collections/all">${escapeHtml(product.title)}</a>
            <p>${money(product.price)}</p>
          </div>
          <div class="wishlist-card__actions">
            <button class="btn btn--sm" type="button" data-backend-add-cart data-product-id="${product._id}">Add to cart</button>
            <button class="cart-link-button wishlist-remove-button" type="button" data-backend-wishlist data-wishlist-remove data-product-id="${product._id}" aria-pressed="true">Remove</button>
          </div>
        </article>
      `)
      .join("");
  };

  const wishlistMarkup = (wishlist) => {
    if (!wishlist.total) {
      return '<div class="wishlist-page__empty"><p>Your wishlist is empty.</p><a class="btn" href="/collections/all">Continue Shopping</a></div>';
    }

    return `
      <div class="wishlist-page__grid">
        ${(wishlist.items || [])
          .map((product) => `
            <article class="wishlist-card wishlist-card--row">
              <a class="wishlist-card__media" href="/collections/all">
                ${image(product)}
              </a>
              <div class="wishlist-card__details">
                <a href="/collections/all">${escapeHtml(product.title)}</a>
                <p>${money(product.price)}</p>
              </div>
              <div class="wishlist-card__actions">
                <button class="btn btn--sm" type="button" data-backend-add-cart data-product-id="${product._id}">Add to cart</button>
                <button class="cart-link-button wishlist-remove-button" type="button" data-backend-wishlist data-wishlist-remove data-product-id="${product._id}" aria-pressed="true">Remove</button>
              </div>
            </article>
          `)
          .join("")}
      </div>
    `;
  };

  const openWishlistPanel = async () => {
    await account().requireLogin();
    const wishlist = await account().request("/wishlist");
    const node = panel("wishlist", "Wishlist");
    node.querySelector("[data-panel-content]").innerHTML = wishlistMarkup(wishlist);
    node.hidden = false;
  };

  const openAccountPanel = async () => {
    await account().requireLogin();
    const [cart, wishlist, orders] = await Promise.all([
      account().request("/cart"),
      account().request("/wishlist"),
      account().request("/orders").catch(() => [])
    ]);
    const user = account().user();
    const node = panel("account", "Account");
    node.querySelector("[data-panel-content]").innerHTML = `
      <div class="account-dashboard">
        <div>
          <p class="account-dashboard__label">Signed in as</p>
          <h3>${escapeHtml(user?.name || "Customer")}</h3>
          <p>${escapeHtml(user?.email || "")}</p>
        </div>
        <div class="account-dashboard__stats">
          <span><strong>${cart.itemCount || 0}</strong> cart items</span>
          <span><strong>${wishlist.total || 0}</strong> wishlist items</span>
          <span><strong>${orders.length || 0}</strong> orders</span>
        </div>
        <div class="button-row">
          <button class="btn btn--sm" type="button" data-wishlist-open>View wishlist</button>
          <a class="btn btn--sm btn--secondary" href="/cart">View cart</a>
        </div>
        <section class="account-orders">
          <h3>Order history</h3>
          ${orders.length ? `
            <div class="account-orders__list">
              ${orders.map((order) => `
                <article class="account-order">
                  <div>
                    <strong>Order ${String(order._id).slice(-6).toUpperCase()}</strong>
                    <p>${new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span>${order.items.length} item${order.items.length === 1 ? "" : "s"}</span>
                    <strong>${money(order.total)}</strong>
                  </div>
                  <span class="badge">${order.status}</span>
                </article>
              `).join("")}
            </div>
          ` : "<p>No orders yet.</p>"}
        </section>
      </div>
    `;
    node.hidden = false;
  };

  const showSuccessPopup = (order) => {
    const node = panel("checkout-success", "Payment successful");
    node.querySelector("[data-panel-content]").innerHTML = `
      <div class="checkout-success">
        <p>Your order has been placed and your cart has been cleared.</p>
        ${order ? `<p><strong>Order ${String(order._id).slice(-6).toUpperCase()}</strong> - ${money(order.total)}</p>` : ""}
        <div class="button-row">
          <button class="btn btn--sm" type="button" data-panel-close>Continue shopping</button>
          <button class="btn btn--sm btn--secondary" type="button" data-account-open>View account</button>
        </div>
      </div>
    `;
    node.hidden = false;
  };

  const completeCheckoutIfNeeded = async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success" || !account()?.token()) return;
    const sessionId = params.get("session_id");
    if (!sessionId) {
      showCartError("Stripe checkout session is missing. Please try checkout again.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    try {
      const result = await account().request("/checkout/complete", {
        method: "POST",
        body: JSON.stringify({ sessionId })
      });
      renderCart(result.cart || { itemCount: 0, items: [], subtotal: 0 });
      showSuccessPopup(result.order);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      showCartError(error.message);
    }
  };

  document.addEventListener("click", async (event) => {
    const accountLink = event.target.closest("[data-account-open]");
    if (accountLink) {
      event.preventDefault();
      await openAccountPanel();
      return;
    }

    const wishlistLink = event.target.closest("[data-wishlist-open]");
    if (wishlistLink) {
      event.preventDefault();
      await openWishlistPanel();
      return;
    }

    const checkoutButton = event.target.closest("[data-backend-checkout]");
    if (checkoutButton) {
      event.preventDefault();
      await account().requireLogin();
      checkoutButton.disabled = true;
      checkoutButton.textContent = "Redirecting...";
      try {
        const session = await account().request("/checkout/session", {
          method: "POST",
          body: JSON.stringify({ origin: window.location.origin })
        });
        window.location.href = session.url;
      } catch (error) {
        checkoutButton.disabled = false;
        checkoutButton.textContent = "Checkout";
        showCartError(error.message);
      }
      return;
    }

    const addButton = event.target.closest("[data-backend-add-cart]");
    if (addButton) {
      event.preventDefault();
      await account().requireLogin();
      addButton.disabled = true;
      try {
        const cart = await account().request("/cart/items", {
          method: "POST",
          body: JSON.stringify({ productId: addButton.dataset.productId, handle: addButton.dataset.productHandle, quantity: 1 })
        });
        renderCart(cart);
        await openCart();
      } finally {
        addButton.disabled = false;
      }
      return;
    }

    const wishlistButton = event.target.closest("[data-backend-wishlist]");
    if (wishlistButton) {
      event.preventDefault();
      await account().requireLogin();
      await account().request("/wishlist/items", {
        method: "POST",
        body: JSON.stringify({ productId: wishlistButton.dataset.productId, handle: wishlistButton.dataset.productHandle })
      });
      await updateWishlistButtons();
      await renderWishlistPage();
      if (document.querySelector("[data-wishlist-panel]:not([hidden])")) await openWishlistPanel();
      return;
    }

    const removeButton = event.target.closest("[data-backend-cart-remove]");
    if (removeButton) {
      event.preventDefault();
      renderCart(await account().request(`/cart/items/${removeButton.dataset.productId}`, { method: "DELETE" }));
    }
  });

  document.addEventListener("change", async (event) => {
    const quantity = event.target.closest("[data-backend-cart-quantity]");
    if (!quantity) return;
    renderCart(
      await account().request(`/cart/items/${quantity.dataset.productId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: Number(quantity.value) })
      })
    );
  });

  document.addEventListener("DOMContentLoaded", async () => {
    await window.CyberNestMoney?.loadSettings();
    document.querySelectorAll("[data-wishlist-toggle]").forEach((button) => {
      button.dataset.backendWishlist = "";
      button.setAttribute("aria-label", "Add to wishlist");
    });
    await loadCart();
    await updateWishlistButtons();
    await renderWishlistPage();
    await completeCheckoutIfNeeded();
  });

  window.addEventListener("cybernest:auth", async () => {
    await loadCart();
    await updateWishlistButtons();
    await renderWishlistPage();
  });

  window.addEventListener("cybernest:logout", () => {
    updateCartCount({ itemCount: 0 });
    document.querySelectorAll("[data-backend-wishlist]").forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Add to wishlist");
    });
    document.querySelector("cart-drawer")?.close?.();
  });
})();




