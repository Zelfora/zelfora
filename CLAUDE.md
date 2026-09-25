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
- `supabase/restaurant_owners.sql` adds restaurant ownership: the `owner_id` and `published` columns, CHECK constraints, and the policies that let owners read, add, edit and delete their menu items and change their restaurant's image.
- `supabase/images.sql` creates the `images` Storage bucket and its policies, and adds `profiles.avatar_url`.
- `supabase/auth_hardening.sql` enables RLS and holds the `orders` policies plus the order-validation trigger. Run `restaurant_owners.sql` first. Don't re-add a `using (true)` read policy for restaurants or menu items: policies are OR'ed, so it would expose unpublished restaurants.
- The `profiles` policies (users can view and update only their own row) were created in the dashboard; they are listed in the header of `schema.sql`.
- The SQL files are run by hand in the Supabase SQL Editor and are written to be safe to re-run (`drop ... if exists` / `create or replace`). New database changes follow the same pattern.
- There are no Supabase CLI migrations. The live database can contain objects that aren't in the repo, for example whatever creates a `profiles` row on signup (`orders.user_id` references `profiles.id`).

**Orders:** `Cart.jsx` inserts `items` as `[{ menu_item_id, name, price, quantity }]` along with a `total`. The `validate_order` trigger (BEFORE INSERT) then overwrites `user_id` with `auth.uid()`, looks up every item's name and price in `menu_items` (the item must belong to the order's restaurant), and recomputes `total`. It also rejects orders for unpublished restaurants. Never trust client-sent prices. Users can only select and insert their own orders; there are no update or delete policies.

### Restaurant owners (`/partner`)
Any signed-in user can register one restaurant (enforced by a unique index on `owner_id`). On `/partner` they change its photo and add, edit and delete menu items in place. There is no role column: someone is an owner because their id is in `restaurants.owner_id`. Keep it that way, because users can update their own `profiles` row.

- A BEFORE INSERT trigger (`prepare_new_restaurant`) forces `owner_id = auth.uid()`, `published = false` and `rating = null` for inserts from the app. The admin approves a restaurant by setting `published = true` in the Table Editor. There is no admin UI.
- Customers only see published restaurants and their menu items. Owners also see their own, and `RestaurantDetail` then shows a preview banner and hides the add-to-cart buttons.
- Owners can update only the columns granted in `restaurant_owners.sql` (currently just `image`), so they can't publish their own restaurant. To make more restaurant fields editable, add them to that grant. Menu items have ownership-checked update and delete policies. Restaurants can't be deleted by owners.
- Deleting a menu item doesn't affect past orders: `orders.items` is a snapshot, not a foreign key.
- Owner-entered data can be incomplete: `FoodImage` falls back to a placeholder for missing or broken images, and `StarRating` shows "New" when `rating` is null.
- `src/pages/Partner.jsx` is not wrapped in `ProtectedRoute`: signed-out visitors see an intro that links to `/login` with `state.from`.
- Shared form classes and euro amount parsing live in `components/formHelpers.js`.

### Images
Every image on the site can be either an uploaded photo or a pasted https link. Always build image fields with the shared pieces below; don't add a one-off upload.

- **Storage:** one public Supabase Storage bucket, `images` (`supabase/images.sql`). Files live at `<user id>/<kind folder>/<random uuid>.webp`. The storage policies only check that the first folder is the uploader's own id, so a new image kind needs no new storage policy. Whether the image may be set on a particular row is checked by that table's RLS when the URL is saved.
- **Database:** an image is a plain text column holding a URL (`restaurants.image`, `menu_items.image`, `profiles.avatar_url`), with an https CHECK constraint. Uploads and links look the same to every page that displays images.
- **`services/images.js`** holds all image logic. `IMAGE_KINDS` sets each kind's folder, resize limit and preview shape. `prepareImage` resizes a picked photo in the browser and encodes it as WebP (JPEG where the browser can't write WebP). `commitImage` uploads a pending photo when the form is saved, stores the URL through a `save(url)` callback, and deletes the replaced file afterwards (or the new one if saving failed). `deleteStoredImage` removes a file when its row is deleted; it ignores external links and never throws.
- **UI:** `ImageInput` is the upload-or-link picker (wrap it in `<FormField group>`). `SingleImageForm` is ImageInput plus a save button, for "change this one photo" screens. `FoodImage` and `Avatar` display images with a fallback. Uploads are deferred until save, so cancelling a form leaves no stray files.
- **Adding a new image kind** (for example a restaurant logo or category images):
  1. Add a text column with an https CHECK constraint, and an update policy or column grant so the right users can set it.
  2. Add an entry to `IMAGE_KINDS`.
  3. Use `ImageInput` with `commitImage` in its form, or `SingleImageForm`.
  4. Call `deleteStoredImage` when the row is deleted.
