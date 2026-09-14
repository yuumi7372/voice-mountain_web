/* ./create_mountain/result/MountainCanvas.tsx */
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Line } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

/* =========================================================
   warmth → 色相
   ========================================================= */

/*
    warmth の値から「山の景色」を決める。

    0〜15    氷山       青〜青紫
    15〜30   雪・冬     青紫〜青
    30〜45   森         青緑〜緑
    45〜60   新緑       緑〜黄緑
    60〜75   春・桜     黄〜ピンク
    75〜90   夕焼け     橙〜赤
    90〜100  火山       赤〜赤紫
*/

function getHueFromWarmth(warmth: number) {
    const value = THREE.MathUtils.clamp(warmth, 0, 100);

    /*
        HSL の Hue は

        0   = 赤
        60  = 黄
        120 = 緑
        180 = シアン
        240 = 青
        300 = 紫

        なので、山の景色として自然になるように
        warmth に対して色相を割り当てる。
    */

    const colorStops = [
        { warmth: 0, hue: 225 },   // 氷山：青
        { warmth: 15, hue: 250 },  // 氷山〜雪：青紫
        { warmth: 30, hue: 200 },  // 雪〜森林：青
        { warmth: 45, hue: 140 },  // 森：緑
        { warmth: 60, hue: 90 },   // 新緑：黄緑
        { warmth: 70, hue: 50 },   // 春：黄色
        { warmth: 75, hue: 340 },  // 桜：ピンク
        { warmth: 90, hue: 15 },   // 夕焼け：橙
        { warmth: 100, hue: 0 },   // 火山：赤
    ];

    // 最初
    if (value <= colorStops[0].warmth) {
        return colorStops[0].hue;
    }

    // 最後
    if (value >= colorStops[colorStops.length - 1].warmth) {
        return colorStops[colorStops.length - 1].hue;
    }

    // 現在いる色相区間を探す
    for (let i = 0; i < colorStops.length - 1; i++) {
        const current = colorStops[i];
        const next = colorStops[i + 1];

        if (
            value >= current.warmth &&
            value <= next.warmth
        ) {
            const t =
                (value - current.warmth) /
                (next.warmth - current.warmth);

            /*
                色相が 360 → 0 をまたぐ場合にも
                なるべく自然に補間する。
            */

            let hue1 = current.hue;
            let hue2 = next.hue;

            if (Math.abs(hue2 - hue1) > 180) {
                if (hue1 < hue2) {
                    hue1 += 360;
                } else {
                    hue2 += 360;
                }
            }

            const hue = THREE.MathUtils.lerp(
                hue1,
                hue2,
                t
            );

            return ((hue % 360) + 360) % 360;
        }
    }

    return colorStops[0].hue;
}


/* =========================================================
   HSL → Three.js Color
   ========================================================= */

