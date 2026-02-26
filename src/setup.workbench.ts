import {
  IStorageService,
  getService,
  initialize as initializeMonacoService
} from '@codingame/monaco-vscode-api'
import getWorkbenchServiceOverride from '@codingame/monaco-vscode-workbench-service-override'
import getQuickAccessServiceOverride from '@codingame/monaco-vscode-quickaccess-service-override'
import { BrowserStorageService } from '@codingame/monaco-vscode-storage-service-override'
import { ExtensionHostKind } from '@codingame/monaco-vscode-extensions-service-override'
import { registerExtension } from '@codingame/monaco-vscode-api/extensions'
import {
  commonServices,
  constructOptions,
  envOptions,
  remoteAuthority,
  userDataProvider,
  disableShadowDom
} from './setup.common'

// Version-based cache clear: bump this when branding/config changes
// to ensure returning visitors get fresh settings from IndexedDB
const EDITOR_VERSION = '1'
const STORAGE_VERSION_KEY = 'speclynx-editor-version'
const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
if (storedVersion !== EDITOR_VERSION) {
  // Clear all IndexedDB databases used by monaco-vscode-api
  const databases = await indexedDB.databases()
  await Promise.all(
    databases
      .filter(db => db.name && (db.name.startsWith('vscode-') || db.name.startsWith('workbench-')))
      .map(db => new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(db.name!)
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      }))
  )
  await userDataProvider.reset()
  localStorage.setItem(STORAGE_VERSION_KEY, EDITOR_VERSION)
}

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

export async function clearStorage(): Promise<void> {
  await userDataProvider.reset()
  await ((await getService(IStorageService)) as BrowserStorageService).clear()
}

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

export { remoteAuthority }
