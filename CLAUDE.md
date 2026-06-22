# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Dev Commands

- `npm run dev` — Start development server (Turbopack, Next.js 16)
- `npm run build` — Production build with TypeScript type-checking
- `npm run lint` — ESLint (flat config, next/core-web-vitals + typescript)
- No test framework is configured

## Tech Stack

- **Next.js 16.2** with App Router and Turbopack — this is NOT a standard Next.js version; read `node_modules/next/dist/docs/` before using any API
- **Tailwind CSS v4** — configured via `@theme inline` blocks in `globals.css`, NOT via `tailwind.config.ts` (which doesn't exist). Custom colors are CSS variables like `--color-naxcal-teal`
- **PostCSS** via `@tailwindcss/postcss` plugin
- **TypeScript** with strict mode, path alias `@/*` → `./src/*`
- **Framer Motion** for animations (fade-in, scroll-triggered, infinite loops)
- **Recharts** for charts (AreaChart, BarChart) — expect SSR warnings about chart dimensions; these are harmless
- **Lucide React** for icons — note: branded social icons (Twitter, Instagram, LinkedIn) do NOT exist in this version; use generic alternatives (Globe, Link2, Send, MessageCircle)

## Architecture

Single-page landing site. The entire app is one route:

- `src/app/layout.tsx` — Root layout (server component), loads Geist fonts, sets metadata
- `src/app/page.tsx` — Full landing page (~700 lines, `"use client"`), contains all sections: hero with phone mockup, stats bar, how it works, asset classes, dashboard preview, performance chart, investment tiers, ROI calculator, testimonials marquee, live activity feed, CTA, footer
- `src/app/globals.css` — Tailwind v4 theme, custom utility classes (`.glass`, `.glass-hover`, `.btn-teal`, `.glow-teal`, `.tier-bronze/silver/gold`, `.marquee-left/right`, `.feed-scroll`, `.aurora-*`, `.text-glow-*`), keyframe animations, slider styling
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

## Brand Design System

All amounts in **USD ($)**, not GBP.

### Colors (defined in globals.css @theme)
- Primary: `naxcal-teal` #1a8a6e, `naxcal-teal-light` #22a882
- Accent: `naxcal-gold` #f0a500
- Background base: #020408
- Alternating sections: #020408 ↔ #060d18 ↔ #0a1628 for contrast
- CTA section: teal gradient `linear-gradient(135deg, #0d2420, #0a1a14)`
- Footer: #010306

### Design Principles
- Dark premium fintech aesthetic with HIGH CONTRAST — cards use `rgba(255,255,255,0.06)` minimum, borders `rgba(255,255,255,0.10)` minimum
- Teal used aggressively: glowing text shadows, gradient buttons with box-shadow, icon backgrounds
- Section backgrounds alternate between dark shades for visual separation
- Phone and dashboard mockups should look "lit from within" with bright screen content against dark frames
- Aurora blobs (3x), dot grid overlay, grain texture for atmospheric depth

### Logo
Use `<Image>` from `next/image` with `/Naxcal_Primary_Logo.png`. Apply `filter: drop-shadow(0 0 16px rgba(26,138,110,0.5))` for glow. Do NOT recreate the logo in CSS.

## Key Patterns

- `AnimatedCounter` — Intersection Observer-based number counter with configurable decimals, prefix, suffix
- `FadeUp` — Framer Motion scroll-triggered fade+slide wrapper used on every section
- `SectionLabel` — Mono uppercase label with teal divider lines
- `LiveDot` — Pulsing green dot for "LIVE" / "FCA Regulated" badges
- Testimonials use a two-row infinite marquee (CSS animation, opposite directions)
- Live activity feed uses CSS `feed-scroll` animation with top/bottom fade gradients
- Tier cards use CSS utility classes `.tier-bronze`, `.tier-silver`, `.tier-gold` for distinct gradient backgrounds and border colors
- ROI calculator auto-selects tier based on deposit amount and shows recharts bar projection

## Supabase

`@supabase/supabase-js` and `@supabase/ssr` are installed but not yet configured or used. No environment variables are set up.
