"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  prediction?: number | null;
  inputDigit?: number | null;
};

const layers = [
  { id: "input", name: "User Input\n0-9", neurons: 10, x: -6.2, showLabels: true },
  { id: "augment", name: "Augmentation", neurons: 18, x: -4.5, showLabels: false },
  { id: "conv1", name: "Conv2D\n32 Filters", neurons: 32, x: -2.8, showLabels: false },
  { id: "pool1", name: "MaxPool", neurons: 16, x: -1.2, showLabels: false },
  { id: "conv2", name: "Conv2D\n64 Filters", neurons: 40, x: 0.6, showLabels: false },
  { id: "pool2", name: "MaxPool", neurons: 18, x: 2.2, showLabels: false },
  { id: "dense", name: "Dense\n128", neurons: 36, x: 3.9, showLabels: false },
  { id: "output", name: "AI Output\n0-9", neurons: 10, x: 5.9, showLabels: true },
];

type Layer = (typeof layers)[number];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getNeuronPositions(layer: Layer) {
  return Array.from({ length: layer.neurons }, (_, i) => {
    const columnSize = Math.ceil(Math.sqrt(layer.neurons));
    const row = Math.floor(i / columnSize);
    const col = i % columnSize;

    const centerOffset = (columnSize - 1) / 2;

    const y =
      (row - centerOffset) * 0.42 +
      (seededRandom(i * 13 + layer.x * 31) - 0.5) * 0.22;

    const z =
      (col - centerOffset) * 0.42 +
      (seededRandom(i * 19 + layer.x * 17) - 0.5) * 0.35;

    return new THREE.Vector3(layer.x, y, z);
  });
}

function DataPulse({ delay = 0 }: { delay?: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;

    const t = ((clock.getElapsedTime() * 0.28 + delay) % 1 + 1) % 1;

    ref.current.position.x = THREE.MathUtils.lerp(-6.2, 5.9, t);
    ref.current.position.y = Math.sin(t * Math.PI * 8 + delay * 5) * 0.75;
    ref.current.position.z = Math.cos(t * Math.PI * 5 + delay * 3) * 0.75;

    const scale = 0.7 + Math.sin(t * Math.PI) * 0.9;
    ref.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 24, 24]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#38bdf8"
        emissiveIntensity={4}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

function Neuron({
  position,
  active,
  size,
}: {
  position: THREE.Vector3;
  active: boolean;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !active) return;

    const pulse = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.18;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[active ? size * 1.6 : size, 24, 24]} />
      <meshStandardMaterial
        color={active ? "#22c55e" : "#60a5fa"}
        emissive={active ? "#22c55e" : "#1d4ed8"}
        emissiveIntensity={active ? 3.5 : 0.9}
        transparent
        opacity={active ? 1 : 0.85}
      />
    </mesh>
  );
}

function Network({ prediction, inputDigit }: Props) {
  const layerPositions = useMemo(() => {
    return layers.map((layer) => ({
      layer,
      positions: getNeuronPositions(layer),
    }));
  }, []);

  return (
    <group scale={1.05}>
      {layerPositions.map(({ layer, positions }, layerIndex) => {
        return (
          <group key={layer.id}>
            <Text
              position={[layer.x, 2.75, 0]}
              fontSize={0.18}
              color="#e0f2fe"
              anchorX="center"
              anchorY="middle"
              textAlign="center"
            >
              {layer.name}
            </Text>

            {positions.map((pos, neuronIndex) => {
              const isInputActive =
                layer.id === "input" &&
                inputDigit !== null &&
                inputDigit !== undefined &&
                neuronIndex === inputDigit;

              const isOutputActive =
                layer.id === "output" &&
                prediction !== null &&
                prediction !== undefined &&
                neuronIndex === prediction;

              const isNearActivePath =
                prediction !== null &&
                prediction !== undefined &&
                layer.id !== "input" &&
                layer.id !== "output" &&
                neuronIndex % 5 === prediction % 5;

              const active = isInputActive || isOutputActive || isNearActivePath;

              return (
                <group key={`${layer.id}-neuron-${neuronIndex}`}>
                  <Neuron position={pos} active={active} size={0.08} />

                  {layer.showLabels && (
                    <Text
                      position={[pos.x + 0.28, pos.y, pos.z]}
                      fontSize={0.14}
                      color={active ? "#86efac" : "#cbd5e1"}
                      anchorX="left"
                      anchorY="middle"
                    >
                      {neuronIndex}
                    </Text>
                  )}
                </group>
              );
            })}

            {layerIndex < layerPositions.length - 1 &&
              positions.flatMap((from, i) => {
                const nextLayerData = layerPositions[layerIndex + 1];
                const nextLayer = nextLayerData.layer;
                const nextPositions = nextLayerData.positions;

                const limitedNextPositions = nextPositions.filter((_, j) => {
                  if (layer.neurons <= 12 || nextLayer.neurons <= 12) return true;
                  return (i + j) % 5 === 0;
                });

                return limitedNextPositions.map((to, j) => {
                  const activeLine =
                    prediction !== null &&
                    prediction !== undefined &&
                    (i + j + prediction) % 7 === 0;

                  return (
                    <Line
                      key={`${layer.id}-${nextLayer.id}-line-${i}-${j}`}
                      points={[from, to]}
                      color={activeLine ? "#38bdf8" : "#2563eb"}
                      lineWidth={activeLine ? 0.8 : 0.35}
                      transparent
                      opacity={activeLine ? 0.5 : 0.12}
                    />
                  );
                });
              })}
          </group>
        );
      })}

      <DataPulse delay={0} />
      <DataPulse delay={0.18} />
      <DataPulse delay={0.36} />
      <DataPulse delay={0.54} />
      <DataPulse delay={0.72} />
    </group>
  );
}

export default function NeuralNetwork3D({
  prediction = null,
  inputDigit = null,
}: Props) {
  return (
    <div className="h-full min-h-[460px] w-full touch-none">
      <Canvas camera={{ position: [0, 0.1, 10.5], fov: 42 }}>
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 8, 17]} />

        <ambientLight intensity={0.75} />
        <pointLight position={[3, 4, 5]} intensity={2.8} />
        <pointLight position={[-4, -3, 4]} intensity={1.5} color="#38bdf8" />

        <Network prediction={prediction} inputDigit={inputDigit} />

        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.8}
          rotateSpeed={0.65}
          panSpeed={0.6}
          minDistance={5}
          maxDistance={18}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}