function getColorFromVoice(
    warmth: number,
    brightness: number,
) {
    /*
        warmth
        → 色相

        brightness
        → 明度
    */

    const hue = getHueFromWarmth(warmth);

    // 色はしっかり出す
    const saturation = 0.9;

     // brightnessだけで明るさを変える
    const lightness =THREE.MathUtils.lerp(
        0.25,
        0.65,
        brightness / 100
    );

    const color = new THREE.Color();

    color.setHSL(
        hue / 360,
        saturation,
        lightness
    );

    return color;
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

            // 文字ごとの音響特徴
            spectral_centroid: number;
            brightness: number;
            warmth: number;
        }[]
    >([]);

    const [harmonicRichness, setHarmonicRichness] =
        useState(0);

    useEffect(() => {
        const savedData =
            localStorage.getItem("analysisResult");

        if (!savedData) {
            console.error(
                "解析結果が見つかりません"
            );
            return;
        }

        try {
            const data = JSON.parse(savedData);

            console.log(
                "読み込んだ解析結果:",
                data
            );

            setPitchData(data.pitch_data);

            setHarmonicRichness(
                data.harmonic_richness
            );

        } catch (error) {
            console.error(
                "解析結果の読み込みに失敗しました:",
                error
            );
        }
    }, []);


    const {
        mountainGeometry,
        ridgePositions,
        ridgeColors,
    } = useMemo(() => {
        if (pitchData.length === 0) {
            return {
                mountainGeometry:
                    new THREE.BufferGeometry(),

                ridgePositions:
                    [] as THREE.Vector3[],

                ridgeColors:
                    [] as THREE.Color[],
            };
        }


        // =====================================================
        // 山の基本パラメータ
        // =====================================================

        const mountainWidth = 500;
        const mountainHeight = 100;


        // =====================================================
        // JSONから最低・最高周波数を取得
        // =====================================================

        const validPitchData =
            pitchData.filter(
                (p) => p.frequency > 0
            );

        if (validPitchData.length === 0) {
            return {
                mountainGeometry:
                    new THREE.BufferGeometry(),

                ridgePositions:
                    [] as THREE.Vector3[],

                ridgeColors:
                    [] as THREE.Color[],
            };
        }

        const minFrequency =
            Math.min(
                ...validPitchData.map(
                    (p) => p.frequency
                )
            );

        const maxFrequency =
            Math.max(
                ...validPitchData.map(
                    (p) => p.frequency
                )
            );

        const maxTime =
            Math.max(
                ...pitchData.map(
                    (p) => p.end
                )
            );


        // =====================================================
        // 稜線
        // =====================================================

        const ridge: THREE.Vector3[] = [];

        // 各文字の色
        const characterColors: THREE.Color[] = [];


        pitchData.forEach((pitch) => {

            // =================================================
            // X = 時間
            // =================================================

            const centerTime =
                (pitch.start + pitch.end) / 2;

            const time =
                centerTime / maxTime;

            const x =
                (time - 0.5) *
                mountainWidth;


            // =================================================
            // Y = 周波数
            // =================================================

            const normalizedPitch =
                THREE.MathUtils.clamp(
                    (pitch.frequency -
                        minFrequency) /
                        (
                            maxFrequency -
                            minFrequency ||
                            1
                        ),
                    0,
                    1
                );

            const height =
                normalizedPitch *
                mountainHeight;


            // =================================================
            // Z = 音量
            // =================================================

            const volumeNormalized =
                THREE.MathUtils.clamp(
                    (pitch.volume + 60) /
                        45,
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


            // =================================================
            // 文字ごとの色
            // =================================================

            const color =
                getColorFromVoice(
                    pitch.warmth,
                    pitch.brightness,
                );

            characterColors.push(color);
        });


        // =====================================================
        // 稜線から斜面を作る
        // =====================================================

        const positions: number[] = [];
        const colors: number[] = [];
        const indices: number[] = [];


        // =====================================================
        // 山の奥行き
        // =====================================================

        const mountainDepth = 200;

        const halfDepth =
            mountainDepth / 2;


        // =====================================================
        // 斜面の段数
        // =====================================================

        const slopeSteps = 12;


        // =====================================================
        // ハーモニックリッチネス
        // → 斜面の広がり
        // =====================================================

        const slopeWidth =
            THREE.MathUtils.lerp(
                halfDepth,
                mountainDepth,
                harmonicRichness / 100
            );


        // =====================================================
        // 頂上 → 地面までの頂点
        // =====================================================

        for (
            let i = 0;
            i < ridge.length;
            i++
        ) {

            const point = ridge[i];

            // この文字の色
            const color =
                characterColors[i];


            for (
                let step = 0;
                step <= slopeSteps;
                step++
            ) {

                const ratio =
                    step / slopeSteps;


                // =================================================
                // Z方向に徐々に広げる
                // =================================================

                const zOffset =
                    THREE.MathUtils.lerp(
                        0,
                        slopeWidth,
                        ratio
                    );


                // =================================================
                // 地面に近づくほど高さを下げる
                // =================================================

                const y =
                    THREE.MathUtils.lerp(
                        point.y,
                        0,
                        ratio
                    );


                // =================================================
                // 手前側
                // =================================================

                positions.push(
                    point.x,
                    y,
                    point.z - zOffset
                );

                colors.push(
                    color.r,
                    color.g,
                    color.b
                );


                // =================================================
                // 奥側
                // =================================================

                positions.push(
                    point.x,
                    y,
                    point.z + zOffset
                );

                colors.push(
                    color.r,
                    color.g,
                    color.b
                );
            }
        }


        // =====================================================
        // 面を作る
        // =====================================================

        const rowSize =
            (slopeSteps + 1) * 2;


        for (
            let i = 0;
            i < ridge.length - 1;
            i++
        ) {

            for (
                let step = 0;
                step < slopeSteps;
                step++
            ) {

                // 現在の断面
                const current =
                    i * rowSize +
                    step * 2;

                // 次の断面
                const next =
                    (i + 1) * rowSize +
                    step * 2;


                // =================================================
                // 現在の段
                // =================================================

                const currentFront =
                    current;

                const currentBack =
                    current + 1;


                // =================================================
                // 次の段
                // =================================================

                const nextFront =
                    next;

                const nextBack =
                    next + 1;


                // =================================================
                // 手前側
                // =================================================

                indices.push(
                    currentFront,
                    nextFront,
                    currentFront + 2,

                    currentFront + 2,
                    nextFront,
                    nextFront + 2
                );


                // =================================================
                // 奥側
                // =================================================

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


        // =====================================================
        // Geometry
        // =====================================================

        const mountainGeometry =
            new THREE.BufferGeometry();


        mountainGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                positions,
                3
            )
        );


        mountainGeometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(
                colors,
                3
            )
        );


        mountainGeometry.setIndex(indices);

        mountainGeometry.computeVertexNormals();


        return {
            mountainGeometry,
            ridgePositions: ridge,
            ridgeColors: characterColors,
        };

    }, [pitchData, harmonicRichness]);


    return (
        <>
            {/* =================================================
                山の面
            ================================================= */}

            <mesh
                geometry={mountainGeometry}
            >
                <meshStandardMaterial
                    vertexColors
                    side={THREE.DoubleSide}
                    roughness={1}
                />
            </mesh>


            {/* =================================================
                山の稜線
            ================================================= */}

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
            <ambientLight
                intensity={1}
            />

            <directionalLight
                position={[5, 10, 5]}
                intensity={2}
            />

            <Mountain />

            {/* =================================================
                方眼紙っぽい地面
            ================================================= */}

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