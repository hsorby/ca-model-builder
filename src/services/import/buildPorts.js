
function parseVesselNames(vesselField) {
  return Array.from(
    new Set(vesselField?.trim().split(/\s+/).filter(Boolean) ?? [])
  )
}

function buildPorts(vessel) {
  const ports = []

  if (vessel.inp_vessels) {
    const inputs = parseVesselNames(vessel.inp_vessels)
    inputs.forEach((name) => {
      ports.push({
        uid: crypto.randomUUID(),
        type: 'left',
        name,
      })
    })
  }

  if (vessel.out_vessels) {
    const outputs = parseVesselNames(vessel.out_vessels)
    outputs.forEach((name) => {
      ports.push({
        uid: crypto.randomUUID(),
        type: 'right',
        name,
      })
    })
  }

  return ports
}

function parseGeneralPorts(generalPorts) {
  return generalPorts
    .filter(
      (port) =>
        port.port_type &&
        Array.isArray(port.variables) &&
        port.variables.length > 0
    )
    .map((port) => ({
      label: port.port_type,
      option: [...port.variables][0], // Currently limited to a single variable per port label.
      isMultiPortSum: port.multi_port == 'Sum',
    }))
}

function buildPortLabels(moduleData) {
  const generalPortLabels = parseGeneralPorts(moduleData.general_ports)

  // Eventually will need to parse directional port labels and combine with general port labels.
  const finalPortLabels = generalPortLabels

  return finalPortLabels
}

export { buildPortLabels, buildPorts }
