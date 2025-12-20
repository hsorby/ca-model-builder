import { useVueFlow } from '@vue-flow/core'
import { nextTick, ref } from 'vue'
import { ElNotification } from 'element-plus'
import dagre from '@dagrejs/dagre'

import { useBuilderStore } from '../stores/builderStore'
import { useFlowHistoryStore } from '../stores/historyStore'

import { validateWorkflowModules } from '../services/workflow/validateWorkflow'
// We assume buildWorkflowGraph now returns nodes (hidden) and logical edge data
import { buildWorkflowGraph } from '../services/workflow/buildWorkflow'

import { getHandleId } from '../utils/ports'

/**
 * Assigns specific Port/Handle IDs based on the geometric positions of nodes.
 * @param {Array} nodes - The generic Vue Flow nodes (already layouted with X/Y)
 * @param {Array} logicalEdges - The simple connections from Step 1
 * @param {Map} nodeDataMap - Map to access your inner node data (ports, etc)
 */
export function resolveEdgesWithGeometry(nodes, logicalEdges, nodeDataMap) {
  const edges = logicalEdges.map((edge) => ({
    id: `e_${edge.source}_${edge.target}_${crypto.randomUUID()}`,
    source: edge.source,
    target: edge.target,
    // type: 'smoothstep',
    // markerEnd: 'arrowclosed',
    sourceHandle: null, // To be filled in Pass 1
    targetHandle: null, // To be filled in Pass 2
  }))

  // 2. Create Maps for quick lookup
  const edgesBySource = new Map()
  const edgesByTarget = new Map()

  edges.forEach((edge) => {
    // Add to Source Map
    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, [])
    edgesBySource.get(edge.source).push(edge)

    // Add to Target Map
    if (!edgesByTarget.has(edge.target)) edgesByTarget.set(edge.target, [])
    edgesByTarget.get(edge.target).push(edge)
  })

  const passes = [
    {
      label: 'Source Side',
      groupKey: 'source', // Group edges by their Source ID
      sortTargetKey: 'target', // Sort them based on where they go (Target Y)
      portType: 'right', // Look for Output/Right ports
      handleField: 'sourceHandle', // Assign to this field
    },
    {
      label: 'Target Side',
      groupKey: 'target', // Group edges by their Target ID
      sortTargetKey: 'source', // Sort them based on where they come from (Source Y)
      portType: 'left', // Look for Input/Left ports
      handleField: 'targetHandle', // Assign to this field
    },
  ]

  // 3. Run the generic function for both sides
  passes.forEach((pass) => {
    assignHandles(nodes, edges, nodeDataMap, pass)
  })

  return edges
}

/**
 * Generic helper to group, sort, and assign handles for one side of the connection.
 */
