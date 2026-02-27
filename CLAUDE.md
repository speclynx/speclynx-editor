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
│                               with all service overrides.
├── setup.common.ts           # The big config file:
│                               - All service overrides (what VSCode features are active)
│                               - Virtual filesystem (petstore.yaml sample)
│                               - Web workers (editor, extension host, textmate, search, etc.)
│                               - Workbench options (branding, layout, gallery, window title)
│                               - Version-based IndexedDB cache clear
│                               - Exports constructOptions & commonServices for setup.workbench
├── main.common.ts            # Registers language extensions (JSON, YAML, Markdown), seti icon theme,
│                               utility extensions, orchestrates startup layout (extension detail →
│                               petstore.yaml → API preview)
├── style.css                 # Global styles — workbench layout, product icon sizing
├── types.d.ts                # TypeScript ambient declarations
│
├── theme/                    # SpecLynx color themes
│   ├── index.ts              # Registers themes as a VSCode extension (Light + Dark)
│   ├── speclynx-light.json   # Light theme token colors
│   └── speclynx-dark.json    # Dark theme token colors
│
├── features/                 # Feature modules
│   └── galleryFilter.ts      # Intercepts fetch to hide bundled extension from marketplace search
│
├── types.d.ts                # TypeScript ambient declarations (Window.vscodeContainer)
│
├── user/                     # Default user settings (loaded before services init)
│   ├── configuration.json    # Default editor/workbench settings (theme, font size, startup, etc.)
│   └── keybindings.json      # Default keybindings
│
├── samples/                  # Sample files loaded into the virtual filesystem
│   └── petstore.yaml         # Petstore OpenAPI spec — the default document
│
└── tools/                    # Internal utilities
    └── fakeWorker.ts         # Worker wrapper for Vite compatibility
```

### Boot Sequence

```
entry.ts → loader.ts → [language pack?] → main.workbench.ts
                                              ├── setup.workbench.ts  (cache clear → DOM → initializeMonacoService)
                                              └── main.common.ts      (extensions → startup layout → open preview)
                                                    └── setup.common.ts  (services, filesystem, workers, config)
```

### Key Files

- **`setup.common.ts`** defines *what* services and config exist
- **`setup.workbench.ts`** *initializes* them into a DOM container
- **`main.common.ts`** loads the *extensions* that run on top

## Extension Bundling

The SpecLynx OpenAPI Toolkit extension is bundled as a VSIX file via `@codingame/monaco-vscode-rollup-vsix-plugin`:

```ts
import '../extensions/speclynx-openapi-toolkit.vsix'
```

The VSIX file lives in `extensions/` and is imported directly in `setup.common.ts`. This approach was chosen over marketplace loading (`additionalBuiltinExtensions`) because:
- **Instant activation** (~554ms vs ~2.6s from marketplace)
- **Works offline** — no dependency on Open VSX availability
- **Deterministic** — exact extension version is shipped with the editor
- **Visible under Installed** — shows in the Extensions panel for marketing

### Patches (`patches/apply.sh`)

Post-install patches make the bundled extension visible in the Extensions panel as a user-installed extension:

1. `rollup-vsix-plugin.js`: `system: true` → `system: false` (visible in Extensions panel)
2. `extensions.js`: `isBuiltin: true` → `isBuiltin: system` (respects the system flag)

Without these, the extension would be invisible in the UI — registered as a hidden built-in extension.

**Run after `npm install`** via the `postinstall` script. **Fragile:** patches won't survive `npm update` on the patched packages.

### Glue Extensions

Two internal "glue" extensions are registered in code (not via VSIX):

- **`speclynx-editor-api`** (`setup.workbench.ts`) — calls `.setAsDefaultApi()` to provide VSCode API access. Hidden from panel.
- **`speclynx-editor-main`** (`main.common.ts`) — opens `petstore.yaml` on startup. Hidden from panel via `{ system: true }`.

These are not real extensions — they're runtime registrations needed to interact with the VSCode API. Only the OpenAPI Toolkit should be visible in the Extensions panel.

### Startup Layout Sequence (`main.common.ts`)

The editor opens three things on startup in forward-only order (no back-and-forth tab switching):

1. **Extension detail tab** — `extension.open` (first content, fills empty editor area)
2. **petstore.yaml** — `showTextDocument` (opens on top, covers extension detail)
3. **API preview** — `openapiToolkit.preview` (Scalar renderer, opens to the side)

The preview command is provided by the OpenAPI Toolkit extension, which runs in the worker extension host and takes time to activate. A polling loop waits up to 15 seconds for `openapiToolkit.preview` to become available before executing it.

The `defaultLayout` in `setup.common.ts` does **not** include `petstore.yaml` in its `editors` array — this avoids conflicts between the default layout opening petstore and main.common.ts opening it again. The **Problems panel** is pre-opened via `defaultLayout.views` with `workbench.panel.markers.view`.

### Gallery Filter (`features/galleryFilter.ts`)

Intercepts `fetch()` calls to the Open-VSX marketplace and filters out `speclynx.vscode-openapi-toolkit` from search results. This prevents users from seeing/installing a duplicate of the pre-bundled extension.

**Important implementation details:**
- Consumes `response.json()` directly (not via `.clone()`) and reconstructs the Response with properly copied headers
- Updates `TotalCount` in result metadata after filtering, otherwise VSCode shows an error when all results are filtered out
- The old approach of using `response.clone().json()` caused header corruption in the reconstructed Response

### Trusted Publishers

`productConfiguration.trustedExtensionPublishers` includes `'speclynx'` to suppress the "Do you trust the publisher?" dialog when extensions from SpecLynx are installed (either bundled or from marketplace). This is separate from Open VSX's publisher verification.

## Branding

- **Title bar:** `productConfiguration.nameShort` = "SpecLynx Editor", `applicationName` = "speclynx-editor"
- **Window title:** `'SpecLynx Editor${separator}${dirty}${activeEditorShort}'`
- **Status bar:** Shows "SpecLynx Editor" via `windowIndicator.label`
- **HTML title:** Set in `index.html`
- **Product icon:** `src/product-icon.png`, injected into shadow DOM via CSS
- **Favicon:** `public/favicon.ico` + `public/speclynx-logo.svg`

## Themes

Only two color themes are available: **SpecLynx Light** (default) and **SpecLynx Dark**.

Registered in `src/theme/index.ts` as a VSCode extension. The `id` field in each theme contribution **must match** the `"workbench.colorTheme"` value in `configuration.json` / `configurationDefaults` exactly — the `id` becomes the `settingsId` used by the theme service for matching (`settingsId = theme.id || label`).

Both themes include explicit `editorSuggestWidget.selectedForeground` and `editorSuggestWidget.focusHighlightForeground` colors. Without these, the suggest widget's selected item foreground falls back to `list.activeSelectionForeground` (white), making text invisible on the light selected background.

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

`setup.common.ts` implements version-based cache clearing. When `EDITOR_VERSION` is bumped, all `vscode-*` and `workbench-*` IndexedDB databases are cleared on next visit. This ensures returning users get fresh branding/config after updates.

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

## Deployment

### GitHub Pages

`vite.config.ts` sets `base: './'` so all asset paths in the build output are relative. This allows deployment to any subpath (e.g., `https://org.github.io/speclynx-editor/`) without path issues.

