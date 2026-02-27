import './style.css'
import { ExtensionHostKind, registerExtension } from '@codingame/monaco-vscode-api/extensions'

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
  const petstoreUri = vscode.Uri.file('/workspace/petstore.yaml')

  // Open extension detail first (first content in editor area — no switch)
  await vscode.commands.executeCommand('extension.open', 'speclynx.vscode-openapi-toolkit')
  // Open petstore.yaml on top (forward motion, covers extension detail)
  const doc = await vscode.workspace.openTextDocument(petstoreUri)
  await vscode.window.showTextDocument(doc, { preview: false })

  // Wait for the OpenAPI Toolkit preview command to become available
  const ready = await (async () => {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      const cmds = await vscode.commands.getCommands(true)
      if (cmds.includes('openapiToolkit.preview')) return true
      await new Promise(r => setTimeout(r, 300))
    }
    return false
  })()

  if (ready) {
    // Open rendered API preview to the side
    await vscode.commands.executeCommand('openapiToolkit.preview')
  }
  // Ensure petstore.yaml in the left group is focused
  await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup')
})
