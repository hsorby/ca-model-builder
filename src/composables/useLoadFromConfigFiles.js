import { useVueFlow } from '@vue-flow/core'
import { nextTick, ref } from 'vue'
import { ElNotification } from 'element-plus'
import dagre from '@dagrejs/dagre'

import { useBuilderStore } from '../stores/builderStore'
import { useFlowHistoryStore } from '../stores/historyStore'
import { validateWorkflowModules } from '../services/import/validateWorkflow'
import { buildWorkflowGraph } from '../services/import/buildWorkflow'
import { getHandleId } from '../utils/ports'

// Helper to convert radians to side
function getSideFromAngle(angle) {
  const deg = angle * (180 / Math.PI)
  // Normalize to 0-360
  const normalized = (deg + 360) % 360

  if (normalized >= 315 || normalized < 45) return 'right'
  if (normalized >= 45 && normalized < 135) return 'bottom'
  if (normalized >= 135 && normalized < 225) return 'left'
  return 'top'
}

/**
 * This function runs a dagre layout on the nodes and edges,
 * treating ports as separate sub-nodes to achieve a port-granular layout.
 * This allows for better organization of nodes based on their port connections.
 *
 * @param {*} nodes - The array of nodes in the workflow graph.
 * @param {*} edges - The array of edges in the workflow graph.
 */
function runPortGranularLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  // Create "Cluster" Nodes.
  nodes.forEach((node) => {
    g.setNode(node.id, {
      label: node.id,
      clusterLabelPos: 'top',
      width: node.dimensions.width,
      height: node.dimensions.height,
    })
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
      node.data.ports.forEach((port) => {
        const handleId = getHandleId(port)
        const portNodeId = getDagrePortId(node.id, handleId)

        // Find the edges connected to this specific port.
        const outEdges = g.outEdges(portNodeId) || []
        const inEdges = g.inEdges(portNodeId) || []

        let targetX, targetY

        // Logic: Find the thing this port is connected to.
        // For 'source' ports, look at the target node.
        // For 'target' ports, look at the source node.
        if (outEdges.length > 0) {
          const targetNodeId = outEdges[0].w // 'w' is the target in Dagre
          const tNode = g.node(targetNodeId)
          targetX = tNode.x
          targetY = tNode.y
        } else if (inEdges.length > 0) {
          const sourceNodeId = inEdges[0].v // 'v' is the source in Dagre
          const sNode = g.node(sourceNodeId)
          targetX = sNode.x
          targetY = sNode.y
        } else {
          // Unconnected port: Keep default or set to 'right'/'left' based on type
          return
        }

        // Calculate Angle from Center of Node to Center of Target
        // Math.atan2(y, x) -> returns angle in radians
        const dx = targetX - nodeWithPos.x
        const dy = targetY - nodeWithPos.y
        const angle = Math.atan2(dy, dx)

        // Assign the optimal side
        port.position = getSideFromAngle(angle) // 'top', 'bottom', 'left', 'right'
      })

      // Sort ports per side to untangle local clusters.
      // We group them by side first, then sort locally.
      const sides = { top: [], right: [], bottom: [], left: [] }

      node.data.ports.forEach((p) => {
        if (sides[p.position]) sides[p.position].push(p)
      })

      // Sort Top/Bottom by X, Left/Right by Y.
      const sortPorts = (portList, isVertical) => {
        portList.sort((a, b) => {
          const aId = getDagrePortId(node.id, getHandleId(a))
          const bId = getDagrePortId(node.id, getHandleId(b))
          const nodeA = g.node(aId)
          const nodeB = g.node(bId)
          if (!nodeA || !nodeB) return 0
          return isVertical ? nodeA.x - nodeB.x : nodeA.y - nodeB.y
        })
      }

      sortPorts(sides.top, true) // Sort by X.
      sortPorts(sides.bottom, true) // Sort by X.
      sortPorts(sides.left, false) // Sort by Y.
      sortPorts(sides.right, false) // Sort by Y.

      // Flatten back into main array.
      node.data.ports = [
        ...sides.top,
        ...sides.right,
        ...sides.bottom,
        ...sides.left,
      ]
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
    updateNodeInternals,
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

  onNodesInitialized(async (initializedNodes) => {
    if (!layoutPending.value || initializedNodes.length === 0) return

    try {
      // Run Layout (Calculates positions & sorts port arrays).
      runPortGranularLayout(initializedNodes, pendingEdges)

      await nextTick()

      // Handles may have moved from initial positions. Update node data from pending map.
      updateNodeInternals(initializedNodes.map((n) => n.id))

      // Add the Finalized Edges.
      addEdges(pendingEdges)

      historyStore.clear()
      await nextTick()

      fitView({ padding: 0.2, duration: 800 })
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
