import { useVueFlow } from "@vue-flow/core"
import { ref, shallowRef, watch } from "vue"

/**
 * In a real world scenario you'd want to avoid creating refs in a global scope like this as they might not be cleaned up properly.
 * @type {{draggedType: Ref<string|null>, isDragOver: Ref<boolean>, isDragging: Ref<boolean>}}
 */
const state = {
  /**
   * The type of the node being dragged.
   */
  draggedType: shallowRef(null),
  isDragOver: ref(false),
  isDragging: ref(false),
}

export default function useDragAndDrop() {
  const { draggedType, isDragOver, isDragging } = state

  const {
    addNodes,
    getNodes,
    onNodesInitialized,
    screenToFlowCoordinate,
    updateNode,
  } = useVueFlow()

  function getId() {
    const allNodes = getNodes.value

    // Find the highest existing ID
    let maxId = -1
    allNodes.forEach((node) => {
      if (node.id.startsWith("dndnode_")) {
        const numPart = parseInt(node.id.split("_")[1], 10)
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart
        }
      }
    })

    // Return the next ID in the sequence
    return `dndnode_${maxId + 1}`
  }

  watch(isDragging, (dragging) => {
    document.body.style.userSelect = dragging ? "none" : ""
  })

  function onDragStart(event, module) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/vueflow", module.name)
      event.dataTransfer.effectAllowed = "move"
    }

    draggedType.value = module
    isDragging.value = true

    document.addEventListener("drop", onDragEnd)
  }

  /**
   * Handles the drag over event.
   *
   * @param {DragEvent} event
   */
  function onDragOver(event) {
    event.preventDefault()

    if (draggedType.value) {
      isDragOver.value = true

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move"
      }
    }
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDragEnd() {
    isDragging.value = false
    isDragOver.value = false
    draggedType.value = null
    document.removeEventListener("drop", onDragEnd)
  }

  /**
   * Handles the drop event.
   *
   * @param {DragEvent} event
   */
  function onDrop(event) {
    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY,
    })

    const nodeId = getId()

    const moduleData = draggedType.value

    if (!moduleData) {
      return
    }

    const allNodes = getNodes.value
    const existingNames = new Set(allNodes.map((node) => node.data.name))
    let finalName = moduleData.name
    let counter = 1

    while (existingNames.has(finalName)) {
      finalName = `${moduleData.name}_${counter}`
      counter++
    }

    const newNode = {
      id: nodeId,
      type: "moduleNode",
      position,
      data: {
        ...JSON.parse(JSON.stringify(moduleData)), // Keep deep copy
        name: finalName, // Use the new unique name
      },
    }

    /**
     * Align node position after drop, so it's centered to the mouse
     *
     * We can hook into events even in a callback, and we can remove the event listener after it's been called.
     */
    const { off } = onNodesInitialized(() => {
      updateNode(nodeId, (node) => ({
        position: {
          x: node.position.x - node.dimensions.width / 2,
          y: node.position.y - node.dimensions.height / 2,
        },
      }))

      off()
    })

    addNodes(newNode)
  }

  return {
    draggedType,
    isDragOver,
    isDragging,
    onDragStart,
    onDragLeave,
    onDragOver,
    onDrop,
  }
}
