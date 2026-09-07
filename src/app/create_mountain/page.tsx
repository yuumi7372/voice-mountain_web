/* ./create_mountain/page.tsx */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"
import background from "../../components/background.module.css";

export default function CreateMountain() {
    const [isRecording, setIsRecording] = useState(false);
    const router = useRouter();
    const streamRef = useRef<MediaStream | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const waveDataRef = useRef<number[]>([]);
    const pitchDataRef = useRef<number[]>([]);

    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [visualData, setVisualData] = useState<number[]>([]);
    const [recordingProgress, setRecordingProgress] = useState(0);

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    async function startRecording() {
        setAudioUrl(null);
        chunksRef.current = [];
        setVisualData([]);
        setRecordingProgress(0);
        waveDataRef.current = [];
        pitchDataRef.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const mimeType =
            MediaRecorder.isTypeSupported("audio/mp4")
                ? "audio/mp4"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";

        const recorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : undefined
        );

        recorder.ondataavailable = (event) => {
            chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
            const audioBlob = new Blob(chunksRef.current, {
                type: recorder.mimeType,
            });

            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);

            const reader = new FileReader();

            reader.onloadend = () => {
                localStorage.setItem(
                    "audioData",
                    reader.result as string
                );
            };

            reader.readAsDataURL(audioBlob);

            console.log("waveData");
            console.log(waveDataRef.current);

            console.log("pitchData");
            console.log(pitchDataRef.current);
        };
        recorder.start();

        intervalRef.current = setInterval(() => {
            const analyser = analyserRef.current;

            if (!analyser) return;

            // -----------------
            // 音量取得
            // -----------------

            const timeData = new Uint8Array(
                analyser.frequencyBinCount
            );

            analyser.getByteTimeDomainData(
                timeData
            );

            let volume = 0;

            for (let i = 0; i < timeData.length; i++) {
                volume = Math.max(
                    volume,
                    Math.abs(timeData[i] - 128)
                );
            }
            const normalizedVolume = volume / 128;

            waveDataRef.current.push(normalizedVolume);

            setVisualData((prev) => {
                const next = [...prev, normalizedVolume];
                return next.slice(-50);
            });

            setRecordingProgress(
                Math.min(waveDataRef.current.length / 50, 1)
            );

            // -----------------
            // 周波数取得
            // -----------------

            const freqData = new Uint8Array(
                analyser.frequencyBinCount
            );

            analyser.getByteFrequencyData(freqData);

            const sampleRate = audioContext.sampleRate;

            const minFreq = 80;
            const maxFreq = 1200;

            const minIndex = Math.floor(minFreq * analyser.fftSize / sampleRate);

            const maxIndex = Math.floor(maxFreq * analyser.fftSize / sampleRate);

            let strongestIndex = minIndex;
            let strongestValue = 0;

            for (let i = minIndex; i <= maxIndex; i++) {
                if (freqData[i] > strongestValue) {
                    strongestValue = freqData[i];
                    strongestIndex = i;
                }
            }

            const dominantFrequency =
                strongestIndex *
                sampleRate /
                analyser.fftSize;

            pitchDataRef.current.push(dominantFrequency);
        }, 100);

        mediaRecorderRef.current = recorder;

        setIsRecording(true);

        setTimeout(() => {
            stopRecording();
        }, 5000);
    }

    function stopRecording() {
        //インターバルをクリアして録音を停止する
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // MediaRecorderを停止する
        mediaRecorderRef.current?.stop();

        //マイクを停止する
        streamRef.current?.getTracks().forEach((track) => {
            track.stop();
        });

        streamRef.current = null;

        //AudioContextを閉じる
        audioContextRef.current?.close();
        audioContextRef.current = null;

        //UIを録音終了状態に更新する
        setIsRecording(false);
    }

    function createMountain() {
        localStorage.setItem(
            "waveData",
            JSON.stringify(waveDataRef.current)
        );

        localStorage.setItem(
            "pitchData",
            JSON.stringify(pitchDataRef.current)
        );

        router.push("/create_mountain/result");
    }

    return (
        <main className={background.container}>
            <section className={styles.card}>
                <p className={styles.label}>CREATE MOUNTAIN</p>

                <h1 className={styles.title}>
                    声で山をつくる
                </h1>

                <p className={styles.description}>
                    5秒間声を録音すると、音量と高さから
                    あなただけの山フィールドを生成します。
                </p>

                <div className={styles.statusBox}>
                    <div
                        className={styles.statusDot}
                        style={{
                            backgroundColor: isRecording ? "#ff5a5a" : "#d9d9d9",
                        }}
                    />

                    <span className={styles.statusText}>
                        {isRecording ? "録音中..." : "録音待機中"}
                    </span>
                </div>

                <div className={styles.visualizer}>
                    {Array.from({ length: 50 }).map((_, index) => {
                        const value = visualData[index] ?? 0;

                        return (
                            <div
                                key={index}
                                className={styles.visualBar}
                                style={{
                                    height: `${8 + value * 70}px`,
                                    opacity: isRecording || value > 0 ? 1 : 0.25,
                                }}
                            />
                        );
                    })}
                </div>

                <div className={styles.progressTrack}>
                    <div
                        className={styles.progressBar}
                        style={{
                            width: `${recordingProgress * 100}%`,
                        }}
                    />
                </div>

                <div className={styles.buttonArea}>
                    <button
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`${styles.button} ${styles.primaryButton}`}
                    >
                        録音開始
                    </button>

                    <button
                        onClick={stopRecording}
                        disabled={!isRecording}
                        className={`${styles.button} ${styles.secondaryButton}`}
                        style={{
                            opacity: !isRecording ? 0.5 : 1,
                        }}
                    >
                        録音停止
                    </button>
                </div>

                {audioUrl && (
                    <audio
                        controls
                        preload="metadata"
                        src={audioUrl}
                    />
                )}

                <button
                    onClick={createMountain}
                    className={`${styles.button} ${styles.createButton}`}
                >
                    山を生成する
                </button>
            </section>
        </main>
    );
}