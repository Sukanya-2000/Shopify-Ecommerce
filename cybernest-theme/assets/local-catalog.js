(function () {
  const root = document.querySelector("[data-local-catalog]");
  if (!root) return;

  const grid = root.querySelector("[data-local-catalog-grid]");
  const count = root.querySelector("[data-local-catalog-count]");
  const status = root.querySelector("[data-local-catalog-status]");
  const search = root.querySelector("[data-local-catalog-search]");
  const type = root.querySelector("[data-local-catalog-type]");
  const category = root.querySelector("[data-local-catalog-category]");
  const availability = root.querySelector("[data-local-catalog-availability]");
  const sort = root.querySelector("[data-local-catalog-sort]");
  const pageSize = root.querySelector("[data-local-catalog-page-size]");
  const columns = root.querySelector("[data-local-catalog-columns]");
  const pagination = root.querySelector("[data-local-catalog-pagination]");
  const apiBase = root.dataset.apiBase || "http://localhost:5000/api";
  let products = [];
  let currentPage = 1;

  const money = (value) => window.CyberNestMoney?.money(value) || new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));

  function productUrl(product) {
    return `/products/${product.handle}`;
  }

  function uniqueTypes(items) {
    return [...new Set(items.map((product) => product.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function uniqueCategories(items) {
    return [...new Set(items.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function productStock(product) {
    return Number(product.inventory?.quantity ?? 0);
  }

  function filteredProducts() {
    const term = search.value.trim().toLowerCase();
    const selectedType = type.value;
    const selectedCategory = category ? category.value : "";
    const selectedAvailability = availability.value;

    return products
      .filter((product) => {
        const matchesSearch = !term || [product.title, product.vendor, product.type, product.category, ...(product.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(term);
        const matchesType = !selectedType || product.type === selectedType;
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        const stock = productStock(product);
        const matchesAvailability =
          !selectedAvailability ||
          (selectedAvailability === "available" && stock > 0) ||
          (selectedAvailability === "sold-out" && stock <= 0);

        return matchesSearch && matchesType && matchesCategory && matchesAvailability;
      })
      .sort((a, b) => {
        if (sort.value === "title-descending") return b.title.localeCompare(a.title);
        if (sort.value === "price-ascending") return Number(a.price) - Number(b.price);
        if (sort.value === "price-descending") return Number(b.price) - Number(a.price);
        if (sort.value === "created-descending") return String(b.createdAt).localeCompare(String(a.createdAt));
        return a.title.localeCompare(b.title);
      });
  }

  function selectedPageSize() {
    return Number(pageSize && pageSize.value ? pageSize.value : 12);
  }

  function selectedColumns() {
    return Number(columns && columns.value ? columns.value : 4);
  }

  function card(product) {
    const image = product.image && product.image.src
      ? `<img src="${product.image.src}" alt="${product.image.alt || product.title}" loading="lazy">`
      : `<div class="product-card__placeholder" aria-hidden="true"><span>${product.title.slice(0, 1)}</span></div>`;
    const stock = productStock(product);
    const stockNotice = stock > 0 && stock < 5 ? `<p class="product-card__stock">${stock} pcs left</p>` : "";

    return `
      <article class="product-card">
        <a class="product-card__link stack" href="${productUrl(product)}">
          <div class="product-card__media">
            <div class="product-card__badges">
              ${Number(product.compareAtPrice || 0) > Number(product.price || 0) ? '<span class="badge badge--sale">Sale</span>' : ""}
              ${stock <= 0 ? '<span class="badge">Sold out</span>' : ""}
            </div>
            ${image}
          </div>
          <div class="stack">
            <p class="product-card__vendor">${product.vendor || "CyberNest"}</p>
            <h3 class="product-card__title">${product.title}</h3>
            <p class="product-card__description">${String(product.descriptionHtml || "").replace(/<[^>]+>/g, "").slice(0, 112)}</p>
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

  function render() {
    const visible = filteredProducts();
    const perPage = selectedPageSize();
    const pages = Math.max(1, Math.ceil(visible.length / perPage));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * perPage;
    const pageItems = visible.slice(start, start + perPage);

    grid.style.setProperty("--catalog-columns", selectedColumns());
    count.textContent = `${visible.length} products`;
    grid.innerHTML = pageItems.length
      ? pageItems.map(card).join("")
      : '<div class="collection-page__empty stack"><h2>No products found</h2><p>Try another search or filter.</p></div>';
    renderPagination(pages, visible.length, start, pageItems.length);
  }

  function renderPagination(pages, total, start, shown) {
    if (!pagination) return;
    if (pages <= 1 || !total) {
      pagination.hidden = true;
      pagination.innerHTML = "";
      return;
    }

    const pageButtons = Array.from({ length: pages }, (_, index) => {
      const page = index + 1;
      return `<button class="pagination__link${page === currentPage ? " is-current" : ""}" type="button" data-local-catalog-page="${page}" ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`;
    }).join("");

    pagination.hidden = false;
    pagination.innerHTML = `
      <p class="collection-page__page-summary">Showing ${start + 1}-${start + shown} of ${total}</p>
      <nav class="pagination" role="navigation" aria-label="Catalog pagination">
        <button class="pagination__link" type="button" data-local-catalog-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
        ${pageButtons}
        <button class="pagination__link" type="button" data-local-catalog-page="${currentPage + 1}" ${currentPage === pages ? "disabled" : ""}>Next</button>
      </nav>
    `;
  }

  function populateFilters() {
    type.innerHTML = '<option value="">All departments</option>' + uniqueTypes(products)
      .map((value) => `<option value="${value}">${value}</option>`)
      .join("");
    if (category) {
      category.innerHTML = '<option value="">All categories</option>' + uniqueCategories(products)
        .map((value) => `<option value="${value}">${value}</option>`)
        .join("");
    }
  }

  async function load() {
    await window.CyberNestMoney?.loadSettings();
    try {
      status.textContent = "Loading local seeded catalog...";
      const response = await fetch(`${apiBase}/products?limit=100&sort_by=title-ascending`);
      if (!response.ok) throw new Error("Catalog API unavailable");
      const data = await response.json();
      products = data.items || [];
      populateFilters();
      root.classList.add("is-local-catalog-ready");
      status.textContent = "Showing seeded local backend catalog";
      render();
    } catch (error) {
      status.textContent = "Showing Shopify catalog. Start the backend to preview seeded local products.";
    }
  }

  [search, type, category, availability, sort, pageSize].forEach((control) => {
    if (!control) return;
    control.addEventListener("input", () => {
      currentPage = 1;
      render();
    });
    control.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
  });

  if (columns) {
    columns.addEventListener("change", render);
  }

  if (pagination) {
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-local-catalog-page]");
      if (!button || button.disabled) return;
      currentPage = Number(button.dataset.localCatalogPage);
      render();
      root.querySelector(".collection-page__local-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  load();
})();



