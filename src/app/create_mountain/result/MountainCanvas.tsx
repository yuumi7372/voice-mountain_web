/* ./create_mountain/result/MountainCanvas.tsx */
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function Mountain() {
    const [waveData, setWaveData] = useState<number[]>([]);
    const [pitchData, setPitchData] = useState<number[]>([]);

    useEffect(() => {
        const savedWaveData = localStorage.getItem("waveData");
        const savedPitchData = localStorage.getItem("pitchData");

        if (savedWaveData) {
            setWaveData(JSON.parse(savedWaveData));
        }

        if (savedPitchData) {
            setPitchData(JSON.parse(savedPitchData));
        }
    }, []);

    const geometry = useMemo(() => {
        // -------------------------
        // 音声データから値を取り出す
        // -------------------------

        const maxVolume =
            waveData.length > 0
                ? Math.max(...waveData)
                : 0.5;

        const validPitchData = pitchData.filter(
            (pitch) => pitch > 0
        );

        const highestPitch =
            validPitchData.length > 0
                ? Math.max(...validPitchData)
                : 400;

        // -------------------------
        // 山のパラメータ
        // -------------------------

        // 想定する声の高さ
        const minPitch = 80;
        const maxPitch = 1200;

        // 0〜1に正規化
        const pitchNormalized = THREE.MathUtils.clamp(
            (highestPitch - minPitch) /
                (maxPitch - minPitch),
            0,
            1
        );

        // 最高音 → 山頂の高さ
        const mountainHeight =
            THREE.MathUtils.lerp(
                2,
                10,
                pitchNormalized
            );

        // 音量 → 山の幅
        const mountainRadius =
            THREE.MathUtils.lerp(
                3,
                8,
                maxVolume
            );

        // -------------------------
        // 山のメッシュを作る
        // -------------------------

        const segments = 80;

        const positions: number[] = [];
        const indices: number[] = [];

        const verticesPerSide = segments + 1;

        for (let z = 0; z <= segments; z++) {
            for (let x = 0; x <= segments; x++) {

                // -1〜1
                const normalizedX =
                    (x / segments) * 2 - 1;

                const normalizedZ =
                    (z / segments) * 2 - 1;

                // 実際の座標
                const worldX =
                    normalizedX * mountainRadius;

                const worldZ =
                    normalizedZ * mountainRadius;

                // 中心からの距離
                const distance = Math.sqrt(
                    normalizedX * normalizedX +
                    normalizedZ * normalizedZ
                );

                // -------------------------
                // 山の形
                // -------------------------

                const t = Math.max(0, 1 - distance);

                // 山頂付近を尖らせる
                const peak = Math.pow(t, 3.0);

                // 裾野はかなり長くする
                const base = Math.pow(t, 0.55);

                const falloff =
                    peak * 0.85 +
                    base * 0.15;

                const y = mountainHeight * falloff;

                positions.push(
                    worldX,
                    y,
                    worldZ
                );
            }
        }

        // -------------------------
        // 三角形を作る
        // -------------------------

        for (let z = 0; z < segments; z++) {
            for (let x = 0; x < segments; x++) {

                const a =
                    z * verticesPerSide + x;

                const b = a + 1;

                const c =
                    a + verticesPerSide;

                const d = c + 1;

                indices.push(
                    a,
                    c,
                    b,

                    b,
                    c,
                    d
                );
            }
        }

        const geometry =
            new THREE.BufferGeometry();

        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                positions,
                3
            )
        );

        geometry.setIndex(indices);

        geometry.computeVertexNormals();

        return geometry;
    }, [waveData, pitchData]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                side={THREE.DoubleSide}
                roughness={1}
            />
        </mesh>
    );
}

export default function MountainCanvas() {
    return (
        <Canvas
            camera={{
                position: [0, 7, 14],
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

            <Mountain />

            {/* 方眼紙っぽい地面 */}
            <Grid
                args={[30, 30]}
                cellSize={1}
                cellThickness={0.5}
                sectionSize={5}
                sectionThickness={1}
                fadeDistance={40}
                fadeStrength={1}
            />

            <OrbitControls />
        </Canvas>
    );
}