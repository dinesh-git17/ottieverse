# OttieVerse — Design Document
> **OttieVerse** | Target: February 14, 2026 | Platform: iOS (Capacitor)

---

## 1. Overview

A disguised Valentine's Day experience wrapped in playful mini-games. Carolina progresses through interactive challenges — a quiz, word search, and poetry canvas — before arriving at the real purpose: a personal letter and a Valentine's ask. The otter mascot ("Ottie") guides her through each scene.

The app ships as a native iOS build via Capacitor, installed directly on her phone.

---

## 2. Tech Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js | 16.1 (stable) | App Router, Turbopack dev, RSC support |
| Runtime | React | 19.x | Concurrent features, `use` hook |
| Language | TypeScript | 5.7+ | Strict mode, no `any` |
| Styling | Tailwind CSS | 4.0 | CSS-first config, `@import "tailwindcss"`, no config file |
| Animation | Motion (Framer Motion) | 12.34+ | `motion/react` imports, spring physics, AnimatePresence, gestures |
| Native Wrapper | Capacitor | 8.0 | SPM default, edge-to-edge Android, SystemBars API |
| Haptics | @capacitor/haptics | 8.0 | Native tactile feedback on iOS |
| Linter/Formatter | Biome | 2.3+ | Tailwind v4 directive support (`tailwindDirectives: true`), single toolchain |
| Package Manager | pnpm | 9.x | Strict dependencies, fast installs |
| Node | Node.js | 22 LTS | Required by Next.js 16 |

---

## 3. Project Structure

```
ottieverse/
├── public/
│   └── otters/                     # all 12 otter assets
│       ├── otter-wave-1.png
│       ├── otter-wave-2.png
│       ├── otter-wave-3.png
│       ├── otter-celebrate.png
│       ├── otter-thinking.png
│       ├── otter-confused.png
│       ├── otter-peeking.png
│       ├── otter-excited.png
│       ├── otter-reading.png
│       ├── otter-heart.png
│       ├── otter-crying.png
│       └── otter-party.png
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout, font loading, metadata
│   │   ├── page.tsx                # entry point, mounts <Experience />
│   │   └── globals.css             # tailwind imports, custom properties
│   ├── components/
│   │   ├── experience.tsx          # scene state machine, orchestrator
│   │   ├── scenes/
│   │   │   ├── welcome.tsx         # scene 0: otter wave + tap to start
│   │   │   ├── quiz.tsx            # scene 1: 5-question trivia
│   │   │   ├── word-search.tsx     # scene 2: drag-to-select grid
│   │   │   ├── poetry-canvas.tsx   # scene 3: freeform text input
│   │   │   ├── letter.tsx          # scene 4: the personal letter
│   │   │   └── the-ask.tsx         # scene 5: valentine proposal + CTA
│   │   ├── ui/
│   │   │   ├── otter-sprite.tsx    # animated otter image cycling
│   │   │   ├── scene-transition.tsx # shared AnimatePresence wrapper
│   │   │   ├── confetti.tsx        # canvas-based confetti explosion
│   │   │   └── floating-hearts.tsx # ambient particle layer
│   │   └── word-search/
│   │       ├── grid.tsx            # letter grid renderer
│   │       ├── use-drag-select.ts  # pointer event drag handler
│   │       └── generator.ts        # grid generation + word placement
│   ├── lib/
│   │   ├── haptics.ts              # capacitor haptics abstraction
│   │   ├── constants.ts            # quiz data, word list, scene config
│   │   └── sms.ts                  # deep link to messages app
│   └── types/
│       └── index.ts                # shared type definitions
├── capacitor.config.ts
├── biome.json
├── next.config.ts
├── tailwind.config.ts              # minimal — only if @theme overrides needed
├── tsconfig.json
└── package.json
```

---

## 4. Scene Architecture

### State Machine

The app is a linear state machine. No routing — all scenes render within a single page, orchestrated by a `currentScene` state variable.

