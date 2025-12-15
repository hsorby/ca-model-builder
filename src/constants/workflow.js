// Workspace bounds
export const WORKSPACE_LIMITS = {
  MIN_X: -2000,
  MIN_Y: -2000,
  MAX_X: 2000,
  MAX_Y: 2000,
}

// Margin to prevent autogeneration occuring right at the border of the workspace
const MARGIN = 150

// Config import bounds
export const PLACEMENT_LIMITS = {
  MIN_X: WORKSPACE_LIMITS.MIN_X+MARGIN,
  MIN_Y: WORKSPACE_LIMITS.MIN_Y+4*MARGIN,
  MAX_X: WORKSPACE_LIMITS.MAX_X-MARGIN,
  MAX_Y: WORKSPACE_LIMITS.MAX_Y-4*MARGIN,
}

// Node sizing and spacing for grid layout
export const NODE_WIDTH = 180
export const NODE_HEIGHT = 100
export const NODE_MARGIN_X = 50
export const NODE_MARGIN_Y = 50