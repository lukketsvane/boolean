'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls, TransformControls, Environment } from '@react-three/drei'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { CSG } from 'three-csg-ts'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Download, Shuffle, Image as ImageIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'

const primitiveTypes = ['box', 'cylinder', 'sphere', 'cone', 'pyramid', 'torus', 'dodecahedron', 'octahedron'] as const
const materialOptions = ['clay', 'gold', 'silver'] as const

type PrimitiveType = typeof primitiveTypes[number]
type MaterialType = typeof materialOptions[number]

interface SceneProps {
  primitive1Type: PrimitiveType
  primitive2Type: PrimitiveType
  size1: [number, number, number]
  size2: [number, number, number]
  rotation1: [number, number, number]
  rotation2: [number, number, number]
  position1: [number, number, number]
  position2: [number, number, number]
  showIntersection: boolean
  material: MaterialType
  setSelectedObject: (object: number | null) => void
  selectedObject: number | null
  setPosition1: (position: [number, number, number]) => void
  setPosition2: (position: [number, number, number]) => void
  setRotation1: (rotation: [number, number, number]) => void
  setRotation2: (rotation: [number, number, number]) => void
  isDarkMode: boolean
}

const createPrimitive = (type: PrimitiveType) => {
  switch (type) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 32, 32)
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 32)
    case 'pyramid':
      return new THREE.ConeGeometry(0.5, 1, 4)
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.25, 16, 100)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.5)
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.5)
  }
}

const createMaterial = (material: MaterialType, isDarkMode: boolean, opacity: number = 0.7) => {
  let materialInstance: THREE.Material;

  switch (material) {
    case 'gold':
      materialInstance = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#FFD700"),
        metalness: 0.9,
        roughness: 0.1,
      })
      break
    case 'silver':
      materialInstance = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#C0C0C0"),
        metalness: 0.9,
        roughness: 0.2,
      })
      break
    default: // clay
      materialInstance = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isDarkMode ? "#888888" : "#CCCCCC"),
        metalness: 0.1,
        roughness: 0.8,
      })
  }

  materialInstance.transparent = true
  materialInstance.opacity = opacity

  return materialInstance
}

