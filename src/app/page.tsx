/* ./page.tsx */
"use client";

import styles from "./page.module.css"
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
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className={styles.title}>
            コエカタマウンテン
          </h1>
          <button className={styles.createMountainButton} onClick={gotoCreateMountainPage}>
            + 山を作る
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mountains.map((mountain) => (
            <div
              key={mountain.id}
              className="overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-video bg-gray-200" />

              <div className="p-4">
                <h2 className="mb-2 text-xl font-bold">
                  {mountain.title}
                </h2>

                <p className="text-sm text-gray-600">
                  🤖 {mountain.comment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}