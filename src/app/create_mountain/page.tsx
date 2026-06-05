/* ./create_mountain/page.tsx */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"
import background from "../../components/background.module.css";

export default function CreateMountain() {
    const [isRecording, setIsRecording] = useState(false);
    const router = useRouter();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const waveDataRef = useRef<number[]>([]);
    const pitchDataRef = useRef<number[]>([]);

    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [visualData, setVisualData] = useState<number[]>([]);
    const [recordingProgress, setRecordingProgress] = useState(0);

    async function startRecording() {
        setVisualData([]);
        setRecordingProgress(0);
        waveDataRef.current = [];
        pitchDataRef.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const recorder = new MediaRecorder(stream);

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

            let maxIndex = 0;

            for (let i = 1; i < freqData.length; i++) {
                if (
                    freqData[i] >
                    freqData[maxIndex]
                ) {
                    maxIndex = i;
                }
            }

            const dominantFrequency =
                maxIndex *
                audioContextRef.current!.sampleRate /
                analyser.fftSize;

            pitchDataRef.current.push(dominantFrequency);

            const mountainData = {
                waveData: waveDataRef.current,
                pitchData: pitchDataRef.current,
            };

            recorder.onstop = () => {

                console.log("waveData");
                console.log(waveDataRef.current);

                console.log("pitchData");
                console.log(pitchDataRef.current);

                console.log(
                    JSON.stringify(mountainData)
                );
            };
        }, 100);

        mediaRecorderRef.current = recorder;

        setIsRecording(true);

        setTimeout(() => {
            stopRecording();
        }, 5000);
    }

    function stopRecording() {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        if (intervalRef.current) {
            clearInterval(
                intervalRef.current
            );
        }
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

        router.push("/mountain");
    }

    return (
        <main className={background.container}>
            <section className={styles.card}>
                <p className={styles.label}>VOICE MOUNTAIN</p>

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