// Filter / short-circuit Open VSX gallery requests.
//
// Three responsibilities:
//
// 1. Search result filtering — strip the bundled SpecLynx OpenAPI Toolkit out of
//    `/vscode/gallery/extensionquery` results so users don't install a duplicate.
//
// 2. Per-extension `/latest` short-circuit — VSCode's ExtensionsWorkbenchService
//    asks open-vsx for the "latest" metadata of every installed extension every time
//    the running-extensions list changes. For our internal glue extensions and the
//    built-in language extensions there is nothing on open-vsx, so each lookup
//    returns 404, and a burst of those triggers 429 rate-limiting. We answer those
//    requests locally with a synthetic 404 so they never reach the network.
//
// 3. `extensionquery` 405 suppression — open-vsx currently returns 405 on POSTs to
//    `/vscode/gallery/extensionquery` (verified server-side; method-not-allowed for
//    every HTTP method/header combination). The gallery service handles 4xx gracefully
//    (treats it as empty results), but the browser still surfaces a network failure
//    in DevTools. We pre-empt the request and return a synthetic 200 with an empty
//    results envelope so the console stays quiet. If/when open-vsx fixes their
//    endpoint, remove this short-circuit to restore real marketplace search.

const BUNDLED_EXTENSION_IDS = new Set([
  'speclynx.vscode-openapi-toolkit'
])

// Extensions that exist only inside this editor — there is no marketplace entry for
// them, so don't bother asking. Match the `{publisher}/{name}` pair from the gallery
// URL (publisher comes first; both case-insensitive).
const INTERNAL_EXTENSIONS = new Set([
  // Bundled VSIX
  'speclynx/vscode-openapi-toolkit',
  // Glue extensions registered in code (setup.workbench.ts, main.common.ts)
  'speclynx/speclynx-editor-main',
  'speclynx/speclynx-editor-api'
])

// Any extension whose publisher is `vscode` is a built-in language/utility extension
// shipped via monaco-vscode-api (json, yaml, markdown, references-view, etc.). None
// of them exist on open-vsx under that publisher.
const INTERNAL_PUBLISHERS = new Set(['vscode'])

// Pull the `{publisher}/{name}` pair from a gallery `/latest` URL. Returns null if
// the URL is not a `/latest` lookup we recognize.
function extractGalleryLatestId(url: string): string | null {
  // Pattern: .../gallery/<...>/<publisher>/<name>/latest
  const match = url.match(/\/gallery\/(?:[^/]+\/)*([^/]+)\/([^/]+)\/latest(?:[/?#]|$)/)
  if (match == null) return null
  return `${match[1]!.toLowerCase()}/${match[2]!.toLowerCase()}`
}

function isInternalExtensionId(id: string): boolean {
  if (INTERNAL_EXTENSIONS.has(id)) return true
  const publisher = id.split('/', 1)[0]!
  return INTERNAL_PUBLISHERS.has(publisher)
}

// Synthetic "empty results" body for an extensionquery short-circuit. Matches the
// VSCode marketplace API shape the gallery service expects (results[0].extensions
// + a ResultCount metadata entry).
const EMPTY_EXTENSION_QUERY_BODY = JSON.stringify({
  results: [{
    extensions: [],
    resultMetadata: [{
      metadataType: 'ResultCount',
      metadataItems: [{ name: 'TotalCount', count: 0 }]
    }]
  }]
})

function syntheticEmptyExtensionQueryResponse(): Response {
  return new Response(EMPTY_EXTENSION_QUERY_BODY, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' }
  })
}

const originalFetch = window.fetch
window.fetch = async function (...args) {
  const url = typeof args[0] === 'string'
    ? args[0]
    : (args[0] instanceof Request ? args[0].url : args[0]?.href)

  // Short-circuit `/latest` lookups for extensions that don't live on open-vsx.
  // Returning a 404 is how open-vsx signals "no such extension", and the gallery
  // service already handles that path gracefully.
  if (url != null && url.includes('/vscode/gallery/')) {
    const id = extractGalleryLatestId(url)
    if (id != null && isInternalExtensionId(id)) {
      return new Response(null, { status: 404, statusText: 'Not Found' })
    }
  }

  // Short-circuit POSTs to `/vscode/gallery/extensionquery`. Open-vsx returns 405
  // for every variant, so the request only produces console noise. Returning an
  // empty-results envelope keeps the gallery service happy and silences DevTools.
  if (url != null && url.includes('/vscode/gallery/extensionquery')) {
    return syntheticEmptyExtensionQueryResponse()
  }

  const response = await originalFetch.apply(this, args)

  if (url != null && url.includes('/vscode/gallery') && url.includes('extensionquery') && response.ok) {
    // Work on a clone so the original body remains intact if anything goes wrong.
    // The gallery service in monaco-vscode-api 32.x reads the body via arrayBuffer(),
    // so we must never consume the original response's body stream on the fallback path.
    const cloned = response.clone()
    try {
      const data = await cloned.json()

      if (data?.results?.[0]?.extensions) {
        const filtered = data.results[0].extensions.filter(
          (ext: any) => {
            const extId = `${ext.publisher?.publisherName}.${ext.extensionName}`.toLowerCase()
            return !BUNDLED_EXTENSION_IDS.has(extId)
          }
        )
        data.results[0].extensions = filtered
        // Update the result count metadata to match filtered results
        if (data.results[0].resultMetadata) {
          for (const meta of data.results[0].resultMetadata) {
            if (meta.metadataType === 'ResultCount' && meta.metadataItems) {
              for (const item of meta.metadataItems) {
                if (item.name === 'TotalCount') {
                  item.count = filtered.length
                }
              }
            }
          }
        }
      }

      // Copy headers manually — passing response.headers directly can corrupt them.
      const headers = new Headers()
      response.headers.forEach((value: string, key: string) => {
        headers.set(key, value)
      })
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    } catch {
      // Parsing failed — fall through and return the untouched original response.
    }
  }

  return response
}
