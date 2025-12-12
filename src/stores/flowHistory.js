import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'

export const useFlowHistoryStore = defineStore('flowHistory', () => {
  const stack = ref([])
  const pointer = ref(-1)
  const working = ref(false)
  const lastChangeWasAdd = ref(false)

  const isBatching = ref(false)
  const activeBatch = ref([])

  const canUndo = computed(() => pointer.value >= 0)
  const canRedo = computed(() => pointer.value < stack.value.length - 1)
  const isUndoRedoing = computed(() => working.value)
  const pointerIndex = computed(() => pointer.value)
  const lastCommandHadOffsetApplied = computed(() => {
    if (pointer.value < 0) {
      return false
    }
    const cmd = stack.value[pointer.value]
    return cmd.offset === 'applied'
  })

  /**
   * Start collecting commands into a temporary bucket
   */
  function beginBatch() {
    isBatching.value = true
    activeBatch.value = []
  }

  /**
   * Cancel the current batch without saving it.
   */
  function cancelBatch() {
    isBatching.value = false
    activeBatch.value = []
  }

  /**
   * Stop collecting commands and save the bucket as ONE history entry
   */
  function endBatch() {
    isBatching.value = false
    if (working.value) {
      activeBatch.value = []
      return
    }

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

  function lastChangeWasAddSetter(value) {
    lastChangeWasAdd.value = value
  }

  function replaceLastCommand(command) {
    if (pointer.value < 0) {
      return
    }

    stack.value[pointer.value] = command
  }

  /**
   * Modified addCommand
   */
  function addCommand(command) {
    if (working.value) {
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

  async function executeAndAddCommand(command) {
    working.value = true

    try {
      await command.redo()
      _pushToStack(command)
    } finally {
      working.value = false
    }
  }

  async function undo() {
    if (!canUndo.value) {
      return
    }
    working.value = true
    try {
      const command = stack.value[pointer.value]
      pointer.value--
      await command.undo()
    } finally {
      working.value = false
    }
    // working.value = true
    // const command = stack.value[pointer.value]
    // command.undo()
    // pointer.value--
    // nextTick().then(() => {
    //   working.value = false
    // })
  }

  async function redo() {
    if (!canRedo.value) {
      return
    }
    if (!canRedo.value) return

    working.value = true
    try {
      pointer.value++
      const command = stack.value[pointer.value]
      lastChangeWasAdd.value = command.type === 'add'
      await command.redo()
    } finally {
      working.value = false
    }
    // working.value = true
    // pointer.value++
    // const command = stack.value[pointer.value]
    // lastChangeWasAdd.value = command.type === 'add'
    // command.redo()
    // nextTick().then(() => {
    //   working.value = false
    // })
  }

  return {
    addCommand,
    beginBatch,
    cancelBatch,
    canRedo,
    canUndo,
    endBatch,
    executeAndAddCommand,
    isUndoRedoing,
    lastChangeWasAdd,
    lastChangeWasAddSetter,
    lastCommandHadOffsetApplied,
    pointerIndex,
    redo,
    replaceLastCommand,
    undo,
  }
})
