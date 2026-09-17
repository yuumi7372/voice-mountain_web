/* ./create_mountain/result/MountainCanvas.tsx */
"use client";

import {
    Canvas,
    useFrame,
    useThree,
} from "@react-three/fiber";
import {
    OrbitControls,
    Line,
} from "@react-three/drei";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

type PitchData = {
    character: string;
    start: number;
    end: number;
    frequency: number | null;
    note: string;
    volume: number;
    spectral_centroid: number;
    brightness: number;
    warmth: number;
};

type MountainGeometryData = {
    geometry: THREE.BufferGeometry;
    ridgePositions: THREE.Vector3[];
    ridgeColors: THREE.Color[];
};

type MountainProps = {
    onGeometryReady?: (
        data: MountainGeometryData
    ) => void;
};

const warmthHueStops = [
    { warmth: 0, hue: 225 },
    { warmth: 15, hue: 250 },
    { warmth: 30, hue: 200 },
    { warmth: 45, hue: 140 },
    { warmth: 60, hue: 90 },
    { warmth: 70, hue: 50 },
    { warmth: 75, hue: 340 },
    { warmth: 90, hue: 15 },
    { warmth: 100, hue: 0 },
];

function getHueFromWarmth(
    warmth: number
): number {
    const value =
        THREE.MathUtils.clamp(
            warmth,
            0,
            100
        );

    for (
        let i = 0;
        i < warmthHueStops.length - 1;
        i++
    ) {
        const current =
            warmthHueStops[i];

        const next =
            warmthHueStops[i + 1];

        if (
            value >= current.warmth &&
            value <= next.warmth
        ) {
            let hue1 =
                current.hue;

            let hue2 =
                next.hue;

            if (
                Math.abs(hue2 - hue1) >
                180
            ) {
                if (hue1 < hue2) {
                    hue1 += 360;
                } else {
                    hue2 += 360;
                }
            }

            const t =
                (value -
                    current.warmth) /
                (next.warmth -
                    current.warmth);

            return (
                (THREE.MathUtils.lerp(
                    hue1,
                    hue2,
                    t
                ) +
                    360) %
                360
            );
        }
    }

    return warmthHueStops[
        warmthHueStops.length - 1
    ].hue;
}

function getColorFromVoice(
    warmth: number,
    brightness: number
): THREE.Color {
    const hue =
        getHueFromWarmth(warmth);

    const saturation = 0.9;

    const lightness =
        THREE.MathUtils.lerp(
            0.25,
            0.65,
            THREE.MathUtils.clamp(
                brightness,
                0,
                100
            ) / 100
        );

    const color =
        new THREE.Color();

    color.setHSL(
        hue / 360,
        saturation,
        lightness
    );

    return color;
}

/**
 * 山の生成
 *
 * 完成形Geometryを作成したあと、
 * 表示時だけ下から上へ伸びるアニメーションを行う。
 */
