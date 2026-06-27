"use client";

import { useEffect, useState } from "react";

const VISIT_COUNTER_BASE = 15367;
const VISIT_COUNTER_KEY = "juhong-homepage-visit-count";

type VisitCounterResponse = {
  count?: number;
  source?: "database" | "local-fallback";
};

export function VisitCounter() {
  const [count, setCount] = useState(VISIT_COUNTER_BASE);

  useEffect(() => {
    let isActive = true;

    async function loadVisitCount() {
      try {
        const response = await fetch("/api/visits", {
          cache: "no-store",
        });
        const data = (await response.json()) as VisitCounterResponse;

        if (
          isActive &&
          data.source === "database" &&
          typeof data.count === "number" &&
          data.count >= VISIT_COUNTER_BASE
        ) {
          setCount(data.count);
          return;
        }
      } catch {
        // Keep the footer working even before the database is connected.
      }

      try {
        const storedValue = window.localStorage.getItem(VISIT_COUNTER_KEY);
        const storedCount = storedValue ? Number.parseInt(storedValue, 10) : VISIT_COUNTER_BASE;
        const safeCount = Number.isFinite(storedCount) && storedCount >= VISIT_COUNTER_BASE
          ? storedCount
          : VISIT_COUNTER_BASE;
        const nextCount = safeCount + 1;

        window.localStorage.setItem(VISIT_COUNTER_KEY, String(nextCount));

        if (isActive) {
          setCount(nextCount);
        }
      } catch {
        if (isActive) {
          setCount(VISIT_COUNTER_BASE);
        }
      }
    }

    void loadVisitCount();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <p className="visit-counter" aria-label={`瀏覽人數 ${count.toLocaleString("zh-TW")} 人`}>
      瀏覽人數 {count.toLocaleString("zh-TW")}
    </p>
  );
}
