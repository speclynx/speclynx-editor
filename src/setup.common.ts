// Theme must be imported FIRST — before any service overrides or localExtensionHost.
// This ensures registerExtension() is called while servicesInitialized is still false,
// placing the theme in builtinExtensions for synchronous processing during init.
import './theme'

import './features/galleryFilter'
import getConfigurationServiceOverride, {
  IStoredWorkspace,
  initUserConfiguration
} from '@codingame/monaco-vscode-configuration-service-override'
import getKeybindingsServiceOverride, {
  initUserKeybindings
} from '@codingame/monaco-vscode-keybindings-service-override'
import {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  createIndexedDBProviders,
  registerFileSystemOverlay
} from '@codingame/monaco-vscode-files-service-override'
import * as monaco from 'monaco-editor'
import {
  IWorkbenchConstructionOptions,
  LogLevel,
  IEditorOverrideServices
} from '@codingame/monaco-vscode-api'
// Core editor services
import getModelServiceOverride from '@codingame/monaco-vscode-model-service-override'
import getNotificationServiceOverride from '@codingame/monaco-vscode-notifications-service-override'
import getDialogsServiceOverride from '@codingame/monaco-vscode-dialogs-service-override'
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override'
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override'
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override'
import getExtensionGalleryServiceOverride from '@codingame/monaco-vscode-extension-gallery-service-override'
import getBannerServiceOverride from '@codingame/monaco-vscode-view-banner-service-override'
import getStatusBarServiceOverride from '@codingame/monaco-vscode-view-status-bar-service-override'
import getTitleBarServiceOverride from '@codingame/monaco-vscode-view-title-bar-service-override'
import getPreferencesServiceOverride from '@codingame/monaco-vscode-preferences-service-override'
import getSnippetServiceOverride from '@codingame/monaco-vscode-snippets-service-override'
import getOutputServiceOverride from '@codingame/monaco-vscode-output-service-override'
import getSearchServiceOverride from '@codingame/monaco-vscode-search-service-override'
import getMarkersServiceOverride from '@codingame/monaco-vscode-markers-service-override'
import getAccessibilityServiceOverride from '@codingame/monaco-vscode-accessibility-service-override'
import getLanguageDetectionWorkerServiceOverride from '@codingame/monaco-vscode-language-detection-worker-service-override'
import getStorageServiceOverride from '@codingame/monaco-vscode-storage-service-override'
import getExtensionServiceOverride from '@codingame/monaco-vscode-extensions-service-override'
import getEnvironmentServiceOverride from '@codingame/monaco-vscode-environment-service-override'
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override'
import getWorkspaceTrustOverride from '@codingame/monaco-vscode-workspace-trust-service-override'
import getLogServiceOverride from '@codingame/monaco-vscode-log-service-override'
import getWorkingCopyServiceOverride from '@codingame/monaco-vscode-working-copy-service-override'
import getOutlineServiceOverride from '@codingame/monaco-vscode-outline-service-override'
import getScmServiceOverride from '@codingame/monaco-vscode-scm-service-override'
import getMultiDiffEditorServiceOverride from '@codingame/monaco-vscode-multi-diff-editor-service-override'
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override'
import getLocalizationServiceOverride from '@codingame/monaco-vscode-localization-service-override'
import getTreeSitterServiceOverride from '@codingame/monaco-vscode-treesitter-service-override'

import { EnvironmentOverride } from '@codingame/monaco-vscode-api/workbench'
import { Worker } from './tools/fakeWorker.js'
import defaultKeybindings from './user/keybindings.json?raw'
import defaultConfiguration from './user/configuration.json?raw'
import 'vscode/localExtensionHost'

// Import SpecLynx extension via VSIX plugin
import '../extensions/speclynx-openapi-toolkit.vsix'

import petstoreSample from './samples/petstore.yaml?raw'

const url = new URL(document.location.href)
const params = url.searchParams
export const resetLayout = params.has('resetLayout')
export const disableShadowDom = params.has('disableShadowDom')
params.delete('resetLayout')

window.history.replaceState({}, document.title, url.href)

export let workspaceFile = monaco.Uri.file('/workspace.code-workspace')

// Version-based cache clear: bump this when branding/config changes
// to ensure returning visitors get fresh settings from IndexedDB.
// Must run BEFORE createIndexedDBProviders so providers open fresh databases.
const EDITOR_VERSION = '4'
const STORAGE_VERSION_KEY = 'speclynx-editor-version'
const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
if (storedVersion !== EDITOR_VERSION) {
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
  localStorage.setItem(STORAGE_VERSION_KEY, EDITOR_VERSION)
}

await createIndexedDBProviders()

const fileSystemProvider = new RegisteredFileSystemProvider(false)

// SpecLynx: Sample API spec
fileSystemProvider.registerFile(
  new RegisteredMemoryFile(
    monaco.Uri.file('/workspace/petstore.yaml'),
    petstoreSample
  )
)

// Use a workspace file to be able to add another folder later (for the "Attach filesystem" button)
fileSystemProvider.registerFile(
  new RegisteredMemoryFile(
    workspaceFile,
    JSON.stringify(
      <IStoredWorkspace>{
        folders: [
          {
            path: '/workspace'
          }
        ]
      },
      null,
      2
    )
  )
)

registerFileSystemOverlay(1, fileSystemProvider)

