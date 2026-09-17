// ./connect/page.tsx
"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import background from "../../components/background.module.css";

export default function ConnectPage() {
    const router = useRouter();

    return (
        <main className={background.container}>
            <div className={styles.wrapper}>

                {/* =========================
                    トップへ戻る
                ========================= */}

                <button
                    className={styles.backButton}
                    onClick={() => router.push("/")}
                >
                    ← トップへ戻る
                </button>

                {/* =========================
                    ヘッダー
                ========================= */}

                <header className={styles.header}>
                    <p className={styles.label}>
                        CONNECT MOUNTAIN
                    </p>

                    <h1 className={styles.title}>
                        山を繋げる
                    </h1>

                    <p className={styles.subtitle}>
                        みんなの山を繋げて、ひとつの声に。
                    </p>
                </header>

                {/* =========================
                    山を繋げるボタン
                ========================= */}

                <section className={styles.startArea}>
                    <button className={styles.connectButton}>
                        🏔️ 山を繋げる
                    </button>

                    <p className={styles.startText}>
                        タグが同じ山を繋げてみよう！
                    </p>
                </section>

                {/* =========================
                    連結された山
                ========================= */}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        🌋 連結された山
                    </h2>

                    <div className={styles.mountainArea}>
                        <div className={styles.placeholderIcon}>
                            ⛰️
                        </div>

                        <p className={styles.placeholderText}>
                            ここに連結された山が表示されます
                        </p>
                    </div>
                </section>

                {/* =========================
                    音声認識結果
                ========================= */}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        📝 音声認識結果
                    </h2>

                    <div className={styles.textArea}>
                        <p className={styles.placeholderText}>
                            ここに連結された山の音声認識結果が表示されます
                        </p>
                    </div>
                </section>

                {/* =========================
                    音声再生
                ========================= */}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        🎧 連結された音声
                    </h2>

                    <div className={styles.audioArea}>
                        <button className={styles.playButton}>
                            ▶ 再生する
                        </button>
                    </div>
                </section>

            </div>
        </main>
    );
}
