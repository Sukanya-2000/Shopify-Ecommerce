class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector('.predictive-search__results');
    this.activeIndex = -1;
    this.items = [];
    this.debouncedSearch = this.debounce(this.onInput.bind(this), 250);
  }

  connectedCallback() {
    if (!this.input || !this.results) return;

    this.input.addEventListener('input', this.debouncedSearch);
    this.input.addEventListener('keydown', this.onKeydown.bind(this));
    document.addEventListener('click', (event) => {
      if (!this.contains(event.target)) this.close();
    });
  }

  debounce(callback, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...args), delay);
    };
  }

  async onInput() {
    const query = this.input.value.trim();

    if (!query) {
      this.close();
      return;
    }

    try {
      const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product,collection,query&resources[limit]=6`);
      if (!response.ok) throw new Error('Predictive search request failed');
      const data = await response.json();
      this.render(data.resources.results, query);
    } catch (error) {
      this.renderEmpty(query);
    }
  }

  onKeydown(event) {
    if (this.results.hidden) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.setActiveItem(this.activeIndex + 1);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.setActiveItem(this.activeIndex - 1);
    }

    if (event.key === 'Enter' && this.activeIndex >= 0 && this.items[this.activeIndex]) {
      event.preventDefault();
      window.location.href = this.items[this.activeIndex].href;
    }

    if (event.key === 'Escape') {
      this.close();
      this.input.blur();
    }
  }

  render(results, query) {
    const products = results.products || [];
    const collections = results.collections || [];
    const queries = results.queries || [];

    if (!products.length && !collections.length && !queries.length) {
      this.renderEmpty(query);
      return;
    }

    this.results.innerHTML = [
      this.renderGroup('Products', products, this.renderProduct),
      this.renderGroup('Collections', collections, this.renderTextResult),
      this.renderGroup('Suggestions', queries, this.renderTextResult),
      `<a class="predictive-search__all" href="/search?q=${encodeURIComponent(query)}">View all results for "${this.escapeHtml(query)}"</a>`
    ].join('');

    this.open();
  }

  renderGroup(title, items, renderer) {
    if (!items.length) return '';

    return `
      <div class="predictive-search__group">
        <h2 class="predictive-search__heading">${title}</h2>
        <ul class="predictive-search__list" role="listbox">
          ${items.map((item) => renderer.call(this, item)).join('')}
        </ul>
      </div>
    `;
  }

  renderProduct(product) {
    const image = product.image ? `<img src="${product.image}" alt="" loading="lazy">` : '';
    const price = product.price ? `<span>${product.price}</span>` : '';
    return `
      <li>
        <a class="predictive-search__item predictive-search__item--product" href="${product.url}" role="option">
          ${image}
          <span>${this.escapeHtml(product.title)}</span>
          ${price}
        </a>
      </li>
    `;
  }

  renderTextResult(item) {
    return `
      <li>
        <a class="predictive-search__item" href="${item.url}" role="option">
          <span>${this.escapeHtml(item.title || item.text || item.styled_text || '')}</span>
        </a>
      </li>
    `;
  }

  renderEmpty(query) {
    this.results.innerHTML = `
      <div class="predictive-search__empty">
        <p>No results for "${this.escapeHtml(query)}"</p>
        <a href="/search?q=${encodeURIComponent(query)}">Search the full store</a>
      </div>
    `;
    this.open();
  }

  open() {
    this.results.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.items = Array.from(this.results.querySelectorAll('a'));
    this.activeIndex = -1;
  }

  close() {
    this.results.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.activeIndex = -1;
  }

  setActiveItem(index) {
    if (!this.items.length) return;
    this.activeIndex = (index + this.items.length) % this.items.length;
    this.items.forEach((item, itemIndex) => {
      item.classList.toggle('is-active', itemIndex === this.activeIndex);
      item.setAttribute('aria-selected', String(itemIndex === this.activeIndex));
    });
  }

  escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
  }
}

if (!customElements.get('predictive-search')) {
  customElements.define('predictive-search', PredictiveSearch);
}