```
WELCOME → QUIZ → WORD_SEARCH → POETRY_CANVAS → LETTER → THE_ASK
  (0)      (1)       (2)            (3)           (4)      (5)
```

Each scene receives an `onComplete` callback. Transitions use `AnimatePresence` with `mode="wait"` for clean exit/enter animations. No back navigation — forward only.

```typescript
// src/types/index.ts
type Scene = 'welcome' | 'quiz' | 'word-search' | 'poetry-canvas' | 'letter' | 'the-ask';

const SCENE_ORDER: Scene[] = [
  'welcome',
  'quiz',
  'word-search',
  'poetry-canvas',
  'letter',
  'the-ask',
];
```

### Scene Transitions

| From | To | Trigger | Transition |
|---|---|---|---|
| Welcome | Quiz | Tap anywhere | Fade out → slide up |
| Quiz | Word Search | All 5 correct | Otter celebrate → fade |
| Word Search | Poetry Canvas | All words found + hidden message reveal | Scale reveal → fade |
| Poetry Canvas | Letter | Submit poem | Slow dissolve, tone shift |
| Letter | The Ask | Scroll to end / tap continue | Gentle fade, warm glow |
| The Ask | End | Tap "Yes" | Confetti + haptic burst + open SMS |

---

## 5. Scene Specifications

### Scene 0 — Welcome

**Visual:** Full-screen soft gradient background (cool teal → soft purple). Otter centered, cycling through 3 wave frames at 4fps. Title fades in below: "Hi Carolina 🦦". Subtitle after 1.5s delay: "Tap anywhere to begin".

**Otter Assets:** `otter-wave-1.png`, `otter-wave-2.png`, `otter-wave-3.png`

**Interaction:** Tap anywhere triggers haptic (`ImpactStyle.Light`) and advances.

**Animation Spec:**
- Otter: `spring({ stiffness: 200, damping: 20 })` scale-in from 0.8 → 1.0
- Title: `fadeIn` with 0.3s delay
- Subtitle: `fadeIn` with 1.5s delay, gentle pulse animation

---

### Scene 1 — Quiz

**Visual:** Card-based question display. Otter in corner reacting to answers. Progress dots at top (5 dots, filling as she answers).

**Otter Assets:** `otter-celebrate.png` (correct), `otter-confused.png` (wrong), `otter-thinking.png` (idle)

**Questions:**

| # | Question | Correct | Wrong 1 | Wrong 2 | Wrong 3 |
|---|---|---|---|---|---|
| 1 | When is Dinesh's birthday? | April 17 | February 14 (too convenient) | December 25 (he wishes) | He doesn't age, he just updates |
| 2 | When did we first start texting? | January 25/26 | March 1st | February 14 (again, too convenient) | Sometime in 2019, you just don't remember |
| 3 | What's Dinesh's go-to Starbucks order? | Matcha | Black coffee, no personality | Pumpkin Spice Latte (basic era) | He just orders water and judges everyone |
| 4 | What coding language does Dinesh use the most? | Python | HTML (watch him lose his mind) | Microsoft Word | He just talks to AI and calls it coding |
| 5 | What's the first thing we cooked together? | Pasta | Reservations | Cereal (it counts) | We don't cook, we DoorDash |

**Interaction:**
- Options rendered as 4 tappable cards, shuffled each render
- Correct: haptic (`NotificationStyle.Success`), otter swaps to celebrate, card glows green, auto-advance after 1.2s
- Wrong: haptic (`NotificationStyle.Error`), otter swaps to confused, card shakes + turns red, message appears ("Babe... really?"), she can retry immediately
- Q2 accepts both "January 25" and "January 26" as correct (timezone edge case)

**Animation Spec:**
- Question card: slide in from right, spring physics
- Options: stagger in (50ms each)
- Correct answer: scale pulse 1.0 → 1.05 → 1.0 with green glow
- Wrong answer: `x: [0, -10, 10, -10, 10, 0]` shake over 400ms

