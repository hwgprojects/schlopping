# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and layout (entry point is `app/page.tsx`, global styles in `app/globals.css`).
- `components/`: Shared UI blocks and shadcn components.
- `components/ui/`: shadcn UI primitives (button, card, input, etc.).
- `lib/`: Utility helpers and shared logic.
- `public/`: Static assets served at the site root.

## Build, Test, and Development Commands
- `npm run dev`: Start the local Next.js dev server.
- `npm run build`: Build the app (static export via `next.config.ts`).
- `npm run start`: Run the production server (mostly for local verification).
- `npm run lint`: Run ESLint checks.
- `npm run predeploy`: Build for GitHub Pages (static export).
- `npm run deploy`: Publish `out/` to the `gh-pages` branch.

## Coding Style & Naming Conventions
- TypeScript + React 19 with App Router.
- Indentation: 2 spaces, use double quotes in TS/TSX to match existing files.
- Components use `PascalCase` (e.g., `ComponentExample`), functions use `camelCase`.
- Prefer Tailwind utility classes; keep UI primitives in `components/ui/`.
- Use `npm run lint` before submitting changes.

## Testing Guidelines
- No automated test framework is configured yet.
- If adding tests, document how to run them and keep filenames consistent (e.g., `*.test.tsx`).

## Commit & Pull Request Guidelines
- Current history only includes the initial scaffold commit; no established convention yet.
- Recommended: concise, imperative commit messages (e.g., “Add live sync list”).
- PRs should include:
  - A clear description of changes and rationale.
  - Screenshots or a short video for UI changes.
  - Notes on manual testing steps (since no automated tests are present).

## Configuration & Deployment Notes
- Static export is enabled in `next.config.ts` and deploys to GitHub Pages.
- `homepage` in `package.json` controls the base path; keep it in sync with the repo.
- The deploy pipeline publishes `out/` using `gh-pages` with `.nojekyll`.
