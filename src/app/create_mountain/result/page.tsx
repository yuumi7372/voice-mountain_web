/* ./create_mountain/result/page.tsx */
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

    function goToPostPage() {
        const canvas = document.querySelector("canvas");
        console.log("canvas:", canvas);
        if (canvas) {
            try {
                const image = canvas.toDataURL("image/png");
                console.log("thumbnail size:", image.length);
                localStorage.setItem("thumbnail", image);
            } catch (error) {
                console.error("サムネ保存失敗:", error);
            }
        }
        router.push("/post");
    }

    useEffect(() => {
        if (!isLoaded) return;

        const waveData = localStorage.getItem("waveData");
        const pitchData = localStorage.getItem("pitchData");

        if (!waveData || !pitchData) {
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
                goToPostPage();
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
                onClick={goToPostPage}
                className={styles.postButton}
            >
                この景色で投稿する
                (Click here or Enter)
            </button>
        </main>
    );
}