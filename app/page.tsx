'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
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
}: SceneProps) {
  const { scene, camera } = useThree()
  const primitive1Ref = useRef<THREE.Mesh>(null)
  const primitive2Ref = useRef<THREE.Mesh>(null)
  const intersectionRef = useRef<THREE.Mesh>(null)
  const transformControlsRef = useRef<TransformControls>(null)
  const orbitControlsRef = useRef<OrbitControls>(null)

  const createPrimitive = useCallback((type: PrimitiveType) => {
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
  }, [])

  const updatePrimitive = useCallback((mesh: THREE.Mesh, type: PrimitiveType, size: [number, number, number], rotation: [number, number, number], position: [number, number, number]) => {
    mesh.geometry.dispose()
    mesh.geometry = createPrimitive(type)
    mesh.scale.set(size[0], size[1], size[2])
    mesh.rotation.set(rotation[0] * Math.PI / 180, rotation[1] * Math.PI / 180, rotation[2] * Math.PI / 180)
    mesh.position.set(position[0], position[1], position[2])
  }, [createPrimitive])

  const calculateIntersection = useCallback(() => {
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
          color: new THREE.Color("#CCCCCC"),
          metalness: 0.2,
          roughness: 0.8,
          clearcoat: 0.0,
          envMapIntensity: 0.5
        })
    }

    if (intersectionRef.current) {
      scene.remove(intersectionRef.current)
      intersectionRef.current.geometry.dispose()
      intersectionRef.current.material.dispose()
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
  }, [material, showIntersection, scene])

  useEffect(() => {
    const material = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5 })
    primitive1Ref.current = new THREE.Mesh(createPrimitive(primitive1Type), material.clone())
    primitive2Ref.current = new THREE.Mesh(createPrimitive(primitive2Type), material.clone())
    primitive1Ref.current.material.color.setHex(0xff0000)
    primitive2Ref.current.material.color.setHex(0x00ff00)
    scene.add(primitive1Ref.current, primitive2Ref.current)

    return () => {
      scene.remove(primitive1Ref.current!, primitive2Ref.current!)
      primitive1Ref.current!.geometry.dispose()
      primitive1Ref.current!.material.dispose()
      primitive2Ref.current!.geometry.dispose()
      primitive2Ref.current!.material.dispose()
    }
  }, [scene, createPrimitive, primitive1Type, primitive2Type])

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
      if (!(canvas instanceof HTMLCanvasElement)) return // Only proceed if the click is on the canvas

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
      <Environment preset="studio" background={false} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 50, 50]} intensity={1.0} castShadow />
      <directionalLight position={[-50, 50, -50]} intensity={0.8} castShadow />
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
    if (selectedObject === 1) {
      const newSize = [...size1] as [number, number, number]
      newSize[axis] = value
      setSize1(newSize)
    } else if (selectedObject === 2) {
      const newSize = [...size2] as [number, number, number]
      newSize[axis] = value
      setSize2(newSize)
    }
  }

  const handleRotationChange = (index: number, axis: number, value: number) => {
    if (selectedObject === 1) {
      const newRotation = [...rotation1] as [number, number, number]
      newRotation[axis] = value
      setRotation1(newRotation)
    } else if (selectedObject === 2) {
      const newRotation = [...rotation2] as [number, number, number]
      newRotation[axis] = value
      setRotation2(newRotation)
    }
  }

  const handleTransformChange = (axis: number, value: number) => {
    if (selectedObject === 1) {
      const newPosition = [...position1] as [number, number, number]
      newPosition[axis] = value
      setPosition1(newPosition)
    } else if (selectedObject === 2) {
      const newPosition = [...position2] as [number, number, number]
      newPosition[axis] = value
      setPosition2(newPosition)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="w-full lg:w-1/2 space-y-4">
        <div className="w-full aspect-square border">
          <Canvas shadows camera={{ position: [50, 50, 50], fov: 75 }}>
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
            />
          </Canvas>
        </div>
        <div className="flex justify-between items-center">
          <Button onClick={randomizePrimitives} variant="outline" size="icon">
            <Shuffle className="h-4 w-4" />
          </Button>
          <div className="flex space-x-2">
            {materialOptions.map((option) => (
              <button
                key={option}
                onClick={() => setMaterial(option)}
                className={`w-6 h-6 ${
                  material === option ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                } ${
                  option === 'clay' ? 'bg-gray-400' :
                  option === 'gold' ? 'bg-yellow-400' :
                  'bg-gray-300'
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
              <SelectTrigger>
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
                <Label>Size</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4">{axis}</span>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={selectedObject === 1 ? size1[i] : size2[i]}
                      onChange={(e) => handleSizeChange(selectedObject, i, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Rotation</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4">{axis}</span>
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={selectedObject === 1 ? rotation1[i] : rotation2[i]}
                      onChange={(e) => handleRotationChange(selectedObject, i, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="flex items-center space-x-2">
                    <span className="w-4">{axis}</span>
                    <Input
                      type="number"
                      min={-50}
                      max={50}
                      value={selectedObject === 1 ? position1[i] : position2[i]}
                      onChange={(e) => handleTransformChange(i, Number(e.target.value))}
                      className="w-full"
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
          />
          <Label htmlFor="intersection-toggle">Show Primitives</Label>
        </div>
      </div>
    </div>
  )
}