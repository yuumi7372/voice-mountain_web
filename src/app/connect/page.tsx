// ./connect/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Canvas,
    useLoader,
} from "@react-three/fiber";
import {
    OrbitControls,
} from "@react-three/drei";
import {
    GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

import styles from "./page.module.css";
import background from "../../components/background.module.css";
import { supabase } from "../../lib/supabase";

type Mountain = {
    id: string;
    name: string;
    mountain_path: string;
};

function MountainModel({
    url,
}: {
    url: string;
}) {
    const gltf = useLoader(
        GLTFLoader,
        url
    );

    return (
        <primitive
            object={gltf.scene}
        />
    );
}

export default function ConnectPage() {
    const router = useRouter();

    const [mountain, setMountain] =
        useState<Mountain | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        async function fetchMountain() {
            try {
                // 最新の山を1件取得
                const {
                    data,
                    error,
                } = await supabase
                    .from("mountain")
                    .select(
                        "id, name, mountain_path"
                    )
                    .not(
                        "mountain_path",
                        "is",
                        null
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false,
                        }
                    )
                    .limit(1)
                    .single();

                if (error) {
                    throw error;
                }

                if (
                    !data?.mountain_path
                ) {
                    throw new Error(
                        "3D山データが見つかりません"
                    );
                }

                setMountain(data);
            } catch (error) {
                console.error(
                    "山の取得に失敗しました:",
                    error
                );

                setError(
                    "山の取得に失敗しました"
                );
            }
        }

        fetchMountain();
    }, []);

    // GLBの公開URLを作る
    const mountainUrl =
        mountain
            ? supabase.storage
                  .from("mountain")
                  .getPublicUrl(
                      mountain.mountain_path
                  ).data.publicUrl
            : null;

    return (
        <main
            className={
                background.container
            }
        >
            <div
                className={
                    styles.wrapper
                }
            >
                {/* =========================
                    トップへ戻る
                ========================= */}

                <button
                    className={
                        styles.backButton
                    }
                    onClick={() =>
                        router.push("/")
                    }
                >
                    ← トップへ戻る
                </button>

                {/* =========================
                    ヘッダー
                ========================= */}

                <header
                    className={
                        styles.header
                    }
                >
                    <p
                        className={
                            styles.label
                        }
                    >
                        CONNECT MOUNTAIN
                    </p>

                    <h1
                        className={
                            styles.title
                        }
                    >
                        山を繋げる
                    </h1>

                    <p
                        className={
                            styles.subtitle
                        }
                    >
                        みんなの山を繋げて、ひとつの声に。
                    </p>
                </header>

                {/* =========================
                    連結された山
                ========================= */}

                <section
                    className={
                        styles.section
                    }
                >
                    <h2
                        className={
                            styles.sectionTitle
                        }
                    >
                        🌋 保存された山
                    </h2>

                    <div
                        className={
                            styles.mountainArea
                        }
                        style={{
                            height: "500px",
                        }}
                    >
                        {error ? (
                            <p
                                className={
                                    styles.placeholderText
                                }
                            >
                                {error}
                            </p>
                        ) : mountainUrl ? (
                            <Canvas
                                camera={{
                                    position: [
                                        0,
                                        80,
                                        250,
                                    ],
                                    fov: 40,
                                }}
                            >
                                <ambientLight
                                    intensity={1}
                                />

                                <directionalLight
                                    position={[
                                        100,
                                        200,
                                        100,
                                    ]}
                                    intensity={2}
                                />

                                <MountainModel
                                    url={
                                        mountainUrl
                                    }
                                />

                                <OrbitControls />
                            </Canvas>
                        ) : (
                            <p
                                className={
                                    styles.placeholderText
                                }
                            >
                                山を読み込んでいます...
                            </p>
                        )}
                    </div>

                    {mountain && (
                        <p
                            style={{
                                textAlign:
                                    "center",
                                marginTop:
                                    "12px",
                            }}
                        >
                            {mountain.name}
                        </p>
                    )}
                </section>

                {/* =========================
                    音声認識結果
                ========================= */}

                <section
                    className={
                        styles.section
                    }
                >
                    <h2
                        className={
                            styles.sectionTitle
                        }
                    >
                        📝 音声認識結果
                    </h2>

                    <div
                        className={
                            styles.textArea
                        }
                    >
                        <p
                            className={
                                styles.placeholderText
                            }
                        >
                            ここに連結された山の音声認識結果が表示されます
                        </p>
                    </div>
                </section>

                {/* =========================
                    音声再生
                ========================= */}

                <section
                    className={
                        styles.section
                    }
                >
                    <h2
                        className={
                            styles.sectionTitle
                        }
                    >
                        🎧 連結された音声
                    </h2>

                    <div
                        className={
                            styles.audioArea
                        }
                    >
                        <button
                            className={
                                styles.playButton
                            }
                        >
                            ▶ 再生する
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}