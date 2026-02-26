# speclynx-editor

Browser-based API spec editor powered by [SpecLynx OpenAPI Toolkit](https://speclynx.com/).

Edit, validate, and preview OpenAPI, AsyncAPI, and JSON Schema specifications directly in your browser — no installation required.

## Features

- **Full SpecLynx Extension** — validation, autocompletion, hover docs, preview
- **Zero Install** — runs entirely in the browser as static assets
- **Offline-First** — your specs never leave your machine
- **Pre-loaded Samples** — start exploring immediately

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Produces static assets in `dist/` that can be deployed to any static hosting (GitHub Pages, Netlify, etc.).

## Tech Stack

- [monaco-vscode-api](https://github.com/CodinGame/monaco-vscode-api) — Full VSCode API for Monaco Editor
- [SpecLynx OpenAPI Toolkit](https://marketplace.visualstudio.com/items?itemName=SpecLynx.vscode-openapi-toolkit) — API spec intelligence
- [Vite](https://vitejs.dev/) — Build tool

## License

Apache 2.0
