# Zelfora

Zelfora is a restaurant ordering website. Visitors can browse restaurants and their menus. Signed-in users can fill a cart, place an order and see their past orders. The site is available in Dutch, English and German, with a light and a dark theme.

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
- `supabase/auth_hardening.sql` sets up the RLS policies and a trigger that checks every order and recalculates its prices on the server. Run it in the Supabase SQL Editor; it is safe to run more than once.

## Project structure

```
src/
  pages/        one component per route (home, restaurant, cart, orders, profile, login)
  components/   shared UI such as the navbar, cards and switchers
  context/      app-wide state: auth, cart, language and theme
  i18n/         translations for nl, en and de
supabase/       database schema and SQL scripts
```
