# [PH-06] Optimize Otter Image Assets

## Context

DESIGN_DOC.md Section 13 mandates each otter PNG at under 200kb with a total image payload under 3MB. The current 12 otter assets total approximately 14MB, with individual files ranging from 732KB (`otter-peeking.png`) to 1.3MB (`otter-wave-1.png`) — all 3-6x over the limit. The `docs/PHASES.md` External Blockers table identifies this as a known issue owned by Dinesh. Compression must achieve the target without visible quality degradation at mobile display sizes (approximately 200-300px rendered width on iPhone screens).

**Design Doc Reference:** Section 11 — Asset Manifest, Section 13 — Performance Targets
**Phase:** `PH-06` — Mobile Polish & Native Build
**Blocks:** None
**Blocked By:** PH-05 (all scenes implemented, all 12 otter assets present in `public/otters/`)

---

## Scope

### In Scope

- Compress all 12 otter PNGs in `public/otters/` to under 200kb each
- Verify total image payload (all 12 files combined) is under 3MB
- Preserve transparency (alpha channel) — otter sprites render on gradient backgrounds
- Maintain visual quality at mobile display sizes (no visible compression artifacts at 200-300px width on Retina displays)
- Re-run `pnpm build` and `npx cap sync` after optimization to propagate compressed assets to `out/` and `ios/App/App/public/otters/`
- Verify compressed assets render correctly in all 6 scenes

### Out of Scope

- Generating new otter assets or modifying otter artwork
- Converting from PNG to WebP or AVIF (Capacitor WebView PNG support is universal; format changes require testing)
- Sprite sheet consolidation (each scene references individual files)
- Adding new images beyond the 12 defined in DESIGN_DOC.md Section 11

---

## Technical Approach

### Architecture

Otter assets are static PNGs served from `public/otters/` via Next.js static export. They are referenced by path (`/otters/<filename>.png`) in components via the `OtterSprite` component and direct `<img>` or Next.js `Image` tags. Compression is a file-level operation that does not require code changes — only the binary PNG files change.

### Key Files

| File                                | Action  | Purpose             |
| ----------------------------------- | ------- | ------------------- |
| `public/otters/otter-wave-1.png`    | Replace | Compress to < 200kb |
| `public/otters/otter-wave-2.png`    | Replace | Compress to < 200kb |
| `public/otters/otter-wave-3.png`    | Replace | Compress to < 200kb |
| `public/otters/otter-celebrate.png` | Replace | Compress to < 200kb |
| `public/otters/otter-thinking.png`  | Replace | Compress to < 200kb |
| `public/otters/otter-confused.png`  | Replace | Compress to < 200kb |
| `public/otters/otter-peeking.png`   | Replace | Compress to < 200kb |
| `public/otters/otter-excited.png`   | Replace | Compress to < 200kb |
| `public/otters/otter-reading.png`   | Replace | Compress to < 200kb |
| `public/otters/otter-heart.png`     | Replace | Compress to < 200kb |
| `public/otters/otter-crying.png`    | Replace | Compress to < 200kb |
| `public/otters/otter-party.png`     | Replace | Compress to < 200kb |

### Dependencies

No additional packages required. PNG compression uses external tooling (macOS Preview, TinyPNG, `pngquant`, `optipng`, or similar). This is an asset pipeline task, not a code dependency.

### Implementation Details

**Current Asset Sizes:**

| File                  | Current Size | Target    |
| --------------------- | ------------ | --------- |
| `otter-wave-1.png`    | 1.3MB        | < 200kb   |
| `otter-wave-2.png`    | 1.3MB        | < 200kb   |
| `otter-wave-3.png`    | 1.3MB        | < 200kb   |
| `otter-celebrate.png` | 1.3MB        | < 200kb   |
| `otter-thinking.png`  | 1.2MB        | < 200kb   |
| `otter-confused.png`  | 1.2MB        | < 200kb   |
| `otter-peeking.png`   | 732KB        | < 200kb   |
| `otter-excited.png`   | 1.2MB        | < 200kb   |
| `otter-reading.png`   | 1.1MB        | < 200kb   |
| `otter-heart.png`     | 1.1MB        | < 200kb   |
| `otter-crying.png`    | 983KB        | < 200kb   |
| `otter-party.png`     | 1.1MB        | < 200kb   |
| **Total**             | **~14MB**    | **< 3MB** |

**Compression Strategy:**

1. **Resize dimensions** — Otter sprites render at approximately 200-300px width on iPhone screens (3x Retina = 600-900px actual). Source images may be significantly larger. Resize to a maximum of 900px on the longest dimension before compression.
2. **Lossy PNG compression** — Use `pngquant` (preferred) or equivalent to apply lossy quantization. Target quality range: 65-80 (pngquant scale) to achieve the 200kb threshold while preserving visual fidelity.
3. **Lossless optimization pass** — After lossy compression, run `optipng` or `oxipng` for additional byte savings via DEFLATE optimization.
4. **Alpha channel preservation** — All compression must preserve the transparency channel. Otter sprites render on scene-specific gradient backgrounds and require clean alpha edges.

