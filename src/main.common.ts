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
  ExtensionHostKind.LocalProcess
)

void getApi().then(async (vscode) => {
  const petstoreUri = vscode.Uri.file('/workspace/petstore.yaml')
  await vscode.workspace.openTextDocument(petstoreUri)
})
