import './style.css'
import productIconUrl from './product-icon.png'
import { ExtensionHostKind, registerExtension } from '@codingame/monaco-vscode-api/extensions'

// Set --product-icon from JS so the URL is absolute at runtime. Defining it in CSS
// produces a relative url() whose base is the source stylesheet, which Chrome does
// not preserve when the variable is consumed across the workbench's shadow DOM —
// the icon then 404s as /product-icon-<hash>.png instead of /assets/product-icon-<hash>.png.
document.documentElement.style.setProperty('--product-icon', `url(${productIconUrl})`)

// Language extensions needed for API specs
import '@codingame/monaco-vscode-json-default-extension'
import '@codingame/monaco-vscode-yaml-default-extension'
import '@codingame/monaco-vscode-markdown-basics-default-extension'

// Theme extensions
import '@codingame/monaco-vscode-theme-seti-default-extension'

// Utility extensions
import '@codingame/monaco-vscode-references-view-default-extension'
import '@codingame/monaco-vscode-search-result-default-extension'
import '@codingame/monaco-vscode-configuration-editing-default-extension'

const { getApi } = registerExtension(
  {
    name: 'speclynx-editor-main',
    publisher: 'speclynx',
    version: '1.0.0',
    engines: {
      vscode: '*'
    }
  },
  ExtensionHostKind.LocalProcess,
  { system: true }
)

void getApi().then(async (vscode) => {
  // The default document opened on startup. The other sample specs (one per supported
  // OpenAPI version × format) live in the Explorer tree for the user to open on demand —
  // opening all six on startup is too noisy.
  const petstoreUri = vscode.Uri.file('/workspace/petstore-3.1.yaml')

  const EXTENSION_ID = 'speclynx.vscode-openapi-toolkit'
  const waitFor = async (predicate: () => boolean | Promise<boolean>) => {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      if (await predicate()) return true
      await new Promise(r => setTimeout(r, 300))
    }
    return false
  }

  // Open extension detail first (first content in editor area — no switch).
  // The VSIX activates asynchronously in the worker extension host, so on a cold
  // start (e.g. after an IndexedDB cache clear) it may not be registered yet —
  // calling `extension.open` too early throws "Extension not found" and would abort
  // the whole startup chain. Wait for it to register, and never let it throw: the
  // sample tab below must open regardless.
  await waitFor(() => vscode.extensions.getExtension(EXTENSION_ID) != null)
  try {
    await vscode.commands.executeCommand('extension.open', EXTENSION_ID)
  } catch {
    // Extension detail is non-essential — proceed to open the sample tab.
  }

  // Open petstore-3.1.yaml on top (forward motion, covers extension detail)
  const doc = await vscode.workspace.openTextDocument(petstoreUri)
  await vscode.window.showTextDocument(doc, { preview: false })

  // Wait for the OpenAPI Toolkit preview command to become available
  const ready = await waitFor(async () =>
    (await vscode.commands.getCommands(true)).includes('openapiToolkit.preview')
  )

  if (ready) {
    // Open rendered API preview to the side
    await vscode.commands.executeCommand('openapiToolkit.preview')
  }
  // Ensure petstore-3.1.yaml in the left group is focused
  await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup')
})