function Mountain({
    onGeometryReady,
}: MountainProps) {
    const { camera } = useThree();

    const meshRef = useRef<THREE.Mesh | null>(
        null
    );

    const ridgeLineRef = useRef<any>(null);

    const animationStartRef = useRef<number | null>(null);

    const animationFinishedRef = useRef(false);

    const [
        pitchData,
        setPitchData,
    ] = useState<PitchData[]>(
        []
    );

    const [
        harmonicRichness,
        setHarmonicRichness,
    ] = useState<number>(0);

    const [mountainOffsetX, setMountainOffsetX] = useState(0);

    useEffect(() => {
        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (
                event.key !== "ArrowLeft" &&
                event.key !== "ArrowRight"
            ) {
                return;
            }

            event.preventDefault();

            const moveAmount = 10;

            setMountainOffsetX((prev) => {
                if (event.key === "ArrowLeft") {
                    return prev - moveAmount;
                }

                return prev + moveAmount;
            });
        };

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, []);

    /**
     * 音声解析結果を読み込む
     */
    useEffect(() => {
        try {
            const savedAnalysis =
                localStorage.getItem(
                    "analysisResult"
                );

            if (!savedAnalysis) {
                console.warn(
                    "analysisResult が localStorage にありません"
                );
                return;
            }

            const data =
                JSON.parse(
                    savedAnalysis
                );

            setPitchData(
                data.pitch_data ?? []
            );

            setHarmonicRichness(
                data.harmonic_richness ??
                0
            );
        } catch (error) {
            console.error(
                "analysisResult の読み込みに失敗しました:",
                error
            );
        }
    }, []);

    const mountainWidth = 500;
    const mountainHeight = 100;
    const mountainDepth = 200;
    const halfDepth =
        mountainDepth / 2;

    /**
     * 山のGeometryを生成
     */
    const {
        mountainGeometry,
        ridgePositions,
        ridgeColors,
    } = useMemo(() => {
        const validPitchData =
            pitchData.filter(
                (p) =>
                    p.frequency !== null &&
                    p.frequency > 0
            );

        if (
            validPitchData.length ===
            0
        ) {
            const emptyGeometry =
                new THREE.BufferGeometry();

            return {
                mountainGeometry:
                    emptyGeometry,
                ridgePositions: [],
                ridgeColors: [],
            };
        }

        const frequencies =
            validPitchData.map(
                (p) =>
                    p.frequency as number
            );

        const minFrequency =
            Math.min(...frequencies);

        const maxFrequency =
            Math.max(...frequencies);

        const recordingDuration = 5;

        const ridgePoints: THREE.Vector3[] =
            [];

        const ridgePointColors: THREE.Color[] =
            [];

        /**
         * 尾根部分を作成
         */
        for (const pitch of pitchData) {
            const centerTime = (pitch.start + pitch.end) / 2;
            const time = THREE.MathUtils.clamp(
                centerTime / recordingDuration,
                0,
                1
            );
            const x = (time - 0.5) * mountainWidth;

            let normalizedPitch = 0;

            if (
                pitch.frequency !==
                null &&
                maxFrequency !==
                minFrequency
            ) {
                normalizedPitch =
                    THREE.MathUtils.clamp(
                        (pitch.frequency -
                            minFrequency) /
                        (maxFrequency -
                            minFrequency),
                        0,
                        1
                    );
            }

            const height =
                normalizedPitch *
                mountainHeight;

            const volumeNormalized =
                THREE.MathUtils.clamp(
                    (pitch.volume +
                        60) /
                    45,
                    0,
                    1
                );

            const z =
                THREE.MathUtils.lerp(
                    halfDepth,
                    -halfDepth,
                    volumeNormalized
                );

            const point =
                new THREE.Vector3(
                    x,
                    height,
                    z
                );

            ridgePoints.push(point);

            const color =
                getColorFromVoice(
                    pitch.warmth,
                    pitch.brightness
                );

            ridgePointColors.push(
                color
            );
        }

        const slopeSteps = 12;

        const slopeWidth =
            THREE.MathUtils.lerp(
                halfDepth,
                mountainDepth,
                THREE.MathUtils.clamp(
                    harmonicRichness / 100,
                    0,
                    1
                )
            );

        const positions: number[] =
            [];

        const colors: number[] =
            [];

        const indices: number[] =
            [];

        const addVertex = (
            position: THREE.Vector3,
            color: THREE.Color
        ) => {
            positions.push(
                position.x,
                position.y,
                position.z
            );

            colors.push(
                color.r,
                color.g,
                color.b
            );

            return (
                positions.length / 3 - 1
            );
        };

        /**
         * 山の面を生成
         */
        for (
            let i = 0;
            i <
            ridgePoints.length;
            i++
        ) {
            const ridgePoint =
                ridgePoints[i];

            const ridgeColor =
                ridgePointColors[i];

            const frontIndices: number[] =
                [];

            const backIndices: number[] =
                [];

            for (
                let step = 0;
                step <= slopeSteps;
                step++
            ) {
                const t =
                    step / slopeSteps;

                const zOffset =
                    THREE.MathUtils.lerp(
                        0,
                        slopeWidth,
                        t
                    );

                const y =
                    THREE.MathUtils.lerp(
                        ridgePoint.y,
                        0,
                        t
                    );

                const frontPosition =
                    new THREE.Vector3(
                        ridgePoint.x,
                        y,
                        ridgePoint.z +
                        zOffset
                    );

                const backPosition =
                    new THREE.Vector3(
                        ridgePoint.x,
                        y,
                        ridgePoint.z -
                        zOffset
                    );

                const frontIndex =
                    addVertex(
                        frontPosition,
                        ridgeColor
                    );

                const backIndex =
                    addVertex(
                        backPosition,
                        ridgeColor
                    );

                frontIndices.push(
                    frontIndex
                );

                backIndices.push(
                    backIndex
                );
            }

            if (i > 0) {
                const previousRidgePoint =
                    ridgePoints[i - 1];

                const previousColor =
                    ridgePointColors[i - 1];

                const previousFrontIndices: number[] =
                    [];

                const previousBackIndices: number[] =
                    [];

                for (
                    let step = 0;
                    step <= slopeSteps;
                    step++
                ) {
                    const t =
                        step / slopeSteps;

                    const zOffset =
                        THREE.MathUtils.lerp(
                            0,
                            slopeWidth,
                            t
                        );

                    const y =
                        THREE.MathUtils.lerp(
                            previousRidgePoint.y,
                            0,
                            t
                        );

                    const frontPosition =
                        new THREE.Vector3(
                            previousRidgePoint.x,
                            y,
                            previousRidgePoint.z +
                            zOffset
                        );

                    const backPosition =
                        new THREE.Vector3(
                            previousRidgePoint.x,
                            y,
                            previousRidgePoint.z -
                            zOffset
                        );

                    const frontIndex =
                        addVertex(
                            frontPosition,
                            previousColor
                        );

                    const backIndex =
                        addVertex(
                            backPosition,
                            previousColor
                        );

                    previousFrontIndices.push(
                        frontIndex
                    );

                    previousBackIndices.push(
                        backIndex
                    );
                }

                /**
                 * 前面
                 */
                for (
                    let step = 0;
                    step < slopeSteps;
                    step++
                ) {
                    const a =
                        previousFrontIndices[
                        step
                        ];

                    const b =
                        previousFrontIndices[
                        step + 1
                        ];

                    const c =
                        frontIndices[step];

                    const d =
                        frontIndices[
                        step + 1
                        ];

                    indices.push(
                        a,
                        c,
                        b
                    );

                    indices.push(
                        b,
                        c,
                        d
                    );
                }

                /**
                 * 背面
                 */
                for (
                    let step = 0;
                    step < slopeSteps;
                    step++
                ) {
                    const a =
                        previousBackIndices[
                        step
                        ];

                    const b =
                        previousBackIndices[
                        step + 1
                        ];

                    const c =
                        backIndices[step];

                    const d =
                        backIndices[
                        step + 1
                        ];

                    indices.push(
                        a,
                        b,
                        c
                    );

                    indices.push(
                        b,
                        d,
                        c
                    );
                }
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
                3
            )
        );

        geometry.setIndex(indices);

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        return {
            mountainGeometry:
                geometry,
            ridgePositions:
                ridgePoints,
            ridgeColors:
                ridgePointColors,
        };
    }, [
        pitchData,
        harmonicRichness,
    ]);

    /**
     * カメラを山全体に合わせる
     */
    useEffect(() => {
        if (
            !mountainGeometry.boundingBox
        ) {
            return;
        }

        const box =
            mountainGeometry.boundingBox;

        const center =
            new THREE.Vector3();

        const size =
            new THREE.Vector3();

        box.getCenter(center);
        box.getSize(size);

        const maxSize =
            Math.max(size.x, size.y, size.z);

        const distance = maxSize * 1.5;

        camera.position.set(
            center.x,
            center.y + maxSize * 0.4,
            center.z + distance
        );

        camera.lookAt(center);

    }, [
        mountainGeometry,
        camera,
    ]);

    /**
     * 山のにょきにょきアニメーション
     */
    useFrame((state) => {
        if (
            !meshRef.current
        ) {
            return;
        }

        if (
            animationFinishedRef.current
        ) {
            return;
        }

        if (
            animationStartRef.current ===
            null
        ) {
            animationStartRef.current =
                state.clock.elapsedTime;
        }

        const elapsed =
            state.clock.elapsedTime -
            animationStartRef.current;

        /**
         * アニメーション時間
         * ここを変えると生成速度を調整できる
         */
        const duration = 2.0;

        const rawProgress =
            THREE.MathUtils.clamp(
                elapsed / duration,
                0,
                1
            );

        /**
         * easeOutCubic
         *
         * 最初はゆっくり、
         * 中盤から勢いよく、
         * 最後にスッと止まる。
         */
        const progress =
            1 -
            Math.pow(
                1 - rawProgress,
                3
            );

        /**
         * Geometryを直接書き換えず、
         * Mesh全体をY方向に伸ばす。
         *
         * ただし scale だと山の底が動くため、
         * position.y を補正して
         * 底面を y=0 に固定する。
         */
        meshRef.current.scale.y =
            progress;

        meshRef.current.position.y =
            -(mountainHeight *
                progress -
                mountainHeight *
                progress *
                progress) *
            0.0;

        /**
         * 白い尾根線も同じように伸ばす
         */
        if (
            ridgeLineRef.current
        ) {
            ridgeLineRef.current.scale.y =
                progress;

            ridgeLineRef.current.position.y =
                0;
        }

        if (
            rawProgress >= 1
        ) {
            meshRef.current.scale.y =
                1;

            meshRef.current.position.y =
                0;

            if (
                ridgeLineRef.current
            ) {
                ridgeLineRef.current.scale.y =
                    1;
            }

            animationFinishedRef.current =
                true;
        }
    });

    /**
     * Geometryが完成したら親へ渡す
     *
     * ここで渡しているGeometryは
     * アニメーション前の「完成形」。
     *
     * なのでGLB保存時には
     * 完成した山が保存される。
     */
    useEffect(() => {
        if (
            mountainGeometry.attributes
                .position ===
            undefined
        ) {
            return;
        }

        if (
            mountainGeometry.attributes
                .position.count === 0
        ) {
            return;
        }

        /**
         * 新しい山が生成されたら
         * アニメーションを最初から再生
         */
        animationStartRef.current =
            null;

        animationFinishedRef.current =
            false;

        if (meshRef.current) {
            meshRef.current.scale.y =
                0;

            meshRef.current.position.y =
                0;
        }

        if (
            ridgeLineRef.current
        ) {
            ridgeLineRef.current.scale.y =
                0;
        }

        onGeometryReady?.({
            geometry:
                mountainGeometry,
            ridgePositions,
            ridgeColors,
        });
    }, [
        mountainGeometry,
        ridgePositions,
        ridgeColors,
        onGeometryReady,
    ]);

    return (
        <>
            <mesh
                ref={meshRef}
                geometry={mountainGeometry}
                position={[mountainOffsetX, 0, 0]}
            >
                <meshStandardMaterial
                    vertexColors
                    side={THREE.DoubleSide}
                    roughness={1}
                />
            </mesh>

            {ridgePositions.length >=
                2 && (
                    <Line
                        ref={ridgeLineRef}
                        points={ridgePositions}
                        color="white"
                        lineWidth={2}
                        position={[mountainOffsetX, 0, 0]}
                    />
                )}
        </>
    );
}