function assignHandles(nodes, edges, nodeDataMap, config) {
  const { groupKey, sortTargetKey, portType, handleField } = config

  // A. Group edges by the node we are currently processing (source or target)
  const edgesByNode = new Map()
  edges.forEach((edge) => {
    const nodeId = edge[groupKey]
    if (!edgesByNode.has(nodeId)) edgesByNode.set(nodeId, [])
    edgesByNode.get(nodeId).push(edge)
  })

  // B. Process each node
  edgesByNode.forEach((nodeEdges, nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    // C. Sort edges based on the geometry of the *other* connected node
    nodeEdges.sort((a, b) => {
      const nodeA = nodes.find((n) => n.id === a[sortTargetKey])
      const nodeB = nodes.find((n) => n.id === b[sortTargetKey])
      return (nodeA?.position.y || 0) - (nodeB?.position.y || 0)
    })

    // D. Get available ports for this specific side
    const nodeData = nodeDataMap.get(nodeId)
    // Adjust check to match your actual data (e.g. 'right'/'source' or 'left'/'target')
    const validPorts = (nodeData?.ports || []).filter(
      (p) =>
        p.type === portType ||
        p.type === (portType === 'right' ? 'source' : 'target')
    )

    // E. Assign Handles sequentially
    nodeEdges.forEach((edge, index) => {
      // Reuse the last port if we have more edges than ports (fan-out/fan-in)
      const port = validPorts[index] || validPorts[validPorts.length - 1]

      if (port) {
        edge[handleField] = getHandleId(port)
      }
    })
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

  // Flag to ensure layout only runs after a file load, not random updates
  const layoutPending = ref(false)
  // Store logical edges temporarily until nodes are placed
  let pendingLogicalEdges = []
  let pendingNodeDataMap = new Map() // Helpful for resolving ports later

  // -- 1. THE TRIGGER --
  async function loadFromConfigFiles(configFiles) {
    await nextTick()

    try {
      const { valid, missing } = validateWorkflowModules(
        configFiles.moduleConfig,
        store.availableModules
      )

      if (!valid) throw new Error(`Missing modules: ${missing.join(', ')}`)

      // A. Reset System
      historyStore.clear()
      nodes.value = []
      edges.value = []
      setViewport({ x: 0, y: 0, zoom: 1 })

      // B. Build Initial State (Nodes Only + Logical Edges)
      // Ensure buildWorkflowGraph returns nodes with `hidden: true`
      const result = buildWorkflowGraph(store.availableModules, configFiles)

      pendingLogicalEdges = result.logicalEdges // Just source/target info

      // Cache node data for the edge resolver to use later
      pendingNodeDataMap.clear()
      result.nodes.forEach((n) => pendingNodeDataMap.set(n.id, n.data))

      // C. Signal that the next initialization is a layout event
      layoutPending.value = true

      // D. Add Invisible Nodes to Canvas
      // Vue Flow will mount them -> measure them -> trigger onNodesInitialized
      addNodes(result.nodes)
    } catch (error) {
      ElNotification.error(`Failed to load workflow: ${error.message}`)
      layoutPending.value = false
    }
  }

  // -- 2. THE PROCESSOR --
  // This hook auto-triggers once Vue Flow has measured the DOM elements
  onNodesInitialized((initializedNodes) => {
    if (!layoutPending.value || initializedNodes.length === 0) return

    try {
      // Step A: Run Dagre Layout (Calculate Node Positions)
      const dagreGraph = new dagre.graphlib.Graph()
      dagreGraph.setDefaultEdgeLabel(() => ({}))
      dagreGraph.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 120 })

      initializedNodes.forEach((node) => {
        // Use the REAL measured dimensions from the DOM
        dagreGraph.setNode(node.id, {
          width: node.dimensions.width || 200,
          height: node.dimensions.height || 100,
        })
      })

      // Add edges to Dagre so it understands the topology
      pendingLogicalEdges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
      })

      dagre.layout(dagreGraph)

      // Step B: Apply Positions & Reveal Nodes
      initializedNodes.forEach((node) => {
        const nodeWithPos = dagreGraph.node(node.id)

        // 1. Center the node based on Dagre's output
        node.position = {
          x: nodeWithPos.x - node.dimensions.width / 2,
          y: nodeWithPos.y - node.dimensions.height / 2,
        }

        // 2. Make visible
        node.style = { opacity: 1 }
      })

      // Step C: Generate Edges based on Final Geometry
      // (Using the "resolveEdgesWithGeometry" logic discussed previously)
      const finalEdges = resolveEdgesWithGeometry(
        initializedNodes,
        pendingLogicalEdges,
        pendingNodeDataMap
      )

      // Step D: Finalize
      addEdges(finalEdges)

      nextTick(() => {
        fitView({ padding: 0.2, duration: 800 })
      })
    } catch (err) {
      console.error('Layout failed', err)
      ElNotification.error('Error organizing graph layout')
    } finally {
      // Reset flag so moving nodes manually later doesn't trigger this again
      layoutPending.value = false
      pendingLogicalEdges = []
    }
  })

  return { loadFromConfigFiles }
}
