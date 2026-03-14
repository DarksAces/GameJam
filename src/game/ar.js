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

// Estado global de AR accesible desde fuera (Singleton)
export const arState = {
  paranoia: false,
  speedMult: 1,
  spawnRateMult: 1
}

export async function initAR(container, { onCapture, onTargetFound }) {
  callbacks.onCapture = onCapture
  callbacks.onTargetFound = onTargetFound
  isRunning = true
  targetFoundTriggered = false
  
  // Reiniciar estado
  arState.paranoia = false
  arState.speedMult = 1
  arState.spawnRateMult = 1

  mindarThree = new MindARThree({
    container
  })

  const { renderer, scene, camera } = mindarThree

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(0, 1, 1)
  scene.add(dirLight)

  const anchor = mindarThree.addAnchor(168)

  const spawnOrb = () => {
    if (!isRunning || orbs.length >= 25) return 
    const orbGroup = createOrb()
    
    orbGroup.position.set(
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5,
      Math.random() * 0.4 + 0.15
    )
    
    const baseSpeed = 0.04
    orbGroup.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * baseSpeed,
      (Math.random() - 0.5) * baseSpeed,
      (Math.random() - 0.5) * baseSpeed
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

  const raycaster = new THREE.Raycaster()
  raycaster.params.Points.threshold = 0.5
  const mouse = new THREE.Vector2()

  const handlePointer = (e) => {
    if (!isRunning || !targetFoundTriggered) return
    
    const isMoveEvent = e.type === 'mousemove' || e.type === 'touchmove';
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    mouse.x = (clientX / window.innerWidth) * 2 - 1
    mouse.y = -(clientY / window.innerHeight) * 2 + 1

    if (isMoveEvent) return; 

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
      raycaster.setFromCamera(mouse, camera);

      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];

        if (now > orb.userData.expiresAt) {
          anchor.group.remove(orb);
          orbs.splice(i, 1);
          continue;
        }

        // Paranoia repulsión
        if (arState.paranoia && orb.userData.type !== 'WHITE') {
          const distToRay = raycaster.ray.distanceSqToPoint(orb.position)
          if (distToRay < 2.0) {
            const pushVector = new THREE.Vector3().subVectors(orb.position, raycaster.ray.origin)
            pushVector.z = 0 
            const repulsionStrength = 0.2 / Math.max(0.1, distToRay)
            pushVector.normalize().multiplyScalar(repulsionStrength)
            orb.position.add(pushVector)
          }
        }

        const frameVelocity = orb.userData.velocity.clone().multiplyScalar(arState.speedMult || 1);
        orb.position.add(frameVelocity);

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