export type GpuTier = 'high' | 'medium' | 'low'

export interface GpuCapabilities {
  tier: GpuTier
  renderer: string
  maxTextureSize: number
  isIntegratedGpu: boolean
}

const LOW_END_PATTERNS = [
  'intel hd graphics',
  'intel uhd graphics',
  'intel iris',
  'intel(r) hd',
  'intel(r) uhd',
  'mesa',
  'swiftshader',
  'llvmpipe',
  'softpipe',
  'microsoft basic render',
  'amd radeon(tm) graphics',
  'amd radeon vega',
  'mali-',
  'adreno',
  'powervr',
]

const HIGH_END_PATTERNS = [
  'nvidia geforce rtx',
  'nvidia geforce gtx 1',
  'nvidia geforce gtx 2',
  'radeon rx',
  'radeon pro',
  'arc a',
]

export function detectGpuCapabilities(): GpuCapabilities {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  if (!gl) {
    return {
      tier: 'low',
      renderer: 'unknown',
      maxTextureSize: 0,
      isIntegratedGpu: true,
    }
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const rendererStr = debugInfo
    ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
    : (gl.getParameter(gl.RENDERER) as string)

  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  const rendererLower = rendererStr.toLowerCase()

  const isIntegratedGpu = LOW_END_PATTERNS.some(p => rendererLower.includes(p))
  const isHighEnd = HIGH_END_PATTERNS.some(p => rendererLower.includes(p))

  let tier: GpuTier = 'medium'
  if (isHighEnd && maxTextureSize >= 16384) {
    tier = 'high'
  } else if (isIntegratedGpu || maxTextureSize <= 4096) {
    tier = 'low'
  }

  // Cleanup
  const loseCtx = gl.getExtension('WEBGL_lose_context')
  if (loseCtx) loseCtx.loseContext()

  return { tier, renderer: rendererStr, maxTextureSize, isIntegratedGpu }
}
