# [PH-XX] <Imperative Verb> <Component/Feature>

## Context

<!-- 2-3 sentences. Why this Epic exists. Link to DESIGN_DOC.md section. -->

{context}

**Design Doc Reference:** Section {N} — {Section Title}
**Phase:** `PH-XX` — {Phase Title}
**Blocks:** {List of Epics in this phase that depend on this one, or "None"}
**Blocked By:** {List of Epics or phases that must complete first, or "None"}

---

## Scope

### In Scope

<!-- Bulleted list of concrete deliverables: files, exports, behaviors -->

- {deliverable_1}
- {deliverable_2}

### Out of Scope

<!-- Bulleted list of explicitly excluded work -->

- {exclusion_1}
- {exclusion_2}

---

## Technical Approach

### Architecture

<!-- Patterns, state management strategy, component hierarchy -->

{architecture_description}

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `{path}` | Create / Modify | {purpose} |

### Dependencies

| Package | Version | Import |
|---------|---------|--------|
| `{package}` | `{version}` | `{import_statement}` |

### Implementation Details

<!-- Specific function signatures, type definitions, spring values, color tokens -->

{implementation_details}

---

## Stories

### Story 1: {Title}

**As a** {persona},
**I want** {capability},
**So that** {benefit}.

**Acceptance Criteria:**

```gherkin
Given {precondition}
When {action}
Then {expected_result}
```

### Story 2: {Title}

**As a** {persona},
**I want** {capability},
**So that** {benefit}.

**Acceptance Criteria:**

```gherkin
Given {precondition}
When {action}
Then {expected_result}
```

<!-- Add 1-6 more stories as needed (3-8 total per Epic) -->

---

## Exit Criteria

<!-- Testable checklist derived from the phase Definition of Done, scoped to this Epic -->

- [ ] {criterion_1}
- [ ] {criterion_2}
- [ ] {criterion_3}
