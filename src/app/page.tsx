/* ./page.tsx */
"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css"
import background from "../components/background.module.css";
import { useRouter } from "next/navigation";

type MountainPost = {
  id: number;
  title: string;
  comment: string;
  image: string | null;
  aiType: string;
  aiComment: string;
  createdAt: string;
};

export default function Home() {
  const router = useRouter();
  const [mountains, setMountains] = useState<MountainPost[]>([]);

  const gotoCreateMountainPage = () => {
    router.push("/create_mountain");
  };

  useEffect(() => {
    const savedPosts = JSON.parse(
      localStorage.getItem("mountainPosts") || "[]"
    ) as MountainPost[];

    setMountains(savedPosts);
  }, []);
  

  return (
    <main className={background.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div>
            <p className={styles.label}>KOEKATA MOUNTAIN</p>
            <h1 className={styles.title}>コエカタマウンテン</h1>
            <p className={styles.subtitle}>
              たった5秒で山ができる
            </p>
          </div>

          <button
            className={styles.createMountainButton}
            onClick={gotoCreateMountainPage}
          >
            + 山を作る
          </button>
        </header>

        {mountains.length === 0 ? (
          <section className={styles.emptyArea}>
            <div className={styles.emptyIcon}>⛰️</div>
            <h2 className={styles.emptyTitle}>まだ山がありません</h2>
            <p className={styles.emptyText}>
              最初の声の山を作ってみよう
            </p>
          </section>
        ) : (
          <section className={styles.grid}>
            {mountains.map((mountain) => (
              <article key={mountain.id}
              className={styles.card}
              onClick={() => router.push(`/mountain/${mountain.id}`)}>
                <div className={styles.imageArea}>
                  {mountain.image ? (
                    <img
                      src={mountain.image}
                      alt={mountain.title}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <span className={styles.mountainIcon}>⛰️</span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.aiType}>🤖 {mountain.aiType}</p>
                  <h2 className={styles.cardTitle}>{mountain.title}</h2>
                  <p className={styles.comment}>{mountain.comment}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}