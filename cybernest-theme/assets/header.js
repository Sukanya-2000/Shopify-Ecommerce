const mobileNav = document.querySelector('[data-mobile-nav]');
const openButton = document.querySelector('[data-mobile-menu-open]');
const closeButtons = document.querySelectorAll('[data-mobile-menu-close]');

function setMobileNavOpen(isOpen) {
  if (!mobileNav || !openButton) {
    return;
  }

  mobileNav.classList.toggle('is-open', isOpen);
  mobileNav.setAttribute('aria-hidden', String(!isOpen));
  openButton.setAttribute('aria-expanded', String(isOpen));
  document.documentElement.classList.toggle('mobile-nav-open', isOpen);
}

if (mobileNav && openButton) {
  openButton.addEventListener('click', () => setMobileNavOpen(true));

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => setMobileNavOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMobileNavOpen(false);
    }
  });
}

