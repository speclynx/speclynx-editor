import { initialize as initializeMonacoService } from '@codingame/monaco-vscode-api'
import getWorkbenchServiceOverride from '@codingame/monaco-vscode-workbench-service-override'
import getQuickAccessServiceOverride from '@codingame/monaco-vscode-quickaccess-service-override'
import { ExtensionHostKind } from '@codingame/monaco-vscode-extensions-service-override'
import { registerExtension } from '@codingame/monaco-vscode-api/extensions'
import {
  commonServices,
  constructOptions,
  envOptions,
  disableShadowDom
} from './setup.common'

let container = window.vscodeContainer

if (container == null) {
  container = document.createElement('div')
  container.style.height = '100vh'

  document.body.replaceChildren(container)

  if (!disableShadowDom) {
    const shadowRoot = container.attachShadow({
      mode: 'open'
    })

    // Inject SpecLynx branding styles into shadow DOM
    const brandingStyle = document.createElement('style')
    brandingStyle.textContent = `
      .window-appicon {
        background-size: 28px !important;
        width: 40px !important;
      }
    `
    shadowRoot.appendChild(brandingStyle)

    const workbenchElement = document.createElement('div')
    workbenchElement.style.height = '100vh'
    shadowRoot.appendChild(workbenchElement)
    container = workbenchElement
  }
}

// Override services
await initializeMonacoService(
  {
    ...commonServices,
    ...getWorkbenchServiceOverride(),
    ...getQuickAccessServiceOverride({
      isKeybindingConfigurationVisible: () => true,
      shouldUseGlobalPicker: () => true
    })
  },
  container,
  constructOptions,
  envOptions
)

await registerExtension(
  {
    name: 'speclynx-editor-api',
    publisher: 'speclynx',
    version: '1.0.0',
    engines: {
      vscode: '*'
    }
  },
  ExtensionHostKind.LocalProcess
).setAsDefaultApi()
