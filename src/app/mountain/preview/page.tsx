/* ./mountain/preview/page.tsx */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import MountainCanvas from "../../create_mountain/result/MountainCanvas";

export default function PreviewPage() {
    const router = useRouter();

    function goToMountainPage() {
        const id = localStorage.getItem(
            "currentMountainId"
        );

        if (id) {
            router.push(`/mountain/${id}`);
        } else {
            router.push("/");
        }
    }

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Enter") {
                goToMountainPage();
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, []);

    return (
        <main className={styles.container}>
            <MountainCanvas />

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