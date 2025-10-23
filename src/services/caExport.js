import JSZip from 'jszip'
import Papa from 'papaparse'

/**
 * Generates a zip blob for the Circulatory Autogen export.
 * @param {Array} nodes - The array of nodes from Vue Flow.
 * @param {Array} edges - The array of edges from Vue Flow.
 * @param {Array} parameters - The parameter data from the store.
 * @returns {Promise<Blob>} A promise that resolves with the zip file blob.
 */
export async function generateExportZip(fileName, nodes, edges, parameters) {
  const zip = new JSZip()

  // --- 1. Specialized Logic ---
  // This is where you will build your custom files.
  // For example, you might loop through nodes and edges to build a graph.
  const customData = {
    message: "This is where the real export logic goes.",
    nodeCount: nodes.length,
    edgeCount: edges.length,
    // ... your logic
  }
  zip.file(`${fileName}_module_config.json`, JSON.stringify(customData, null, 2))


  // --- 2. Parameters CSV ---
  const csvData = Papa.unparse(parameters)
  zip.file(`${fileName}_vessel_array.csv`, csvData)

  // --- 3. Generate and Return the Blob ---
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  })

  return zipBlob
}
