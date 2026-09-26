# Zelfora

Zelfora is a restaurant ordering website. Visitors can browse restaurants and their menus. Signed-in users can fill a cart, place an order and see their past orders. Restaurant owners can register their restaurant, change its photo and manage its menu in the restaurant portal at `/partner`. Wherever the site shows a photo, users can upload one or paste a link. The site is available in Dutch, English and German, with a light and a dark theme.

## Tech stack

- [React](https://react.dev) 19 with [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com) v4
- [React Router](https://reactrouter.com) 7
- [Supabase](https://supabase.com) for the database and user accounts

## Getting started

You need Node.js 20.19 or newer and access to the Zelfora Supabase project.

1. Install the dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the Supabase project URL and the publishable (anon) key. Both are in the Supabase dashboard under the project's API settings. `.env` is ignored by git.
3. Start the development server:
   ```
   npm run dev
   ```

## Scripts

| Command           | What it does                                |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Starts the development server               |
| `npm run build`   | Builds the production site into `dist/`     |
| `npm run preview` | Serves the production build locally         |
| `npm run lint`    | Checks the code with ESLint                 |

## Database

The website talks to Supabase directly from the browser. The anon key is public by design, so the data is protected by Row Level Security (RLS) policies in the database.

- `supabase/schema.sql` is a reference copy of the database tables. It is not meant to be run.
- `supabase/restaurant_owners.sql` lets restaurant owners register a restaurant, manage its menu items and change its photo, and keeps new restaurants hidden until they are approved.
- `supabase/images.sql` creates the `images` storage bucket for uploaded photos and adds profile photos.
- `supabase/auth_hardening.sql` sets up the order policies and a trigger that checks every order and recalculates its prices on the server.

Run them in the Supabase SQL Editor in this order: `restaurant_owners.sql`, `auth_hardening.sql`, `images.sql`. All three are safe to run more than once, so after a change you can simply run the changed file again.

### Database access for Claude Code

`.mcp.json` connects Claude Code to Supabase's official MCP server, scoped to this project. There are two servers: `supabase` (read-only) and `supabase-write` (every call needs your approval). To connect, start a new Claude Code conversation, type `/mcp`, and choose **Authenticate** for each server. This opens a Supabase login in your browser; no keys are stored in the repo. See "Database access from Claude Code" in `CLAUDE.md` for how it's used.

### Approving a restaurant

A newly registered restaurant is only visible to its owner. To put it online, open the `restaurants` table in the Supabase Table Editor and set `published` to `true`. To give an existing restaurant to an owner, set its `owner_id` to the owner's user id.

### Email confirmation links

After signing up, the confirmation email sends new users back to the page they came from, such as the restaurant portal. Supabase only allows this for known addresses, so add your site with a wildcard under Authentication > URL Configuration > Redirect URLs (for example `https://zelfora.nl/**` and `http://localhost:5173/**`). Otherwise, users land on the Site URL instead.

## Project structure

```
src/
  pages/        one component per route (home, restaurant, cart, orders, profile, login, partner)
  components/   shared UI such as the navbar, cards and switchers
  context/      app-wide state: auth, cart, language and theme
  services/     image resizing, uploads and clean-up
  i18n/         translations for nl, en and de
supabase/       database schema and SQL scripts
```
