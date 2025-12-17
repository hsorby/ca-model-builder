import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'

export const useFlowHistoryStore = defineStore('flowHistory', () => {
  const stack = ref([])
  const pointer = ref(-1)
  const working = ref(false)
  const lastChangeWasAdd = ref(false)

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

    _pushToStack(command)
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
      await command.redo()
    } finally {
      working.value = false
    }
  }

  return {
    addCommand,
    canRedo,
    canUndo,
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
