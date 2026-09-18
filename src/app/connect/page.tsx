"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

import styles from "./page.module.css";
import background from "../../components/background.module.css";
import { supabase } from "../../lib/supabase";

type Mountain = {
    id: string;
    name: string;
    mountain_path: string;
    audio_path: string;
    word: string;
    tagLabel: string;
};

const targetTags = [
    {
        key: "go1",
        tagId: "9c75db98-d729-4163-8613-cda75032e907",
        label: "5の句",
    },
    {
        key: "shichi",
        tagId: "b53ec162-5742-4eb8-8afd-c2f9e1af05db",
        label: "7の句",
    },
    {
        key: "go2",
        tagId: "9c75db98-d729-4163-8613-cda75032e907",
        label: "5の句",
    },
];

/* =========================================================
   1つのGLBを描画
   ========================================================= */

function MountainModel({
    path,
    x,
}: {
    path: string;
    x: number;
}) {
    const { data } = supabase.storage
        .from("mountain")
        .getPublicUrl(path);
        
    const gltf = useLoader(GLTFLoader, data.publicUrl);

    const animationStartRef =
        useRef<number | null>(null);

    const animationFinishedRef =
        useRef(false);

    useEffect(() => {
        animationStartRef.current = null;
        animationFinishedRef.current = false;

        gltf.scene.scale.y = 0;
    }, [path, gltf.scene]);

    useFrame((state) => {
        if (animationFinishedRef.current) {
            return;
        }

        if (animationStartRef.current === null) {
            animationStartRef.current =
                state.clock.elapsedTime;
        }

        const duration = 2.0;

        const elapsed =
            state.clock.elapsedTime -
            animationStartRef.current;

        const rawProgress =
            THREE.MathUtils.clamp(
                elapsed / duration,
                0,
                1
            );

        // MountainCanvasと同じeaseOutCubic
        const progress =
            1 -
            Math.pow(
                1 - rawProgress,
                3
            );

        gltf.scene.scale.y = progress;

        if (rawProgress >= 1) {
            gltf.scene.scale.y = 1;
            animationFinishedRef.current = true;
        }
    });

    return (
        <primitive
            object={gltf.scene}
            position={[x, 0, 0]}
        />
    );
}

/* =========================================================
   5つのGLBを横方向に連結
   ========================================================= */

function ConnectedMountains({
    mountains,
}: {
    mountains: Mountain[];
}) {
    const [positions, setPositions] = useState<number[]>([]);
    const [totalWidth, setTotalWidth] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const calculatePositions = async () => {
            const loader = new GLTFLoader();
            const nextPositions: number[] = [];

            let currentX = 0;

            for (const mountain of mountains) {
                try {
                    const { data } = supabase.storage
                        .from("mountain")
                        .getPublicUrl(mountain.mountain_path);

                    const gltf = await loader.loadAsync(
                        data.publicUrl
                    );

                    const box = new THREE.Box3().setFromObject(
                        gltf.scene
                    );

                    const minX = box.min.x;
                    const maxX = box.max.x;
                    const width = maxX - minX;

                    console.log(
                        `${mountain.tagLabel}:`,
                        "minX =",
                        minX,
                        "maxX =",
                        maxX,
                        "width =",
                        width
                    );

                    const x = currentX - minX;

                    nextPositions.push(x);

                    currentX += width;
                } catch (error) {
                    console.error(
                        `${mountain.tagLabel} のGLB読み込みに失敗しました:`,
                        error
                    );
                }
            }

            if (!cancelled) {
                setPositions(nextPositions);

                // 5つの山を並べたあとの全体幅
                setTotalWidth(currentX);
            }
        };

        calculatePositions();

        return () => {
            cancelled = true;
        };
    }, [mountains]);

    if (positions.length !== mountains.length) {
        return null;
    }

    // 全体の中心
    const centerX = totalWidth / 2;

    return (
        <group
            scale={[0.4, 0.4, 0.4]}
            position={[-centerX * 0.4, 0, 0]}
        >
            {mountains.map((mountain, index) => (
                <MountainModel
                    key={`${mountain.id}-${index}`}
                    path={mountain.mountain_path}
                    x={positions[index]}
                />
            ))}
        </group>
    );
}

/* =========================================================
   メインページ
   ========================================================= */

