
/**
 * Generates a unique edge ID.
 *
 * @returns {string} Unique edge ID.
 */
export function getId(edgeIds, prefix = 'edge_') {
  // Find the highest existing ID
  let maxId = -1
  edgeIds.forEach((edgeId) => {
    if (edgeId.startsWith(prefix)) {
      const numPart = parseInt(edgeId.split('_')[1], 10)
      if (!isNaN(numPart) && numPart > maxId) {
        maxId = numPart
      }
    }
  })

  // Return the next ID in the sequence
  return `${prefix}${maxId + 1}`
}
