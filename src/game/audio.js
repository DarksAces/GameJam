import { Howl } from 'howler'

const captureSound = new Howl({ src: ['/sounds/capture.mp3'], volume: 0.8 })
const spawnSound   = new Howl({ src: ['/sounds/spawn.mp3'],   volume: 0.4 })

const ambientSound = new Howl({ 
  src: ['/cat.mp3'], 
  loop: true, 
  volume: 0.5,
  onload: function() {
    console.log('✅ enjoy.mp3 cargado correctamente')
  },
  onloaderror: function(id, err) {
    console.error('❌ Error cargando enjoy.mp3:', err)
  },
  onplay: function() {
    console.log('🎵 enjoy.mp3 reproduciéndose')
  },
  onpause: function() {
    console.log('⏸️ enjoy.mp3 pausado')
  }
})

let isAmbientPlaying = false

export const playCapture = () => captureSound.play()
export const playSpawn   = () => spawnSound.play()

export const playAmbient = () => {
  console.log('🎵 Iniciando enjoy.mp3...')
  ambientSound.play()
  isAmbientPlaying = true
}

export const stopAmbient = () => {
  console.log('🎵 Deteniendo enjoy.mp3...')
  ambientSound.stop()
  isAmbientPlaying = false
}

export const toggleAmbient = () => {
  if (isAmbientPlaying) {
    ambientSound.pause()
    isAmbientPlaying = false
    console.log('🎵 Música pausada')
  } else {
    ambientSound.play()
    isAmbientPlaying = true
    console.log('🎵 Música reanudada')
  }
  return isAmbientPlaying
}

export const isAmbientActive = () => isAmbientPlaying