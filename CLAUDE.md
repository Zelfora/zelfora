# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Zelfora is a restaurant ordering website: browse restaurants and menus, fill a cart, place orders, and manage an account. It is a single-page app built with React 19, Vite, Tailwind CSS v4 and React Router 7, written in plain JavaScript (JSX, no TypeScript), with Supabase for the database and auth. There is no backend server of its own.

## Commands

```
npm run dev       # Vite dev server
npm run build     # production build into dist/
npm run preview   # serve the built dist/
npm run lint      # ESLint
```

There is no test suite.

The app needs a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Without them, `src/supabaseClient.js` throws at startup.

## Architecture

### Supabase: the database enforces security
The browser talks to Supabase directly with the public anon key, so Row Level Security and database triggers are the only real protection. Anything added to the frontend that reads or writes data needs a matching RLS policy.

- `supabase/schema.sql` is a reference snapshot of the public tables, exported from the dashboard. Keep it current when the schema changes.
- `supabase/auth_hardening.sql` holds the RLS policies for `restaurants`, `menu_items` and `orders`, plus the order-validation trigger. The `profiles` policies (users can view and update only their own row) were created in the dashboard; they are listed in the header of `schema.sql`. It is run by hand in the Supabase SQL Editor and is written to be safe to re-run (`drop ... if exists` / `create or replace`). New database changes follow the same pattern.
- There are no Supabase CLI migrations. The live database can contain objects that aren't in the repo, for example whatever creates a `profiles` row on signup (`orders.user_id` references `profiles.id`).

**Orders:** `Cart.jsx` inserts `items` as `[{ menu_item_id, name, price, quantity }]` along with a `total`. The `validate_order` trigger (BEFORE INSERT) then overwrites `user_id` with `auth.uid()`, looks up every item's name and price in `menu_items` (the item must belong to the order's restaurant), and recomputes `total`. Never trust client-sent prices. Users can only select and insert their own orders; there are no update or delete policies.

### Providers
`main.jsx` nests the providers as `ThemeProvider > LanguageProvider > AuthProvider > CartProvider`. Each one exposes a hook (`useTheme`, `useTranslation`, `useAuth`, `useCart`) that throws when used outside its provider. The order matters: `CartProvider` calls `useTranslation`.

- **Auth** (`context/AuthContext.jsx`) wraps Supabase auth. `ProtectedRoute` sends signed-out users to `/login` with `state.from`, and `Login` returns them there after signing in. `changePassword` first re-verifies the current password. Auth errors are shown through `authErrorMessage`, which looks up the translation key `authError.<supabase error code>` and falls back to Supabase's message.
- **Cart** (`context/CartContext.jsx`) lives in memory only, so it is lost on reload. It holds items from a single restaurant; adding from another restaurant asks for confirmation and then clears the cart.

### Translations
All user-visible text goes through `t('dotted.key', { vars })` from `useTranslation()`. The strings live in `src/i18n/translations.js` in three languages: `nl` (the default and the fallback for missing keys), `en` and `de`. When adding text, add the key to all three. Use `formatPrice` (EUR) and `formatDate` from the same hook rather than formatting by hand.

### Theming
Tailwind v4 is configured in CSS, not in a JS config file. The design tokens are defined in `@theme` in `src/index.css` (`bg`, `surface`, `border`, `text`, `text-muted`, `primary-*`, `accent-*`, `danger`, …). Dark is the default. The light theme overrides the same CSS variables under `:root[data-theme="light"]`. Use the token classes (`bg-surface`, `text-text-muted`) rather than raw colors so both themes work, and when adding a color token, also add its light override.

An inline script in `index.html` applies the saved or system theme before React loads, to avoid a flash of the wrong theme. It duplicates the storage key `zelfora.theme` and the `theme-color` values from `ThemeContext.jsx`, so keep the two in sync. `localStorage` access (`zelfora.theme`, `zelfora.lang`) is always wrapped in try/catch.

## Settled decisions

- **iOS login email field:** Safari does not show Text Replacement shortcuts or email suggestions in the login email field. Every markup workaround was tested on a real iPhone and failed, including a two-step flow, attribute changes and moving the field out of the form. `Login.jsx` deliberately uses standard markup (one `<form>`, `type="email"`, `autocomplete` set to `username`/`current-password`/`new-password`). Don't retry this. Point to iCloud Keychain autofill instead.