---

### Scene 2 — Word Search

**Visual:** 10×10 letter grid, centered. Word list on the side/below (responsive). Otter peeking from bottom-right corner.

**Otter Assets:** `otter-peeking.png` (idle), `otter-excited.png` (word found)

**Words:**

| Word | Length | Direction |
|---|---|---|
| DINN | 4 | Horizontal |
| OTTIE | 5 | Vertical |
| FOREVER | 7 | Horizontal |
| TORONTO | 7 | Diagonal |
| CRIMINAL | 8 | Horizontal |
| LOVE | 4 | Vertical |
| BEBE | 4 | Diagonal |

**Hidden Message:** After all 7 words are found, remaining letters highlight to reveal: **"BE MY VALENTINE"**

**Grid Generation:**
- 10×10 grid (100 cells)
- 7 words placed first (39 letters used)
- Remaining 61 cells: 14 spell "BE MY VALENTINE", 47 are random filler
- Filler letters weighted toward common consonants to avoid accidental word formation

**Drag Mechanic:**
- Touch/pointer start on a cell begins selection
- Drag direction locked after 2nd cell (horizontal, vertical, or diagonal)
- Cells highlight with a colored line as she drags
- Release validates against word list
- Valid: word stays highlighted, haptic (`ImpactStyle.Medium`), otter jumps, word crossed off list
- Invalid: highlight fades, no penalty
- Each found word gets a unique color from a warm palette

**Hidden Message Reveal:**
- After all 7 words found, 1s pause
- Remaining letters pulse and glow sequentially
- Letters rearrange/highlight to spell "BE MY VALENTINE"
- Haptic pattern: 3 quick pulses
- Auto-advance after 3s hold

---

### Scene 3 — Poetry Canvas

**Visual:** Full-screen with a warm, soft gradient background (amber → rose). Minimal UI. A prompt at the top in elegant serif typography. Below, a large text area styled to look like paper/canvas, not a form field. Otter sitting with book in bottom corner.

**Otter Assets:** `otter-reading.png`

**Prompt:** "Write something beautiful. Anything. A thought, a feeling, a few words."

**Text Input:**
- Rendered in a handwriting-style web font (e.g., Caveat from Google Fonts)
- Auto-growing textarea with no visible border
- Minimum 1 character to enable submit
- Max 500 characters (soft limit, no hard block)

**On Submit:**
- Text fades out gently
- Response fades in: "Whatever you just wrote — I felt it. You have that effect. 💛"
- 2s hold, then "Continue" button appears
- Haptic: `ImpactStyle.Light`

**No AI dependency.** Static response. This moment cannot fail.

---

### Scene 4 — The Letter

**Visual:** Full tonal shift. Background transitions to deep, warm tones (burgundy → midnight). All UI chrome disappears. Just text on screen, centered, beautiful typography.

**Otter Assets:** None. This is just Dinesh's words.

**Content:** [PENDING — Dinesh writing this]

**Typography:**
- Serif font (e.g., Playfair Display) for the letter body
- Line height: 1.8
- Max width: 600px, centered
- Paragraphs fade in sequentially with 0.5s stagger

**Interaction:**
- Scroll or tap to reveal paragraphs progressively
- "Continue" appears after all text is visible
- Haptic: none (keep the moment quiet)

---

### Scene 5 — The Ask

**Visual:** Background brightens to warm rose-gold. Otter holding heart, centered above the question. Large typography: "Will you be my Valentine?"

**Otter Assets:** `otter-heart.png` (initial), `otter-crying.png` (no press), `otter-party.png` (yes)

**Buttons:**
- "Yes" — large, prominent, warm gradient, glowing
- "No" — smaller, subtle, gray

**"No" Button Degradation Sequence:**

