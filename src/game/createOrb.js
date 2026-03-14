import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js'

const COLORS = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88, 0xff6600]

const POINT_VALUES = {
  0x00ffff: 1, // Cian
  0xff00ff: 2, // Magenta
  0x00ff88: 3, // Esmeralda
  0xffff00: 5, // Amarillo
  0xff6600: -2 // Naranja
}

const LABELS = {
  0x00ffff: '+1',
  0xff00ff: 'SUEÑO',
  0x00ff88: 'FOCO',
  0xffff00: 'EXITO',
  0xff6600: 'TDHA'
}

export function createOrb() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const points = POINT_VALUES[color]

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
  orb.userData.points = points

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