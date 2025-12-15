import { buildWorkflowNodes } from "./buildNodes"
import { buildWorkflowEdges } from "./buildEdges"
import { createPortAllocator } from "./portAllocator"

export function buildWorkflowGraph(configFiles) {
  const nodes = buildWorkflowNodes(
    configFiles.vesselArray,
    configFiles.moduleConfig
  )

  const nodeByName = new Map(
    nodes.map(node => [node.data.name, node])
  )

  const portAllocator = createPortAllocator()

  const edges = buildWorkflowEdges(
    configFiles.vesselArray,
    nodeByName,
    portAllocator
  )

  return { nodes, edges }
}
