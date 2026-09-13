/* ./create_mountain/result/MountainCanvas.tsx */
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function getColorFromFrequency(
    frequency: number,
    minFrequency: number,
    maxFrequency: number
) {
    const colorStops = [
        { frequency: 60, color: "#920783" },
        { frequency: 70, color: "#601986" },
        { frequency: 80, color: "#1D2088" },
        { frequency: 90, color: "#00479D" },
        { frequency: 100, color: "#0068B7" },
        { frequency: 110, color: "#0086D1" },
        { frequency: 120, color: "#00A3E9" },
        { frequency: 130, color: "#00B9E9" },
        { frequency: 140, color: "#00A0C1" },
        { frequency: 150, color: "#009E96" },
        { frequency: 160, color: "#009B6B" },
        { frequency: 170, color: "#009944" },
        { frequency: 180, color: "#22AC38" },
        { frequency: 190, color: "#8FC31F" },
        { frequency: 200, color: "#CFDB00" },
        { frequency: 220, color: "#FFF100" },
        { frequency: 240, color: "#FCC800" },
        { frequency: 260, color: "#F39800" },
        { frequency: 280, color: "#EB6100" },
        { frequency: 300, color: "#E60012" },
        { frequency: 320, color: "#E60033" },
        { frequency: 340, color: "#E5004F" },
        { frequency: 360, color: "#E5006A" },
        { frequency: 400, color: "#E4007F" },
        { frequency: 440, color: "#ef4ba5" },
        { frequency: 500, color: "#f37abd" },
        { frequency: 700, color: "#f1abd2" },
        { frequency: 800, color: "#f1d0e2" },
        { frequency: 900, color: "#f1e6f1" },
        { frequency: 1000, color: "#e6f1f1" },
    ];

    if (maxFrequency <= minFrequency) {
        return new THREE.Color(colorStops[0].color);
    }

    // 実際の声の最低音〜最高音を0〜1にする
    const ratio = THREE.MathUtils.clamp(
        (frequency - minFrequency) /
            (maxFrequency - minFrequency),
        0,
        1
    );

    // colorStops全体を0〜1として使う
    const position =
        ratio * (colorStops.length - 1);

    const index = Math.floor(position);
    const nextIndex = Math.min(
        index + 1,
        colorStops.length - 1
    );

    const t = position - index;

     return new THREE.Color(
        colorStops[index].color
    ).lerp(
        new THREE.Color(
            colorStops[nextIndex].color
        ),
        t
    );
}

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

    /*
     * 5秒間の音声から
     * 「どの周波数がどれくらい出ていたか」
     * を連続的に調べる
     */
    const frequencyDistribution = useMemo(() => {
        const validPitchData = pitchData.filter(
            (pitch) => pitch > 0
        );

        if (validPitchData.length === 0) {
            return {
                minFrequency: 0,
                maxFrequency: 0,
                distribution: [],
            };
        }

        // 実際に入力された声の周波数範囲
        const minFrequency = Math.min(
            ...validPitchData
        );

        const maxFrequency = Math.max(
            ...validPitchData
        );

        /*
        * 1Hz刻みの連続的な分布を作る
        *
        * 例えば180.5Hzの声なら、
        * 180Hzと181Hzの両方に影響する。
        */
        const distribution: number[] = [];

        for (
            let frequency = Math.floor(minFrequency);
            frequency <= Math.ceil(maxFrequency);
            frequency++
        ) {
            let amount = 0;

            for (const pitch of validPitchData) {
                const distance = Math.abs(
                    pitch - frequency
                );

                const spread = 8;

                if (distance < spread) {
                    const influence =
                        1 - distance / spread;

                    amount += influence;
                }
            }

            distribution.push(amount);
        }

        // 最大値を1にする
        const maxDistribution = Math.max(
            ...distribution,
            1
        );

        return {
            minFrequency,
            maxFrequency,
            distribution: distribution.map(
                (value) =>
                    value / maxDistribution
            ),
        };
    }, [pitchData]);

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

        const minPitch =
            frequencyDistribution.minFrequency || 80;

        const maxPitch =
            frequencyDistribution.maxFrequency || 400;

        /*
         * 最高音 → 山頂の高さ
         */
        const pitchNormalized = THREE.MathUtils.clamp(
            (highestPitch - minPitch) /
                (700 - minPitch),
            0,
            1
        );

        const mountainHeight =
            THREE.MathUtils.lerp(
                2,
                10,
                pitchNormalized
            );

        /*
         * 音量 → 山の大きさ
         */
        const mountainRadius =
            THREE.MathUtils.lerp(
                3,
                8,
                maxVolume
            );

        // -------------------------
        // 山のメッシュ
        // -------------------------

        const segments = 80;

        const positions: number[] = [];
        const colors: number[] = [];
        const indices: number[] = [];

        const verticesPerSide = segments + 1;

        for (let z = 0; z <= segments; z++) {
            for (let x = 0; x <= segments; x++) {

                const normalizedX =
                    (x / segments) * 2 - 1;

                const normalizedZ =
                    (z / segments) * 2 - 1;

                const worldX =
                    normalizedX * mountainRadius;

                const worldZ =
                    normalizedZ * mountainRadius;

                const distance = Math.sqrt(
                    normalizedX * normalizedX +
                    normalizedZ * normalizedZ
                );

                // -------------------------
                // 山の形
                // -------------------------

                const t = Math.max(
                    0,
                    1 - distance
                );

                const peak =
                    Math.pow(t, 3.0);

                const base =
                    Math.pow(t, 0.55);

                const falloff =
                    peak * 0.85 +
                    base * 0.15;

                const y =
                    mountainHeight * falloff;

                positions.push(
                    worldX,
                    y,
                    worldZ
                );

                // -------------------------
                // 山の高さ → 周波数
                // -------------------------

                const heightRatio =
                    mountainHeight > 0
                        ? y / mountainHeight
                        : 0;

                const frequency =
                    minPitch +
                    heightRatio *
                        (maxPitch - minPitch);

                // -------------------------
                // 色
                // -------------------------

                const color =getColorFromFrequency(
                    frequency,
                    minPitch,
                    maxPitch
                );

                /*
                 * 周波数分布を調べる
                 *
                 * 例えば180Hzの声が多ければ、
                 * 180Hz付近の色が強くなる。
                 */
                let distribution = 0;

                if (
                    frequencyDistribution.distribution.length > 0
                ) {
                    const index = Math.round(
                        frequency - Math.floor(frequencyDistribution.minFrequency)
                    );

                    distribution = frequencyDistribution.distribution[
                        THREE.MathUtils.clamp(
                            index,
                            0,
                            frequencyDistribution.distribution.length - 1
                        )
                    ] ?? 0;
                }

                /*
                 * 成分量によって色の濃さを変える。
                 *
                 * 今回はまず、
                 * 「色の帯を太くする」
                 * 前段階として、
                 * 成分が多い周波数ほど
                 * 色を強くする。
                 */
                const brightness =
                    THREE.MathUtils.lerp(
                        0.45,
                        1.0,
                        distribution
                    );

                color.multiplyScalar(
                    brightness
                );

                const alpha = distance <= 1 ? 1 : 0;
                colors.push(
                    color.r,
                    color.g,
                    color.b,
                    alpha
                );
            }
        }

        // -------------------------
        // 三角形
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

        geometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(
                colors,
                4
            )
        );

        geometry.setIndex(indices);

        geometry.computeVertexNormals();

        return geometry;
    }, [
        waveData,
        pitchData,
        frequencyDistribution,
    ]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                vertexColors
                transparent
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