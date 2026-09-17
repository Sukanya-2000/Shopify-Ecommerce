(() => {
  const cartJsonUrl = `${window.Shopify?.routes?.root || '/'}cart.js`;
  const addUrl = `${window.Shopify?.routes?.root || '/'}cart/add.js`;
  const changeUrl = `${window.Shopify?.routes?.root || '/'}cart/change.js`;

  const formatMoney = (cents, format = window.theme?.moneyFormat) => {
    if (window.Shopify?.formatMoney && format) return window.Shopify.formatMoney(cents, format);
    return new Intl.NumberFormat(document.documentElement.lang || 'en', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD'
    }).format(cents / 100);
  };

  const fetchCart = async () => {
    const response = await fetch(cartJsonUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Unable to load cart.');
    return response.json();
  };

  const changeCartLine = async (key, quantity) => {
    const response = await fetch(changeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    if (!response.ok) throw new Error('Unable to update cart.');
    return fetchCart();
  };

  const updateCartCount = (cart) => {
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = cart.item_count;
    });
  };

  const escapeHtml = (value) => {
    const element = document.createElement('span');
    element.textContent = value || '';
    return element.innerHTML;
  };

  const itemImage = (item) => {
    if (!item.image) return '';
    return `<img src="${item.image}" alt="${escapeHtml(item.product_title)}" loading="lazy">`;
  };

  const itemVariant = (item) => {
    if (!item.variant_title || item.variant_title === 'Default Title') return '';
    return `<p>${escapeHtml(item.variant_title)}</p>`;
  };

  const lineMarkup = (item, context) => `
    <div class="${context}__item" data-cart-item>
      <a class="${context}__media" href="${item.url}">${itemImage(item)}</a>
      <div class="${context}__details">
        <a href="${item.url}">${escapeHtml(item.product_title)}</a>
        ${itemVariant(item)}
        <button class="cart-link-button" type="button" data-cart-remove data-line-key="${item.key}">Remove</button>
      </div>
      <label class="${context}__quantity">
        <span class="visually-hidden">Quantity for ${escapeHtml(item.product_title)}</span>
        <input class="input" type="number" min="0" value="${item.quantity}" data-cart-quantity data-line-key="${item.key}">
      </label>
      <p class="${context}__price">${formatMoney(item.final_line_price)}</p>
    </div>
  `;

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.items = this.querySelector('[data-cart-items]');
      this.empty = this.querySelector('[data-cart-empty]');
      this.subtotal = this.querySelector('[data-cart-subtotal]');
      this.error = this.querySelector('[data-cart-error]');

      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-cart-drawer-close]')) this.close();
      });

      this.addEventListener('change', async (event) => {
        const input = event.target.closest('[data-cart-quantity]');
        if (!input) return;
        await this.updateLine(input.dataset.lineKey, Number(input.value));
      });

      this.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-cart-remove]');
        if (!button) return;
        await this.updateLine(button.dataset.lineKey, 0);
      });
    }

    async open(message) {
      if (message) this.showError(message);
      const cart = await fetchCart();
      this.render(cart);
      this.hidden = false;
      document.documentElement.classList.add('cart-drawer-open');
    }

    close() {
      this.hidden = true;
      document.documentElement.classList.remove('cart-drawer-open');
    }

    render(cart) {
      updateCartCount(cart);
      this.error.hidden = true;
      this.error.textContent = '';
      this.items.innerHTML = cart.items.map((item) => lineMarkup(item, 'cart-drawer')).join('');
      this.empty.hidden = cart.item_count > 0;
      this.items.hidden = cart.item_count === 0;
      this.subtotal.textContent = formatMoney(cart.total_price);
    }

    showError(message) {
      this.error.textContent = message;
      this.error.hidden = false;
    }

    async updateLine(key, quantity) {
      try {
        const cart = await changeCartLine(key, quantity);
        this.render(cart);
      } catch (error) {
        this.showError(error.message);
      }
    }
  }

  class CartPage extends HTMLElement {
    connectedCallback() {
      this.items = this.querySelector('[data-cart-page-items]');
      this.empty = this.querySelector('[data-cart-page-empty]');
      this.content = this.querySelector('[data-cart-page-content]');
      this.subtotal = this.querySelector('[data-cart-page-subtotal]');

      this.addEventListener('change', async (event) => {
        const input = event.target.closest('[data-cart-quantity]');
        if (!input) return;
        await this.updateLine(input.dataset.lineKey, Number(input.value));
      });

      this.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-cart-remove]');
        if (!button) return;
        await this.updateLine(button.dataset.lineKey, 0);
      });
    }

    render(cart) {
      updateCartCount(cart);
      this.items.innerHTML = cart.items.map((item) => lineMarkup(item, 'cart-page')).join('');
      this.empty.hidden = cart.item_count > 0;
      this.content.hidden = cart.item_count === 0;
      this.subtotal.textContent = formatMoney(cart.total_price);
    }

    async updateLine(key, quantity) {
      const cart = await changeCartLine(key, quantity);
      this.render(cart);
      document.querySelector('cart-drawer')?.render(cart);
    }
  }

  if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);
  if (!customElements.get('cart-page')) customElements.define('cart-page', CartPage);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelector('cart-drawer')?.close();
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('form[action^="/cart/add"], form[action^="/cart/add.js"]');
    if (!form) return;

    event.preventDefault();
    const drawer = document.querySelector('cart-drawer');

    try {
      const response = await fetch(addUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.description || payload.message || 'Unable to add this item.');
      }
      await drawer?.open();
    } catch (error) {
      await drawer?.open(error.message);
    }
  });
})();
