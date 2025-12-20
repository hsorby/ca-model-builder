// import { buildWorkflowNodes } from "./buildNodes"
// import { buildWorkflowEdges } from "./buildEdges"
// import { createPortAllocator } from "./portAllocator"
import { buildPorts, buildPortLabels } from './buildPorts'
import { getHandleId } from '../../utils/ports'

export function buildWorkflowNodes(availableModules, vessels, moduleConfig) {
  const moduleLookup = new Map()
  availableModules.forEach((file) => {
    file.modules.forEach((mod) => {
      moduleLookup.set(`${file.filename}::${mod.componentName}`, mod)
    })
  })

  return vessels.map((vessel, index) => {
    const moduleConfigData = moduleConfig.find(
      (m) => m.vessel_type === vessel.vessel_type
    )

    const moduleData = moduleLookup.get(
      `${moduleConfigData.module_file}::${moduleConfigData.module_type}`
    )

    return {
      // RECOMMENDED: Use the vessel name as ID if unique.
      // It makes linking edges for Dagre much easier than 'dndnode_0'.
      id: vessel.name,
      type: 'moduleNode',

      // 1. Give them a dummy position initially
      position: { x: 100, y: 100 },

      // 2. Do NOT set style width/height here. Let the CSS/Component decide.
      // style: { ... },

      // 3. Start invisible so the user doesn't see them stack at (0,0)
      style: { opacity: 0 },

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

export function buildLogicalEdges(vessels) {
  const logicalEdges = []

  vessels.forEach((vessel) => {
    if (!vessel.out_vessels) return

    vessel.out_vessels.split(' ').forEach((targetName) => {
      logicalEdges.push({
        source: vessel.name,
        target: targetName,
        // We don't assign handles yet!
        // We just note what TYPE of connection we need (if relevant)
        type: 'vessel_connection',
      })
    })
  })

  return logicalEdges
}

export function buildWorkflowGraph(store, configFiles) {
  const nodes = buildWorkflowNodes(
    store,
    configFiles.vesselArray,
    configFiles.moduleConfig
  )

  const nodeByName = new Map(nodes.map((node) => [node.data.name, node]))

  // const portAllocator = createPortAllocator()

  const logicalEdges = buildLogicalEdges(configFiles.vesselArray)

  return { nodes, logicalEdges }
}
