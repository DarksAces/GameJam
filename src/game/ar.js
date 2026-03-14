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
      orbs.forEach((orb) => {
        // Bobbing
        orb.position.y = orb.userData.baseY + Math.sin(time * 0.002 + orb.userData.phase) * 0.05
        orb.rotation.y += 0.02
      })
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