function Scene({
  primitive1Type,
  primitive2Type,
  size1,
  size2,
  rotation1,
  rotation2,
  position1,
  position2,
  showIntersection,
  material,
  setSelectedObject,
  selectedObject,
  setPosition1,
  setPosition2,
  setRotation1,
  setRotation2,
  isDarkMode,
}: SceneProps) {
  const { scene, camera } = useThree()
  const primitive1Ref = useRef<THREE.Mesh>(null)
  const primitive2Ref = useRef<THREE.Mesh>(null)
  const intersectionRef = useRef<THREE.Mesh>(null)
  const transformControlsRef = useRef<typeof TransformControls>(null)
  const orbitControlsRef = useRef<typeof OrbitControls>(null)

  const primitive1Geometry = useMemo(() => createPrimitive(primitive1Type), [primitive1Type])
  const primitive2Geometry = useMemo(() => createPrimitive(primitive2Type), [primitive2Type])
  const materialInstance = useMemo(() => createMaterial(material, isDarkMode), [material, isDarkMode])

  const updatePrimitive = useCallback((mesh: THREE.Mesh, geometry: THREE.BufferGeometry, size: [number, number, number], rotation: [number, number, number], position: [number, number, number]) => {
    if (!mesh) return
    mesh.geometry = geometry
    mesh.scale.set(...size)
    mesh.rotation.set(...rotation.map(r => r * Math.PI / 180) as [number, number, number])
    mesh.position.set(...position)
  }, [])

  const calculateIntersection = useCallback(() => {
    if (!primitive1Ref.current || !primitive2Ref.current) return

    // Create clones of the primitives to perform CSG operations
    const primitive1Clone = primitive1Ref.current.clone()
    const primitive2Clone = primitive2Ref.current.clone()

    // Apply transformations to the clones
    primitive1Clone.updateMatrix()
    primitive2Clone.updateMatrix()

    const bspA = CSG.fromMesh(primitive1Clone)
    const bspB = CSG.fromMesh(primitive2Clone)
    const intersectionBSP = bspA.intersect(bspB)
    
    if (intersectionRef.current) {
      scene.remove(intersectionRef.current)
      intersectionRef.current.geometry.dispose()
      if (intersectionRef.current.material instanceof THREE.Material) {
        intersectionRef.current.material.dispose()
      }
    }

    intersectionRef.current = CSG.toMesh(intersectionBSP, new THREE.Matrix4(), createMaterial(material, isDarkMode, 1))
    intersectionRef.current.castShadow = true
    intersectionRef.current.receiveShadow = true

    scene.add(intersectionRef.current)

    if (primitive1Ref.current) {
      primitive1Ref.current.visible = showIntersection || selectedObject === 1
    }
    if (primitive2Ref.current) {
      primitive2Ref.current.visible = showIntersection || selectedObject === 2
    }

    // Clean up clones
    primitive1Clone.geometry.dispose()
    primitive2Clone.geometry.dispose()
  }, [scene, showIntersection, selectedObject, material, isDarkMode])

  useEffect(() => {
    primitive1Ref.current = new THREE.Mesh(primitive1Geometry, materialInstance.clone())
    primitive2Ref.current = new THREE.Mesh(primitive2Geometry, materialInstance.clone())
    primitive1Ref.current.material.color.setHex(isDarkMode ? 0xcc0000 : 0xff0000)
    primitive2Ref.current.material.color.setHex(isDarkMode ? 0x00cc00 : 0x00ff00)
    scene.add(primitive1Ref.current, primitive2Ref.current)

    return () => {
      scene.remove(primitive1Ref.current!, primitive2Ref.current!)
      primitive1Ref.current!.geometry.dispose()
      primitive1Ref.current!.material.dispose()
      primitive2Ref.current!.geometry.dispose()
      primitive2Ref.current!.material.dispose()
    }
  }, [scene, primitive1Geometry, primitive2Geometry, materialInstance, isDarkMode])

  useFrame(() => {
    if (primitive1Ref.current) {
      updatePrimitive(primitive1Ref.current, primitive1Geometry, size1, rotation1, position1)
    }
    if (primitive2Ref.current) {
      updatePrimitive(primitive2Ref.current, primitive2Geometry, size2, rotation2, position2)
    }
    calculateIntersection()
  })

  const onMouseClick = useCallback((event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement
    if (!(canvas instanceof HTMLCanvasElement)) return

    const rect = canvas.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects([primitive1Ref.current!, primitive2Ref.current!])

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object
      if (clickedObject === primitive1Ref.current) {
        setSelectedObject(1)
        transformControlsRef.current?.attach(primitive1Ref.current)
      } else if (clickedObject === primitive2Ref.current) {
        setSelectedObject(2)
        transformControlsRef.current?.attach(primitive2Ref.current)
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.visible = true
      }
    } else {
      setSelectedObject(null)
      transformControlsRef.current?.detach()
    }
  }, [camera, setSelectedObject])

  useEffect(() => {
    const canvasElement = document.querySelector('canvas')
    if (canvasElement) {
      canvasElement.addEventListener('click', onMouseClick)
      return () => canvasElement.removeEventListener('click', onMouseClick)
    }
  }, [onMouseClick])

  useEffect(() => {
    const controls = transformControlsRef.current
    if (controls) {
      const handleMouseDown = () => {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = false
        }
      }
      const handleMouseUp = () => {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true
        }
      }
      const handleChange = () => {
        if (controls.object) {
          const position = controls.object.position
          const rotation = controls.object.rotation
          if (selectedObject === 1) {
            setPosition1([position.x, position.y, position.z])
            setRotation1([
              rotation.x * 180 / Math.PI,
              rotation.y * 180 / Math.PI,
              rotation.z * 180 / Math.PI
            ])
          } else if (selectedObject === 2) {
            setPosition2([position.x, position.y, position.z])
            setRotation2([
              rotation.x * 180 / Math.PI,
              rotation.y * 180 / Math.PI,
              rotation.z * 180 / Math.PI
            ])
          }
          calculateIntersection()
        }
      }

      controls.addEventListener('mouseDown', handleMouseDown)
      controls.addEventListener('mouseUp', handleMouseUp)
      controls.addEventListener('change', handleChange)
      return () => {
        controls.removeEventListener('mouseDown', handleMouseDown)
        controls.removeEventListener('mouseUp', handleMouseUp)
        controls.removeEventListener('change', handleChange)
      }
    }
  }, [selectedObject, setPosition1, setPosition2, setRotation1, setRotation2, calculateIntersection])

  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.visible = selectedObject !== null
    }
  }, [selectedObject])

  return (
    <>
      <OrbitControls ref={orbitControlsRef} makeDefault enableDamping={false} />
      {selectedObject !== null && (
        <TransformControls ref={transformControlsRef} />
      )}
      <Environment preset={isDarkMode ? "sunset" : "sunset"} background={false} />
      <ambientLight intensity={isDarkMode ? 0.2 : 0.4} />
      <directionalLight position={[10, 10, 5]} intensity={isDarkMode ? 1.5 : 2} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={isDarkMode ? 0.8 : 1} castShadow />
      <pointLight position={[0, 0, 5]} intensity={isDarkMode ? 0.5 : 0.8} />
    </>
  )
}

