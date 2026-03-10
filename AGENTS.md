# Repository Guidelines

## Project Structure & Module Organization
`src/App.jsx` coordinates routing-like view switches, session state, and cloud/local storage flows. Keep screen components in `src/components/` (`AdminView.jsx`, `SignerView.jsx`, `PrintPreview.jsx`) and shared logic in `src/lib/` (`sessions.js`, `storage.js`, `staff.js`, `print.js`). `src/styles.css` holds global styling, `index.html` is the Vite entry page, and `dist/` is generated build output. Root-level `site-*.png` files are reference screenshots, not runtime assets.

## Build, Test, and Development Commands
Use npm scripts from the repository root:

- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server for local work.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle for a final browser check.

There are no test or lint scripts configured yet, so `npm run build` is the minimum pre-merge validation step.

## Coding Style & Naming Conventions
Match the existing codebase: 2-space indentation, semicolons, double quotes, and trailing commas in multiline objects and JSX. Use PascalCase for React components (`CloudSetupView.jsx`), camelCase for functions and state helpers (`handleSaveSignature`), and UPPER_SNAKE_CASE for exported constants (`DEFAULT_CLOUD_CONFIG`). Keep parsing, persistence, and sync logic in `src/lib/` rather than embedding it in UI components. Do not edit `dist/` or `node_modules/` manually.

## Testing Guidelines
This project currently relies on manual verification. For behavior changes, test both storage modes:

- Local mode: create, update, delete, and print sessions backed by `localStorage`.
- Cloud mode: verify reads and writes against a valid Google Apps Script endpoint through `src/lib/sessions.js`.

If you add automated coverage, place tests beside the related module as `*.test.js` or `*.test.jsx` and prefer Vitest to stay aligned with Vite.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so no repository-specific commit convention can be inferred. Use short imperative Conventional Commit-style messages such as `feat: add roster import validation` or `fix: preserve signatures during staff sync`. Pull requests should include a clear summary, manual test steps, screenshots for UI changes, and notes for any local storage key or Apps Script configuration changes.
