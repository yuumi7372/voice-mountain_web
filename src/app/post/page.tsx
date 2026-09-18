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
            analysisResult?.pitch_data ?? [];

        if (pitchData.length === 0) {
            return {
                type: "未分析の山",
                comment:
                    "音声データが見つからなかったため、山の評価はまだできません。",
            };
        }

        // -------------------------
        // 有効なデータだけ取り出す
        // -------------------------

        const validPitchData =
            pitchData.filter(
                (pitch: any) =>
                    typeof pitch.frequency === "number" &&
                    pitch.frequency > 0
            );

        if (validPitchData.length === 0) {
            return {
                type: "未分析の山",
                comment:
                    "音程を検出できなかったため、山の評価はまだできません。",
            };
        }

        // -------------------------
        // 基本値を計算
        // -------------------------

        const frequencies =
            validPitchData.map(
                (pitch: any) => pitch.frequency
            );

        const volumes =
            validPitchData
                .map(
                    (pitch: any) => pitch.volume
                )
                .filter(
                    (volume: any) =>
                        typeof volume === "number"
                );

        const brightnessValues =
            validPitchData
                .map(
                    (pitch: any) =>
                        pitch.brightness
                )
                .filter(
                    (value: any) =>
                        typeof value === "number"
                );

        const warmthValues =
            validPitchData
                .map(
                    (pitch: any) =>
                        pitch.warmth
                )
                .filter(
                    (value: any) =>
                        typeof value === "number"
                );

        // 平均値を求める
        const average = (
            values: number[]
        ) =>
            values.length > 0
                ? values.reduce(
                    (
                        sum,
                        value
                    ) =>
                        sum + value,
                    0
                ) /
                values.length
                : 0;

        const avgFrequency =
            average(frequencies);

        const minFrequency =
            Math.min(...frequencies);

        const maxFrequency =
            Math.max(...frequencies);

        const frequencyRange =
            maxFrequency -
            minFrequency;

        const avgVolume =
            average(volumes);

        const maxVolume =
            volumes.length > 0
                ? Math.max(...volumes)
                : 0;

        const avgBrightness =
            average(
                brightnessValues
            );

        const avgWarmth =
            average(
                warmthValues
            );

        const harmonicRichness =
            typeof analysisResult?.harmonic_richness ===
                "number"
                ? analysisResult.harmonic_richness
                : null;

        // -------------------------
        // 山の特徴を判定
        // -------------------------

        let type = "";

        /*
        * 周波数の幅が大きい
        * → 高低差のある山
        */
        if (
            frequencyRange >= 300
        ) {
            type =
                "起伏のある大地形";
        }

        /*
        * 周波数の幅が小さく、
        * かつ明るさが高い
        * → なだらかで明るい山
        */
        else if (
            frequencyRange < 80 &&
            avgBrightness >= 70
        ) {
            type =
                "きらめき高原型";
        }

        /*
        * 周波数が高め
        * → 高い山
        */
        else if (
            maxFrequency >= 500
        ) {
            type =
                "そびえ立つ高峰型";
        }

        /*
        * 倍音が豊富
        * → 響きのある山
        */
        else if (
            harmonicRichness !== null &&
            harmonicRichness >= 80
        ) {
            type =
                "響きの峰型";
        }

        /*
        * 暖かさが高い
        * → 暖かい色の山
        */
        else if (
            avgWarmth >= 60
        ) {
            type =
                "あたたか森林型";
        }

        /*
        * その他
        */
        else {
            type =
                "おだやかな山並み型";
        }

        // -------------------------
        // 診断コメントを組み立てる
        // -------------------------

        const heightComment =
            `最高周波数は${maxFrequency.toFixed(
                1
            )}Hz、最低周波数は${minFrequency.toFixed(
                1
            )}Hzで、約${frequencyRange.toFixed(
                1
            )}Hzの音域が含まれていました。`;

        let terrainComment = "";

        if (
            frequencyRange >= 300
        ) {
            terrainComment =
                "広い音域を行き来する声だったため、高低差の大きな起伏のある地形として表れています。";
        } else if (
            frequencyRange < 80
        ) {
            terrainComment =
                "音域の変化が比較的小さいため、山の高低差も穏やかで、なだらかな地形になっています。";
        } else {
            terrainComment =
                "ある程度の音域の変化があり、山にもほどよい高低差が生まれています。";
        }

        const brightnessComment =
            `Brightnessの平均は${avgBrightness.toFixed(
                1
            )}で、${avgBrightness >= 70
                ? "明るい音の成分が多く含まれていました。"
                : "比較的落ち着いた明るさの音でした。"
            }`;

        const warmthComment =
            `Warmthの平均は${avgWarmth.toFixed(
                1
            )}で、${avgWarmth >= 60
                ? "暖かみのある音色が強く表れています。"
                : avgWarmth >= 35
                    ? "ほどよい暖かさを持った音色です。"
                    : "すっきりとした音色が特徴的です。"
            }`;

        let harmonicComment = "";

        if (
            harmonicRichness !== null
        ) {
            harmonicComment =
                `倍音の豊かさは${harmonicRichness.toFixed(
                    1
                )}で、${harmonicRichness >= 80
                    ? "豊かな倍音を含んだ、響きのある声でした。"
                    : harmonicRichness >= 50
                        ? "ある程度の倍音を含んだ声でした。"
                        : "倍音成分は比較的少なめでした。"
                }`;
        }

        const volumeComment =
            `平均音量は${avgVolume.toFixed(
                1
            )}dB、最大音量は${maxVolume.toFixed(
                1
            )}dBでした。`;

        // -------------------------
        // 最終コメント
        // -------------------------

        const comment =
            `${heightComment}
        ${terrainComment}

        ${brightnessComment}
        ${warmthComment}

        ${volumeComment}${harmonicComment
                ? `\n${harmonicComment}`
                : ""
            }

        声の高さや音色の特徴が、それぞれ山の高さ・色・地形として表れています。`;

        return {
            type,
            comment,
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