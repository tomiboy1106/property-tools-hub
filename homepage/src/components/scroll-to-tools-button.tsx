"use client";

import { ArrowDown } from "lucide-react";
import { ArrowUp } from "lucide-react";

type ScrollToToolsButtonProps = {
  position?: "hero" | "closing";
};

export function ScrollToToolsButton({
  position = "hero",
}: ScrollToToolsButtonProps) {
  function scrollToTools() {
    const toolsTitle = document.getElementById("tools-title");

    if (!toolsTitle) {
      return;
    }

    const header = document.querySelector<HTMLElement>(".site-header");
    const headerHeight = header?.offsetHeight ?? 76;
    const targetTop =
      toolsTitle.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      28;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });

    window.history.replaceState(null, "", "#tools");
  }

  return (
    <button
      className={position === "closing" ? "secondary-button" : "primary-button"}
      type="button"
      onClick={scrollToTools}
    >
      {position === "closing" ? "返回選擇試算工具" : "開始選擇試算工具"}
      {position === "closing" ? (
        <ArrowUp size={18} aria-hidden="true" />
      ) : (
        <ArrowDown size={18} aria-hidden="true" />
      )}
    </button>
  );
}
