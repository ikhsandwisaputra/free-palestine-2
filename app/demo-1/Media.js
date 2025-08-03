import { Mesh, Program, Texture } from 'ogl'

import fragment from './fragment.glsl'
import vertex from './vertex.glsl'

export default class {
  constructor ({ element, geometry, gl, height, scene, screen, viewport }) {
    this.element = element
    this.geometry = geometry
    this.gl = gl
    this.height = height
    this.scene = scene
    this.screen = screen
    this.viewport = viewport

    this.extra = 0
    
    // Diubah: Deteksi tipe media (gambar atau video)
    this.image = this.element.querySelector('img')
    this.video = this.element.querySelector('video')
    this.mediaType = this.image ? 'image' : 'video'

    this.createMesh()
    this.createBounds()

    this.onResize()
  }

  createMesh () {
    const texture = new Texture(this.gl, {
      generateMipmaps: false
    })

    const program = new Program(this.gl, {
      fragment,
      vertex,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uViewportSizes: { value: [this.viewport.width, this.viewport.height] },
        uStrength: { value: 0 }
      },
      transparent: true
    })

    // Diubah: Logika bersyarat untuk memuat media
   if (this.mediaType === 'image') {
    const image = new Image()
    image.src = this.image.src
    image.onload = _ => {
      program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight]
      texture.image = image
    }
  } else {
    texture.image = this.video
    program.uniforms.uImageSizes.value = [this.video.videoWidth, this.video.videoHeight]

    // TAMBAHKAN BARIS INI
    this.video.play() 
  }

    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program
    })

    this.plane.setParent(this.scene)
  }

  createBounds () {
    this.bounds = this.element.getBoundingClientRect()

    this.updateScale()
    this.updateX()
    this.updateY()

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y]
  }

  updateScale () {
    this.plane.scale.x = this.viewport.width * this.bounds.width / this.screen.width
    this.plane.scale.y = this.viewport.height * this.bounds.height / this.screen.height
  }

  updateX (x = 0) {
    this.plane.position.x = -(this.viewport.width / 2) + (this.plane.scale.x / 2) + ((this.bounds.left - x) / this.screen.width) * this.viewport.width
  }

  updateY (y = 0) {
    this.plane.position.y = ((this.viewport.height / 2) - (this.plane.scale.y / 2) - ((this.bounds.top - y) / this.screen.height) * this.viewport.height) - this.extra
  }

  update (y, direction) {
    this.updateScale()
    this.updateX()
    this.updateY(y.current)

    // Diubah: Pembaruan tekstur hanya dijalankan jika medianya adalah video
    if (this.mediaType === 'video') {
      if (this.plane.program.uniforms.tMap.value.image) {
        this.plane.program.uniforms.tMap.value.needsUpdate = true
      }
    }

    const planeOffset = this.plane.scale.y / 2
    const viewportOffset = this.viewport.height / 2

    this.isBefore = this.plane.position.y + planeOffset < -viewportOffset
    this.isAfter = this.plane.position.y - planeOffset > viewportOffset

    if (direction === 'up' && this.isBefore) {
      this.extra -= this.height
      this.isBefore = false
      this.isAfter = false
    }

    if (direction === 'down' && this.isAfter) {
      this.extra += this.height
      this.isBefore = false
      this.isAfter = false
    }

    this.plane.program.uniforms.uStrength.value = ((y.current - y.last) / this.screen.width) * 10
  }

  onResize (sizes) {
    this.extra = 0

    if (sizes) {
      const { height, screen, viewport } = sizes

      if (height) this.height = height
      if (screen) this.screen = screen
      if (viewport) {
        this.viewport = viewport
        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height]
      }
    }

    this.createBounds()
  }
}