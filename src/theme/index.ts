import { ExtensionHostKind } from '@codingame/monaco-vscode-extensions-service-override'
import { registerExtension } from '@codingame/monaco-vscode-api/extensions'

// Register the SpecLynx themes as a VSCode extension
const { registerFileUrl } = registerExtension(
  {
    name: 'speclynx-theme',
    publisher: 'speclynx',
    version: '1.0.0',
    engines: { vscode: '*' },
    contributes: {
      themes: [
        {
          id: 'speclynx-light',
          label: 'SpecLynx Light',
          uiTheme: 'vs',
          path: './themes/speclynx-light.json'
        },
        {
          id: 'speclynx-dark',
          label: 'SpecLynx Dark',
          uiTheme: 'vs-dark',
          path: './themes/speclynx-dark.json'
        }
      ]
    }
  },
  ExtensionHostKind.LocalProcess,
  { system: true }
)

registerFileUrl('./themes/speclynx-light.json', new URL('./speclynx-light.json', import.meta.url).href)
registerFileUrl('./themes/speclynx-dark.json', new URL('./speclynx-dark.json', import.meta.url).href)
