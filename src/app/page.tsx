/* ./page.tsx */
"use client";

import styles from "./page.module.css"
import background from "../components/background.module.css";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const gotoCreateMountainPage = () => {
    router.push("/create_mountain");
  };
  const mountains = [
    {
      id: 1,
      title: "ほげぴよ山",
      comment: "なだらかな稜線ですね",
      image: "/sample1.jpg",
    },
    {
      id: 2,
      title: "おやすみ山",
      comment: "優しい峰が続いています",
      image: "/sample2.jpg",
    },
    {
      id: 3,
      title: "ねこ山",
      comment: "個性的な地形です",
      image: "/sample3.jpg",
    },
  ];

  return (
    <main className={background.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div>
            <p className={styles.label}>VOICE MOUNTAIN</p>
            <h1 className={styles.title}>コエカタマウンテン</h1>
            <p className={styles.subtitle}>
              声から生まれた山フィールドを眺めよう
            </p>
          </div>

          <button
            className={styles.createMountainButton}
            onClick={gotoCreateMountainPage}
          >
            + 山を作る
          </button>
        </header>

        <section className={styles.grid}>
          {mountains.map((mountain) => (
            <article key={mountain.id} className={styles.card}>
              <div className={styles.imageArea}>
                <span className={styles.mountainIcon}>⛰️</span>
              </div>

              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>{mountain.title}</h2>
                <p className={styles.comment}>🤖 {mountain.comment}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}