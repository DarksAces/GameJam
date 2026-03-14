import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-face-three.prod.js'
import { createOrb } from './createOrb'
import { playCapture, playSpawn } from './audio'

let mindarThree = null
let orbs = []
let callbacks = {}
let spawnInterval = null
let isRunning = false
let targetFoundTriggered = false
let arState = { paranoia: false, speedMult: 1, spawnRateMult: 1 }

export async function initAR(container, { onCapture, onTargetFound }, externalState) {
  callbacks.onCapture = onCapture
  callbacks.onTargetFound = onTargetFound
  arState = externalState || { paranoia: false, speedMult: 1, spawnRateMult: 1 }
  isRunning = true
  targetFoundTriggered = false

  mindarThree = new MindARThree({
    container
  })

  const { renderer, scene, camera } = mindarThree

  // Iluminación
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(0, 1, 1)
  scene.add(dirLight)

  // Anchor 168 (Entre los ojos)
  const anchor = mindarThree.addAnchor(168)

  const spawnOrb = () => {
    if (!isRunning || orbs.length >= 30) return 
    const orbGroup = createOrb()
    
    orbGroup.position.set(
      (Math.random() - 0.5) * 3.0,
      (Math.random() - 0.5) * 3.0,
      Math.random() * 0.4 + 0.15
    )
    orbGroup.userData.basePos = orbGroup.position.clone()
    
    // Velocidad base
    const baseSpeedThreshold = 0.04
    orbGroup.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * baseSpeedThreshold,
      (Math.random() - 0.5) * baseSpeedThreshold,
      (Math.random() - 0.5) * baseSpeedThreshold
    )
    orbGroup.userData.expiresAt = Date.now() + 5000
    
    anchor.group.add(orbGroup)
    orbs.push(orbGroup)
    playSpawn()
  }

  const handleTargetFound = () => {
    if (targetFoundTriggered) return
    console.log('🎯 CARA DETECTADA');
    targetFoundTriggered = true
    callbacks.onTargetFound?.()
    if (!spawnInterval && isRunning) {
      const scheduleNextSpawn = () => {
        if (!isRunning) return
        spawnOrb()
        const wait = 1800 / (arState.spawnRateMult || 1)
        spawnInterval = setTimeout(scheduleNextSpawn, wait)
      }
      scheduleNextSpawn()
    }
  }

  anchor.onTargetFound = () => handleTargetFound();

  // --- Raycaster ---
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const handlePointer = (e) => {
    if (!isRunning || !targetFoundTriggered) return
    
    // Si es un evento de movimiento y no estamos en modo Paranoia, no hacemos el Raycast pesado
    // Pero necesitamos actualizar la posición del mouse para el loop de animación
    const isMoveEvent = e.type === 'mousemove' || e.type === 'touchmove';
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    mouse.x = (clientX / window.innerWidth) * 2 - 1
    mouse.y = -(clientY / window.innerHeight) * 2 + 1

    if (isMoveEvent) return; // Solo actualizamos 'mouse' y salimos

    // Solo si es mousedown o touchstart procedemos a la captura
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(anchor.group.children, true)

    if (hits.length > 0) {
      let hitObject = hits[0].object
      let targetOrb = hitObject
      while (targetOrb.parent && !orbs.includes(targetOrb)) {
        targetOrb = targetOrb.parent
      }

      const idx = orbs.indexOf(targetOrb)
      if (idx > -1) {
        anchor.group.remove(targetOrb)
        orbs.splice(idx, 1)
        playCapture()
        // PASAR EL TIPO AL CALLBACK
        callbacks.onCapture?.(targetOrb.userData.points, targetOrb.userData.type)
      }
    }
  }

  window.addEventListener('mousedown', handlePointer)
  window.addEventListener('mousemove', handlePointer)
  window.addEventListener('touchstart', handlePointer, { passive: true })
  window.addEventListener('touchmove', handlePointer, { passive: true })

  await mindarThree.start()

  renderer.setAnimationLoop((time) => {
    if (!isRunning) return
    
    if (anchor.group.visible && !targetFoundTriggered) {
      handleTargetFound();
    }

    if (targetFoundTriggered) {
      const now = Date.now();
      
      // Actualizar Raycaster para Paranoia (basado en la última posición del ratón)
      raycaster.setFromCamera(mouse, camera);

      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];

        if (now > orb.userData.expiresAt) {
          anchor.group.remove(orb);
          orbs.splice(i, 1);
          continue;
        }

        // --- Lógica de Paranoia (Repulsión) ---
        if (arState.paranoia && orb.userData.type !== 'WHITE') {
          const distToRay = raycaster.ray.distanceSqToPoint(orb.position)
          if (distToRay < 2.0) { // Rango de detección
            const pushVector = new THREE.Vector3().subVectors(orb.position, raycaster.ray.origin)
            pushVector.z = 0 
            const repulsionStrength = 0.2 / Math.max(0.1, distToRay)
            pushVector.normalize().multiplyScalar(repulsionStrength)
            orb.position.add(pushVector) // Aplicar empuje a la posición actual
          }
        }

        // Aplicar movimiento (multiplicado por speedMult del poder)
        const frameVelocity = orb.userData.velocity.clone().multiplyScalar(arState.speedMult || 1);
        orb.position.add(frameVelocity);

        // Rebotes
        const bounds = { x: 1.5, y: 1.5, z: 0.8 };
        if (Math.abs(orb.position.x) > bounds.x) orb.userData.velocity.x *= -1;
        if (Math.abs(orb.position.y) > bounds.y) orb.userData.velocity.y *= -1;
        if (orb.position.z < 0.1 || orb.position.z > bounds.z) orb.userData.velocity.z *= -1;

        orb.rotation.y += 0.02;
      }
    }
    renderer.render(scene, camera)
  })

  callbacks.cleanup = () => {
    window.removeEventListener('mousedown', handlePointer)
    window.removeEventListener('mousemove', handlePointer)
    window.removeEventListener('touchstart', handlePointer)
    window.removeEventListener('touchmove', handlePointer)
    isRunning = false
    clearTimeout(spawnInterval)
    spawnInterval = null
  }
}

export function stopAR() {
  if (callbacks.cleanup) callbacks.cleanup()
  if (mindarThree) {
    mindarThree.stop()
    if (mindarThree.renderer) mindarThree.renderer.setAnimationLoop(null)
    mindarThree = null
  }
  orbs = []
}