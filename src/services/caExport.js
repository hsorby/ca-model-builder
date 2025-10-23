import JSZip from "jszip"
import Papa from "papaparse"

/**
 * Classifies a variable based on a list of parameters.
 * Assumes 'parameters' is an array of objects, where each object has a 'name' property
 * representing the parameter name (e.g., [{ name: 'param_a' }, { name: 'param_b' }]).
 *
 * @param {object} variable - The variable object (e.g., { name: 'my_var_suffix' })
 * @param {Array<object>} parameters - List of parameter objects.
 * @returns {string} - 'global_constant', 'constant', or 'variable'
 */
function classifyVariable(variable, parameters) {
  const varName = variable.name;

  if (!varName || !Array.isArray(parameters)) {
    console.error("Invalid input to classifyVariable");
    return 'variable'; // Default or error state
  }

  let isConstant = false; // Flag to check if we found a prefix match

  for (const param of parameters) {
    const paramName = param.variable_name;

    // 1. Check for an exact match first
    if (varName === paramName) {
      return 'global_constant'; // Found exact match, classification is done.
    }

    // 2. Check if the parameter name is a prefix of the variable name
    //    AND the variable name is longer (meaning it has a suffix)
    if (paramName.startsWith(varName) && paramName.length > varName.length) {
      // We found a potential prefix match. We set the flag but continue checking
      // other parameters in case a later one is an *exact* match.
      isConstant = true;
    }
  }

  // 3. After checking all parameters:
  //    If we found a prefix match (and didn't return 'global_constant' earlier)
  if (isConstant) {
    return 'constant';
  }

  // 4. If neither exact nor prefix match was found after checking all parameters
  return 'variable';
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
  for (const node of nodes) {
    nodeNameMap.set(node.id, node.data.name)
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

    let generalPorts = []
    for (const info of node.data.portLabels || []) {
      generalPorts.push({
        port_type: info.label,
        variables: info.option || [],
        multi_port: true, // Placeholder, figure out actual logic if needed.
      })
    }
    let variablesAndUnits = []
    for (const variable of node.data.portOptions || []) {
      variablesAndUnits.push([
        variable.name, variable.unit || 'missing', 'access', classifyVariable(variable, parameters)
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
  console.log("Parameters:", parameters)
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
