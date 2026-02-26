import type { RegisterLocalExtensionResult } from '@codingame/monaco-vscode-api/extensions'
import { registerExtension } from '@codingame/monaco-vscode-api/extensions'

// Register the SpecLynx themes as a VSCode extension.
// extHostKind is undefined (not LocalProcess) so contributions are
// processed synchronously when the extension service starts, matching
// how built-in theme extensions work in monaco-vscode-api.
//
// IMPORTANT: The `id` field becomes the `settingsId` used by the theme service
// to match against "workbench.colorTheme" in user configuration. It must match
// the value set in configuration.json / configurationDefaults exactly.
//
// The cast to RegisterLocalExtensionResult is needed because the overload for
// undefined extHostKind returns the base type, but registerFileUrl is available
// at runtime (same pattern used by built-in theme extension packages).
const { registerFileUrl } = registerExtension(
  {
    name: 'speclynx-theme',
    publisher: 'speclynx',
    version: '1.0.0',
    engines: { vscode: '*' },
    contributes: {
      themes: [
        {
          id: 'SpecLynx Light',
          label: 'SpecLynx Light',
          uiTheme: 'vs',
          path: './themes/speclynx-light.json'
        },
        {
          id: 'SpecLynx Dark',
          label: 'SpecLynx Dark',
          uiTheme: 'vs-dark',
          path: './themes/speclynx-dark.json'
        }
      ]
    }
  },
  undefined,
  { system: true }
) as RegisterLocalExtensionResult

registerFileUrl('./themes/speclynx-light.json', new URL('./speclynx-light.json', import.meta.url).href)
registerFileUrl('./themes/speclynx-dark.json', new URL('./speclynx-dark.json', import.meta.url).href)
