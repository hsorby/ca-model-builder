import { MarkerType } from "@vue-flow/core"
import { getHandleId, SOURCE_PORT_PRIORITY, TARGET_PORT_PRIORITY } from "../../utils/ports"

export function buildWorkflowEdges(vessels, nodeByName, portAllocator) {
  const edges = []

  vessels.forEach(vessel => {
    if (!vessel.out_vessels) return

    const sourceNode = nodeByName.get(vessel.name)
    if (!sourceNode) return

    vessel.out_vessels.split(" ").forEach(targetName => {
      const targetNode = nodeByName.get(targetName)
      if (!targetNode) return

      const sourcePort = portAllocator.nextUnusedPort(
        sourceNode,
        SOURCE_PORT_PRIORITY
      )

      const targetPort = portAllocator.nextUnusedPort(
        targetNode,
        TARGET_PORT_PRIORITY
      )

      if (!sourcePort || !targetPort) return

      edges.push({
        id: `e_${sourceNode.id}_${targetNode.id}_${crypto.randomUUID()}`,
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: getHandleId(sourcePort),
        targetHandle: getHandleId(targetPort),
        type: "smoothstep",
        markerEnd: MarkerType.ArrowClosed,
      })
    })
  })

  return edges
}