export default function ConnectPage() {
    const router = useRouter();

    const [mountains, setMountains] = useState<Mountain[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasConnected, setHasConnected] = useState(false);

    /* -----------------------------------------------------
       ボタンを押したときに5つの山をランダム選択
    ----------------------------------------------------- */

    const connectMountains = async () => {
        setLoading(true);
        setMountains([]);
        setHasConnected(false);

        const selected: Mountain[] = [];

        /*
         * 5つのタグそれぞれから
         * 山を1つずつランダムに選ぶ
         */
        for (const tag of targetTags) {
            const { data, error } = await supabase
                .from("mountain")
                .select("id, name, mountain_path, audio_path, analysis_data")
                .eq("tag_id", tag.tagId)
                .not("mountain_path", "is", null)
                .not("audio_path", "is", null);

            if (error) {
                console.error(
                    `タグ ${tag.label} の取得に失敗:`,
                    error
                );

                continue;
            }

            if (!data || data.length === 0) {
                console.warn(
                    `タグ ${tag.label} の山がありません`
                );

                continue;
            }

            /*
             * ランダムに1つ選択
             */
            const randomMountain =
                data[
                    Math.floor(
                        Math.random() * data.length
                    )
                ];

            selected.push({
                id: randomMountain.id,
                name: randomMountain.name,
                mountain_path: randomMountain.mountain_path,
                audio_path: randomMountain.audio_path,
                word: randomMountain.analysis_data?.text ?? "",
                tagLabel: tag.label,
            });
        }

        console.log(
            "Connectで選ばれた山:",
            selected
        );

        setMountains(selected);
        setLoading(false);

        /*
         * 山の表示が更新されたあとに
         * 連結された山までスクロール
         */
        if (selected.length > 0) {
            setHasConnected(true);

            setTimeout(() => {
                document
                    .getElementById("connected-mountain")
                    ?.scrollIntoView({
                        behavior: "smooth",
                    });
            }, 100);
        }
    };

    /* -----------------------------------------------------
       Connect UI
       ----------------------------------------------------- */

    return (
        <main className={background.container}>
            <div className={styles.wrapper}>

                {/* =========================
                    トップへ戻る
                ========================= */}

                <button
                    className={styles.backButton}
                    onClick={() => router.push("/")}
                >
                    ← トップへ戻る
                </button>

                {/* =========================
                    ヘッダー
                ========================= */}

                <header className={styles.header}>
                    <p className={styles.label}>
                        CONNECT MOUNTAIN
                    </p>

                    <h1 className={styles.title}>
                        山を繋げる
                    </h1>

                    <p className={styles.subtitle}>
                        みんなの山を繋げて、ひとつの声に。
                    </p>
                </header>

                {/* =========================
                    山を繋げるボタン
                ========================= */}

                <section className={styles.startArea}>
                    <button
                        className={styles.connectButton}
                        onClick={connectMountains}
                        disabled={loading}
                    >
                        {loading
                            ? "🏔️ 山を集めています……"
                            : "🏔️ 山を繋げる"}
                    </button>
                </section>

                {/* =========================
                    連結された山
                ========================= */}

                <section
                    id="connected-mountain"
                    className={styles.section}
                >
                    <h2 className={styles.sectionTitle}>
                        🌋 連結された山
                    </h2>

                    <div className={styles.mountainArea}>
                        {!hasConnected ? (
                            <div>
                                <div
                                    className={
                                        styles.placeholderIcon
                                    }
                                >
                                    ⛰️
                                </div>

                                <p
                                    className={
                                        styles.placeholderText
                                    }
                                >
                                    「山を繋げる」ボタンを押して
                                    <br />
                                    みんなの山を繋げよう！
                                </p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "520px",
                                }}
                            >
                                <Canvas
                                    camera={{
                                        position: [
                                            0,
                                            50,
                                            150,
                                        ],
                                        fov: 45,
                                    }}
                                >
                                    {/* 全体を明るくする */}
                                    <ambientLight
                                        intensity={2}
                                    />

                                    {/* メインライト */}
                                    <directionalLight
                                        position={[
                                            500,
                                            500,
                                            500,
                                        ]}
                                        intensity={2}
                                    />

                                    {/* 5つのGLBを連結 */}
                                    <ConnectedMountains
                                        mountains={mountains}
                                    />

                                    {/* カメラ操作 */}
                                    <OrbitControls />
                                </Canvas>
                            </div>
                        )}
                    </div>
                </section>

                {/* =========================
                    音声認識結果
                ========================= */}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        📝 音声認識結果
                    </h2>

                    <div className={styles.textArea}>
                        <div>
                            {mountains.map((mountain, index) => (
                                <p
                                    key={`${mountain.id}-${index}`}
                                    className={styles.placeholderText}
                                >
                                    {mountain.word}
                                </p>
                            ))}
                        </div>  
                    </div>
                </section>

                {/* =========================
                    音声再生
                ========================= */}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        🎧 連結された音声
                    </h2>

                    <div className={styles.audioArea}>
                        <div>
                            {mountains.map((mountain, index) => {
                                const { data } = supabase.storage
                                    .from("audio")
                                    .getPublicUrl(mountain.audio_path);

                                return (
                                    <div key={`${mountain.id}-${index}`}>
                                        <span>
                                            {mountain.tagLabel}
                                        </span>

                                        <audio
                                            controls
                                            src={data.publicUrl}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}