| Press | Message | Button Effect | Otter |
|---|---|---|---|
| 1 | "Are you sure? 🥺" | Shrinks 20% | Stays with heart |
| 2 | "The otter is crying" | Shrinks 40% total | Swaps to crying |
| 3 | "Dinesh.exe has stopped working" | Shrinks 60%, starts shaking | Crying harder |
| 4 | "Fine I'll ask the otter instead" | Shrinks 80%, drifting randomly | Still crying |
| 5 | Button starts running from her finger (pointer tracking) | Almost invisible | Crying |
| 6+ | Button disappears entirely | Gone | Crying |

Meanwhile "Yes" grows 5% larger and glows brighter with each "No" press.

**Haptics per "No" press:** `ImpactStyle.Heavy` + screen shake animation

**On "Yes":**
- Confetti explosion (canvas-based, 3s duration, 200+ particles)
- Otter swaps to party mode
- Haptic: `NotificationStyle.Success` + `vibrate()`
- 2s celebration, then CTA appears
- CTA: "Send him the good news 💌" button
- Opens SMS app with pre-filled message to Dinesh's number

**SMS Deep Link:**
```typescript
// iOS SMS deep link
const message = encodeURIComponent("[PENDING — Dinesh to provide]");
const phone = "[DINESH_PHONE]";
window.open(`sms:${phone}&body=${message}`, '_system');
```

---

## 6. Visual Design System

### Color Palette (Scene Progression)

```css
/* Scene 0-1: Cool / Playful */
--welcome-start: #0d9488;     /* teal-600 */
--welcome-end: #7c3aed;       /* violet-600 */

/* Scene 2: Warm / Engaged */
--search-start: #7c3aed;      /* violet-600 */
--search-end: #e11d48;         /* rose-600 */

/* Scene 3: Soft / Creative */
--poetry-start: #f59e0b;      /* amber-500 */
--poetry-end: #f43f5e;         /* rose-500 */

/* Scene 4: Deep / Emotional */
--letter-start: #881337;       /* rose-900 */
--letter-end: #1e1b4b;         /* indigo-950 */

/* Scene 5: Bright / Celebration */
--ask-start: #fda4af;          /* rose-300 */
--ask-end: #fbbf24;            /* amber-400 */
```

### Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Headings | Inter | 700 | 28-36px |
| Body | Inter | 400 | 16-18px |
| Quiz options | Inter | 500 | 16px |
| Poetry input | Caveat | 400 | 22px |
| Letter body | Playfair Display | 400 | 18-20px |
| "Will you be my Valentine?" | Playfair Display | 700 | 32px |

### Ambient Layer

Floating hearts particle system that gradually appears from Scene 3 onward:
- Scene 0-2: no particles
- Scene 3: 3-5 small hearts, very subtle, slow float
- Scene 4: 8-10 hearts, slightly more visible
- Scene 5: 20+ hearts, full effect, mixed sizes

Implemented as a canvas overlay with `pointer-events: none`.

---

## 7. Haptics Strategy

| Event | Style | Rationale |
|---|---|---|
| Tap to start | `ImpactStyle.Light` | Acknowledgment |
| Correct answer | `NotificationStyle.Success` | Reward |
| Wrong answer | `NotificationStyle.Error` | Playful feedback |
| Word found | `ImpactStyle.Medium` | Satisfying discovery |
| Hidden message reveal | 3× `ImpactStyle.Light` (100ms apart) | Building excitement |
| Poem submitted | `ImpactStyle.Light` | Gentle acknowledgment |
| "No" button press | `ImpactStyle.Heavy` | Dramatic comedy |
| "Yes" press | `NotificationStyle.Success` + `vibrate()` | Full celebration |

### Abstraction Layer

