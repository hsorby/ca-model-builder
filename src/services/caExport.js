import JSZip from "jszip"
import Papa from "papaparse"

/**
 * Generates a zip blob for the Circulatory Autogen export.
 * @param {Array} nodes - The array of nodes from Vue Flow.
 * @param {Array} edges - The array of edges from Vue Flow.
 * @param {Array} parameters - The parameter data from the store.
 * @returns {Promise<Blob>} A promise that resolves with the zip file blob.
 */
export async function generateExportZip(fileName, nodes, edges, parameters) {
  const zip = new JSZip()

  console.log("Generating export zip with filename:", fileName)
  console.log("Nodes:", nodes)
  console.log("Edges:", edges)
  const nodeNameMap = new Map()
  for (const node of nodes) {
    nodeNameMap.set(node.id, node.data.name)
  }

  let module_config = []
  let vessel_array = []
  // name, BC_type, vessel_type, inp_vessels, out_vessels
  //   "vessel_type":"simple_membrane",
  //   "BC_type":"nn",
  //   "module_format":"cellml",
  //   "module_file":"colon_FTU_modules.cellml",
  //   "module_type":"simple_membrane",
  //   "entrance_ports":
  //   "exit_ports":
  //   "general_ports":
  //   [
  //     {
  //       "port_type":"membrane_voltage",
  //       "variables":["u_e_m"]
  //     },
  //     {
  //       "port_type":"v_ENaC_i",
  //       "variables":["v_ENaC_i"]
  //     }
  //   ],
  //   "variables_and_units":
  const BC_type = "nn" // Placeholder, figure out actual logic if needed.
  for (const node of nodes) {
    const inp_vessels = []
    const out_vessels = []
    for (const edge of edges) {
      // --- Check for INCOMING edges ---
      // If an edge's target is this node, it's an input.
      if (edge.target === node.id) {
        // Get the name of the source node
        const sourceNodeName = nodeNameMap.get(edge.source)
        if (sourceNodeName) {
          inp_vessels.push(sourceNodeName)
        }
      }

      // --- Check for OUTGOING edges ---
      // If an edge's source is this node, it's an output.
      if (edge.source === node.id) {
        // Get the name of the target node
        const targetNodeName = nodeNameMap.get(edge.target)
        if (targetNodeName) {
          out_vessels.push(targetNodeName)
        }
      }
    }
    console.log(node.data)
    let generalPorts = []
    for (const info of node.data.portLabels || []) {
      generalPorts.push({
        port_type: info.label,
        variables: info.option || [],
        multi_port: true, // Placeholder, figure out actual logic if needed.
      })
    }
    let variablesAndUnits = []
    module_config.push({
      vessel_type: node.data.name,
      BC_type: BC_type,
      module_format: "cellml",
      module_file: node.data.sourceFile,
      module_type: node.data.componentName,
      entrance_ports: node.data.entrancePorts || [],
      exit_ports: node.data.exitPorts || [],
      general_ports: generalPorts || [],
      variables_and_units: variablesAndUnits
    })
    vessel_array.push({
      name: node.data.name,
      BC_type: BC_type,
      vessel_type: node.data.name,
      inp_vessels: inp_vessels.join(' '),
      out_vessels: out_vessels.join(' '),
    })
  }
  // console.log("Parameters:", parameters)
  zip.file(
    `${fileName}_module_config.json`,
    JSON.stringify(module_config, null, 2)
  )

  // --- 2. Parameters CSV ---
  console.log("Vessel array for CSV:", vessel_array)
  const csvData = Papa.unparse(vessel_array)
  zip.file(`${fileName}_vessel_array.csv`, csvData)

  // --- 3. Generate and Return the Blob ---
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  })

  return zipBlob
}
