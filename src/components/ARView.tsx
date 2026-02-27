import { useEffect, useRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { ARButton } from "three/examples/jsm/webxr/ARButton.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

export default function ARView() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current!
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    )

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
    hemiLight.position.set(0.5, 1, 0.25)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(0, 5, 5)
    scene.add(dirLight)

    let model: THREE.Object3D | null = null

    // Load model (Production Safe Path)
    const loader = new GLTFLoader()
    loader.load(
      "/models/mug.glb",
      (gltf) => {
        model = gltf.scene
        model.scale.set(0.3, 0.3, 0.3)
        scene.add(model)
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error)
      }
    )

    // ------------------------------------
    // ✅ CHECK IF AR IS SUPPORTED
    // ------------------------------------

    if ((navigator as any).xr) {
      renderer.xr.enabled = true

      let controller = renderer.xr.getController(0)
      scene.add(controller)

      let reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      )

      reticle.matrixAutoUpdate = false
      reticle.visible = false
      scene.add(reticle)

      let hitTestSource: XRHitTestSource | null = null
      let hitTestSourceRequested = false

      controller.addEventListener("select", () => {
        if (reticle.visible && model) {
          const clone = model.clone()
          clone.position.setFromMatrixPosition(reticle.matrix)
          clone.quaternion.setFromRotationMatrix(reticle.matrix)
          scene.add(clone)
        }
      })

      document.body.appendChild(
        ARButton.createButton(renderer, {
          requiredFeatures: ["hit-test"],
        })
      )

      renderer.setAnimationLoop((_, frame) => {
        if (frame) {
          const referenceSpace = renderer.xr.getReferenceSpace()
          const session = renderer.xr.getSession()

          if (!hitTestSourceRequested && session) {
            session.requestReferenceSpace("viewer").then((viewerSpace) => {
              (session as any).requestHitTestSource({ space: viewerSpace }).then((source: any) => {
                hitTestSource = source
              })
            })

            session.addEventListener("end", () => {
              hitTestSourceRequested = false
              hitTestSource = null
            })

            hitTestSourceRequested = true
          }

          if (hitTestSource && referenceSpace) {
            const hitTestResults = frame.getHitTestResults(hitTestSource)

            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0]
              const pose = hit.getPose(referenceSpace)

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
    } else {
      // ------------------------------------
      // ❌ FALLBACK TO NORMAL 3D VIEWER
      // ------------------------------------

      camera.position.set(0, 1, 3)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true

      const animate = () => {
        requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }

      animate()

      const message = document.createElement("div")
      message.innerText = "AR not supported on this device. Showing 3D view."
      message.style.position = "absolute"
      message.style.top = "20px"
      message.style.left = "50%"
      message.style.transform = "translateX(-50%)"
      message.style.background = "white"
      message.style.padding = "10px 20px"
      message.style.borderRadius = "8px"
      message.style.fontSize = "14px"
      message.style.zIndex = "999"
      container.appendChild(message)
    }

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })

    return () => {
      renderer.dispose()
      container.innerHTML = ""
    }
  }, [])

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
}