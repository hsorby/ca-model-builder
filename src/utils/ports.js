import { Position } from '@vue-flow/core'

export const PORT_SIDES = ["left", "right", "top", "bottom"]
export const SOURCE_PORT_PRIORITY = ["right", "bottom", "top", "left"]
export const TARGET_PORT_PRIORITY = ["left", "top", "bottom", "right"]

export function randomPortSide() {
    return PORT_SIDES[Math.floor(Math.random() * PORT_SIDES.length)]
}

export function getHandleId(port) {
    return `port_${port.uid}`
}

export function portPosition(side) {
  switch (side) {
    case 'left':
      return Position.Left
    case 'right':
      return Position.Right
    case 'top':
      return Position.Top
    case 'bottom':
      return Position.Bottom
    default:
      return Position.Left
  }
}

