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

    // Move chat bubble above mobile bottom nav
    window.$crisp.push(["config", "position:reverse", true]);

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    // Hide Crisp button on mobile — users access chat via Support page instead
    script.onload = () => {
      const style = document.createElement("style");
      style.textContent = `
        @media (max-width: 1023px) {
          .crisp-client .cc-1brb6 {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    };

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

export function openCrispChat() {
  if (typeof window !== "undefined" && window.$crisp) {
    (window.$crisp as unknown[]).push(["do", "chat:open"]);
  }
}
