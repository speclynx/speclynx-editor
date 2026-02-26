# CLAUDE.md — SpecLynx Editor Developer Guide

## What Is This?

A browser-based VSCode workbench with the SpecLynx OpenAPI Toolkit extension pre-loaded. Built on [monaco-vscode-api](https://github.com/CodinGame/monaco-vscode-api) — "VSCode as a library". Users get a full editor experience for API specs without installing anything.

**Not a VSCode fork.** This assembles VSCode UI components via service overrides. The architecture follows monaco-vscode-api conventions (flat setup files, manual service composition), not VSCode's internal layered architecture.

## Architecture

```
src/
├── entry.ts                  # Entry point — loads loader.ts
├── loader.ts                 # Locale detection → loads language pack if ?locale=xx → boots main.workbench
├── main.workbench.ts         # Imports setup.workbench (initializes services) then main.common
├── setup.workbench.ts        # Creates DOM container (shadow DOM), calls initializeMonacoService
│                               with all service overrides. Version-based IndexedDB cache clear.
├── setup.common.ts           # The big config file:
│                               - All service overrides (what VSCode features are active)
│                               - Virtual filesystem (petstore.yaml sample)
│                               - Web workers (editor, extension host, textmate, search, etc.)
│                               - Workbench options (branding, layout, gallery, window title)
│                               - Exports constructOptions & commonServices for setup.workbench
├── main.common.ts            # Registers language extensions (JSON, YAML, Markdown), seti icon theme,
│                               utility extensions, opens petstore.yaml on startup
├── style.css                 # Global styles — workbench layout, product icon sizing
├── types.d.ts                # TypeScript ambient declarations
│
├── theme/                    # SpecLynx color themes
│   ├── index.ts              # Registers themes as a VSCode extension (Light + Dark)
│   ├── speclynx-light.json   # Light theme token colors
│   └── speclynx-dark.json    # Dark theme token colors
│
├── features/                 # Feature modules
│   ├── galleryFilter.ts      # Intercepts fetch to hide bundled extension from marketplace search
│   └── notifications.ts      # Notification handling
│
├── user/                     # Default user settings (loaded before services init)
│   ├── configuration.json    # Default editor/workbench settings (theme, font size, startup, etc.)
│   └── keybindings.json      # Default keybindings
│
├── samples/                  # Sample files loaded into the virtual filesystem
│   └── petstore.yaml         # Petstore OpenAPI spec — the default document
│
└── tools/                    # Internal utilities
    ├── fakeWorker.ts         # Worker wrapper for Vite compatibility
    └── extHostWorker.ts      # Extension host worker bridge
```

### Boot Sequence

```
entry.ts → loader.ts → [language pack?] → main.workbench.ts
                                              ├── setup.workbench.ts  (cache clear → DOM → initializeMonacoService)
                                              └── main.common.ts      (extensions → open petstore.yaml)
                                                    └── setup.common.ts  (services, filesystem, workers, config)
```

### Key Files

- **`setup.common.ts`** defines *what* services and config exist
- **`setup.workbench.ts`** *initializes* them into a DOM container
- **`main.common.ts`** loads the *extensions* that run on top

## Extension Bundling

The SpecLynx OpenAPI Toolkit extension is bundled via `@codingame/monaco-vscode-rollup-vsix-plugin`:

```ts
import '../extensions/speclynx-openapi-toolkit.vsix'
```

The VSIX file lives in `extensions/` and is imported directly in `setup.common.ts`.

### Patches (`patches/apply.sh`)

Post-install patches make bundled extensions behave as **user-installed** rather than hidden built-ins:

1. `rollup-vsix-plugin.js`: `system: true` → `system: false` (visible in Extensions panel)
2. `extensions.js`: `isBuiltin: true` → `isBuiltin: system` (respects the system flag)

Without these, the extension would be invisible in the UI — registered as a system/built-in extension.

**Run after `npm install`** via the `postinstall` script.

### Gallery Filter (`features/galleryFilter.ts`)

Intercepts `fetch()` calls to the Open-VSX marketplace and filters out `speclynx.vscode-openapi-toolkit` from search results. This prevents users from seeing/installing a duplicate of the pre-bundled extension.

**Important implementation details:**
- Consumes `response.json()` directly (not via `.clone()`) and reconstructs the Response with properly copied headers
- Updates `TotalCount` in result metadata after filtering, otherwise VSCode shows an error when all results are filtered out
- The old approach of using `response.clone().json()` caused header corruption in the reconstructed Response

## Branding

- **Title bar:** `productConfiguration.nameShort` = "SpecLynx Editor", `applicationName` = "speclynx-editor"
- **Window title:** `'SpecLynx Editor${separator}${dirty}${activeEditorShort}'`
- **Status bar:** Shows "SpecLynx Editor" via `windowIndicator.label`
- **HTML title:** Set in `index.html`
- **Product icon:** `src/product-icon.png`, injected into shadow DOM via CSS
- **Favicon:** `public/favicon.ico` + `public/speclynx-logo.svg`

## Themes

Only two color themes are available: **SpecLynx Light** (default) and **SpecLynx Dark**.

All built-in VSCode themes were removed:
- `@codingame/monaco-vscode-theme-defaults-default-extension` (8 themes: Dark+, Light+, etc.)
- `@codingame/monaco-vscode-theme-2026-default-extension` (2 themes: VS Code Light/Dark)

The Seti icon theme (`@codingame/monaco-vscode-theme-seti-default-extension`) is kept for file icons.

## Service Overrides — What's Included and What's Not

### Included (essential for API spec editing)
- Configuration, Keybindings, Model, Theme, Languages, Textmate, TreeSitter — core editor
- Extension, ExtensionGallery — extension system + Open-VSX marketplace
- Notification, Dialogs — UI basics
- StatusBar, TitleBar, Banner — workbench UI
- Explorer — file tree
- Search, Markers — find/problems panel
- Storage, Environment, Lifecycle, Log — infrastructure
- WorkspaceTrust, WorkingCopy — file handling
- Preferences — settings UI
- Snippets, Output — useful for extensions
- Accessibility — a11y
- LanguageDetection — auto-detect file types
- Outline — document structure
- Localization — i18n support
- SCM — source control (for future git/gist integration)
- MultiDiffEditor — side-by-side spec comparison

### Removed (not needed)
- Debug, Terminal, Testing — no runtime execution
- Chat, AI, MCP — no AI features
- Notebook, Interactive — no notebook support
- Task — no task runner
- Timeline, Comments — no git history/PR context
- EditSessions, UserDataSync, UserDataProfile — no cloud sync
- Emmet — HTML shortcuts, irrelevant for YAML/JSON
- RemoteAgent, Authentication, SecretStorage — no remote/OAuth
- Issue, Share, Speech, Survey, Update, Relauncher — desktop/platform features
- Telemetry, Performance, Assignment — tracking/experiments
- Welcome, ProcessController, ImageResize — unused UI

All removed services are one-line imports to restore if needed later.

### Language Extensions — What's Included
- **JSON** — OpenAPI/AsyncAPI specs
- **YAML** — OpenAPI/AsyncAPI specs
- **Markdown** — README rendering

Removed: HTML, CSS, JavaScript, TypeScript (not needed; SpecLynx extension activates on `onLanguage:json` and `onLanguage:yaml` only).

## IndexedDB Cache Versioning

`setup.workbench.ts` implements version-based cache clearing. When `EDITOR_VERSION` is bumped, all `vscode-*` and `workbench-*` IndexedDB databases are cleared on next visit. This ensures returning users get fresh branding/config after updates.

**Bump `EDITOR_VERSION` when:** changing default theme, branding, configuration defaults, or anything stored in IndexedDB.

The `?resetLayout` URL parameter also forces a layout reset (useful for development).

## COEP/COOP Headers

The editor requires these headers for SharedArrayBuffer (used by language features):

```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: cross-origin
```

Vite dev server sets these via `configureServer` in `vite.config.ts`. Production hosting must set them too.

## Development

```bash
npm install          # Also runs patches/apply.sh via postinstall
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # Production build → dist/ (~98MB, ~1m18s)
npm run preview      # Preview production build
```

**Build size note:** 98MB total is expected for a full VSCode workbench. The main JS bundle is ~12MB (3MB gzipped). Most of the size is tree-sitter WASM files, i18n JSON, and the SpecLynx extension assets.

### Vite Cache

After modifying `node_modules` (e.g., re-running patches), clear Vite's transform cache:

```bash
rm -rf node_modules/.vite
```

### URL Parameters

- `?resetLayout` — force layout reset (clears stale state)
- `?locale=xx` — set UI language (e.g., `?locale=cs` for Czech)
- `?disableShadowDom` — render without shadow DOM (debugging)
- `?htmlFileSystemProvider` — use HTML file system instead of in-memory

## Lessons Learned

1. **Start from the working demo, then customize.** Building a minimal setup from scratch is much harder than trimming the full demo — too many implicit dependencies between services.

2. **`postinstall` patches are fragile.** They won't survive `npm update` on the patched packages. Document what they do and why.

3. **IndexedDB persists old config.** Users who visited before a branding change will see stale settings. The version-based cache clear solves this.

4. **Response construction is tricky.** When intercepting `fetch()`, using `response.clone().json()` then passing `response.headers` to a new `Response()` can produce corrupt headers. Consume `.json()` directly and copy headers manually via `new Headers()`.

5. **Shadow DOM blocks headless testing.** Playwright with default headless Chromium can't render the shadow DOM workbench. Use `headless: false` with `args: ['--headless=new']` for screenshots, but even that is unreliable.

6. **COEP headers affect cross-origin requests.** The `Cross-Origin-Embedder-Policy: credentialless` header can block requests to services that don't send `Cross-Origin-Resource-Policy`. Open-VSX works because it supports CORS, but other services might not.

7. **Service overrides are modular.** Removing a service override is a one-line deletion. Restoring it is a one-line addition. Don't be afraid to trim aggressively — you can always add things back.
