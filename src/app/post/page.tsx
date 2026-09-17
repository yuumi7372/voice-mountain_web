/* ./post/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import background from "../../components/background.module.css";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";

type Tag = {
    id: string;
    name: string;
};

export default function PostPage() {
    const [thumbnail, setThumbnail] =
        useState<string | null>(null);

    const router = useRouter();

    const [aiReview, setAiReview] = useState({
        type: "分析中...",
        comment: "声の山を読み取っています。",
    });

    const [mountainName, setMountainName] =
        useState("");

    const [comment, setComment] =
        useState("");

    const [isPosting, setIsPosting] =
        useState(false);

    const [tags, setTags] =
        useState<Tag[]>([]);

    const [selectedTagId, setSelectedTagId] =
        useState("");

    useEffect(() => {
        const savedThumbnail =
            localStorage.getItem(
                "thumbnail"
            );

        setThumbnail(savedThumbnail);

        const analysisResult =
            JSON.parse(
                localStorage.getItem(
                    "analysisResult"
                ) || "{}"
            );

        setAiReview(
            createAiReview(
                analysisResult
            )
        );
    }, []);

    // -------------------------
    // タグ取得
    // -------------------------

    useEffect(() => {
        async function fetchTags() {
            const {
                data,
                error,
            } = await supabase
                .from("tags")
                .select("id, name")
                .order("name", {
                    ascending: true,
                });

            if (error) {
                console.error(
                    "タグの取得に失敗しました:",
                    error
                );

                return;
            }

            setTags(data ?? []);
        }

        fetchTags();
    }, []);

    // -------------------------
    // AIレビュー
    // -------------------------

    function createAiReview(
        analysisResult: any
    ) {
        const pitchData =
            analysisResult?.pitch_data ??
            [];

        if (
            pitchData.length === 0
        ) {
            return {
                type: "未分析の山",
                comment:
                    "音声データが見つからなかったため、山の評価はまだできません。",
            };
        }

        const validPitchData =
            pitchData.filter(
                (pitch: any) =>
                    typeof pitch.frequency ===
                        "number" &&
                    pitch.frequency > 0
            );

        if (
            validPitchData.length === 0
        ) {
            return {
                type: "未分析の山",
                comment:
                    "音程を検出できなかったため、山の評価はまだできません。",
            };
        }

        const avgPitch =
            validPitchData.reduce(
                (
                    sum: number,
                    pitch: any
                ) =>
                    sum +
                    pitch.frequency,
                0
            ) /
            validPitchData.length;

        const maxVolume =
            Math.max(
                ...validPitchData.map(
                    (pitch: any) =>
                        pitch.volume
                )
            );

        if (
            maxVolume > -10 &&
            avgPitch > 500
        ) {
            return {
                type:
                    "そびえ立つ高音峰型",
                comment:
                    "力強い声と高めの音が反映され、鋭く高い山が生まれました。勢いのある発声が山の迫力につながっています。",
            };
        }

        if (
            avgPitch > 400
        ) {
            return {
                type:
                    "きらめき高原型",
                comment:
                    "比較的高めの声が反映され、明るく軽やかな印象の山になっています。山全体に澄んだ雰囲気があります。",
            };
        }

        return {
            type:
                "おだやか渓谷型",
            comment:
                "高低差が少なく、なだらかな地形が広がっています。落ち着いた話し方や安定した発声が反映された山かもしれません。",
        };
    }

    // -------------------------
    // Data URL → Blob
    // -------------------------

    function dataUrlToBlob(
        dataUrl: string
    ): Blob {
        const [
            header,
            base64,
        ] =
            dataUrl.split(",");

        const mimeType =
            header.match(
                /data:(.*?);/
            )?.[1] ||
            "application/octet-stream";

        const binary =
            atob(base64);

        const bytes =
            new Uint8Array(
                binary.length
            );

        for (
            let i = 0;
            i < binary.length;
            i++
        ) {
            bytes[i] =
                binary.charCodeAt(i);
        }

        return new Blob(
            [bytes],
            {
                type: mimeType,
            }
        );
    }

    // -------------------------
    // 投稿
    // -------------------------

    async function handlePost() {
        if (
            !mountainName.trim()
        ) {
            alert(
                "山の名前を入力してね"
            );

            return;
        }

        if (isPosting) {
            return;
        }

        setIsPosting(true);

        try {
            // -------------------------
            // localStorageから取得
            // -------------------------

            const analysisResult =
                JSON.parse(
                    localStorage.getItem(
                        "analysisResult"
                    ) || "{}"
                );

            const savedThumbnail =
                localStorage.getItem(
                    "thumbnail"
                );

            const savedAudio =
                localStorage.getItem(
                    "audioData"
                );

            const savedMountain =
                localStorage.getItem(
                    "mountainGLB"
                );

            // -------------------------
            // 山GLBチェック
            // -------------------------

            if (!savedMountain) {
                throw new Error(
                    "生成した山の3Dデータが見つかりません。山の生成ページに戻って、もう一度生成してね。"
                );
            }

            // -------------------------
            // 投稿ID
            // -------------------------

            const uploadId =
                crypto.randomUUID();

            // -------------------------
            // サムネイル
            // -------------------------

            let thumbnailPath:
                | string
                | null = null;

            if (
                savedThumbnail
            ) {
                const thumbnailBlob =
                    dataUrlToBlob(
                        savedThumbnail
                    );

                thumbnailPath =
                    `${uploadId}.png`;

                const {
                    error:
                        thumbnailError,
                } =
                    await supabase.storage
                        .from("img")
                        .upload(
                            thumbnailPath,
                            thumbnailBlob,
                            {
                                contentType:
                                    "image/png",
                                upsert:
                                    false,
                            }
                        );

                if (
                    thumbnailError
                ) {
                    throw new Error(
                        `サムネイルのアップロードに失敗しました: ${thumbnailError.message}`
                    );
                }
            }

            // -------------------------
            // 音声
            // -------------------------

            let audioPath:
                | string
                | null = null;

            if (
                savedAudio
            ) {
                const audioBlob =
                    dataUrlToBlob(
                        savedAudio
                    );

                audioPath =
                    `${uploadId}.wav`;

                const {
                    error:
                        audioError,
                } =
                    await supabase.storage
                        .from("audio")
                        .upload(
                            audioPath,
                            audioBlob,
                            {
                                contentType:
                                    "audio/wav",
                                upsert:
                                    false,
                            }
                        );

                if (
                    audioError
                ) {
                    throw new Error(
                        `音声のアップロードに失敗しました: ${audioError.message}`
                    );
                }
            }

            // -------------------------
            // 3D山
            // -------------------------

            const mountainBlob =
                dataUrlToBlob(
                    savedMountain
                );

            const mountainPath =
                `${uploadId}.glb`;

            const {
                error:
                    mountainError,
            } =
                await supabase.storage
                    .from("mountain")
                    .upload(
                        mountainPath,
                        mountainBlob,
                        {
                            contentType:
                                "model/gltf-binary",
                            upsert:
                                false,
                        }
                    );

            if (
                mountainError
            ) {
                throw new Error(
                    `3D山データのアップロードに失敗しました: ${mountainError.message}`
                );
            }

            // -------------------------
            // DBへ保存
            // -------------------------

            const {
                error:
                    databaseError,
            } =
                await supabase
                    .from("mountain")
                    .insert({
                        tag_id:
                            selectedTagId ||
                            null,

                        name:
                            mountainName.trim(),

                        comment:
                            comment.trim(),

                        ai_type:
                            aiReview.type,

                        audio_path:
                            audioPath,

                        img_path:
                            thumbnailPath,

                        mountain_path:
                            mountainPath,

                        analysis_data: {
                            ...analysisResult,

                            aiReview: {
                                type:
                                    aiReview.type,

                                comment:
                                    aiReview.comment,
                            },
                        },
                    });

            if (
                databaseError
            ) {
                throw new Error(
                    `山データの保存に失敗しました: ${databaseError.message}`
                );
            }

            // -------------------------
            // 投稿成功
            // -------------------------

            // 一時データを削除
            localStorage.removeItem("mountainGLB");
            localStorage.removeItem("analysisResult");
            localStorage.removeItem("thumbnail");
            localStorage.removeItem("audioData");
            localStorage.removeItem("waveData");
            localStorage.removeItem("pitchData");

            alert(
                "山を投稿したよ！⛰️"
            );

            router.push(
                "/"
            );
        } catch (error) {
            console.error(
                "投稿エラー:",
                error
            );

            if (
                error instanceof Error
            ) {
                alert(
                    `投稿に失敗しました。\n${error.message}`
                );
            } else {
                alert(
                    "投稿に失敗しました。"
                );
            }
        } finally {
            setIsPosting(
                false
            );
        }
    }

    return (
        <main
            className={
                background.container
            }
        >
            <section
                className={
                    styles.card
                }
            >
                <div
                    className={
                        styles.header
                    }
                >
                    <p
                        className={
                            styles.label
                        }
                    >
                        POST MOUNTAIN
                    </p>

                    <h1
                        className={
                            styles.title
                        }
                    >
                        山を投稿する
                    </h1>

                    <p
                        className={
                            styles.description
                        }
                    >
                        作った山に名前とコメントをつけて保存しよう
                    </p>
                </div>

                <div
                    className={
                        styles.content
                    }
                >
                    <div
                        className={
                            styles.previewArea
                        }
                    >
                        {thumbnail ? (
                            <img
                                src={
                                    thumbnail
                                }
                                alt="生成した山のサムネイル"
                                className={
                                    styles.thumbnail
                                }
                                onClick={() =>
                                    router.push(
                                        "/create_mountain/result"
                                    )
                                }
                            />
                        ) : (
                            <div
                                className={
                                    styles.emptyThumbnail
                                }
                            >
                                サムネイルがありません
                            </div>
                        )}

                        <div
                            className={
                                styles.aiReview
                            }
                        >
                            <div
                                className={
                                    styles.aiHeader
                                }
                            >
                                🤖 AI山評価
                            </div>

                            <p
                                className={
                                    styles.aiTitle
                                }
                            >
                                {
                                    aiReview.type
                                }
                            </p>

                            <p
                                className={
                                    styles.aiComment
                                }
                            >
                                {
                                    aiReview.comment
                                }
                            </p>
                        </div>
                    </div>

                    <div
                        className={
                            styles.formArea
                        }
                    >
                        <input
                            className={
                                styles.input
                            }
                            placeholder="山の名前"
                            value={
                                mountainName
                            }
                            onChange={(
                                e
                            ) =>
                                setMountainName(
                                    e.target.value
                                )
                            }
                        />

                        <textarea
                            className={
                                styles.textarea
                            }
                            placeholder="ひとことコメント"
                            value={
                                comment
                            }
                            onChange={(
                                e
                            ) =>
                                setComment(
                                    e.target.value
                                )
                            }
                        />

                        <div
                            className={
                                styles.tagArea
                            }
                        >
                            <select
                                className={
                                    styles.tagSelect
                                }
                                value={
                                    selectedTagId
                                }
                                onChange={(
                                    e
                                ) =>
                                    setSelectedTagId(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">
                                    タグを選択しない
                                </option>

                                {tags.map(
                                    (
                                        tag
                                    ) => (
                                        <option
                                            key={
                                                tag.id
                                            }
                                            value={
                                                tag.id
                                            }
                                        >
                                            {
                                                tag.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <button
                            className={
                                styles.postButton
                            }
                            onClick={
                                handlePost
                            }
                            disabled={
                                isPosting
                            }
                        >
                            {isPosting
                                ? "投稿中..."
                                : "投稿する"}
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}