/**
 * Geometry → GLB
 */
async function exportGeometryToGLB(
    geometry: THREE.BufferGeometry
): Promise<Blob> {
    const exporter =
        new GLTFExporter();

    const material =
        new THREE.MeshStandardMaterial(
            {
                vertexColors: true,
                side: THREE.DoubleSide,
                roughness: 1,
            }
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        "KoeKataMountain";

    return new Promise(
        (resolve, reject) => {
            exporter.parse(
                mesh,
                (result) => {
                    if (
                        result instanceof
                        ArrayBuffer
                    ) {
                        const blob =
                            new Blob(
                                [result],
                                {
                                    type: "model/gltf-binary",
                                }
                            );

                        resolve(blob);
                    } else {
                        reject(
                            new Error(
                                "GLBの生成結果がArrayBufferではありません"
                            )
                        );
                    }
                },
                (error) => {
                    reject(error);
                },
                {
                    binary: true,
                    onlyVisible: true,
                }
            );
        }
    );
}

/**
 * Blob → Base64
 */
function blobToDataUrl(
    blob: Blob
): Promise<string> {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onloadend = () => {
                if (
                    typeof reader.result ===
                    "string"
                ) {
                    resolve(
                        reader.result
                    );
                } else {
                    reject(
                        new Error(
                            "GLBのBase64変換に失敗しました"
                        )
                    );
                }
            };

            reader.onerror = () => {
                reject(
                    new Error(
                        "GLBの読み込みに失敗しました"
                    )
                );
            };

            reader.readAsDataURL(
                blob
            );
        }
    );
}

