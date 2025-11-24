// stores/flowHistory.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useFlowHistoryStore = defineStore('flowHistory', () => {
  const stack = ref([])
  const pointer = ref(-1)
  const isUndoRedoing = ref(false) // Lock to prevent loops
  const limit = 20

  const canUndo = computed(() => {console.log('pointer value:', pointer.value); return pointer.value >= 0})
  const canRedo = computed(() => pointer.value < stack.value.length - 1)

  /**
   * Add a command to the stack
   * command structure: { undo: Function, redo: Function }
   */
  function addCommand(command) {
    if (isUndoRedoing.value) return

    // If we are in the middle of the stack, truncate the future
    if (pointer.value < stack.value.length - 1) {
      stack.value = stack.value.slice(0, pointer.value + 1)
    }

    stack.value.push(command)
    pointer.value++
    
    // Limit stack size
    if (stack.value.length > limit) {
      stack.value.shift()
      pointer.value--
    }
  }

  function undo() {
    if (!canUndo.value) return

    isUndoRedoing.value = true
    const command = stack.value[pointer.value]
    command.undo() // Execute the undo function
    pointer.value--
    
    // Unlock after a microtask to let Vue Flow settle
    setTimeout(() => { isUndoRedoing.value = false }, 10)
  }

  function redo() {
    if (!canRedo.value) return

    isUndoRedoing.value = true
    pointer.value++
    const command = stack.value[pointer.value]
    command.redo() // Execute the redo function
    
    setTimeout(() => { isUndoRedoing.value = false }, 10)
  }

  return {
    addCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoRedoing
  }
})
