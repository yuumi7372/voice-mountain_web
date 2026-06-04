/* ./create_mountain/page.tsx */
"use client";

import { useRef, useState } from "react";

export default function CreateMountain() {
    const [isRecording, setIsRecording] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const waveDataRef = useRef<number[]>([]);
    const pitchDataRef = useRef<number[]>([]);

    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    async function startRecording() {
        waveDataRef.current = [];
        pitchDataRef.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(
            stream
        );

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const recorder = new MediaRecorder(stream);

        recorder.onstop = () => {

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
            waveDataRef.current.push(volume);

            // -----------------
            // 周波数取得
            // -----------------

            const freqData = new Uint8Array(
                analyser.frequencyBinCount
            );

            analyser.getByteFrequencyData(
                freqData
            );

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

            pitchDataRef.current.push(
                dominantFrequency
            );


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

    return (
        <div>
            <button onClick={startRecording}>
                録音開始
            </button>

            <button onClick={stopRecording}>
                録音停止
            </button>

            <button>
                create
            </button>
        </div>
    );
}