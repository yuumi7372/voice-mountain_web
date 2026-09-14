/* ./create_mountain/result/MountainCanvas.tsx */
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Line } from "@react-three/drei";
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
    const [pitchData, setPitchData] = useState<
        {
            character: string;
            start: number;
            end: number;
            frequency: number;
            note: string;
            volume: number;
        }[]
    >([]);
    const [harmonicRichness, setHarmonicRichness] = useState(0);

    useEffect(() => {
        fetch("/voice_result.json")
            .then((response) => response.json())
            .then((data) => {
                console.log("読み込んだJSON:", data);

                setPitchData(data.pitch_data);
                setHarmonicRichness(data.harmonic_richness);
            })
            .catch((error) => {
                console.error("JSON読み込みエラー:", error);
            });
    }, []);

    const { mountainGeometry, ridgePositions } = useMemo(() => {
        if (pitchData.length === 0) {
            return {
                mountainGeometry: new THREE.BufferGeometry(),
                ridgePositions: [] as THREE.Vector3[],
            };
        }

        // -------------------------
        // 山の基本パラメータ
        // -------------------------

        const mountainWidth = 500;
        const mountainHeight = 100;

        // -------------------------
        // JSONから最低・最高周波数を取得
        // -------------------------

        const validPitchData = pitchData.filter(
            (p) => p.frequency > 0
        );

        if (validPitchData.length === 0) {
            return {
                mountainGeometry: new THREE.BufferGeometry(),
                ridgePositions: [] as THREE.Vector3[],
            };
        }

        const minFrequency = Math.min(
            ...validPitchData.map((p) => p.frequency)
        );

        const maxFrequency = Math.max(
            ...validPitchData.map((p) => p.frequency)
        );

        const maxTime = Math.max(
            ...pitchData.map((p) => p.end)
        );

        // -------------------------
        // 稜線の頂点
        // -------------------------

        const ridge: THREE.Vector3[] = [];

        pitchData.forEach((pitch) => {
            // =========================
            // X = 時間
            // =========================

            const centerTime =
                (pitch.start + pitch.end) / 2;

            const time =
                centerTime / maxTime;

            const x =
                (time - 0.5) * mountainWidth;

            // =========================
            // Y = 周波数
            // =========================

            const normalizedPitch =
                THREE.MathUtils.clamp(
                    (pitch.frequency - minFrequency) /
                        (maxFrequency - minFrequency || 1),
                    0,
                    1
                );

            const height =
                normalizedPitch * mountainHeight;

            // =========================
            // Z = 音量
            // =========================

            const volumeNormalized =
                THREE.MathUtils.clamp(
                    (pitch.volume + 60) / 45,
                    0,
                    1
                );

            const z =
                THREE.MathUtils.lerp(
                    100,
                    -100,
                    volumeNormalized
                );

            ridge.push(
                new THREE.Vector3(
                    x,
                    height,
                    z
                )
            );
        });

        // -------------------------
        // 稜線から斜面を作る
        // -------------------------

        const positions: number[] = [];
        const indices: number[] = [];

        // 山の奥行き
        const mountainDepth = 200;
        const halfDepth = mountainDepth / 2; 

        // 斜面を何段に分けるか
        const slopeSteps = 12;
        
        // ハーモニックリッチネスを使って斜面の広がりを決める
        const slopeWidth = THREE.MathUtils.lerp(
            halfDepth,
            mountainDepth,
            harmonicRichness / 100
        );

        // -------------------------
        // 頂上 → 地面までの頂点を作る
        // -------------------------

        for (let i = 0; i < ridge.length; i++) {
            const point = ridge[i];

            for (let step = 0; step <= slopeSteps; step++) {
                const ratio = step / slopeSteps;

                // Z方向に徐々に広げる
                const zOffset =
                    THREE.MathUtils.lerp(
                        0,
                        slopeWidth,
                        ratio
                    );

                // 地面に近づくほど高さを下げる
                const y =
                    THREE.MathUtils.lerp(
                        point.y,
                        0,
                        ratio
                    );

                // -------------------------
                // 手前側
                // -------------------------

                positions.push(
                    point.x,
                    y,
                    point.z - zOffset
                );

                // -------------------------
                // 奥側
                // -------------------------

                positions.push(
                    point.x,
                    y,
                    point.z + zOffset
                );
            }
        }

        // -------------------------
        // 面を作る
        // -------------------------

        const rowSize = (slopeSteps + 1) * 2;

        for (let i = 0; i < ridge.length - 1; i++) {

            for (let step = 0; step < slopeSteps; step++) {

                // 現在の断面
                const current =
                    i * rowSize + step * 2;

                // 次の断面
                const next =
                    (i + 1) * rowSize + step * 2;

                // 現在の段の4頂点
                const currentFront = current;
                const currentBack = current + 1;

                // 次の段の4頂点
                const nextFront = next;
                const nextBack = next + 1;

                // 手前側
                indices.push(
                    currentFront,
                    nextFront,
                    currentFront + 2,

                    currentFront + 2,
                    nextFront,
                    nextFront + 2
                );

                // 奥側
                indices.push(
                    currentBack + 2,
                    nextBack,
                    currentBack,

                    currentBack + 2,
                    nextBack + 2,
                    nextBack
                );
            }
        }

        // -------------------------
        // 山のGeometry
        // -------------------------

        const mountainGeometry =
            new THREE.BufferGeometry();

        mountainGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                positions,
                3
            )
        );

        mountainGeometry.setIndex(indices);

        mountainGeometry.computeVertexNormals();

        return {
            mountainGeometry,
            ridgePositions: ridge,
        };

    }, [pitchData]);

    return (
        <>
            {/* -------------------------
                山の面
            ------------------------- */}
            <mesh geometry={mountainGeometry}>
                <meshStandardMaterial
                    color="white"
                    side={THREE.DoubleSide}
                    roughness={1}
                />
            </mesh>

            {/* -------------------------
                山の稜線
            ------------------------- */}
            {ridgePositions.length >= 2 && (
                <Line
                    points={ridgePositions}
                    color="white"
                    lineWidth={2}
                />
            )}
        </>
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