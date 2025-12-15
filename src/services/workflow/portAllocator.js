export function createPortAllocator() {
  const usedPorts = new Map()

  function nextUnusedPort(node, sidePriority) {
    const ports = node?.data?.ports

    if (!Array.isArray(ports)) return null

    const used = usedPorts.get(node.id) ?? []

    const port = ports.find(
      p => sidePriority.includes(p.type) && !used.includes(p.uid)
    )

    if (!port) return null

    usedPorts.set(node.id, [...used, port.uid])
    return port
  }

  return { nextUnusedPort }
}
