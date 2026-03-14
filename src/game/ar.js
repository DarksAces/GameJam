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

export async function initAR(container, { onCapture, onTargetFound }) {
  callbacks.onCapture = onCapture
  callbacks.onTargetFound = onTargetFound
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
    if (!isRunning || orbs.length >= 25) return 
    const orbGroup = createOrb()
    
    // Spawn siempre frontal y visible
    orbGroup.position.set(
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5,
      Math.random() * 0.4 + 0.15
    )
    orbGroup.userData.baseY = orbGroup.position.y
    orbGroup.userData.phase = Math.random() * Math.PI * 2
    
    // Nueva velocidad solicitada por el usuario
    orbGroup.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.015,
      (Math.random() - 0.5) * 0.015,
      (Math.random() - 0.5) * 0.015
    )
    // Tiempo de vida para evitar saturación (4 segundos)
    orbGroup.userData.expiresAt = Date.now() + 4000
    
    anchor.group.add(orbGroup)
    orbs.push(orbGroup)
    playSpawn()
  }

  const handleTargetFound = () => {
    if (targetFoundTriggered) return
    console.log('🎯 CARA DETECTADA - Iniciando juego');
    targetFoundTriggered = true
    callbacks.onTargetFound?.()
    if (!spawnInterval && isRunning) {
      spawnOrb()
      spawnInterval = setInterval(spawnOrb, 1800)
    }
  }

  anchor.onTargetFound = () => handleTargetFound();

  // --- Raycaster mejorado ---
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const handlePointer = (e) => {
    if (!isRunning || !targetFoundTriggered) return
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    mouse.x = (clientX / window.innerWidth) * 2 - 1
    mouse.y = -(clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    
    // Intersectamos con el grupo de anclaje (que contiene orbes)
    const hits = raycaster.intersectObjects(anchor.group.children, true)

    if (hits.length > 0) {
      let hitObject = hits[0].object
      
      // Subimos hasta encontrar el grupo que está en el array 'orbs'
      let targetOrb = hitObject
      while (targetOrb.parent && !orbs.includes(targetOrb)) {
        targetOrb = targetOrb.parent
      }

      const idx = orbs.indexOf(targetOrb)
      if (idx > -1) {
        console.log(`✅ CAPTURADO: ${targetOrb.userData.points} pts`);
        anchor.group.remove(targetOrb)
        orbs.splice(idx, 1)
        playCapture()
        callbacks.onCapture?.(targetOrb.userData.points)
      }
    }
  }

  window.addEventListener('mousedown', handlePointer)
  window.addEventListener('touchstart', handlePointer, { passive: true })

  await mindarThree.start()

  renderer.setAnimationLoop((time) => {
    if (!isRunning) return
    
    // Fallback de detección por visibilidad
    if (anchor.group.visible && !targetFoundTriggered) {
      handleTargetFound();
    }

    if (targetFoundTriggered) {
      const now = Date.now();
      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];

        // Auto-eliminación tras expirar
        if (now > orb.userData.expiresAt) {
          anchor.group.remove(orb);
          orbs.splice(i, 1);
          continue;
        }

        // Aplicar movimiento
        orb.position.add(orb.userData.velocity);

        // Rebotes en límites
        const bounds = { x: 1.2, y: 1.0, z: 0.8 };
        if (Math.abs(orb.position.x) > bounds.x) orb.userData.velocity.x *= -1;
        if (Math.abs(orb.position.y) > bounds.y) orb.userData.velocity.y *= -1;
        if (orb.position.z < 0.1 || orb.position.z > bounds.z) orb.userData.velocity.z *= -1;

        orb.rotation.y += 0.02;
        orb.rotation.x += 0.01;
      }
    }
    renderer.render(scene, camera)
  })

  callbacks.cleanup = () => {
    window.removeEventListener('mousedown', handlePointer)
    window.removeEventListener('touchstart', handlePointer)
    isRunning = false
    clearInterval(spawnInterval)
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