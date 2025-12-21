import { useVueFlow } from '@vue-flow/core'
import { nextTick, ref } from 'vue'
import { ElNotification } from 'element-plus'
import dagre from '@dagrejs/dagre'

import { useBuilderStore } from '../stores/builderStore'
import { useFlowHistoryStore } from '../stores/historyStore'
import { validateWorkflowModules } from '../services/import/validateWorkflow'
import { buildWorkflowGraph } from '../services/import/buildWorkflow'
import { getHandleId } from '../utils/ports'

// ----------------------------------------------------------------------
//  The Compound Layout
// ----------------------------------------------------------------------
function runPortGranularLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 50 })
  g.setDefaultEdgeLabel(() => ({}))

  // Create "Cluster" Nodes.
  nodes.forEach((node) => {
    g.setNode(node.id, { label: node.id, clusterLabelPos: 'top' })
  })

  // Create "Port" Nodes.
  const getDagrePortId = (nodeId, handleId) =>
    `DAGRE_PORT_${nodeId}_${handleId}`

  nodes.forEach((node) => {
    const ports = node.data.ports || []
    ports.forEach((port) => {
      // Ensure we use the exact same ID generation logic as the edge handles.
      const handleId = getHandleId(port)
      const portNodeId = getDagrePortId(node.id, handleId)

      g.setNode(portNodeId, { width: 10, height: 10 })
      g.setParent(portNodeId, node.id)
    })
  })

  // Create Edges.
  edges.forEach((edge) => {
    const sourcePortId = getDagrePortId(edge.source, edge.sourceHandle)
    const targetPortId = getDagrePortId(edge.target, edge.targetHandle)
    g.setEdge(sourcePortId, targetPortId)
  })

  // Run Layout.
  dagre.layout(g)

  // Apply Results.
  nodes.forEach((node) => {
    const nodeWithPos = g.node(node.id)

    // Update Node Position (Center to Top-Left).
    if (nodeWithPos) {
      node.position = {
        x: nodeWithPos.x - nodeWithPos.width / 2,
        y: nodeWithPos.y - nodeWithPos.height / 2,
      }
    }

    // Update Port Order (Sort by Y).
    if (node.data.ports) {
      node.data.ports.sort((a, b) => {
        const aId = getDagrePortId(node.id, getHandleId(a))
        const bId = getDagrePortId(node.id, getHandleId(b))
        return (g.node(aId)?.y || 0) - (g.node(bId)?.y || 0)
      })
    }

    node.style = { opacity: 1 }
  })
}

export function useLoadFromConfigFiles() {
  const {
    nodes,
    edges,
    addNodes,
    addEdges,
    setViewport,
    onNodesInitialized,
    fitView,
  } = useVueFlow()
  const store = useBuilderStore()
  const historyStore = useFlowHistoryStore()

  const layoutPending = ref(false)
  let pendingEdges = []
  let pendingNodeDataMap = new Map()

  async function loadFromConfigFiles(configFiles) {
    try {
      const { valid, missing } = validateWorkflowModules(
        configFiles.moduleConfig,
        store.availableModules
      )
      if (!valid) throw new Error(`Missing modules: ${missing.join(', ')}`)

      historyStore.clear()
      nodes.value = []
      edges.value = []
      setViewport({ x: 0, y: 0, zoom: 1 })

      const result = buildWorkflowGraph(store.availableModules, configFiles)

      pendingEdges = result.edges
      pendingNodeDataMap.clear()
      result.nodes.forEach((n) => pendingNodeDataMap.set(n.id, n.data))

      layoutPending.value = true
      addNodes(result.nodes) // Adds invisible nodes
    } catch (error) {
      ElNotification.error(`Failed to load workflow: ${error.message}`)
      layoutPending.value = false
    }
  }

  onNodesInitialized((initializedNodes) => {
    if (!layoutPending.value || initializedNodes.length === 0) return

    try {
      // Run Layout (Calculates positions & sorts port arrays).
      runPortGranularLayout(initializedNodes, pendingEdges)

      // Add the Finalized Edges.
      addEdges(pendingEdges)

      historyStore.clear()
      nextTick(() => {
        fitView({ padding: 0.2, duration: 800 })
      })
    } catch (err) {
      historyStore.clear()
      ElNotification.error('Error organizing graph layout')
    } finally {
      layoutPending.value = false
      pendingEdges = []
    }
  })

  return { loadFromConfigFiles }
}