Deploy the `dist/` directory directly to GitHub Pages. The COEP/COOP headers must be configured at the hosting level (e.g., via Cloudflare Workers, a `_headers` file for Netlify, or a service worker for GitHub Pages).

## Development

```bash
npm install          # Also runs patches/apply.sh via postinstall
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # Production build → dist/ (~98MB, ~1m18s)
npm run preview      # Preview production build
```

**Build size note:** ~98MB total is expected for a full VSCode workbench. The main JS bundle is ~12MB (3MB gzipped). Most of the size is tree-sitter WASM files, i18n JSON, and the SpecLynx extension assets.

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

8. **Theme `id` must match config exactly.** In `ColorThemeData.fromExtensionTheme()`, `settingsId = theme.id || label`. The theme contribution `id` field must match the `"workbench.colorTheme"` configuration value exactly (e.g., `'SpecLynx Light'`, not `'speclynx-light'`).

9. **Theme import must come first.** The theme registration (`import './theme'`) must be the first import in `setup.common.ts` — before any service overrides or `localExtensionHost`. This ensures `registerExtension()` is called while `servicesInitialized` is still `false`, placing the theme in `builtinExtensions` for synchronous processing during init.

10. **VSIX bundling beats marketplace loading for core extensions.** `additionalBuiltinExtensions` (marketplace) adds ~2.6s network latency, requires Open VSX availability, and shows extensions under @builtin (not Installed). VSIX bundling activates in ~554ms, works offline, and with patches shows under Installed. Use marketplace loading for optional extensions; bundle core ones.

11. **`extension.open` always steals focus.** The `extension.open` command has no `preserveFocus` option — it always becomes the active editor tab. To avoid visible tab switching, open it as the first content in an empty editor area, then open the desired file on top (forward-only motion).

12. **Extension commands require polling.** VSIX extensions run in the worker extension host and their commands aren't available immediately. Use `vscode.commands.getCommands()` in a polling loop to wait for commands like `openapiToolkit.preview` to become registered.

13. **`editorSuggestWidget` foreground fallback is `list.activeSelectionForeground`.** Without explicit `editorSuggestWidget.selectedForeground`, the suggest widget's selected item text color falls back to `list.activeSelectionForeground` — often white, which is invisible on light backgrounds. Always set it explicitly in themes.

14. **Use `base: './'` for portable builds.** Vite defaults to `base: '/'` which breaks on GitHub Pages (subpath deployment). Setting `base: './'` makes all asset paths relative, working on any hosting path.
