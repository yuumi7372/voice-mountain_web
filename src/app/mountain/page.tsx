/* ./mountain/page.tsx */
"use client";

import { useEffect } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

export default function MountainPage() {
    const { unityProvider, sendMessage, isLoaded } = useUnityContext({
        loaderUrl: "/unity/Build/unity.loader.js",
        dataUrl: "/unity/Build/unity.data",
        frameworkUrl: "/unity/Build/unity.framework.js",
        codeUrl: "/unity/Build/unity.wasm",
    });

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


    return (
        <main>
            <Unity
                unityProvider={unityProvider}
                style={{
                width: "100%",
                height: "800px",
                }}
            />
        </main>
    );
}