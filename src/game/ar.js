import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-face-three.prod.js'
import { createOrb } from './createOrb'
import { playCapture, playSpawn } from './audio'

let mindarThree = null
let orbs = []
let callbacks = {}
let spawnInterval = null

export async function initAR(container, { onCapture }) {
  callbacks.onCapture = onCapture

  mindarThree = new MindARThree({
    container
  })

  const { renderer, scene, camera } = mindarThree

  // Iluminación
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(0, 1, 1)
  scene.add(dirLight)

  const anchor = mindarThree.addAnchor(1)  // Frente para face tracking

  // --- Spawn de orbes ---
  const spawnOrb = () => {
    if (orbs.length >= 6) return
    const orb = createOrb()
    orb.userData.points = orb.userData.points || 1  // Asegura que tenga puntos definidos
    // Posiciones aleatorias alrededor del target
    orb.position.set(
      (Math.random() - 0.5) * 1.2,
      Math.random() * 0.8,
      (Math.random() - 0.5) * 0.4
    )
    orb.userData.baseY = orb.position.y
    orb.userData.phase = Math.random() * Math.PI * 2 // fase aleatoria para el bob
    anchor.group.add(orb)
    orbs.push(orb)
    playSpawn()
  }

  spawnOrb()
  spawnInterval = setInterval(spawnOrb, 2500)

  // --- Tap / Click para capturar ---
  const raycaster = new THREE.Raycaster()

  const handleTap = (e) => {
    const touch = e.touches ? e.touches[0] : e
    const rect = container.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera({ x, y }, camera)
    const hits = raycaster.intersectObjects(orbs, true)

    if (hits.length > 0) {
      // Sube al padre (el orbe) si el hit fue en el halo hijo
      let target = hits[0].object
      while (target.parent && !orbs.includes(target)) {
        target = target.parent
      }
      const idx = orbs.indexOf(target)
      if (idx > -1) {
        console.log('🎯 Orbe capturado! Puntos:', target.userData.points)
        anchor.group.remove(target)
        orbs.splice(idx, 1)
        playCapture()
        console.log('📞 Llamando callback con puntos:', target.userData.points)
        callbacks.onCapture?.(target.userData.points)  // ← Ahora SÍ pasa los puntos
      }
    }
  }

  container.addEventListener('click', handleTap)
  container.addEventListener('touchstart', handleTap, { passive: true })

  // --- Loop de animación ---
  await mindarThree.start()

  renderer.setAnimationLoop((time) => {
    orbs.forEach((orb) => {
      // Bobbing suave
      orb.position.y = orb.userData.baseY + Math.sin(time * 0.002 + orb.userData.phase) * 0.05
      // Rotación lenta
      orb.rotation.y += 0.015
      orb.rotation.x += 0.005
    })
    renderer.render(scene, camera)
  })
}

export function stopAR() {
  clearInterval(spawnInterval)
  if (mindarThree) {
    mindarThree.stop()
    mindarThree.renderer.setAnimationLoop(null)
    mindarThree = null
  }
  orbs = []
}