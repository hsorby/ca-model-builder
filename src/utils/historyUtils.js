
export const executeTransaction = (historyStore, callback) => {
  try {
    historyStore.startBatch()
    callback() // Run the logic (add nodes, move things, etc)
  } catch (err) {
    historyStore.cancelBatch() 
  } finally {
    // Always commit, ensuring the system resets to normal mode
    historyStore.commitBatch()
  }
}