export default function Component() {
  const [showIntersection, setShowIntersection] = useState(false)
  const [primitive1Type, setPrimitive1Type] = useState<PrimitiveType>('box')
  const [primitive2Type, setPrimitive2Type] = useState<PrimitiveType>('cylinder')
  const [size1, setSize1] = useState<[number, number, number]>([25, 25, 25])
  const [size2, setSize2] = useState<[number, number, number]>([25, 25, 25])
  const [rotation1, setRotation1] = useState<[number, number, number]>([0, 0, 0])
  const [rotation2, setRotation2] = useState<[number, number, number]>([0, 0, 0])
  const [position1, setPosition1] = useState<[number, number, number]>([-12.5, 0, 0])
  const [position2, setPosition2] = useState<[number, number, number]>([-25, 0, 0])
  const [selectedObject, setSelectedObject] = useState<number | null>(null)
  const [material, setMaterial] = useState<MaterialType>('clay')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDarkMode(darkModeMediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches)
    }

    darkModeMediaQuery.addEventListener('change', handleChange)

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const randomizePrimitives = useCallback(() => {
    setPrimitive1Type(primitiveTypes[Math.floor(Math.random() * primitiveTypes.length)])
    setPrimitive2Type(primitiveTypes[Math.floor(Math.random() * primitiveTypes.length)])
    setSize1([Math.random() * 30 + 20, Math.random() * 30 + 20, Math.random() * 30 + 20])
    setSize2([Math.random() * 30 + 20, Math.random() * 30 + 20, Math.random() * 30 + 20])
    setRotation1([Math.random() * 360, Math.random() * 360, Math.random() * 360])
    setRotation2([Math.random() * 360, Math.random() * 360, Math.random() * 360])
    setPosition1([Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10])
    setPosition2([Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10])
    setSelectedObject(null)
  }, [])

  const handleSizeChange = useCallback((index: number, axis: number, value: number) => {
    const setter = index === 1 ? setSize1 : setSize2
    setter(prev => {
      const newSize = [...prev] as [number, number, number]
      newSize[axis] = value
      return newSize
    })
  }, [])

  const handleRotationChange = useCallback((index: number, axis: number, value: number) => {
    const setter = index === 1 ? setRotation1 : setRotation2
    setter(prev => {
      const newRotation = [...prev] as [number, number, number]
      newRotation[axis] = value
      return newRotation
    })
  }, [])

  const handleTransformChange = useCallback((index: number, axis: number, value: number) => {
    const setter = index === 1 ? setPosition1 : setPosition2
    setter(prev => {
      const newPosition = [...prev] as [number, number, number]
      newPosition[axis] = value
      return newPosition
    })
  }, [])

  const downloadScene = useCallback(() => {
    const scene = new THREE.Scene()
    const primitive1 = new THREE.Mesh(createPrimitive(primitive1Type), createMaterial(material, isDarkMode))
    const primitive2 = new THREE.Mesh(createPrimitive(primitive2Type), createMaterial(material, isDarkMode))
    
    // Convert sizes from millimeters to meters (Three.js uses meters by default)
    const convertToMeters = (size: [number, number, number]): [number, number, number] => {
      return size.map(value => value / 1000) as [number, number, number]
    }
    
    const size1InMeters = convertToMeters(size1)
    const size2InMeters = convertToMeters(size2)
    
    // Convert positions from millimeters to meters
    const position1InMeters = position1.map(value => value / 1000) as [number, number, number]
    const position2InMeters = position2.map(value => value / 1000) as [number, number, number]

    primitive1.scale.set(...size1InMeters)
    primitive1.rotation.set(...rotation1.map(r => r * Math.PI / 180) as [number, number, number])
    primitive1.position.set(...position1InMeters)

    primitive2.scale.set(...size2InMeters)
    primitive2.rotation.set(...rotation2.map(r => r * Math.PI / 180) as [number, number, number])
    primitive2.position.set(...position2InMeters)

    scene.add(primitive1, primitive2)

    const exporter = new GLTFExporter()
    exporter.parse(
      scene,
      (gltf) => {
        // Add custom metadata to indicate that the model is in millimeters
        if (typeof gltf === 'object' && gltf !== null) {
          if (!gltf.asset) gltf.asset = {}
          if (!gltf.asset.extras) gltf.asset.extras = {}
          gltf.asset.extras.units = 'millimeters'
        }

        const output = JSON.stringify(gltf, null, 2)
        const blob = new Blob([output], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${primitive1Type}_${primitive2Type}_mm.gltf`
        link.click()
        URL.revokeObjectURL(url)
      },
      { binary: false }
    )
  }, [primitive1Type, primitive2Type, size1, size2, rotation1, rotation2, position1, position2, material, isDarkMode])

  const captureSnapshot = useCallback(() => {
    if (canvasRef.current) {
      // Create a new scene and camera
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1000)
      camera.position.set(30, 30, 30)
      camera.lookAt(0, 0, 0)

      // Add primitives to the scene
      const primitive1 = new THREE.Mesh(createPrimitive(primitive1Type), createMaterial(material, isDarkMode))
      const primitive2 = new THREE.Mesh(createPrimitive(primitive2Type), createMaterial(material, isDarkMode))
      primitive1.scale.set(...size1)
      primitive1.rotation.set(...rotation1.map(r => r * Math.PI / 180) as [number, number, number])
      primitive1.position.set(...position1)
      primitive2.scale.set(...size2)
      primitive2.rotation.set(...rotation2.map(r => r * Math.PI / 180) as [number, number, number])
      primitive2.position.set(...position2)
      scene.add(primitive1, primitive2)

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.2 : 0.4)
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, isDarkMode ? 1.5 : 2)
      directionalLight1.position.set(10, 10, 5)
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, isDarkMode ? 0.8 : 1)
      directionalLight2.position.set(-10, -10, -5)
      const pointLight = new THREE.PointLight(0xffffff, isDarkMode ? 0.5 : 0.8)
      pointLight.position.set(0, 0, 5)
      scene.add(ambientLight, directionalLight1, directionalLight2, pointLight)

      // Render the scene
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(1024, 1024)
      renderer.render(scene, camera)

      // Create and download the image
      const dataURL = renderer.domElement.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataURL
      link.download = `${primitive1Type}_${primitive2Type}.png`
      link.click()
    }
  }, [canvasRef, primitive1Type, primitive2Type, size1, size2, rotation1, rotation2, position1, position2, material, isDarkMode])

  return (
    <div className={`flex flex-col lg:flex-row gap-4 p-4 ${isDarkMode ? 'dark' : ''}`}>
      <div className="w-full lg:w-1/2 space-y-4">
        <div className="w-full aspect-square border dark:border-white border-black">
          <Canvas shadows camera={{ position: [30, 30, 30], fov: 65 }} ref={canvasRef}>
            <Scene
              primitive1Type={primitive1Type}
              primitive2Type={primitive2Type}
              size1={size1}
              size2={size2}
              rotation1={rotation1}
              rotation2={rotation2}
              position1={position1}
              position2={position2}
              showIntersection={showIntersection}
              material={material}
              setSelectedObject={setSelectedObject}
              selectedObject={selectedObject}
              setPosition1={setPosition1}
              setPosition2={setPosition2}
              setRotation1={setRotation1}
              setRotation2={setRotation2}
              isDarkMode={isDarkMode}
            />
          </Canvas>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button onClick={randomizePrimitives} size="icon" variant="ghost" className="hover:bg-transparent">
              <Shuffle className="h-4 w-4" />
              <span className="sr-only">Randomize primitives</span>
            </Button>
            <Button onClick={downloadScene} size="icon" variant="ghost" className="hover:bg-transparent">
              <Download className="h-4 w-4" />
              <span className="sr-only">Download scene</span>
            </Button>
            <Button onClick={captureSnapshot} size="icon" variant="ghost" className="hover:bg-transparent">
              <ImageIcon className="h-4 w-4" />
              <span className="sr-only">Capture snapshot</span>
            </Button>
          </div>
          <div className="flex space-x-2">
            {materialOptions.map((option) => (
              <button
                key={option}
                onClick={() => setMaterial(option)}
                className={`w-6 h-6 rounded-full ${
                  material === option ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400' : ''
                } ${
                  option === 'clay' ? 'bg-gray-400 dark:bg-gray-600' :
                  option === 'gold' ? 'bg-yellow-400 dark:bg-yellow-600' :
                  'bg-gray-300 dark:bg-gray-400'
                }`}
                aria-label={`Set material to ${option}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((index) => (
            <Select
              key={index}
              onValueChange={(value: PrimitiveType) => index === 1 ? setPrimitive1Type(value) : setPrimitive2Type(value)}
              value={index === 1 ? primitive1Type : primitive2Type}
            >
              <SelectTrigger className="bg-black text-white dark:bg-white dark:text-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {primitiveTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {selectedObject && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-white text-black">Size (mm)</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4 dark:text-white text-black">{axis}</span>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={selectedObject === 1 ? size1[i] : size2[i]}
                      onChange={(e) => handleSizeChange(selectedObject, i, Number(e.target.value))}
                      className="w-full bg-black text-white dark:bg-white dark:text-black"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-white text-black">Rotation (deg)</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4 dark:text-white text-black">{axis}</span>
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={selectedObject === 1 ? rotation1[i] : rotation2[i]}
                      onChange={(e) => handleRotationChange(selectedObject, i, Number(e.target.value))}
                      className="w-full bg-black text-white dark:bg-white dark:text-black"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-white text-black">Position (mm)</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4 dark:text-white text-black">{axis}</span>
                    <Input
                      type="number"
                      min={-50}
                      max={50}
                      value={selectedObject === 1 ? position1[i] : position2[i]}
                      onChange={(e) => handleTransformChange(selectedObject, i, Number(e.target.value))}
                      className="w-full bg-black text-white dark:bg-white dark:text-black"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            checked={showIntersection}
            onCheckedChange={setShowIntersection}
            id="intersection-toggle"
            className="bg-black dark:bg-white"
          />
          <Label htmlFor="intersection-toggle" className="dark:text-white text-black">Show Primitives</Label>
        </div>
      </div>
    </div>
  )
}