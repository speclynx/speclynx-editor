// Filter bundled extensions from marketplace search results
// This prevents users from installing a duplicate of the pre-bundled SpecLynx extension

const BUNDLED_EXTENSION_IDS = new Set([
  'speclynx.vscode-openapi-toolkit'
])

// Intercept fetch to filter gallery search results
const originalFetch = window.fetch
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args)
  const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : args[0]?.href)
  
  if (url && url.includes('/vscode/gallery') && url.includes('extensionquery') && response.ok) {
    // Work on a clone so the original body remains intact if anything goes wrong.
    // The gallery service in monaco-vscode-api 32.x reads the body via arrayBuffer(),
    // so we must never consume the original response's body stream on the fallback path.
    const cloned = response.clone()
    try {
      const data = await cloned.json()

      if (data?.results?.[0]?.extensions) {
        const filtered = data.results[0].extensions.filter(
          (ext: any) => {
            const id = `${ext.publisher?.publisherName}.${ext.extensionName}`.toLowerCase()
            return !BUNDLED_EXTENSION_IDS.has(id)
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
