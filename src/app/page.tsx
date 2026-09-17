/* ./page.tsx */
"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import background from "../components/background.module.css";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type MountainPost = {
  id: string;
  title: string;
  comment: string;
  image: string | null;
  aiType: string;
  aiComment: string;
  createdAt: string;
  tagName: string | null;
};

type Tag = {
  id: string;
  name: string;
};

export default function Home() {
  const router = useRouter();

  const [mountains, setMountains] = useState<MountainPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const gotoCreateMountainPage = () => {
    router.push("/create_mountain");
  };

  useEffect(() => {
    async function fetchMountains() {
      try {
        // =========================
        // タグを取得
        // =========================

        const { data: tagData, error: tagError } = await supabase
          .from("tags")
          .select("id, name");

        if (tagError) {
          throw tagError;
        }

        const tags: Tag[] = tagData ?? [];

        // =========================
        // 山を取得
        // =========================

        const { data: mountainData, error: mountainError } =
          await supabase
            .from("mountain")
            .select("*")
            .order("created_at", { ascending: false });

        if (mountainError) {
          throw mountainError;
        }

        // =========================
        // 山データとタグを結びつける
        // =========================

        const posts: MountainPost[] = (mountainData ?? []).map(
          (mountain) => {
            let imageUrl: string | null = null;

            // img_pathがある場合、Storageの画像URLを取得
            if (mountain.img_path) {
              const { data: imageData } = supabase.storage
                .from("img")
                .getPublicUrl(mountain.img_path);

              imageUrl = imageData.publicUrl;
            }

            // tag_idからタグを探す
            const tag = tags.find(
              (tag) => tag.id === mountain.tag_id
            );

            return {
              id: mountain.id,
              title: mountain.name,
              comment: mountain.comment ?? "",
              image: imageUrl,
              aiType: mountain.ai_type ?? "未分析",
              aiComment:
                mountain.analysis_data?.aiReview?.comment ?? "",
              createdAt: mountain.created_at,
              tagName: tag?.name ?? null,
            };
          }
        );

        setMountains(posts);
      } catch (error) {
        console.error("山一覧の取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMountains();
  }, []);

  return (
    <main className={background.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div>
            <p className={styles.label}>KOEKATA MOUNTAIN</p>

            <h1 className={styles.title}>
              コエカタマウンテン
            </h1>

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

        {isLoading ? (
          <section className={styles.emptyArea}>
            <div className={styles.emptyIcon}>⛰️</div>

            <h2 className={styles.emptyTitle}>
              山を読み込んでいます
            </h2>
          </section>
        ) : mountains.length === 0 ? (
          <section className={styles.emptyArea}>
            <div className={styles.emptyIcon}>⛰️</div>

            <h2 className={styles.emptyTitle}>
              まだ山がありません
            </h2>

            <p className={styles.emptyText}>
              最初の声の山を作ってみよう
            </p>
          </section>
        ) : (
          <section className={styles.grid}>
            {mountains.map((mountain) => (
              <article
                key={mountain.id}
                className={styles.card}
                onClick={() =>
                  router.push(`/mountain/${mountain.id}`)
                }
              >
                <div className={styles.imageArea}>
                  {mountain.image ? (
                    <img
                      src={mountain.image}
                      alt={mountain.title}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <span className={styles.mountainIcon}>
                      ⛰️
                    </span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  {/* タグ */}
                  {mountain.tagName && (
                    <p className={styles.tag}>
                      # {mountain.tagName}
                    </p>
                  )}

                  {/* AI診断 */}
                  <p className={styles.aiType}>
                    🤖 {mountain.aiType}
                  </p>

                  {/* 山の名前 */}
                  <h2 className={styles.cardTitle}>
                    {mountain.title}
                  </h2>

                  {/* コメント */}
                  <p className={styles.comment}>
                    {mountain.comment}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}