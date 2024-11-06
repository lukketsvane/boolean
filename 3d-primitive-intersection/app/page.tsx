'use client'

import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls, TransformControls, Environment } from '@react-three/drei'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { CSG } from 'three-csg-ts'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Shuffle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const primitiveTypes = ['box', 'cylinder', 'sphere', 'cone', 'pyramid', 'torus'] as const
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
    }
  }

  const updatePrimitive = (mesh: THREE.Mesh, type: PrimitiveType, size: [number, number, number], rotation: [number, number, number], position: [number, number, number]) => {
    if (!mesh) return
    mesh.geometry.dispose()
    mesh.geometry = createPrimitive(type)
    mesh.scale.set(...size)
    mesh.rotation.set(...rotation.map(r => r * Math.PI / 180) as [number, number, number])
    mesh.position.set(...position)
  }

  const calculateIntersection = () => {
    if (!primitive1Ref.current || !primitive2Ref.current) return

    const bspA = CSG.fromMesh(primitive1Ref.current)
    const bspB = CSG.fromMesh(primitive2Ref.current)
    const intersectionBSP = bspA.intersect(bspB)
    
    let intersectionMaterial: THREE.MeshPhysicalMaterial
    switch (material) {
      case 'gold':
        intersectionMaterial = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#FFD700"),
          metalness: 0.95,
          roughness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.5
        })
        break
      case 'silver':
        intersectionMaterial = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#C0C0C0"),
          metalness: 0.9,
          roughness: 0.1,
          clearcoat: 0.8,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.2
        })
        break
      default: // clay
        intersectionMaterial = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(isDarkMode ? "#666666" : "#CCCCCC"),
          metalness: 0.2,
          roughness: 0.8,
          clearcoat: 0.0,
          envMapIntensity: 0.5
        })
    }

    if (intersectionRef.current) {
      scene.remove(intersectionRef.current)
      intersectionRef.current.geometry.dispose()
      if (intersectionRef.current.material instanceof THREE.Material) {
        intersectionRef.current.material.dispose()
      }
    }

    intersectionRef.current = CSG.toMesh(intersectionBSP, new THREE.Matrix4(), intersectionMaterial)
    intersectionRef.current.castShadow = true
    intersectionRef.current.receiveShadow = true

    scene.add(intersectionRef.current)

    if (primitive1Ref.current) {
      primitive1Ref.current.material.opacity = showIntersection ? 0.2 : 0
      primitive1Ref.current.visible = showIntersection
    }
    if (primitive2Ref.current) {
      primitive2Ref.current.material.opacity = showIntersection ? 0.2 : 0
      primitive2Ref.current.visible = showIntersection
    }
  }

  useEffect(() => {
    const material = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5 })
    primitive1Ref.current = new THREE.Mesh(createPrimitive(primitive1Type), material.clone())
    primitive2Ref.current = new THREE.Mesh(createPrimitive(primitive2Type), material.clone())
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
  }, [scene, primitive1Type, primitive2Type, isDarkMode])

  useFrame(() => {
    if (primitive1Ref.current) {
      updatePrimitive(primitive1Ref.current, primitive1Type, size1, rotation1, position1)
    }
    if (primitive2Ref.current) {
      updatePrimitive(primitive2Ref.current, primitive2Type, size2, rotation2, position2)
    }
    calculateIntersection()
  })

  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onMouseClick = (event: MouseEvent) => {
      const canvas = event.target as HTMLCanvasElement
      if (!(canvas instanceof HTMLCanvasElement)) return

      const rect = canvas.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

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
      } else {
        setSelectedObject(null)
        transformControlsRef.current?.detach()
      }
    }

    const canvasElement = document.querySelector('canvas')
    if (canvasElement) {
      canvasElement.addEventListener('click', onMouseClick)
      return () => canvasElement.removeEventListener('click', onMouseClick)
    }
  }, [camera, setSelectedObject])

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
  }, [selectedObject, setPosition1, setPosition2, setRotation1, setRotation2])

  return (
    <>
      <OrbitControls ref={orbitControlsRef} makeDefault enableDamping={false} />
      <TransformControls ref={transformControlsRef} />
      <Environment preset={isDarkMode ? "night" : "studio"} background={false} />
      <ambientLight intensity={isDarkMode ? 0.3 : 0.5} />
      <directionalLight position={[50, 50, 50]} intensity={isDarkMode ? 0.8 : 1.0} castShadow />
      <directionalLight position={[-50, 50, -50]} intensity={isDarkMode ? 0.6 : 0.8} castShadow />
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

  const randomizePrimitives = () => {
    setPrimitive1Type(primitiveTypes[Math.floor(Math.random() * primitiveTypes.length)])
    setPrimitive2Type(primitiveTypes[Math.floor(Math.random() * primitiveTypes.length)])
    setSize1([Math.random() * 40 + 10, Math.random() * 40 + 10, Math.random() * 40 + 10])
    setSize2([Math.random() * 40 + 10, Math.random() * 40 + 10, Math.random() * 40 + 10])
    setRotation1([Math.random() * 360, Math.random() * 360, Math.random() * 360])
    setRotation2([Math.random() * 360, Math.random() * 360, Math.random() * 360])
    setPosition1([Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10])
    setPosition2([Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10])
  }

  const handleSizeChange = (index: number, axis: number, value: number) => {
    const setter = index === 1 ? setSize1 : setSize2
    setter(prev => {
      const newSize = [...prev] as [number, number, number]
      newSize[axis] = value
      return newSize
    })
  }

  const handleRotationChange = (index: number, axis: number, value: number) => {
    const setter = index === 1 ? setRotation1 : setRotation2
    setter(prev => {
      const newRotation = [...prev] as [number, number, number]
      newRotation[axis] = value
      return newRotation
    })
  }

  const handleTransformChange = (index: number, axis: number, value: number) => {
    const setter = index === 1 ? setPosition1 : setPosition2
    setter(prev => {
      const newPosition = [...prev] as [number, number, number]
      newPosition[axis] = value
      return newPosition
    })
  }

  return (
    <div className={`flex flex-col lg:flex-row gap-4 p-4 ${isDarkMode ? 'dark' : ''}`}>
      <div className="w-full lg:w-1/2 space-y-4">
        <div className="w-full aspect-square border dark:border-gray-700">
          <Canvas shadows camera={{ position: [30, 30, 30], fov: 65 }}>
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
          <Button onClick={randomizePrimitives} variant="outline" size="icon" className="dark:bg-gray-800 dark:text-white">
            <Shuffle className="h-4 w-4" />
          </Button>
          <div className="flex space-x-2">
            {materialOptions.map((option) => (
              <button
                key={option}
                onClick={() => setMaterial(option)}
                className={`w-6 h-6 ${
                  material === option ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400' : ''
                } ${
                  option === 'clay' ? 'bg-gray-400 dark:bg-gray-600' :
                  option === 'gold' ? 'bg-yellow-400 dark:bg-yellow-600' :
                  'bg-gray-300 dark:bg-gray-500'
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
              <SelectTrigger className="dark:bg-gray-800 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:text-white">
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
                <Label className="dark:text-white">Size</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4 dark:text-white">{axis}</span>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={selectedObject === 1 ? size1[i] : size2[i]}
                      onChange={(e) => handleSizeChange(selectedObject, i, Number(e.target.value))}
                      className="w-full dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-white">Rotation</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4 dark:text-white">{axis}</span>
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={selectedObject === 1 ? rotation1[i] : rotation2[i]}
                      onChange={(e) => handleRotationChange(selectedObject, i, Number(e.target.value))}
                      className="w-full dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-white">Position</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4 dark:text-white">{axis}</span>
                    <Input
                      type="number"
                      min={-50}
                      max={50}
                      value={selectedObject === 1 ? position1[i] : position2[i]}
                      onChange={(e) => handleTransformChange(selectedObject, i, Number(e.target.value))}
                      className="w-full dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Switch
            checked={showIntersection}
            onCheckedChange={setShowIntersection}
            id="intersection-toggle"
            className="dark:bg-gray-700"
          />
          <Label htmlFor="intersection-toggle" className="dark:text-white">Show Primitives</Label>
        </div>
      </div>
    </div>
  )
}