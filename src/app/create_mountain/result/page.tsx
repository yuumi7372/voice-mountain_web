/* ./create_mountain/result/page.tsx */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"
import MountainCanvas from "./MountainCanvas";

export default function ResultPage() {
    const router = useRouter();

    function goToPostPage() {
        const canvas = document.querySelector("canvas");

        console.log("canvas:", canvas);
        console.log("canvas width:", canvas?.width);
        console.log("canvas height:", canvas?.height);

        if (canvas) {
            try {
                const image = canvas.toDataURL("image/png");

                console.log("thumbnail size:", image.length);
                console.log("thumbnail:", image.slice(0, 50));

                localStorage.setItem("thumbnail", image);
            } catch (error) {
                console.error("サムネ保存失敗:", error);
            }
        }

        router.push("/post");
    }

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
            <MountainCanvas/>

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