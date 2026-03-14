import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { createOrb } from './createOrb'
import { playCapture, playSpawn } from './audio'

let mindarThree = null
let orbs = []
let callbacks = {}
let spawnInterval = null
let isRunning = false

export async function initAR(container, { onCapture }) {
  callbacks.onCapture = onCapture
  isRunning = true

  mindarThree = new MindARThree({
    container,
    imageTargetSrc: 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind',
  })

  const { renderer, scene, camera } = mindarThree
  
  // Fondo transparente para ver la cámara
  renderer.setClearColor(0x000000, 0)

  // Luces
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(0, 0, 5)
  scene.add(dirLight)

  // Anchor 0 (Ajustar cuando tengamos el .mind real)
  const anchor = mindarThree.addAnchor(0)
  
  const spawnOrb = () => {
    if (!isRunning || orbs.length >= 20) return
    const orb = createOrb()
    
    // Posiciones aleatorias relativas al marcador
    orb.position.set(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
      Math.random() * 0.5
    )
    
    orb.userData.basePos = orb.position.clone()
    orb.userData.phase = Math.random() * Math.PI * 2
    
    anchor.group.add(orb)
    orbs.push(orb)
    playSpawn()
  }

  anchor.onTargetFound = () => {
    console.log('🎯 Target detectado!')
    if (!spawnInterval) {
      spawnOrb()
      spawnInterval = setInterval(spawnOrb, 1200)
    }
  }

  anchor.onTargetLost = () => {
    console.log('Target perdido')
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  // --- Raycasting para clicks ---
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const handlePointer = (e) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX
    const y = e.touches ? e.touches[0].clientY : e.clientY
    
    mouse.x = (x / window.innerWidth) * 2 - 1
    mouse.y = -(y / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(anchor.group.children, true)

    if (hits.length > 0) {
      // Encontrar el grupo que es el orbe
      let target = hits[0].object
      while (target.parent && !orbs.includes(target)) {
        target = target.parent
      }
      
      const idx = orbs.indexOf(target)
      if (idx > -1) {
        console.log('✅ ¡Capturado!')
        anchor.group.remove(target)
        orbs.splice(idx, 1)
        playCapture()
        callbacks.onCapture?.(target.userData.points)
      }
    }
  }

  window.addEventListener('mousedown', handlePointer)
  window.addEventListener('touchstart', handlePointer, { passive: true })

  await mindarThree.start()
  
  renderer.setAnimationLoop((time) => {
    if (!isRunning) return
    
    orbs.forEach((orb) => {
      // Animación suave
      orb.position.y = orb.userData.basePos.y + Math.sin(time * 0.003 + orb.userData.phase) * 0.05
      orb.rotation.y += 0.02
    })
    
    renderer.render(scene, camera)
  })

  callbacks.cleanup = () => {
    window.removeEventListener('mousedown', handlePointer)
    window.removeEventListener('touchstart', handlePointer)
    mindarThree.stop()
    renderer.setAnimationLoop(null)
  }
}

export function stopAR() {
  isRunning = false
  clearInterval(spawnInterval)
  spawnInterval = null
  if (callbacks.cleanup) callbacks.cleanup()
  orbs = []
}