```typescript
// src/lib/haptics.ts
import { Haptics, ImpactStyle, NotificationStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const haptic = {
  light: () => isNative && Haptics.impact({ style: ImpactStyle.Light }),
  medium: () => isNative && Haptics.impact({ style: ImpactStyle.Medium }),
  heavy: () => isNative && Haptics.impact({ style: ImpactStyle.Heavy }),
  success: () => isNative && Haptics.notification({ type: NotificationStyle.Success }),
  error: () => isNative && Haptics.notification({ type: NotificationStyle.Error }),
  vibrate: () => isNative && Haptics.vibrate(),
  pattern: async (count: number, delay: number) => {
    if (!isNative) return;
    for (let i = 0; i < count; i++) {
      await Haptics.impact({ style: ImpactStyle.Light });
      await new Promise(r => setTimeout(r, delay));
    }
  },
};
```

---

## 8. Capacitor Configuration

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.dineshd.ottieverse',
  appName: 'OttieVerse',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
```

**Build Pipeline:**
```bash
pnpm build            # Next.js static export
npx cap sync          # Sync web assets to native
npx cap open ios      # Open in Xcode for device build
```

**Required:** `output: 'export'` in `next.config.ts` for static HTML generation (Capacitor serves static files).

---

## 9. Biome Configuration

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "error",
        "useConst": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      },
      "correctness": {
        "useExhaustiveDependencies": "warn",
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

---

## 10. Dependencies

### Production
```json
{
  "next": "^16.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "motion": "^12.34.0",
  "@capacitor/core": "^8.0.0",
  "@capacitor/haptics": "^8.0.0",
  "@capacitor/ios": "^8.0.0"
}
```

### Development
```json
{
  "@biomejs/biome": "^2.3.0",
  "@capacitor/cli": "^8.0.0",
  "typescript": "^5.7.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",
  "tailwindcss": "^4.0.0",
  "@tailwindcss/vite": "^4.0.0"
}
```

---

## 11. Asset Manifest

| File | Scene | Usage | Status |
|---|---|---|---|
| `otter-wave-1.png` | 0 | Wave frame 1 | ✅ Generated |
| `otter-wave-2.png` | 0 | Wave frame 2 | ✅ Generated |
| `otter-wave-3.png` | 0 | Wave frame 3 | ✅ Generated |
| `otter-celebrate.png` | 1 | Correct answer | ⏳ Pending |
| `otter-thinking.png` | 1 | Idle state | ⏳ Pending |
| `otter-confused.png` | 1 | Wrong answer | ⏳ Pending |
| `otter-peeking.png` | 2 | Watching grid | ⏳ Pending |
| `otter-excited.png` | 2 | Word found | ⏳ Pending |
| `otter-reading.png` | 3 | Poetry companion | ⏳ Pending |
| `otter-heart.png` | 5 | The ask | ⏳ Pending |
| `otter-crying.png` | 5 | No press | ⏳ Pending |
| `otter-party.png` | 5 | Yes celebration | ⏳ Pending |

---

## 12. Outstanding Items

| Item | Owner | Status |
|---|---|---|
| Generate otter assets 2-4 | Dinesh | ⏳ Prompts ready |
| Slice + remove backgrounds | Dinesh | ⏳ After generation |
| Write the letter (Scene 4) | Dinesh | ⏳ |
| Pre-filled SMS text | Dinesh | ⏳ |
| Dinesh's phone number for SMS link | Dinesh | ⏳ |
| Word search grid generation | Claude | 🔜 Next |
| Build the app | Claude + Dinesh | 🔜 After assets |

---

## 13. Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.0s |
| Bundle size (gzipped) | < 150kb (excl. images) |
| Animation framerate | 60fps minimum |
| Otter images (each) | < 200kb (compressed PNG) |
| Total asset payload | < 3MB |

---

## 14. Constraints

- **No backend.** Entire app is client-side static HTML. Capacitor serves from disk.
- **No network dependency.** Nothing can fail because of a timeout or API error.
- **iOS only.** Carolina uses an iPhone. Android support is unnecessary.
- **Single use.** This app is used once. No auth, no persistence, no analytics.
- **Deadline: February 14, 2026.** Non-negotiable.
