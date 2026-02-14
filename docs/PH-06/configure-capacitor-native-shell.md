# [PH-06] Configure Capacitor iOS Shell and App Identity

## Context

PH-06 requires initializing the native iOS project through Capacitor, configuring app icon and splash screen assets, and verifying the native shell renders the web app correctly with proper safe area insets on target devices. The `ios/` directory does not yet exist — `npx cap sync` must scaffold the Xcode project and copy web assets from `out/`. The app icon (1024×1024 source) and splash screen are required for native distribution polish.

**Design Doc Reference:** Section 8 — Capacitor Configuration
**Phase:** `PH-06` — Mobile Polish & Native Build
**Blocks:** `harden-ui-native-fidelity` (iOS project must exist for Simulator testing)
**Blocked By:** PH-05 (all scenes implemented), `pnpm build` must succeed producing `out/`

---

## Scope

### In Scope

- Run `npx cap sync` to initialize `ios/` native project and sync web assets from `out/`
- Configure app icon using a 1024×1024 source image in the Xcode asset catalog (`ios/App/App/Assets.xcassets/AppIcon.appiconset/`)
- Configure splash screen (launch storyboard) for a clean cold-launch appearance with no white flash
- Verify `capacitor.config.ts` matches DESIGN_DOC.md Section 8 exactly: `webDir: "out"`, `appId: "dev.dineshd.ottieverse"`, `appName: "OttieVerse"`, `ios.contentInset: "always"`
- Verify the `ios/App/App/public/` directory receives all web assets from `out/` after sync
- Open the project in Xcode via `npx cap open ios` and confirm it builds without errors

### Out of Scope

- Android native project (iOS only per DESIGN_DOC.md Section 14)
- Scene component modifications (covered in `harden-ui-native-fidelity`)
- Otter asset optimization (covered in `optimize-otter-assets`)
- Modifying `capacitor.config.ts` beyond verification (current config matches spec)
- CI/CD Xcode build automation (PH-07 territory)

---

## Technical Approach

### Architecture

Capacitor 8 uses Swift Package Manager (SPM) by default for iOS. The `npx cap sync` command performs two operations: (1) copies the static export from `out/` into the iOS project's web asset directory, and (2) installs/updates Capacitor native plugins (including `@capacitor/haptics`). The Xcode project at `ios/App/App.xcodeproj` is the build target.

The app icon requires a single 1024×1024 PNG source. Xcode generates all required icon sizes from this source via the asset catalog. The splash screen is controlled by `LaunchScreen.storyboard` inside the iOS project.

### Key Files

| File                                              | Action                      | Purpose                                                                                |
| ------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `capacitor.config.ts`                             | Verify                      | Confirm `webDir`, `appId`, `appName`, `ios.contentInset` match DESIGN_DOC.md Section 8 |
| `ios/`                                            | Create (via `npx cap sync`) | Initialize Xcode project with Capacitor 8 + SPM                                        |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | Modify                      | Install 1024×1024 app icon source                                                      |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard`  | Modify                      | Configure splash screen appearance                                                     |
| `ios/App/App/public/`                             | Verify                      | Confirm web assets copied from `out/`                                                  |

### Dependencies

| Package           | Version  | Usage                                   |
| ----------------- | -------- | --------------------------------------- |
| `@capacitor/cli`  | `^8.0.0` | CLI: `npx cap sync`, `npx cap open ios` |
| `@capacitor/core` | `^8.0.0` | Runtime: `Capacitor.isNativePlatform()` |
| `@capacitor/ios`  | `^8.0.0` | iOS platform integration                |

### Implementation Details

**Step 1 — Build and Sync:**

```bash
pnpm build              # Produce static export in out/
npx cap sync            # Initialize ios/ and copy web assets
```

**Step 2 — Verify Capacitor Config:**
The current `capacitor.config.ts` already matches DESIGN_DOC.md Section 8:

```typescript
const config: CapacitorConfig = {
  appId: "dev.dineshd.ottieverse",
  appName: "OttieVerse",
  webDir: "out",
  server: { androidScheme: "https" },
  ios: { contentInset: "always" },
};
```

**Step 3 — App Icon:**
Place a 1024×1024 PNG (no alpha channel, no rounded corners — iOS applies mask automatically) into the Xcode asset catalog. The asset catalog JSON (`Contents.json`) must reference the single source image with `"size": "1024x1024"` and `"scale": "1x"`.

[BLOCKER: App icon source image (1024×1024 PNG) must be provided by Dinesh. No icon asset currently exists in the repository.]

**Step 4 — Splash Screen:**
Modify `LaunchScreen.storyboard` to set a background color matching `--welcome-start` (`#1a0a1e`) to prevent white flash on cold launch. The storyboard should display a centered, minimal branded element (app name or otter silhouette) that visually bridges to the Welcome scene.

