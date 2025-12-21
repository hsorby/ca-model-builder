export const PORT_SIDES = ["left", "right", "top", "bottom"]
export const SOURCE_PORT_PRIORITY = ["right", "bottom", "top", "left"]
export const TARGET_PORT_PRIORITY = ["left", "top", "bottom", "right"]

export function randomPortSide() {
    return PORT_SIDES[Math.floor(Math.random() * PORT_SIDES.length)]
}

export function getHandleId(port) {
    return `port_${port.type}_${port.uid}`
}
