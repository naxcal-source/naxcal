"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!id) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = id;

    // Hide on mobile via Crisp API
    window.$crisp.push(["config", "hide:on-mobile", true]);

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    // Also force-hide with CSS on mobile as fallback
    const style = document.createElement("style");
    style.id = "crisp-mobile-hide";
    style.textContent = `
      @media (max-width: 1023px) {
        #crisp-chatbox,
        .crisp-client,
        [data-crisp-namespace] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      script.remove();
      style.remove();
    };
  }, []);

  return null;
}

export function openCrispChat() {
  if (typeof window !== "undefined" && window.$crisp) {
    (window.$crisp as unknown[]).push(["do", "chat:show"]);
    (window.$crisp as unknown[]).push(["do", "chat:open"]);
  }
}
