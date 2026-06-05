/* ./post/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import background from "../../components/background.module.css";
import styles from "./page.module.css";

export default function PostPage() {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const router = useRouter();
    const [aiReview, setAiReview] = useState({
        type: "分析中...",
        comment: "声の山を読み取っています。",
    });
    const [mountainName, setMountainName] = useState("");
    const [comment, setComment] = useState("");

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
                comment: "音声データが見つからなかったため、山の評価はまだできません。",
            };
        }

        const avgVolume =
            waveData.reduce((sum, value) => sum + value, 0) / waveData.length;

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

    function handlePost() {
        if (!mountainName.trim()) {
            alert("山の名前を入力してね");
            return;
        }

        const newPost = {
            id: Date.now(),
            title: mountainName,
            comment: comment,
            image: thumbnail,
            waveData: JSON.parse(localStorage.getItem("waveData") || "[]"),
            pitchData: JSON.parse(localStorage.getItem("pitchData") || "[]"),
            aiType: aiReview.type,
            aiComment: aiReview.comment,
            createdAt: new Date().toISOString(),
            audioData: localStorage.getItem("audioData"),
        };

        const savedPosts = JSON.parse(
            localStorage.getItem("mountainPosts") || "[]"
        );

        localStorage.setItem(
            "mountainPosts",
            JSON.stringify([newPost, ...savedPosts])
        );

        router.push("/");
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
                                onClick={() => router.push("/create_mountain/result")}
                            />
                        ) : (
                            <div className={styles.emptyThumbnail}>
                                サムネイルがありません
                            </div>
                        )}

                        <div className={styles.aiReview}>
                            <div className={styles.aiHeader}>🤖 AI山評価</div>
                            <p className={styles.aiTitle}>{aiReview.type}</p>
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
                            onChange={(e) => setMountainName(e.target.value)}
                        />

                        <textarea
                            className={styles.textarea}
                            placeholder="ひとことコメント"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />

                        <button className={styles.postButton} onClick={handlePost}>
                            投稿する
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}