- **Several images per row** (a gallery, photos on a review): use a child table with one URL per row (for example `restaurant_photos(id, restaurant_id, url, position)`), not an array column. The bucket, policies and helpers stay the same.
- **Known gaps:**
  - A file can be left behind if the tab closes between upload and save, or if a delete fails. A scheduled cleanup (an Edge Function comparing `storage.objects` with the image columns) can remove these later.
  - Each uploaded URL should belong to one field. Replacing or deleting it removes the file even if the same URL was pasted elsewhere.
  - Only the uploader can delete their files. If a restaurant gets a new owner, the photos the previous owner uploaded stay in storage when they are replaced.
- **Later, for performance:** images are served at their uploaded size. Resized variants can be added in one place by rewriting our own URLs to Supabase's image transformation endpoint (paid plans) or a CDN. External links can't be resized.

### Providers
`main.jsx` nests the providers as `ThemeProvider > LanguageProvider > AuthProvider > CartProvider`. Each one exposes a hook (`useTheme`, `useTranslation`, `useAuth`, `useCart`) that throws when used outside its provider. The order matters: `CartProvider` calls `useTranslation`.

- **Auth** (`context/AuthContext.jsx`) wraps Supabase auth. `ProtectedRoute` sends signed-out users to `/login` with `state.from`, and `Login` returns them there after signing in. After a new sign-up, the email confirmation link also leads there, provided the URL is allowed under Auth > URL Configuration > Redirect URLs. It also loads the signed-in user's `profiles` row as `profile` (for `avatar_url`), and `updateProfile` saves changes to it. `changePassword` first re-verifies the current password. Auth errors are shown through `authErrorMessage`, which looks up the translation key `authError.<supabase error code>` and falls back to Supabase's message.
- **Cart** (`context/CartContext.jsx`) lives in memory only, so it is lost on reload. It holds items from a single restaurant; adding from another restaurant asks for confirmation and then clears the cart.

### Translations
All user-visible text goes through `t('dotted.key', { vars })` from `useTranslation()`. The strings live in `src/i18n/translations.js` in three languages: `nl` (the default and the fallback for missing keys), `en` and `de`. When adding text, add the key to all three. Use `formatPrice` (EUR) and `formatDate` from the same hook rather than formatting by hand.

### Theming
Tailwind v4 is configured in CSS, not in a JS config file. The design tokens are defined in `@theme` in `src/index.css` (`bg`, `surface`, `border`, `text`, `text-muted`, `primary-*`, `accent-*`, `danger`, …). Dark is the default. The light theme overrides the same CSS variables under `:root[data-theme="light"]`. Use the token classes (`bg-surface`, `text-text-muted`) rather than raw colors so both themes work, and when adding a color token, also add its light override.

An inline script in `index.html` applies the saved or system theme before React loads, to avoid a flash of the wrong theme. It duplicates the storage key `zelfora.theme` and the `theme-color` values from `ThemeContext.jsx`, so keep the two in sync. `localStorage` access (`zelfora.theme`, `zelfora.lang`) is always wrapped in try/catch.

## Settled decisions

- **iOS login email field:** Safari does not show Text Replacement shortcuts or email suggestions in the login email field. Every markup workaround was tested on a real iPhone and failed, including a two-step flow, attribute changes and moving the field out of the form. `Login.jsx` deliberately uses standard markup (one `<form>`, `type="email"`, `autocomplete` set to `username`/`current-password`/`new-password`). Don't retry this. Point to iCloud Keychain autofill instead.
