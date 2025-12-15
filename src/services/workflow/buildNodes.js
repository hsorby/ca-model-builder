import { randomPortSide } from "../../utils/ports"
import { PLACEMENT_LIMITS, NODE_HEIGHT, NODE_WIDTH, NODE_MARGIN_X, NODE_MARGIN_Y } from "../../constants/workflow"


function computeNodePosition(index) {
  const nodesPerRow = Math.floor((PLACEMENT_LIMITS.MAX_X - PLACEMENT_LIMITS.MIN_X) / (NODE_WIDTH + NODE_MARGIN_X))
  const row = Math.floor(index / nodesPerRow)
  const col = index % nodesPerRow

  const x = PLACEMENT_LIMITS.MIN_X + col * (NODE_WIDTH + NODE_MARGIN_X)
  const y = PLACEMENT_LIMITS.MIN_Y + row * (NODE_HEIGHT + NODE_MARGIN_Y)

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

function buildPortLabels(moduleData) {
  return Object.entries(moduleData)
    .filter(([key, value]) =>
      ["general_ports", "entrance_ports", "exit_ports"].includes(key) && 
      Array.isArray(value)
    )
    .flatMap(([type, ports]) => 
      ports
        .filter(p => p.port_type && p.variables?.length)
        .map(p => ({
          portType: type,
          label: p.port_type,
          option: p.variables[0],
          isMultiPortSum: p.multi_port === "Sum",
        }))
    )
}

export function buildWorkflowNodes(availableModules, vessels, moduleConfig) {
  let idCounter = 0

  const moduleLookup = new Map()
  availableModules.forEach(file => {
    file.modules.forEach(mod => {
        moduleLookup.set(`${file.filename}::${mod.componentName}`, mod)
    })
  })

  return vessels.map((vessel, index) => {
    const moduleConfigData = moduleConfig.find(
      m => m.vessel_type === vessel.vessel_type
    )

    const moduleData = moduleLookup.get(`${moduleConfigData.module_file}::${moduleConfigData.module_type}`)

    return {
      id: `dndnode_${idCounter++}`,
      type: "moduleNode",
      position: computeNodePosition(index),
      style: { width: NODE_WIDTH + "px", height: NODE_HEIGHT + "px" },
      data: {
        ...vessel,
        ...moduleData,
        name: vessel.name,
        ports: buildPorts(vessel),
        label: `${moduleData.componentName} — ${moduleData.sourceFile}`,
        portLabels: buildPortLabels(moduleConfigData),
      },
    }
  })
}

