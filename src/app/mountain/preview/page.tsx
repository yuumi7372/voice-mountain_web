/* ./mountain/preview/page.tsx */
"use client";

import { useEffect } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"

export default function ResultPage() {
    const router = useRouter();
    const { unityProvider, sendMessage, isLoaded } = useUnityContext({
        loaderUrl: "/unity/Build/unity.loader.js",
        dataUrl: "/unity/Build/unity.data",
        frameworkUrl: "/unity/Build/unity.framework.js",
        codeUrl: "/unity/Build/unity.wasm",

        webglContextAttributes: {
            preserveDrawingBuffer: true,
        },
    });

    function goToMountainPage() {
        const id = localStorage.getItem("currentMountainId");

        if (id) {
            router.push(`/mountain/${id}`);
        } else {
            router.push("/");
        }
    }

    useEffect(() => {
        if (!isLoaded) return;

        const waveData = localStorage.getItem("waveData");
        const pitchData = localStorage.getItem("pitchData");

        console.log("waveData", waveData);
        console.log("pitchData", pitchData);

        if (!waveData || !pitchData|| waveData === "undefined" || pitchData === "undefined") {
            console.log("データがないよ");
            return;
        }

        const json = JSON.stringify({
            waveData: JSON.parse(waveData),
            pitchData: JSON.parse(pitchData),
        });

        sendMessage("MountainReceiver", "ReceiveData", json);
    }, [isLoaded, sendMessage]);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Enter") {
                goToMountainPage();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [router]);


    return (
        <main className={styles.container}>
            <Unity
                unityProvider={unityProvider}
                className={styles.unity}
            />

            <button
                onClick={goToMountainPage}
                className={styles.postButton}
            >
                戻る
                (Click here or Enter)
            </button>
        </main>
    );
}