type MountainCanvasProps = {
    onGLBReady?: (
        glb: Blob
    ) => void;
};

export default function MountainCanvas({
    onGLBReady,
}: MountainCanvasProps) {
    const mountainDataRef =
        useRef<MountainGeometryData | null>(
            null
        );

    const hasExportedRef =
        useRef(false);

    const handleGeometryReady =
        async (
            data: MountainGeometryData
        ) => {
            mountainDataRef.current =
                data;

            /**
             * GLBは1回だけ生成
             */
            if (
                hasExportedRef.current
            ) {
                return;
            }

            try {
                hasExportedRef.current =
                    true;

                const glb =
                    await exportGeometryToGLB(
                        data.geometry
                    );

                console.log(
                    "GLB生成成功",
                    glb
                );

                console.log(
                    "GLBサイズ:",
                    glb.size,
                    "bytes"
                );

                onGLBReady?.(glb);

                const glbDataUrl =
                    await blobToDataUrl(
                        glb
                    );

                localStorage.setItem(
                    "mountainGLB",
                    glbDataUrl
                );

                console.log(
                    "GLBをlocalStorageへ保存しました"
                );
            } catch (error) {
                console.error(
                    "GLBの書き出しに失敗しました:",
                    error
                );

                hasExportedRef.current =
                    false;
            }
        };

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
        >
            <Canvas
                camera={{
                    position: [
                        0,
                        10,
                        150,
                    ],
                    fov: 40,
                }}
                gl={{
                    preserveDrawingBuffer:
                        true,
                }}
            >
                <ambientLight
                    intensity={1}
                />

                <directionalLight
                    position={[ 5, 10, 5,]}
                    intensity={2}
                />

                <Mountain
                    onGeometryReady={
                        handleGeometryReady
                    }
                />

                <OrbitControls />
            </Canvas>
        </div>
    );
}