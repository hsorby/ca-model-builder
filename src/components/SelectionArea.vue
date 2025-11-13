<template>
  <div 
    ref="containerRef"
    class="selection-container"
    @mousedown="startSelection"
  >
    <slot />
    <div
      v-if="isSelecting"
      class="selection-rectangle"
      :style="selectionStyle"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue"

const props = defineProps({
  modifierKey: { type: String, default: "Shift" },
})

const isSelecting = ref(false)
const containerRef = ref(null)
const startCoords = ref({ x: 0, y: 0 })
const currentCoords = ref({ x: 0, y: 0 })

const selectionStyle = computed(() => {
  const left = Math.min(startCoords.value.x, currentCoords.value.x)
  const top = Math.min(startCoords.value.y, currentCoords.value.y)
  const w = Math.abs(startCoords.value.x - currentCoords.value.x)
  const h = Math.abs(startCoords.value.y - currentCoords.value.y)
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`,
  }
})

function startSelection(e) {
  // Only left-click + shift key
  if (e.button !== 0 || !e.shiftKey) return

  e.preventDefault()
  const containerRect = containerRef.value.getBoundingClientRect()

  startCoords.value = {
    x: e.clientX - containerRect.left,
    y: e.clientY - containerRect.top,
  }
  currentCoords.value = { ...startCoords.value }

  isSelecting.value = true

  window.addEventListener("mousemove", updateSelection)
  window.addEventListener("mouseup", endSelection)
}

function updateSelection(e) {
  if (!isSelecting.value || !containerRef.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  currentCoords.value.x = e.clientX - containerRect.left
  currentCoords.value.y = e.clientY - containerRect.top
}

function endSelection() {
  if (!isSelecting.value) return
  isSelecting.value = false
  window.removeEventListener("mousemove", updateSelection)
  window.removeEventListener("mouseup", endSelection)
}

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", updateSelection)
  window.removeEventListener("mouseup", endSelection)
})
</script>

<style scoped>

.selection-container {
  position: relative; 
  width: 100%;
  height: 100%; 
  user-select: none;
}

.selection-rectangle {
  position: absolute; 
  pointer-events: none; 
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.9);
  border-radius: 4px;
  z-index: 2500;
}
</style>