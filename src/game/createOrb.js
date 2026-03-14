import * as THREE from 'three'

const COLORS = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88, 0xff6600]

const POINT_VALUES = {
  0x00ffff: 1, // Cian
  0xff00ff: 2, // Magenta
  0x00ff88: 3, // Esmeralda
  0xffff00: 5, // Amarillo
  0xff6600: -2 // Naranja
}

export function createOrb() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const points = POINT_VALUES[color]

  // Grupo contenedor para el orbe
  const group = new THREE.Group()
  group.userData.points = points

  // Esfera visual principal
  const geometry = new THREE.SphereGeometry(0.08, 32, 32)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.95,
  })
  const orbMesh = new THREE.Mesh(geometry, material)
  group.add(orbMesh)

  // Halo exterior (glow effect)
  const glowGeo = new THREE.SphereGeometry(0.13, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  group.add(glow)

  // AREA DE IMPACTO INVISIBLE (Más grande para facilitar el click)
  const hitGeo = new THREE.SphereGeometry(0.20, 16, 16)
  const hitMat = new THREE.MeshBasicMaterial({ 
    visible: false, 
    transparent: true, 
    opacity: 0 
  })
  const hitMesh = new THREE.Mesh(hitGeo, hitMat)
  hitMesh.name = "hitbox"
  group.add(hitMesh)

  // Luz puntual
  const light = new THREE.PointLight(color, 1.5, 0.5)
  group.add(light)

  return group
}