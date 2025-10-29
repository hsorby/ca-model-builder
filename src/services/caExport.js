import JSZip from "jszip"
import Papa from "papaparse"

/**
 * Classifies a variable based on a list of parameters.
 * Assumes 'parameters' is an array of objects, where each object has a 'name' property
 * representing the parameter name (e.g., [{ name: 'param_a' }, { name: 'param_b' }]).
 *
 * @param {string} moduleName - The name the variable comes from.
 * @param {object} variable - The variable object (e.g., { name: 'q_V' })
 * @param {Array<object>} parameters - List of parameter objects.
 * @returns {string} - 'global_constant', 'constant', or 'variable'
 */
function classifyVariable(moduleName, variable, parameters) {
  const varName = variable.name

  if (!varName || !Array.isArray(parameters)) {
    console.error("Invalid input to classifyVariable")
    return "undefined" // Default or error state
  }

  for (const param of parameters) {
    const paramName = param.variable_name

    // Check for an exact match first.
    if (varName === paramName) {
      return "global_constant" // Found exact match, classification is done.
    }

    // Check for a compound match.
    if (`${varName}_${moduleName}` === paramName) {
      return "constant"
    }
  }

  // Neither a globl constant of constant found after checking all parameters.
  return "variable"
}

/**
 * Generates a zip blob for the Circulatory Autogen export.
 * @param {Array} nodes - The array of nodes from Vue Flow.
 * @param {Array} edges - The array of edges from Vue Flow.
 * @param {Array} parameters - The parameter data from the store.
 * @returns {Promise<Blob>} A promise that resolves with the zip file blob.
 */
export async function generateExportZip(fileName, nodes, edges, parameters) {
  const zip = new JSZip()

  const nodeNameMap = new Map()
  const nodeNameObjMap = new Map()
  for (const node of nodes) {
    nodeNameMap.set(node.id, node.data.name)
    nodeNameObjMap.set(node.data.name, node)
  }

  let module_config = []
  let vessel_array = []
  const BC_type = "nn" // Placeholder, figure out actual logic if needed.
  for (const node of nodes) {
    const inp_vessels = []
    const out_vessels = []
    for (const edge of edges) {
      // --- Check for INCOMING edges ---
      // If an edge's target is this node, it's an input.
      if (edge.target === node.id) {
        // Get the name of the source node.
        const sourceNodeName = nodeNameMap.get(edge.source)
        if (sourceNodeName) {
          inp_vessels.push(sourceNodeName)
        }
      }

      // --- Check for OUTGOING edges ---
      // If an edge's source is this node, it's an output.
      if (edge.source === node.id) {
        // Get the name of the target node.
        const targetNodeName = nodeNameMap.get(edge.target)
        if (targetNodeName) {
          out_vessels.push(targetNodeName)
        }
      }
    }

    const sourceNodeObjects = inp_vessels
      .map((name) => nodeNameObjMap.get(name))
      .filter(Boolean) // Filter out any undefined/missing nodes

    let generalPorts = []
    for (const info of node.data.portLabels || []) {
      const currentPortLabel = info.label

      // Count how many *input nodes* have this *same port label*
      let portLabelCountOnInputs = 0
      for (const sourceNode of sourceNodeObjects) {
        // Check if the source node has *at least one* port with the same label
        const hasLabel = (sourceNode.data.portLabels || []).some(
          (pl) => pl.label === currentPortLabel
        )
        if (hasLabel) {
          portLabelCountOnInputs++
        }
      }

      // Check the multi_port condition
      const isMultiPort = portLabelCountOnInputs > 1

      // Create the port entry
      const portEntry = {
        port_type: currentPortLabel,
        variables: [info.option] || [],
      }

      if (isMultiPort) {
        portEntry.multi_port = "True"
      }

      generalPorts.push(portEntry)
    }
    let variablesAndUnits = []
    for (const variable of node.data.portOptions || []) {
      variablesAndUnits.push([
        variable.name,
        variable.units || "missing",
        "access",
        classifyVariable(node.data.name, variable, parameters),
      ])
    }

    module_config.push({
      vessel_type: node.data.name,
      BC_type: BC_type,
      module_format: "cellml",
      module_file: node.data.sourceFile,
      module_type: node.data.componentName,
      entrance_ports: node.data.entrancePorts || [],
      exit_ports: node.data.exitPorts || [],
      general_ports: generalPorts || [],
      variables_and_units: variablesAndUnits,
    })
    vessel_array.push({
      name: node.data.name,
      BC_type: BC_type,
      vessel_type: node.data.name,
      inp_vessels: inp_vessels.join(" "),
      out_vessels: out_vessels.join(" "),
    })
  }

  zip.file(
    `${fileName}_module_config.json`,
    JSON.stringify(module_config, null, 2)
  )

  const csvData = Papa.unparse(vessel_array)
  zip.file(`${fileName}_vessel_array.csv`, csvData)

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  })

  return zipBlob
}
