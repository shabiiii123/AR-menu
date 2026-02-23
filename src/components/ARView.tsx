import { useEffect, useRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { ARButton } from "three/examples/jsm/webxr/ARButton.js"

export default function ARView() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let scene: THREE.Scene
    let camera: THREE.PerspectiveCamera
    let renderer: THREE.WebGLRenderer
    let controller: THREE.Group
    let reticle: THREE.Mesh
    let hitTestSource: XRHitTestSource | null = null
    let hitTestSourceRequested = false
    let model: THREE.Object3D | null = null

    // Scene
    scene = new THREE.Scene()

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true

    containerRef.current?.appendChild(renderer.domElement)

    // Light
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
    light.position.set(0.5, 1, 0.25)
    scene.add(light)

    // Reticle (surface indicator)
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2)
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    reticle = new THREE.Mesh(geometry, material)
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    scene.add(reticle)

    // Load Model
    const loader = new GLTFLoader()
    loader.load("/src/models/mug.glb", (gltf) => {
      model = gltf.scene
      model.scale.set(0.2, 0.2, 0.2)
    })

    // Controller
    controller = renderer.xr.getController(0)
    controller.addEventListener("select", () => {
      if (reticle.visible && model) {
        const clone = model.clone()
        clone.position.setFromMatrixPosition(reticle.matrix)
        clone.quaternion.setFromRotationMatrix(reticle.matrix)
        scene.add(clone)
      }
    })
    scene.add(controller)

    // AR Button
    document.body.appendChild(
      ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"]
      })
    )

    // Animation Loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace()
        const session = renderer.xr.getSession()

        if (!hitTestSourceRequested) {
          session?.requestReferenceSpace("viewer").then((referenceSpace) => {
            session.requestHitTestSource({ space: referenceSpace }).then((source) => {
              hitTestSource = source
            })
          })

          session?.addEventListener("end", () => {
            hitTestSourceRequested = false
            hitTestSource = null
          })

          hitTestSourceRequested = true
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource)

          if (hitTestResults.length) {
            const hit = hitTestResults[0]
            const pose = hit.getPose(referenceSpace!)

            if (pose) {
              reticle.visible = true
              reticle.matrix.fromArray(pose.transform.matrix)
            }
          } else {
            reticle.visible = false
          }
        }
      }

      renderer.render(scene, camera)
    })

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })

    return () => {
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
}