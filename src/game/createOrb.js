import * as THREE from 'three'

export const ORB_TYPES = [
  { type: 'BLUE',   icon: '💰', color: 0x00aaff, points: 1, weight: 60 },
  { type: 'RED',    icon: '💩', color: 0xff3333, points: 2, weight: 8 },
  { type: 'GREEN',  icon: '🌿', color: 0x33ff33, points: 5, weight: 8 },
  { type: 'YELLOW', icon: '🫘', color: 0xffff33, points: 3, weight: 8 },
  { type: 'ORANGE', icon: '🐱', color: 0xffaa00, points: 0, weight: 4 }, // gato
]

// Caché de texturas para evitar recrearlas continuamente
const textureCache = {}

function getEmojiTexture(emoji) {
  if (textureCache[emoji]) return textureCache[emoji]

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  
  // Limpiar fondo (asegurar transparencia total)
  context.clearRect(0, 0, size, size)

  // Estilo del texto
  context.font = 'bold 380px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  
  // Brillo exterior (Halo) directo en el emoji para que resalte en cualquier fondo
  context.shadowColor = 'rgba(255, 255, 255, 0.8)'
  context.shadowBlur = 40
  
  // Dibujar el emoji centrado
  context.fillText(emoji, size / 2, size / 2)
  
  // Segunda pasada para reforzar el color y detalle
  context.shadowBlur = 0
  context.fillText(emoji, size / 2, size / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  textureCache[emoji] = texture
  return texture
}

export function createOrb() {
  const totalWeight = ORB_TYPES.reduce((acc, obj) => acc + obj.weight, 0)
  let random = Math.random() * totalWeight
  let selected = ORB_TYPES[0]

  for (const orbType of ORB_TYPES) {
    if (random < orbType.weight) {
      selected = orbType
      break
    }
    random -= orbType.weight
  }

  const { type, icon, color, points } = selected

  const group = new THREE.Group()
  group.userData.type = type
  group.userData.points = points

  // Sprite con el emoji (Sin fondo circular, más impactante)
  const spriteMaterial = new THREE.SpriteMaterial({
    map: getEmojiTexture(icon),
    transparent: true,
    alphaTest: 0.05,
    sizeAttenuation: true
  })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(0.4, 0.4, 1)
  group.add(sprite)

  // Glow ambiental muy suave (fuera del emoji para no ensuciar)
  const glowGeo = new THREE.SphereGeometry(0.25, 16, 16)
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  group.add(glow)

  // Hitbox
  const hitGeo = new THREE.SphereGeometry(0.5, 16, 16)
  const hitMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 })
  const hitMesh = new THREE.Mesh(hitGeo, hitMat)
  hitMesh.name = "hitbox"
  group.add(hitMesh)

  // Luz puntual potente
  const light = new THREE.PointLight(color, 2.5, 1.0)
  light.position.set(0, 0, 0.1)
  group.add(light)

  return group
}