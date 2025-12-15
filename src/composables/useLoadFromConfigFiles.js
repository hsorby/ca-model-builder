import { useVueFlow } from "@vue-flow/core"
import { nextTick } from "vue"
import { ElNotification } from "element-plus"
import { useBuilderStore } from "../stores/builderStore"

import { validateWorkflowModules } from "../services/workflow/validateWorkflow"
import { buildWorkflowGraph } from "../services/workflow/buildWorkflow"

export function useLoadFromConfigFiles() {
  const { nodes, edges, addNodes, addEdges, setViewport } = useVueFlow()
  const store = useBuilderStore()

  async function loadFromConfigFiles(configFiles) {
    await nextTick()

    try {
      const { valid, missing } = validateWorkflowModules(
        configFiles.moduleConfig,
        store.availableModules
      )

      if (!valid) {
        throw new Error(`Missing modules: ${missing.join(", ")}`)
      }

      // Reset Vue Flow
      nodes.value = []
      edges.value = []
      setViewport({ x: 0, y: 0, zoom: 1 })

      const { nodes: newNodes, edges: newEdges } =
        buildWorkflowGraph(store.availableModules, configFiles)

      addNodes(newNodes)
      await nextTick()
      addEdges(newEdges)

    } catch (error) {
      ElNotification.error(
        `Failed to load workflow: ${error.message}`
      )
    }
  }

  return { loadFromConfigFiles }
}
