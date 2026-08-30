(function () {
  const sections = document.querySelectorAll("[data-local-featured]");
  const departments = document.querySelector("[data-local-departments]");
  const brands = document.querySelector("[data-local-brands]");
  const hero = document.querySelector("[data-homepage-hero]");
  if (!sections.length && !departments && !brands && !hero) return;

  const apiBase = "http://localhost:5000/api";
  const departmentImages = {
    Audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    Chargers: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80",
    "Desk Gear": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80",
    Gaming: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80",
    Networking: "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=900&q=80",
    "Smart Home": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=900&q=80"
  };

  const money = (value) => window.CyberNestMoney?.money(value) || new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));

  function imageMarkup(product) {
    if (product.image && product.image.src) {
      return `<img src="${product.image.src}" alt="${product.image.alt || product.title}" loading="lazy">`;
    }

    return `<div class="product-card__placeholder" aria-hidden="true"><span>${product.title.slice(0, 1)}</span></div>`;
  }

  function productCard(product) {
    const stock = Number(product.inventory?.quantity ?? 0);
    const stockNotice = stock > 0 && stock < 5 ? `<p class="product-card__stock">${stock} pcs left</p>` : "";

    return `
      <article class="product-card">
        <a class="product-card__link stack" href="/collections/all">
          <div class="product-card__media">${imageMarkup(product)}</div>
          <div class="stack">
            <p class="product-card__vendor">${product.vendor || "CyberNest"}</p>
            <h3 class="product-card__title">${product.title}</h3>
            <p class="product-card__price">${money(product.price)}</p>
            ${stockNotice}
          </div>
        </a>
        <div class="product-card__actions">
          <button class="btn btn--sm product-card__button" type="button" data-backend-add-cart data-product-id="${product._id}" ${stock <= 0 ? "disabled" : ""}>${stock > 0 ? "Add to cart" : "Sold out"}</button>
          <button class="product-card__wishlist" type="button" data-backend-wishlist data-product-id="${product._id}" aria-label="Add ${product.title} to wishlist"><span class="visually-hidden">Wishlist</span></button>
        </div>
      </article>
    `;
  }

  function byTag(products, tag) {
    return products.filter((product) => (product.tags || []).includes(tag));
  }

  function fillFeatured(products) {
    sections.forEach((section, index) => {
      const grid = section.querySelector("[data-local-featured-grid]");
      if (!grid) return;

      const heading = section.dataset.localFeatured.toLowerCase();
      let items = products;
      if (heading.includes("deal")) items = byTag(products, "deals");
      if (heading.includes("best")) items = byTag(products, "best seller");
      if (heading.includes("new")) items = byTag(products, "new arrival");
      if (!items.length) items = products.slice(index * 8, index * 8 + 8);

      grid.innerHTML = items.slice(0, 8).map(productCard).join("");
      section.classList.add("is-local-featured-ready");
    });
  }

  function fillDepartments(products) {
    if (!departments) return;
    const grid = departments.querySelector("[data-local-departments-grid]");
    if (!grid) return;

    const types = [...new Set(products.map((product) => product.type).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 6);

    grid.innerHTML = types
      .map((type) => `
        <a class="department-card" href="/collections/all">
          <div class="department-card__media">
            <img src="${departmentImages[type] || departmentImages["Smart Home"]}" alt="${type}" loading="lazy">
          </div>
          <span class="department-card__title">${type}</span>
        </a>
      `)
      .join("");
  }

  function fillHero(products) {
    if (!hero || hero.querySelector(".homepage-hero__media")) return;
    const product = products.find((item) => item.image && item.image.src);
    if (!product) return;
    hero.style.setProperty("--hero-fallback-image", `url("${product.image.src}")`);
    hero.classList.add("homepage-hero--fallback-image");
  }

  function brandCard(brand) {
    return `
      <a class="brand-logo brand-logo--text" href="/collections/all" style="--brand-color: ${brand.color || "#0f172a"}">
        <span class="brand-logo__mark">${brand.initials || brand.name.slice(0, 2)}</span>
        <span class="brand-logo__name">${brand.name}</span>
        <span class="brand-logo__tagline">${brand.tagline || ""}</span>
      </a>
    `;
  }

  async function fillBrands() {
    if (!brands) return;
    const grid = brands.querySelector("[data-local-brands-grid]");
    if (!grid) return;

    try {
      const response = await fetch(`${apiBase}/brands`);
      if (!response.ok) return;
      const data = await response.json();
      const items = data.items || [];
      if (!items.length) return;
      grid.innerHTML = items.map(brandCard).join("");
      brands.classList.add("is-local-brands-ready");
    } catch (error) {
      return;
    }
  }

  async function load() {
    await window.CyberNestMoney?.loadSettings();
    try {
      const response = await fetch(`${apiBase}/products?limit=72&sort_by=title-ascending`);
      if (!response.ok) return;
      const data = await response.json();
      const products = data.items || [];
      if (!products.length) return;
      fillHero(products);
      fillDepartments(products);
      fillFeatured(products);
      fillBrands();
    } catch (error) {
      return;
    }
  }

  load();
})();



