// This utility function can be called with a position change (inside onNodesChange).
// It checks all other nodes and calculated the helper line positions and the position where the current node should snap to.
export function getHelperLines(change, nodes, distance = 5) {
  const defaultResult = {
    horizontal: undefined,
    vertical: undefined,
    snapPosition: { x: undefined, y: undefined },
    alignment: undefined, // 'edge' | 'centre'
  }

  const nodeA = nodes.find((node) => node.id === change.id)

  if (!nodeA || !change.position) {
    return defaultResult
  }

  const nodeABounds = {
    left: change.position.x,
    right: change.position.x + (nodeA.dimensions.width ?? 0),
    top: change.position.y,
    bottom: change.position.y + (nodeA.dimensions.height ?? 0),
    width: nodeA.dimensions.width ?? 0,
    height: nodeA.dimensions.height ?? 0,
    centreX: change.position.x + (nodeA.dimensions.width ?? 0) / 2,
    centreY: change.position.y + (nodeA.dimensions.height ?? 0) / 2,
  }

  let horizontalDistance = distance
  let verticalDistance = distance

  return nodes
    .filter((node) => node.id !== nodeA.id)
    .reduce((result, nodeB) => {
      const nodeBBounds = {
        left: nodeB.position.x,
        right: nodeB.position.x + (nodeB.dimensions.width ?? 0),
        top: nodeB.position.y,
        bottom: nodeB.position.y + (nodeB.dimensions.height ?? 0),
        width: nodeB.width ?? 0,
        height: nodeB.height ?? 0,
        centreX: nodeB.position.x + (nodeB.dimensions.width ?? 0) / 2,
        centreY: nodeB.position.y + (nodeB.dimensions.height ?? 0) / 2,
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|
      //  |
      //  |
      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     B     |
      //  |___________|

      const distanceLeftLeft = Math.abs(nodeABounds.left - nodeBBounds.left)
      if (distanceLeftLeft < verticalDistance) {
        result.snapPosition.x = nodeBBounds.left
        result.vertical = nodeBBounds.left
        result.alignment = 'edge'
        verticalDistance = distanceLeftLeft
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|
      //              |
      //              |
      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     B     |
      //  |___________|

      const distanceRightRight = Math.abs(nodeABounds.right - nodeBBounds.right)
      if (distanceRightRight < verticalDistance) {
        result.snapPosition.x = nodeBBounds.right - nodeABounds.width
        result.vertical = nodeBBounds.right
        result.alignment = 'edge'
        verticalDistance = distanceRightRight
      }

      //              |‾‾‾‾‾‾‾‾‾‾‾|
      //              |     A     |
      //              |___________|
      //              |
      //              |
      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     B     |
      //  |___________|

      const distanceLeftRight = Math.abs(nodeABounds.left - nodeBBounds.right)
      if (distanceLeftRight < verticalDistance) {
        result.snapPosition.x = nodeBBounds.right
        result.vertical = nodeBBounds.right
        result.alignment = 'edge'
        verticalDistance = distanceLeftRight
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|
      //              |
      //              |
      //              |‾‾‾‾‾‾‾‾‾‾‾|
      //              |     B     |
      //              |___________|

      const distanceRightLeft = Math.abs(nodeABounds.right - nodeBBounds.left)
      if (distanceRightLeft < verticalDistance) {
        result.snapPosition.x = nodeBBounds.left - nodeABounds.width
        result.vertical = nodeBBounds.left
        verticalDistance = distanceRightLeft
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾|‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |     |     B     |
      //  |___________|     |___________|

      const distanceTopTop = Math.abs(nodeABounds.top - nodeBBounds.top)
      if (distanceTopTop < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.top
        result.horizontal = nodeBBounds.top
        horizontalDistance = distanceTopTop
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|_________________
      //                    |           |
      //                    |     B     |
      //                    |___________|

      const distanceBottomTop = Math.abs(nodeABounds.bottom - nodeBBounds.top)
      if (distanceBottomTop < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.top - nodeABounds.height
        result.horizontal = nodeBBounds.top
        result.alignment = 'edge'
        horizontalDistance = distanceBottomTop
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|     |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |     |     B     |
      //  |___________|_____|___________|

      const distanceBottomBottom = Math.abs(
        nodeABounds.bottom - nodeBBounds.bottom
      )
      if (distanceBottomBottom < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.bottom - nodeABounds.height
        result.horizontal = nodeBBounds.bottom
        result.alignment = 'edge'
        horizontalDistance = distanceBottomBottom
      }

      //                    |‾‾‾‾‾‾‾‾‾‾‾|
      //                    |     B     |
      //                    |           |
      //  |‾‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
      //  |     A     |
      //  |___________|

      const distanceTopBottom = Math.abs(nodeABounds.top - nodeBBounds.bottom)
      if (distanceTopBottom < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.bottom
        result.horizontal = nodeBBounds.bottom
        result.alignment = 'edge'
        horizontalDistance = distanceTopBottom
      }

      // Center X to Centre X

      const distanceCentreX = Math.abs(
        nodeABounds.centreX - nodeBBounds.centreX
      )
      if (distanceCentreX < verticalDistance) {
        result.snapPosition.x = nodeBBounds.centreX - nodeABounds.width / 2
        result.vertical = nodeBBounds.centreX
        result.alignment = 'centre'
        verticalDistance = distanceCentreX
      }

      // Center Y to Centre Y

      const distanceCentreY = Math.abs(
        nodeABounds.centreY - nodeBBounds.centreY
      )
      if (distanceCentreY < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.centreY - nodeABounds.height / 2
        result.horizontal = nodeBBounds.centreY
        result.alignment = 'centre'
        horizontalDistance = distanceCentreY
      }

      return result
    }, defaultResult)
}
