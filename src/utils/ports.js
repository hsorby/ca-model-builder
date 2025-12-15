export const PORT_SIDES = ["left", "right", "top", "bottom"]
export const SOURCE_PORT_PRIORITY = ["right", "bottom", "top", "left"]
export const TARGET_PORT_PRIORITY = ["left", "top", "bottom", "right"]

export function randomPortSide() {
    return PORT_SIDES[Math.floor(Math.random() * PORT_SIDES.length)]
}

export function getHandleId(port) {
    return `port_${port.type}_${port.uid}`
}

export function createPortAllocator() {
    const usedPorts = new Map()

    function nextUnusedPort(node, sidePriority) {
        const used = usedPorts.get(node.id) ?? []

        const port = node.data.ports.find(
            p => sidePriority.includes(p.type) && !used.includes(p.uid)
        )

        if (!port) return null
        
        usedPorts.set(node.id, [...used, ports.uid])
        return port
    }

    return { nextUnusedPort }
}