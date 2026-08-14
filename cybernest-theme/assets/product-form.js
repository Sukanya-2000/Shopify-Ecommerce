class ProductPage {
  constructor(container) {
    this.container = container;
    this.form = container.querySelector('.product-form');
    this.variants = JSON.parse(container.querySelector('[data-product-variants]')?.textContent || '[]');
    this.moneyFormat = window.Shopify?.money_format || '${{amount}}';
    this.bindOptions();
    this.bindGallery();
    this.bindSubmit();
    this.updateUnavailableOptions();
  }

  bindOptions() {
    this.form?.addEventListener('change', (event) => {
      if (event.target.matches('input[type="radio"]')) this.onVariantChange();
    });
  }

  bindGallery() {
    this.container.querySelectorAll('[data-media-thumb]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.mediaThumb;
        this.container.querySelectorAll('[data-media-id]').forEach((media) => {
          media.classList.toggle('is-hidden', media.dataset.mediaId !== id);
        });
        this.container.querySelectorAll('[data-media-thumb]').forEach((thumb) => {
          thumb.classList.toggle('is-active', thumb === button);
        });
      });
    });
  }

  bindSubmit() {
    this.form?.addEventListener('submit', () => {
      // TODO: wire cart drawer open on successful add - built Day 6
    });
  }

  onVariantChange() {
    const selectedOptions = Array.from(this.form.querySelectorAll('fieldset')).map((fieldset) => {
      return fieldset.querySelector('input[type="radio"]:checked')?.value;
    });
    const variant = this.variants.find((candidate) => {
      return candidate.options.every((option, index) => option === selectedOptions[index]);
    });

    if (!variant) return;

    this.form.querySelector('[data-variant-id]').value = variant.id;
    this.container.querySelector('[data-current-price]').textContent = this.formatMoney(variant.price);

    const compare = this.container.querySelector('[data-compare-price]');
    const badge = this.container.querySelector('[data-discount-badge]');
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      compare.hidden = false;
      badge.hidden = false;
      compare.textContent = this.formatMoney(variant.compare_at_price);
      badge.textContent = `Save ${Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100)}%`;
    } else {
      compare.hidden = true;
      badge.hidden = true;
    }

    const button = this.form.querySelector('[data-add-to-cart]');
    button.disabled = !variant.available;
    button.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
    window.history.replaceState({}, '', `${window.location.pathname}?variant=${variant.id}`);
    this.updateUnavailableOptions();
  }

  updateUnavailableOptions() {
    this.form?.querySelectorAll('.product-option__label').forEach((label) => {
      const input = label.querySelector('input');
      const fieldsets = Array.from(this.form.querySelectorAll('fieldset'));
      const selected = fieldsets.map((fieldset) => fieldset.querySelector('input[type="radio"]:checked')?.value);
      const fieldsetIndex = fieldsets.indexOf(input.closest('fieldset'));
      selected[fieldsetIndex] = input.value;
      const possibleVariant = this.variants.find((variant) => {
        return variant.options.every((option, index) => option === selected[index]);
      });
      input.disabled = !possibleVariant || !possibleVariant.available;
      label.classList.toggle('is-unavailable', input.disabled);
    });
  }

  formatMoney(cents) {
    if (window.Shopify?.formatMoney) return window.Shopify.formatMoney(cents, this.moneyFormat);
    return new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }
}

document.querySelectorAll('[data-product-page]').forEach((container) => new ProductPage(container));