**Compression Command (pngquant example):**

```bash
pngquant --quality=65-80 --force --output public/otters/otter-wave-1.png public/otters/otter-wave-1.png
```

**Post-Compression Pipeline:**

```bash
pnpm build            # Rebuild static export with compressed assets
npx cap sync          # Sync compressed assets to ios/App/App/public/otters/
```

**Quality Verification:**

After compression, open each scene in iOS Simulator at iPhone 15 Pro resolution and visually inspect otter rendering. Check for:

- Banding artifacts on smooth gradients within the otter artwork
- Jagged alpha edges against gradient backgrounds
- Color shift from quantization
- Visible dithering patterns at normal viewing distance

---

## Stories

### Story 1: Compress all otter PNGs to under 200kb each

**As a** developer,
**I want** every otter PNG in `public/otters/` to be under 200kb,
**So that** the app meets DESIGN_DOC.md Section 13 performance targets.

**Acceptance Criteria:**

```gherkin
Given all 12 otter PNG files exist in public/otters/
When each file is compressed using lossy PNG quantization with alpha preservation
Then every file is under 200kb as reported by ls -la
And the total size of all 12 files is under 3MB
And each file retains its original filename exactly
```

### Story 2: Preserve visual quality at mobile display sizes

**As a** user,
**I want** the otter images to look crisp and clean on my iPhone,
**So that** the compression is invisible to me during the experience.

**Acceptance Criteria:**

```gherkin
Given compressed otter PNGs are loaded in iOS Simulator at iPhone 15 Pro resolution
When the Welcome scene renders otter-wave-1/2/3.png cycling at 4fps
Then no visible banding, dithering, or color shift is apparent at normal viewing distance
And alpha edges render cleanly against the teal-to-violet gradient background

When the Quiz scene renders otter-celebrate/thinking/confused.png
Then otter expressions are clear and distinguishable

When the Word Search scene renders otter-peeking/excited.png
Then otter details are preserved at the smaller peeking size

When The Ask scene renders otter-heart/crying/party.png
Then emotional expressions are clearly readable
```

### Story 3: Preserve alpha transparency on gradient backgrounds

**As a** developer,
**I want** all compressed otter PNGs to retain their alpha channels,
**So that** sprites composite correctly on scene-specific gradient backgrounds.

**Acceptance Criteria:**

```gherkin
Given each compressed otter PNG retains an alpha channel
When an otter sprite renders on the Welcome gradient (--welcome-start to --welcome-end)
Then no white or colored fringe appears around the otter silhouette
And the gradient shows through transparent regions without artifacts

When an otter sprite renders on The Ask gradient (--ask-start to --ask-end)
Then alpha compositing produces clean edges with no halo effect
```

### Story 4: Propagate compressed assets to build output and native project

**As a** developer,
**I want** compressed assets to flow through the entire build pipeline,
**So that** the iOS app binary contains the optimized images.

**Acceptance Criteria:**

```gherkin
Given compressed PNGs are in public/otters/
When pnpm build completes
Then out/otters/ contains the compressed versions with matching file sizes

When npx cap sync completes after build
Then ios/App/App/public/otters/ contains the compressed versions with matching file sizes
And no stale uncompressed copies remain in the build output
```

### Story 5: Verify total image payload meets budget

**As a** developer,
**I want** the total image payload to be under 3MB,
**So that** the app installs quickly and uses minimal device storage.

**Acceptance Criteria:**

```gherkin
Given all 12 otter PNGs have been compressed
When I calculate the total size of public/otters/*.png
Then the sum is under 3,145,728 bytes (3MB)
And the app bundle size (images + code) remains reasonable for iOS distribution
```

---

## Exit Criteria

- [ ] Every otter PNG in `public/otters/` is under 200kb (`ls -la` verification)
- [ ] Total image payload for all 12 files is under 3MB
- [ ] All 12 PNGs retain alpha transparency (no opaque backgrounds)
- [ ] No visible compression artifacts at iPhone 15 Pro display resolution in iOS Simulator
- [ ] Alpha edges render cleanly against all 5 scene gradient backgrounds
- [ ] `pnpm build` succeeds and `out/otters/` contains compressed assets
- [ ] `npx cap sync` succeeds and `ios/App/App/public/otters/` contains compressed assets
- [ ] Otter sprite cycling in Welcome scene (4fps) shows no visual degradation
- [ ] Otter expression swaps in Quiz, Word Search, and The Ask scenes are clearly readable
