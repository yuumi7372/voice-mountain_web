/* ./create_mountain/result/MountainCanvas.tsx */
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type MountainProps = {
    waveData: number[];
};

function Mountain({ waveData }: MountainProps) {
    const width = 12;
    const depth = 5;
    const heightMultiplier = 5;

    const segments = Math.max(waveData.length, 2);

    const vertices: number[] = [];
    const indices: number[] = [];

    // 横方向 × 奥行き方向の格子を作る
    const depthSegments = 20;

    for (let x = 0; x < segments; x++) {
        const waveIndex = x;
        const value = waveData[waveIndex] ?? 0;

        const xPosition =
            (x / (segments - 1) - 0.5) * width;

        // 波形から山の高さを決める
        const mountainHeight = value * heightMultiplier;

        for (let z = 0; z <= depthSegments; z++) {
            const depthRatio = z / depthSegments;

            const zPosition =
                (depthRatio - 0.5) * depth;

            // 中央が高く、端に行くほど低くする
            const centerFactor =
                1 - Math.abs(depthRatio - 0.5) * 2;

            const height =
                mountainHeight * centerFactor;

            vertices.push(
                xPosition,
                height,
                zPosition
            );
        }
    }

    // 格子状に面を作る
    for (let x = 0; x < segments - 1; x++) {
        for (let z = 0; z < depthSegments; z++) {
            const current =
                x * (depthSegments + 1) + z;

            const next =
                (x + 1) * (depthSegments + 1) + z;

            indices.push(
                current,
                next,
                current + 1
            );

            indices.push(
                next,
                next + 1,
                current + 1
            );
        }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
            vertices,
            3
        )
    );

    geometry.setIndex(indices);

    geometry.computeVertexNormals();

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default function MountainCanvas() {
    const waveData =
        typeof window !== "undefined"
            ? JSON.parse(
                localStorage.getItem("waveData") ?? "[]"
            )
            : [];

    return (
        <Canvas
            camera={{
                position: [0, 4, 12],
                fov: 50,
            }}
            gl={{
                preserveDrawingBuffer: true,
            }}
        >
            <ambientLight intensity={1} />

            <directionalLight
                position={[5, 10, 5]}
                intensity={2}
            />

            <Mountain waveData={waveData} />

            <OrbitControls />
        </Canvas>
    );
}