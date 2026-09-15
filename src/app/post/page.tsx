/* ./post/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import background from "../../components/background.module.css";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";

export default function PostPage() {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const router = useRouter();

    const [aiReview, setAiReview] = useState({
        type: "分析中...",
        comment: "声の山を読み取っています。",
    });

    const [mountainName, setMountainName] = useState("");
    const [comment, setComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        const savedThumbnail = localStorage.getItem("thumbnail");
        setThumbnail(savedThumbnail);

        const waveData = JSON.parse(
            localStorage.getItem("waveData") || "[]"
        ) as number[];

        const pitchData = JSON.parse(
            localStorage.getItem("pitchData") || "[]"
        ) as number[];

        setAiReview(createAiReview(waveData, pitchData));
    }, []);

    function createAiReview(waveData: number[], pitchData: number[]) {
        if (waveData.length === 0 || pitchData.length === 0) {
            return {
                type: "未分析の山",
                comment:
                    "音声データが見つからなかったため、山の評価はまだできません。",
            };
        }

        const avgVolume =
            waveData.reduce((sum, value) => sum + value, 0) /
            waveData.length;

        const maxVolume = Math.max(...waveData);

        const validPitchData = pitchData.filter((pitch) => pitch > 0);

        const avgPitch =
            validPitchData.length > 0
                ? validPitchData.reduce((sum, value) => sum + value, 0) /
                  validPitchData.length
                : 0;

        if (maxVolume > 0.8 && avgPitch > 500) {
            return {
                type: "そびえ立つ高音峰型",
                comment:
                    "力強い声と高めの音が反映され、鋭く高い山が生まれました。勢いのある発声が山の迫力につながっています。",
            };
        }

        if (avgVolume > 0.45) {
            return {
                type: "ダイナミック山脈型",
                comment:
                    "声の大きさに変化があり、起伏のある山になっています。感情の動きや声の強弱が地形に表れています。",
            };
        }

        if (avgPitch > 400) {
            return {
                type: "きらめき高原型",
                comment:
                    "比較的高めの声が反映され、明るく軽やかな印象の山になっています。山全体に澄んだ雰囲気があります。",
            };
        }

        return {
            type: "おだやか渓谷型",
            comment:
                "高低差が少なく、なだらかな地形が広がっています。落ち着いた話し方や安定した発声が反映された山かもしれません。",
        };
    }

    // Base64形式のデータをBlobに変換する
    function dataUrlToBlob(dataUrl: string): Blob {
        const [header, base64] = dataUrl.split(",");

        const mimeType =
            header.match(/data:(.*?);/)?.[1] || "application/octet-stream";

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Blob([bytes], {
            type: mimeType,
        });
    }

    async function handlePost() {
        if (!mountainName.trim()) {
            alert("山の名前を入力してね");
            return;
        }

        if (isPosting) {
            return;
        }

        setIsPosting(true);

        try {
            // -------------------------
            // localStorageからデータ取得
            // -------------------------

            const waveData = JSON.parse(
                localStorage.getItem("waveData") || "[]"
            ) as number[];

            const pitchData = JSON.parse(
                localStorage.getItem("pitchData") || "[]"
            ) as number[];

            const analysisResult = JSON.parse(
                localStorage.getItem("analysisResult") || "{}"
            );

            const savedThumbnail = localStorage.getItem("thumbnail");
            const savedAudio = localStorage.getItem("audioData");

            // 投稿ごとのファイル名に使うID
            const uploadId = crypto.randomUUID();

            // -------------------------
            // サムネイルをStorageへ保存
            // -------------------------

            let thumbnailPath: string | null = null;

            if (savedThumbnail) {
                const thumbnailBlob = dataUrlToBlob(savedThumbnail);

                thumbnailPath = `${uploadId}.png`;

                const { error: thumbnailError } = await supabase.storage
                    .from("img")
                    .upload(thumbnailPath, thumbnailBlob, {
                        contentType: "image/png",
                        upsert: false,
                    });

                if (thumbnailError) {
                    throw new Error(
                        `サムネイルのアップロードに失敗しました: ${thumbnailError.message}`
                    );
                }
            }

            // -------------------------
            // 音声をStorageへ保存
            // -------------------------

            let audioPath: string | null = null;

            if (savedAudio) {
                const audioBlob = dataUrlToBlob(savedAudio);

                audioPath = `${uploadId}.wav`;

                const { error: audioError } = await supabase.storage
                    .from("audio")
                    .upload(audioPath, audioBlob, {
                        contentType: "audio/wav",
                        upsert: false,
                    });

                if (audioError) {
                    throw new Error(
                        `音声のアップロードに失敗しました: ${audioError.message}`
                    );
                }
            }

            // -------------------------
            // mountainテーブルへ保存
            // -------------------------

            const { error: mountainError } = await supabase
                .from("mountain")
                .insert({
                    // tag_idは現在まだ使わない
                    tag_id: null,

                    name: mountainName.trim(),

                    comment: comment.trim(),

                    ai_type: aiReview.type,

                    audio_path: audioPath,

                    img_path: thumbnailPath,

                    analysis_data: {
                        ...analysisResult,
                        aiReview: {
                            type: aiReview.type,
                            comment: aiReview.comment,
                        },
                    },

                    mountain_data: {
                        waveData: waveData,
                        pitchData: pitchData,
                    },
                });

            if (mountainError) {
                throw new Error(
                    `山データの保存に失敗しました: ${mountainError.message}`
                );
            }

            // -------------------------
            // 投稿成功
            // -------------------------

            alert("山を投稿したよ！⛰️");

            router.push("/");
        } catch (error) {
            console.error("投稿エラー:", error);

            if (error instanceof Error) {
                alert(`投稿に失敗しました。\n${error.message}`);
            } else {
                alert("投稿に失敗しました。");
            }
        } finally {
            setIsPosting(false);
        }
    }

    return (
        <main className={background.container}>
            <section className={styles.card}>
                <div className={styles.header}>
                    <p className={styles.label}>POST MOUNTAIN</p>
                    <h1 className={styles.title}>山を投稿する</h1>
                    <p className={styles.description}>
                        作った山に名前とコメントをつけて保存しよう
                    </p>
                </div>

                <div className={styles.content}>
                    <div className={styles.previewArea}>
                        {thumbnail ? (
                            <img
                                src={thumbnail}
                                alt="生成した山のサムネイル"
                                className={styles.thumbnail}
                                onClick={() =>
                                    router.push("/create_mountain/result")
                                }
                            />
                        ) : (
                            <div className={styles.emptyThumbnail}>
                                サムネイルがありません
                            </div>
                        )}

                        <div className={styles.aiReview}>
                            <div className={styles.aiHeader}>
                                🤖 AI山評価
                            </div>

                            <p className={styles.aiTitle}>
                                {aiReview.type}
                            </p>

                            <p className={styles.aiComment}>
                                {aiReview.comment}
                            </p>
                        </div>
                    </div>

                    <div className={styles.formArea}>
                        <input
                            className={styles.input}
                            placeholder="山の名前"
                            value={mountainName}
                            onChange={(e) =>
                                setMountainName(e.target.value)
                            }
                        />

                        <textarea
                            className={styles.textarea}
                            placeholder="ひとことコメント"
                            value={comment}
                            onChange={(e) =>
                                setComment(e.target.value)
                            }
                        />

                        <button
                            className={styles.postButton}
                            onClick={handlePost}
                            disabled={isPosting}
                        >
                            {isPosting ? "投稿中..." : "投稿する"}
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}