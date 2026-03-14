import * as THREE from 'three'

export const ORB_TYPES = [
  { type: 'BLUE', color: 0x00aaff, points: 1, weight: 60 },
  { type: 'RED', color: 0xff3333, points: 2, weight: 8 },
  { type: 'GREEN', color: 0x33ff33, points: 5, weight: 8 },
  { type: 'YELLOW', color: 0xffff33, points: 3, weight: 8 },
  { type: 'ORANGE', color: 0xffaa00, points: 0, weight: 4 }, // gato
]

export function createOrb() {
  // Selección por peso
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

  const { type, color, points } = selected

  // Grupo contenedor
  const group = new THREE.Group()
  group.userData.type = type
  group.userData.points = points

  // Esfera visual
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

  // Glow
  const glowGeo = new THREE.SphereGeometry(0.13, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  group.add(glow)

  // Hitbox invisible
  const hitGeo = new THREE.SphereGeometry(0.4, 16, 16)
  const hitMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 })
  const hitMesh = new THREE.Mesh(hitGeo, hitMat)
  hitMesh.name = "hitbox"
  group.add(hitMesh)

  // Luz
  const light = new THREE.PointLight(color, 1.5, 0.5)
  group.add(light)

  return group
}