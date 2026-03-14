import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js'

const COLORS = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88, 0xff6600]

export function createOrb() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]

  // Esfera principal
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
  const orb = new THREE.Mesh(geometry, material)

  // Halo exterior (glow effect)
  const glowGeo = new THREE.SphereGeometry(0.13, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  orb.add(glow)

  // Luz puntual para iluminar alrededor del orbe
  const light = new THREE.PointLight(color, 1.5, 0.5)
  orb.add(light)

  return orb
}