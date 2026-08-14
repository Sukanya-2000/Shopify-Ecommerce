/*
  Guest/localStorage wishlist MVP.
  Saved data is device/browser-local under cybernest_wishlist, with product IDs only.
  Logged-in customer-metafield sync and cross-device wishlist support are Phase 2, not today's scope.
*/
(() => {
  const storageKey = 'cybernest_wishlist';

  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value.map(String) : [];
    } catch (_error) {
      return [];
    }
  };

  const write = (ids) => {
    localStorage.setItem(storageKey, JSON.stringify([...new Set(ids.map(String))]));
  };

  const has = (id) => read().includes(String(id));
  const add = (id) => write([...read(), String(id)]);
  const remove = (id) => write(read().filter((savedId) => savedId !== String(id)));

  const updateButtons = () => {
    const ids = read();
    document.querySelectorAll('[data-wishlist-toggle]').forEach((button) => {
      const active = ids.includes(String(button.dataset.productId));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      if (button.textContent.trim() === 'Save to wishlist' || button.textContent.trim() === 'Saved to wishlist') {
        button.textContent = active ? 'Saved to wishlist' : 'Save to wishlist';
      }
      const icon = button.querySelector('[aria-hidden="true"]');
      if (icon) icon.textContent = active ? 'Saved' : 'Save';
    });
  };

  const money = (cents) =>
    new Intl.NumberFormat(document.documentElement.lang || 'en', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD'
    }).format(cents / 100);

  const escapeHtml = (value) => {
    const element = document.createElement('span');
    element.textContent = value || '';
    return element.innerHTML;
  };

  const renderWishlistPage = async () => {
    const page = document.querySelector('[data-wishlist-page]');
    if (!page) return;

    const grid = page.querySelector('[data-wishlist-items]');
    const empty = page.querySelector('[data-wishlist-empty]');
    const ids = read();
    empty.hidden = ids.length > 0;
    grid.innerHTML = '';

    if (ids.length === 0) return;

    const mapNode = page.querySelector('[data-wishlist-product-map]');
    const productMap = JSON.parse(mapNode?.textContent || '[]');
    const handles = ids
      .map((id) => productMap.find((product) => String(product.id) === String(id))?.handle)
      .filter(Boolean);

    const products = await Promise.all(
      handles.map((handle) =>
        fetch(`/products/${handle}.js`)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null)
      )
    );

    grid.innerHTML = products
      .filter(Boolean)
      .map((product) => {
        const variant = product.variants?.[0];
        return `
          <article class="wishlist-card">
            <a href="${product.url}">
              ${product.featured_image ? `<img src="${product.featured_image}" alt="${escapeHtml(product.title)}" loading="lazy">` : ''}
              <h2>${escapeHtml(product.title)}</h2>
            </a>
            <p>${money(product.price)}</p>
            <form action="/cart/add" method="post">
              <input type="hidden" name="id" value="${variant?.id || ''}">
              <button class="btn btn--sm" type="submit" ${variant?.available ? '' : 'disabled'}>${variant?.available ? 'Move to Cart' : 'Sold out'}</button>
            </form>
            <button class="cart-link-button" type="button" data-wishlist-toggle data-product-id="${product.id}" aria-pressed="true">Remove</button>
          </article>
        `;
      })
      .join('');

    updateButtons();
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wishlist-toggle]');
    if (!button) return;

    const id = button.dataset.productId;
    if (!id) return;
    if (has(id)) remove(id);
    else add(id);

    updateButtons();
    renderWishlistPage();
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateButtons();
    renderWishlistPage();
  });

  window.CyberNestWishlist = { read, add, remove, has, updateButtons };
})();
