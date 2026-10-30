"use client";

import Image from "next/image";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function LineFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!widgetRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function closePanel() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="line-floating-widget" ref={widgetRef}>
      {isOpen && (
        <section
          id="line-contact-panel"
          className="line-floating-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="line-panel-title"
          aria-describedby="line-panel-description"
        >
          <div className="line-panel-header">
            <div>
              <p className="line-panel-kicker">岠鋐不動產事業</p>
              <h2 id="line-panel-title">加入 LINE 好友</h2>
            </div>
            <button
              ref={closeButtonRef}
              className="line-panel-close"
              type="button"
              aria-label="關閉 LINE 加入好友視窗"
              onClick={closePanel}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p id="line-panel-description" className="line-panel-description">
            使用 LINE 掃描下方 QR Code，立即與岠鋐團隊聯繫。
          </p>
          <div className="line-qr-frame">
            <Image
              className="line-qr-image"
              src="/images/line-qr-code.jpg"
              width={540}
              height={540}
              sizes="(max-width: 700px) 190px, 220px"
              alt="岠鋐不動產 LINE 加入好友 QR Code"
            />
          </div>
          <a
            className="line-direct-link"
            href="https://lin.ee/W2Blh0Y"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="開啟 LINE 加入岠鋐不動產好友"
          >
            <MessageCircle size={18} aria-hidden="true" />
            直接開啟 LINE
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          <p className="line-panel-note">歡迎加入好友，洽詢房產買賣與相關服務。</p>
        </section>
      )}
      <button
        ref={triggerRef}
        className="line-floating-trigger"
        type="button"
        aria-label={isOpen ? "關閉 LINE 加入好友視窗" : "開啟 LINE 加入好友視窗"}
        aria-controls="line-contact-panel"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <MessageCircle size={22} aria-hidden="true" />
        <span>＋LINE</span>
      </button>
    </div>
  );
}