// Workers
const workers: Partial<Record<string, Worker>> = {
  editorWorkerService: new Worker(
    new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
    { type: 'module' }
  ),
  extensionHostWorkerMain: new Worker(
    new URL('@codingame/monaco-vscode-api/workers/extensionHost.worker', import.meta.url),
    { type: 'module' }
  ),
  TextMateWorker: new Worker(
    new URL('@codingame/monaco-vscode-textmate-service-override/worker', import.meta.url),
    { type: 'module' }
  ),
  OutputLinkDetectionWorker: new Worker(
    new URL('@codingame/monaco-vscode-output-service-override/worker', import.meta.url),
    { type: 'module' }
  ),
  LanguageDetectionWorker: new Worker(
    new URL(
      '@codingame/monaco-vscode-language-detection-worker-service-override/worker',
      import.meta.url
    ),
    { type: 'module' }
  ),
  LocalFileSearchWorker: new Worker(
    new URL('@codingame/monaco-vscode-search-service-override/worker', import.meta.url),
    { type: 'module' }
  )
}

window.MonacoEnvironment = {
  getWorkerUrl(_, label) {
    return workers[label]?.url.toString()
  },
  getWorkerOptions(_, label) {
    return workers[label]?.options
  }
}

// Set configuration before initializing service so it's directly available (especially for the theme, to prevent a flicker)
await Promise.all([
  initUserConfiguration(defaultConfiguration),
  initUserKeybindings(defaultKeybindings)
])

export const constructOptions: IWorkbenchConstructionOptions = {
  enableWorkspaceTrust: false,
  windowIndicator: {
    label: 'SpecLynx Editor',
    tooltip: '',
    command: ''
  },
  workspaceProvider: {
    trusted: true,
    async open() {
      window.open(window.location.href)
      return true
    },
    workspace: { workspaceUri: workspaceFile }
  },
  developmentOptions: {
    logLevel: LogLevel.Info
  },
  configurationDefaults: {
    'window.title': 'SpecLynx Editor${separator}${dirty}${activeEditorShort}',
    'workbench.colorTheme': 'SpecLynx Light',
    'workbench.iconTheme': 'vs-seti'
  },
  defaultLayout: {
    editors: [
      {
        uri: monaco.Uri.file('/workspace/petstore.yaml'),
        viewColumn: 1
      }
    ],
    layout: {
      editors: {
        orientation: 0,
        groups: [{ size: 1 }]
      }
    },
    views: [],
    force: resetLayout
  },
  productConfiguration: {
    nameShort: 'SpecLynx Editor',
    nameLong: 'SpecLynx API Spec Editor',
    applicationName: 'speclynx-editor',
    extensionsGallery: {
      serviceUrl: 'https://open-vsx.org/vscode/gallery',
      resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
      extensionUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest', // https://github.com/eclipse/openvsx/issues/1036#issuecomment-2476449435
      controlUrl: '',
      nlsBaseUrl: ''
    }
  }
}

export const envOptions: EnvironmentOverride = {}

export const commonServices: IEditorOverrideServices = {
  // Core infrastructure
  ...getLogServiceOverride(),
  ...getExtensionServiceOverride({
    enableWorkerExtensionHost: true
  }),
  ...getExtensionGalleryServiceOverride({ webOnly: false }),
  ...getModelServiceOverride(),
  ...getNotificationServiceOverride(),
  ...getDialogsServiceOverride(),
  ...getConfigurationServiceOverride(),
  ...getKeybindingsServiceOverride(),
  ...getTextmateServiceOverride(),
  ...getTreeSitterServiceOverride(),
  ...getThemeServiceOverride(),
  ...getLanguagesServiceOverride(),
  // Workbench UI
  ...getPreferencesServiceOverride(),
  ...getOutlineServiceOverride(),
  ...getBannerServiceOverride(),
  ...getStatusBarServiceOverride(),
  ...getTitleBarServiceOverride(),
  ...getSnippetServiceOverride(),
  ...getOutputServiceOverride(),
  ...getSearchServiceOverride(),
  ...getMarkersServiceOverride(),
  ...getAccessibilityServiceOverride(),
  ...getLanguageDetectionWorkerServiceOverride(),
  ...getStorageServiceOverride({
    fallbackOverride: {
      'workbench.activity.showAccounts': false
    }
  }),
  ...getLifecycleServiceOverride(),
  ...getEnvironmentServiceOverride(),
  ...getWorkspaceTrustOverride(),
  ...getWorkingCopyServiceOverride(),
  ...getScmServiceOverride(),
  ...getMultiDiffEditorServiceOverride(),
  ...getExplorerServiceOverride(),
  ...getLocalizationServiceOverride({
    async clearLocale() {
      const url = new URL(window.location.href)
      url.searchParams.delete('locale')
      window.history.pushState(null, '', url.toString())
    },
    async setLocale(id) {
      const url = new URL(window.location.href)
      url.searchParams.set('locale', id)
      window.history.pushState(null, '', url.toString())
    },
    availableLanguages: [
      { locale: 'en', languageName: 'English' },
      { locale: 'cs', languageName: 'Czech' },
      { locale: 'de', languageName: 'German' },
      { locale: 'es', languageName: 'Spanish' },
      { locale: 'fr', languageName: 'French' },
      { locale: 'it', languageName: 'Italian' },
      { locale: 'ja', languageName: 'Japanese' },
      { locale: 'ko', languageName: 'Korean' },
      { locale: 'pl', languageName: 'Polish' },
      { locale: 'pt-br', languageName: 'Portuguese (Brazil)' },
      { locale: 'ru', languageName: 'Russian' },
      { locale: 'tr', languageName: 'Turkish' },
      { locale: 'zh-hans', languageName: 'Chinese (Simplified)' },
      { locale: 'zh-hant', languageName: 'Chinese (Traditional)' }
    ]
  })
}
