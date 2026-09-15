/* ./mountain/[id]/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import background from "../../../components/background.module.css";
import styles from "./page.module.css";
import { supabase } from "../../../lib/supabase";

type MountainPost = {
    id: string;
    title: string;
    comment: string;
    image: string | null;
    waveData: number[];
    pitchData: number[];
    aiType: string;
    aiComment: string;
    createdAt: string;
    audioUrl: string | null;
    analysisResult: any;
};

export default function MountainDetailPage() {
    const params = useParams();
    const router = useRouter();

    const [mountain, setMountain] = useState<MountainPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMountain() {
            try {
                // -------------------------
                // URLのidを取得
                // -------------------------

                const mountainId = params.id;

                if (typeof mountainId !== "string") {
                    return;
                }

                // -------------------------
                // Supabaseから山を取得
                // -------------------------

                const { data, error } = await supabase
                    .from("mountain")
                    .select("*")
                    .eq("id", mountainId)
                    .single();

                if (error) {
                    throw error;
                }

                // -------------------------
                // サムネイルURL
                // imgはPublicなので
                // getPublicUrlを使う
                // -------------------------

                let imageUrl: string | null = null;

                if (data.img_path) {
                    const { data: imageData } = supabase.storage
                        .from("img")
                        .getPublicUrl(data.img_path);

                    imageUrl = imageData.publicUrl;
                }

                // -------------------------
                // 音声URL
                // audioもPublicなので
                // getPublicUrlを使う
                // -------------------------

                let audioUrl: string | null = null;

                if (data.audio_path) {
                    const { data: audioData } = supabase.storage
                        .from("audio")
                        .getPublicUrl(data.audio_path);

                    audioUrl = audioData.publicUrl;
                }

                // -------------------------
                // mountain_dataから
                // waveData / pitchDataを取得
                // -------------------------

                const waveData =
                    data.mountain_data?.waveData ?? [];

                const pitchData =
                    data.mountain_data?.pitchData ?? [];

                // -------------------------
                // AIコメント
                // -------------------------

                const aiComment =
                    data.analysis_data?.aiReview?.comment ?? "";

                // -------------------------
                // 山の情報をセット
                // -------------------------

                setMountain({
                    id: data.id,
                    title: data.name,
                    comment: data.comment ?? "",
                    image: imageUrl,
                    waveData,
                    pitchData,
                    aiType: data.ai_type ?? "未分析",
                    aiComment,
                    createdAt: data.created_at,
                    audioUrl,
                    analysisResult: data.analysis_data ?? null,
                });
            } catch (error) {
                console.error(
                    "山の取得に失敗しました:",
                    error
                );
            } finally {
                setIsLoading(false);
            }
        }

        fetchMountain();
    }, [params.id]);

    // -------------------------
    // 読み込み中
    // -------------------------

    if (isLoading) {
        return (
            <main className={background.container}>
                <section className={styles.card}>
                    <h1 className={styles.title}>
                        山を読み込んでいます...
                    </h1>
                </section>
            </main>
        );
    }

    // -------------------------
    // 山が見つからない
    // -------------------------

    if (!mountain) {
        return (
            <main className={background.container}>
                <section className={styles.card}>
                    <h1 className={styles.title}>
                        山が見つかりません
                    </h1>

                    <button
                        className={styles.backButton}
                        onClick={() => router.push("/")}
                    >
                        トップへ戻る
                    </button>
                </section>
            </main>
        );
    }

    // -------------------------
    // Three.jsの山を開く
    // -------------------------

    function openMountain() {
        const currentMountain = mountain;

        if (!currentMountain) return;

        localStorage.setItem(
            "waveData",
            JSON.stringify(currentMountain.waveData)
        );

        localStorage.setItem(
            "pitchData",
            JSON.stringify(currentMountain.pitchData)
        );

        // analysisResultが存在するときだけ保存する
        if (currentMountain.analysisResult) {
            localStorage.setItem(
                "analysisResult",
                JSON.stringify(currentMountain.analysisResult)
            );
        } else {
            localStorage.removeItem("analysisResult");
            console.error(
                "解析結果が見つかりません:",
                currentMountain
            );
        }

        localStorage.setItem(
            "currentMountainId",
            currentMountain.id
        );

        router.push("/mountain/preview");
    }

    return (
        <main className={background.container}>
            <section className={styles.card}>
                <button
                    className={styles.backButton}
                    onClick={() => router.push("/")}
                >
                    ← トップへ戻る
                </button>

                <div className={styles.content}>
                    <div className={styles.previewArea}>
                        {mountain.image ? (
                            <img
                                src={mountain.image}
                                alt={mountain.title}
                                className={styles.thumbnail}
                                onClick={openMountain}
                            />
                        ) : (
                            <div className={styles.emptyThumbnail}>
                                サムネイルがありません
                            </div>
                        )}
                    </div>

                    <div className={styles.infoArea}>
                        <p className={styles.label}>
                            MOUNTAIN DETAIL
                        </p>

                        <h1 className={styles.title}>
                            {mountain.title}
                        </h1>

                        <div className={styles.aiReview}>
                            <div className={styles.aiHeader}>
                                🤖 AI山評価
                            </div>

                            <p className={styles.aiTitle}>
                                {mountain.aiType}
                            </p>

                            <p className={styles.aiComment}>
                                {mountain.aiComment}
                            </p>
                        </div>

                        <div className={styles.commentBox}>
                            <p className={styles.commentLabel}>
                                ひとこと
                            </p>

                            <p className={styles.comment}>
                                {mountain.comment ||
                                    "コメントはありません"}
                            </p>
                        </div>

                        {/* 作った声 */}
                        {mountain.audioUrl && (
                            <div className={styles.audioBox}>
                                <p className={styles.audioLabel}>
                                    🎙️ この山を作った声
                                </p>

                                <audio
                                    controls
                                    src={mountain.audioUrl}
                                    className={styles.audioPlayer}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

