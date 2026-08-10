"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

export default function CrispChat() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!id) return;

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = id;

    window.$crisp.push(["config", "hide:on-mobile", true]);

    const existing = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
    let script: HTMLScriptElement | null = null;

    if (!existing) {
      script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      document.head.appendChild(script);
    }

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
      script?.remove();
      style.remove();
    };
  }, []);

  return null;
}

export function openCrispChat() {
  if (typeof window === "undefined") return;

  if (window.$crisp && process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) {
    window.$crisp.push(["do", "chat:show"]);
    window.$crisp.push(["do", "chat:open"]);
    return;
  }

  window.location.href =
    "mailto:support@naxcal.us?subject=Naxcal%20Live%20Chat%20Support%20Request";
}
