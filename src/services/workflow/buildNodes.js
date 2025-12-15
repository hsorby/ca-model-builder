import { randomPortSide } from "../../utils/ports"
import { WORKSPACE_LIMITS, NODE_HEIGHT, NODE_WIDTH, NODE_MARGIN_X, NODE_MARGIN_Y } from "../../constants/workflow"

function computeNodePosition(index) {
  const nodesPerRow = Math.floor((WORKSPACE_LIMITS.MAX_X - WORKSPACE_LIMITS.MIN_X) / (NODE_WIDTH + NODE_MARGIN_X))
  const row = Math.floor(index / nodesPerRow)
  const col = index % nodesPerRow

  const x = WORKSPACE_LIMITS.MIN_X + col * (NODE_WIDTH + NODE_MARGIN_X)
  const y = WORKSPACE_LIMITS.MIN_Y + row * (NODE_HEIGHT + NODE_MARGIN_Y)

  return { x, y }
}

function parseVesselNames(vesselField) {
    return Array.from(
        new Set((vesselField?.trim().split(/\s+/).filter(Boolean) ?? []))
    )
}

function buildPorts(vessel) {
  const ports = []

  if (vessel.inp_vessels){
    const inputs = parseVesselNames(vessel.inp_vessels)
    inputs.forEach(name => {
        ports.push({
        uid: crypto.randomUUID(),
        type: randomPortSide(),
        name,
        })
    })
  }
  
  if (vessel.out_vessels){
    const outputs = parseVesselNames(vessel.out_vessels)
    outputs.forEach(name => {
    ports.push({
      uid: crypto.randomUUID(),
      type: randomPortSide(),
      name,
    })
  })
  }

  return ports
}

export function buildWorkflowNodes(vessels, moduleConfig) {
  let idCounter = 0

  return vessels.map((vessel, index) => {
    const moduleData = moduleConfig.find(
      m => m.vessel_type === vessel.vessel_type
    )

    return {
      id: `dndnode_${idCounter++}`,
      type: "moduleNode",
      position: computeNodePosition(index),
      data: {
        ...vessel,
        ...moduleData,
        name: vessel.name,
        ports: buildPorts(vessel),
        label: `${moduleData.module_type} — ${moduleData.module_file}`,
      },
    }
  })
}