[BLOCKER: Splash screen design decision required — solid color with text, or branded image. Dinesh to confirm preferred approach.]

**Step 5 — Open in Xcode:**

```bash
npx cap open ios        # Opens ios/App/App.xcodeproj in Xcode
```

Verify the project builds, the signing team is configured, and the app launches in Simulator.

---

## Stories

### Story 1: Initialize iOS native project via Capacitor sync

**As a** developer,
**I want** `npx cap sync` to scaffold the iOS project and copy web assets,
**So that** the app can be built and tested in Xcode.

**Acceptance Criteria:**

```gherkin
Given the out/ directory contains a clean static export from pnpm build
When I run npx cap sync
Then the ios/ directory is created with a valid Xcode project at ios/App/App.xcodeproj
And the ios/App/App/public/ directory contains all files from out/ including index.html, _next/, and otters/
And the command completes with exit code 0
And @capacitor/haptics native plugin is installed via SPM
```

### Story 2: Configure app icon for all iOS display contexts

**As a** user,
**I want** the app icon to display correctly on my home screen, Settings, and Spotlight,
**So that** the app looks professional and native.

**Acceptance Criteria:**

```gherkin
Given a 1024x1024 PNG source image with no alpha channel is provided
When the image is placed in ios/App/App/Assets.xcassets/AppIcon.appiconset/
And the Contents.json references it as the single source
Then the app icon renders correctly on the iOS home screen at 60x60@3x
And the app icon renders correctly in Settings at 29x29@3x
And the app icon renders correctly in Spotlight at 40x40@3x
And no visible scaling artifacts or transparency issues appear
```

### Story 3: Configure splash screen for clean cold launch

**As a** user,
**I want** a branded splash screen on cold launch,
**So that** the app feels native from the moment it opens with no white flash.

**Acceptance Criteria:**

```gherkin
Given the app is not running in memory (cold start)
When I tap the app icon to launch
Then a splash screen with background color #1a0a1e displays immediately
And no white or default-colored flash appears between splash and content
And the splash screen transitions to the Welcome scene within the app's loading time
And the visual transition from splash to Welcome feels continuous
```

### Story 4: Verify web assets are correctly synced to native project

**As a** developer,
**I want** to confirm all web assets are present in the iOS project after sync,
**So that** the app renders all scenes and otter images correctly on device.

**Acceptance Criteria:**

```gherkin
Given npx cap sync has completed successfully
When I inspect ios/App/App/public/
Then index.html exists at the root
And the _next/ directory contains all JavaScript bundles
And the otters/ directory contains all 12 otter PNG files
And file sizes in ios/App/App/public/otters/ match those in out/otters/
```

### Story 5: Verify Xcode project builds and launches in Simulator

**As a** developer,
**I want** the Xcode project to build and launch without errors,
**So that** I can test the app on iOS Simulator and physical devices.

**Acceptance Criteria:**

```gherkin
Given the iOS project has been initialized via npx cap sync
When I open the project with npx cap open ios
And I select an iPhone 15 Pro or iPhone 16 Pro Simulator target
And I press Build and Run (Cmd+R)
Then the project compiles without build errors
And the app launches in the Simulator
And the Welcome scene renders with the correct gradient and otter animation
```

---

## Exit Criteria

- [ ] `npx cap sync` completes with exit code 0
- [ ] `ios/` directory exists with valid Xcode project structure (`ios/App/App.xcodeproj`)
- [ ] `ios/App/App/public/` contains all web assets matching `out/` directory
- [ ] `@capacitor/haptics` native plugin is installed via SPM
- [ ] App icon source (1024×1024 PNG) installed in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- [ ] App icon renders correctly at all iOS sizes (Home Screen, Settings, Spotlight)
- [ ] Splash screen background color is `#1a0a1e` — no white flash on cold launch
- [ ] `capacitor.config.ts` matches DESIGN_DOC.md Section 8 exactly
- [ ] Xcode project builds without errors targeting iPhone 15 Pro Simulator
- [ ] App launches in Simulator and renders the Welcome scene correctly
