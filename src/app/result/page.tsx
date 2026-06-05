/* ./result/page.tsx */
"use client";

import { useEffect, useState } from "react";

export default function Result() {
    const [waveData, setWaveData] = useState<number[]>([]);
    const [pitchData, setPitchData] = useState<number[]>([]);

    useEffect(() => {
        const wave =
            localStorage.getItem("waveData");

        const pitch =
            localStorage.getItem("pitchData");

        if (wave) {
            setWaveData(JSON.parse(wave));
        }

        if (pitch) {
            setPitchData(JSON.parse(pitch));
        }
    }, []);

    return (
        <div>
            <h1>山生成結果</h1>

            <p>
                waveData数:
                {waveData.length}
            </p>

            <p>
                pitchData数:
                {pitchData.length}
            </p>
        </div>
    );
}