---
name: epic-writer
description: Generate implementation-ready Epics from execution phases defined in docs/PHASES.md. Use when decomposing a phase into engineering work items, creating Epics for sprint planning, or translating architectural specifications into stories with testable acceptance criteria. Triggers on phase decomposition, epic generation, planning work, and story writing.
---

# Epic Writer

Decompose execution phases into implementation-ready Epics. Each Epic is a self-contained engineering unit that a developer can implement without asking clarifying questions.

## Input

Invoke with a Phase ID argument (e.g., `PH-01`, `PH-02`).

```
/epic-writer PH-03
```

## Workflow

### Step 1: Extract Phase Definition

1. Read `docs/PHASES.md` and locate the row matching the provided `PH-ID`
2. Extract: Title, Description, Definition of Done, Primary Files
3. Identify upstream dependencies from the Dependency Graph section

### Step 2: Cross-Reference Design Doc

1. Read `DESIGN_DOC.md` sections relevant to the phase
2. Extract: scene specifications, animation values, haptic events, color palettes, typography specs, asset references, interaction patterns
3. Resolve every ambiguous detail against the Design Doc — if the Design Doc does not specify a value, flag it as a blocker in the Epic

### Step 3: Decompose Into Epics

Split the phase into 1-4 Epics based on functional boundaries:

- **One concern per Epic.** A scene component, a utility module, a state machine, and a visual effect are separate Epics
- **File affinity.** Group files that change together. A hook and the component consuming it belong in the same Epic
- **Dependency order.** If Epic B imports from Epic A, Epic A must be listed first with an explicit "blocks" annotation

### Step 4: Write Each Epic

Use the strict template from `assets/epic-template.md`. Fill every section completely:

- **Title:** `[PH-XX] <Imperative Verb> <Component/Feature>`
- **Context:** 2-3 sentences linking to the Design Doc section and explaining the engineering motivation
- **Scope — In:** Bulleted list of deliverables (files, exports, behaviors)
- **Scope — Out:** Bulleted list of explicitly excluded work
- **Technical Approach:** Specific libraries, imports, patterns, and file paths. Reference exact function signatures, type names, and spring values from the Design Doc
- **Stories:** 3-8 user stories, each with Gherkin acceptance criteria (Given/When/Then)
- **Exit Criteria:** Checklist derived from the phase Definition of Done, filtered to this Epic's scope

### Step 5: Validate Epic Quality

Before writing any Epic file, verify:

- [ ] Zero "TBD", "TODO", or placeholder text in any field
- [ ] Every file path references an actual path from the Project Structure (DESIGN_DOC Section 3) or PHASES.md Phase-to-File Mapping
- [ ] Every animation value (stiffness, damping, scale range) is sourced from DESIGN_DOC Section 5 or Section 6
- [ ] Every haptic event matches DESIGN_DOC Section 7 exactly
- [ ] Every color value references a CSS custom property from DESIGN_DOC Section 6
- [ ] Every story has at least one Given/When/Then acceptance criterion
- [ ] Exit criteria are testable (build commands, lint commands, visual assertions)

### Step 6: Write Output Files

Save each Epic as a Markdown file:

```
docs/<PH-ID>/<epic-name>.md
```

Create the phase directory if it does not exist. Use lowercase-hyphenated filenames matching the Epic's subject (e.g., `quiz-state-machine.md`, `grid-generator.md`).

## Constraints

### Zero Ambiguity Rule

Every Epic must define the _how_, not just the _what_. A story that says "render the quiz" is rejected. A story that says "render a `motion.div` card with `spring({ stiffness: 300, damping: 25 })` slide-in from `x: 300` containing 4 shuffled `<button type="button">` option elements" is accepted.

### Design Doc Authority

DESIGN_DOC.md is the single source of truth for all specifications. Do not invent values. If the Design Doc is silent on a detail, insert a `[BLOCKER: <description>]` tag and halt Epic generation for that story until the blocker is resolved.

### Scope Discipline

- Do not include work from adjacent phases
- Do not add "nice to have" stories beyond the phase Definition of Done
- Do not reference files outside the Phase-to-File Mapping unless the phase explicitly requires modifying shared modules

### Naming Conventions

- Epic titles use imperative mood: "Build", "Implement", "Configure" — not "Building" or "Configuration of"
- Story titles start with "As a [user/developer]"
- File names are lowercase-hyphenated: `word-search-grid.md`, not `WordSearchGrid.md`

## Output Format

Each Epic file follows `assets/epic-template.md` exactly. The collection of Epics for a phase constitutes the complete engineering specification for that phase. No additional planning documents are required.
