import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useFlowHistoryStore = defineStore('flowHistory', () => {
  const stack = ref([])
  const pointer = ref(-1)
  const isUndoRedoing = ref(false)

  const isBatching = ref(false)
  const activeBatch = ref([])

  const canUndo = computed(() => pointer.value >= 0)
  const canRedo = computed(() => pointer.value < stack.value.length - 1)

  /**
   * Start collecting commands into a temporary bucket
   */
  function startBatch() {
    isBatching.value = true
    activeBatch.value = []
  }

  /**
   * Stop collecting commands and save the bucket as ONE history entry
   */
  function commitBatch() {
    isBatching.value = false

    // If nothing happened, don't create an empty history entry
    if (activeBatch.value.length === 0) {
      return
    }

    // Create a "Super Command"
    // CRITICAL: We clone the batch array so it doesn't get cleared by reference
    const batchCommands = [...activeBatch.value]

    const superCommand = {
      // REDO: Execute all commands in original order
      redo: () => {
        batchCommands.forEach((cmd) => cmd.redo())
      },
      // UNDO: Execute all commands in REVERSE order
      // (e.g., must delete connection before deleting the node)
      undo: () => {
        ;[...batchCommands].reverse().forEach((cmd) => cmd.undo())
      },
    }

    // Push the super command to the real stack
    // We bypass the generic addCommand logic to avoid double-checking
    _pushToStack(superCommand)

    // Cleanup
    activeBatch.value = []
  }

  /**
   * Internal helper to handle stack slicing and pointer
   */
  function _pushToStack(command) {
    if (pointer.value < stack.value.length - 1) {
      stack.value = stack.value.slice(0, pointer.value + 1)
    }
    stack.value.push(command)
    pointer.value++
  }

  /**
   * Modified addCommand
   */
  function addCommand(command) {
    if (isUndoRedoing.value) {
      return
    }

    if (isBatching.value) {
      // If batching, add to temporary array
      activeBatch.value.push(command)
    } else {
      // If not batching, add to real stack
      _pushToStack(command)
    }
  }

  function undo() {
    if (!canUndo.value) {
      return
    }
    isUndoRedoing.value = true
    const command = stack.value[pointer.value]
    command.undo()
    pointer.value--
    setTimeout(() => {
      isUndoRedoing.value = false
    }, 10)
  }

  function redo() {
    if (!canRedo.value) {
      return
    }
    isUndoRedoing.value = true
    pointer.value++
    const command = stack.value[pointer.value]
    command.redo()
    setTimeout(() => {
      isUndoRedoing.value = false
    }, 10)
  }

  return {
    addCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    startBatch,
    commitBatch,
  }
})
