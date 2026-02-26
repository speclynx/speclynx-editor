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
  
  if (url && url.includes('/vscode/gallery') && url.includes('extensionquery')) {
    try {
      const data = await response.json()
      
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
        const headers = new Headers()
        response.headers.forEach((value: string, key: string) => {
          headers.set(key, value)
        })
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers
        })
      }
      // If no extensions array, reconstruct response from parsed JSON
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    } catch {
      // If parsing fails, return original response
    }
  }
  
  return response
}
