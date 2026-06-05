/* ./mountain/[id]/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import background from "../../../components/background.module.css";
import styles from "./page.module.css";

type MountainPost = {
    id: number;
    title: string;
    comment: string;
    image: string | null;
    waveData: number[];
    pitchData: number[];
    aiType: string;
    aiComment: string;
    createdAt: string;
    audioData: string | null;
};

export default function MountainDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [mountain, setMountain] = useState<MountainPost | null>(null);

    useEffect(() => {
        const posts = JSON.parse(
            localStorage.getItem("mountainPosts") || "[]"
        ) as MountainPost[];

        const foundMountain = posts.find(
            (post) => post.id === Number(params.id)
        );

        setMountain(foundMountain ?? null);
    }, [params.id]);

    if (!mountain) {
        return (
            <main className={background.container}>
                <section className={styles.card}>
                    <h1 className={styles.title}>山が見つかりません</h1>
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

    function openMountain() {
        if (!mountain) return;

        localStorage.setItem(
            "waveData",
            JSON.stringify(mountain.waveData)
        );

        localStorage.setItem(
            "pitchData",
            JSON.stringify(mountain.pitchData)
        );
        localStorage.setItem(
            "currentMountainId",
            String(mountain.id)
        );

        router.push("/mountain/preview");
    }

    function deleteMountain() {
        if (!mountain) return;

        const ok = window.confirm(
            "この山を削除しますか？"
        );

        if (!ok) return;

        const posts = JSON.parse(
            localStorage.getItem("mountainPosts") || "[]"
        ) as MountainPost[];

        const updatedPosts = posts.filter(
            (post) => post.id !== mountain.id
        );

        localStorage.setItem(
            "mountainPosts",
            JSON.stringify(updatedPosts)
        );

        router.push("/");
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
                        <p className={styles.label}>MOUNTAIN DETAIL</p>
                        <h1 className={styles.title}>{mountain.title}</h1>

                        <div className={styles.aiReview}>
                            <div className={styles.aiHeader}>🤖 AI山評価</div>
                            <p className={styles.aiTitle}>{mountain.aiType}</p>
                            <p className={styles.aiComment}>
                                {mountain.aiComment}
                            </p>
                        </div>

                        <div className={styles.commentBox}>
                            <p className={styles.commentLabel}>ひとこと</p>
                            <p className={styles.comment}>
                                {mountain.comment || "コメントはありません"}
                            </p>
                        </div>

                        {mountain.audioData && (
                            <div className={styles.audioBox}>
                                <p className={styles.audioLabel}>
                                    🎙️ この山を作った声
                                </p>

                                <audio
                                    controls
                                    src={mountain.audioData}
                                    className={styles.audioPlayer}
                                />
                            </div>
                        )}

                        <button
                            className={styles.deleteButton}
                            onClick={deleteMountain}
                        >
                            削除する
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}