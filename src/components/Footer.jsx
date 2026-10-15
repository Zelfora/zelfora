import ThemeSwitcher from './ThemeSwitcher';

// Holds the theme switch for visitors who aren't signed in (the navbar only
// has it in the account menu). cart-shift moves it aside for the cart panel
// on a restaurant page, like the page above it.
function Footer() {
  return (
    <footer className="cart-shift border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-text-muted sm:flex-row sm:justify-between md:px-8">
        <span className="font-display font-semibold text-text">Zelfora</span>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}

export default Footer;
