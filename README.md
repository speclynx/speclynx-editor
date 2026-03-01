# SpecLynx Editor

[![Deploy Status](https://github.com/speclynx/speclynx-editor/actions/workflows/deploy.yml/badge.svg)](https://github.com/speclynx/speclynx-editor/actions)
[![Live Demo](https://img.shields.io/badge/demo-editor.speclynx.com-blue)](https://editor.speclynx.com)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-3.0-40c463.svg)](https://github.com/speclynx/speclynx-editor/blob/HEAD/CODE_OF_CONDUCT.md)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/speclynx/speclynx-editor/blob/HEAD/LICENSE)

<div align="center">
    <a href="https://speclynx.com"><img width="636" height="407" alt="SpecLynx Editor" src="https://github.com/user-attachments/assets/1cfd6c8e-0206-4d53-9a2c-e4d10be84ca0" /></a>
</div>

Browser-based API spec editor powered by [SpecLynx OpenAPI Toolkit](https://speclynx.com/openapi-toolkit/).

Edit, validate, and preview OpenAPI, AsyncAPI, and JSON Schema specifications directly in your browser — no installation required.

## Features

- **Full SpecLynx Extension** — validation, autocompletion, hover docs, preview
- **Zero Install** — runs entirely in the browser as static assets
- **Offline-First** — your specs never leave your machine
- **Pre-loaded Samples** — start exploring immediately

## Demo

A live deployment is available at **[editor.speclynx.com](https://editor.speclynx.com)**.

<a href="https://editor.speclynx.com"><img alt="SpecLynx Editor Screenshot" src="https://editor.speclynx.com/speclynx-editor.png" /></a>

Every change merged to `main` is automatically deployed, so the demo always reflects the latest version.

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
- [SpecLynx OpenAPI Toolkit](https://speclynx.com/openapi-toolkit/) — API spec intelligence
- [Vite](https://vitejs.dev/) — Build tool

## License

SpecLynx Editor is licensed under [Apache 2.0 license](https://github.com/speclynx/speclynx-editor/blob/main/LICENSE).
SpecLynx Editor comes with an explicit [NOTICE](https://github.com/speclynx/speclynx-editor/blob/main/NOTICE) file.
