# TDD Refactoring Plan - Complete Rebuild

**Date**: 2026-01-09
**Approach**: Strict Test-Driven Development (Article III)
**Scope**: Complete refactoring of Fediverse processor

---

## Constitutional Compliance Workflow

Following Article III: Test-First Imperative

```
1. 🔴 RED:    Write comprehensive test suite
2. ✅ APPROVE: Get user approval of tests
3. ✅ VERIFY:  Run tests, confirm they FAIL
4. 🟢 GREEN:   Implement code to pass tests
5. ♻️ REFACTOR: Clean up while keeping tests green
```

---

## Phase 1: Color Algorithm (PRIORITY 1)

### Component: `scripts/fediverse-processor/colors.go`

**Current Risk**: HIGH - Complex algorithm with no validation
**Lines of Code**: ~180
**Test Cases Required**: 25+

### 1.1: Write Test Suite First (RED)

**File**: `scripts/fediverse-processor/colors_test.go`

**Test Categories**:

#### A. Age-Based Color Mapping (10 tests)
- Young instance (< 1 year old) → Blue hues (240°)
- Old instance (> 5 years old) → Red hues (0°)
- Medium age instance → Mid-range hues
- Genesis date edge case (2016-11-23)
- Maximum age calculation
- Logarithmic normalization correctness
- Age = 0 edge case
- Negative date handling
- Future date handling (error case)
- Very old instance (10+ years)

#### B. Era Offset System (6 tests)
- Pre-2019 instance → -20° offset (veteran instances)
- Post-2024 instance → +20° offset (newcomers)
- 2019-2024 standard era → 0° offset
- Era boundary dates (exact 2019-01-01, 2024-01-01)
- Era offset composition with base hue
- Hue normalization after era offset (0-360° range)

#### C. Domain Hash Perturbation (5 tests)
- Same domain always produces same hash
- Different domains produce different hashes
- Hash perturbation range ±30°
- Hash value between 0-1
- Hash composition with age and era

#### D. Saturation Calculation (4 tests)
- Minimum users (1) → Minimum saturation (40%)
- Maximum users (3M+) → Maximum saturation (90%)
- Mid-range users → Mid saturation
- Logarithmic scaling correctness

#### E. Lightness Calculation (5 tests)
- Zero activity (MAU=0) → Minimum lightness (30%)
- Full activity (MAU=UserCount) → Maximum lightness (75%)
- 50% activity → Mid lightness
- Activity > 100% (edge case, cap at 100%)
- Zombie instance (high users, zero MAU)

#### F. Color Format Output (3 tests)
- HSL values correct
- RGB conversion correct
- Hex format correct (#rrggbb)

#### G. Integration Tests (5 tests)
- Real instance: mastodon.social (known values)
- Real instance: pawoo.net (known values)
- Real instance: pixelfed.social (known values)
- Batch processing 100 instances
- Color distribution across spectrum

**Total Test Cases**: 38 comprehensive tests

### 1.2: User Approval

**Deliverable**: Present `colors_test.go` for review
**Criteria**: User confirms test coverage is adequate

### 1.3: Verify Failure (RED)

**Expected Outcome**: All 38 tests FAIL (code doesn't exist yet)

### 1.4: Implementation (GREEN)

**Action**: Rewrite `colors.go` guided by tests
**Goal**: Make all 38 tests PASS

### 1.5: Refactor

**Actions**:
- Extract common helper functions
- Improve code readability
- Add inline documentation
- Ensure tests still pass

---

## Phase 2: Position Algorithm (PRIORITY 2)

### Component: `scripts/fediverse-processor/positions.go`

**Current Risk**: HIGH - Complex spatial algorithm
**Lines of Code**: ~180
**Test Cases Required**: 30+

### 2.1: Write Test Suite First (RED)

**File**: `scripts/fediverse-processor/positions_test.go`

**Test Categories**:

#### A. Three-Star System (8 tests)
- mastodon.social position = (0, 0, 0)
- pawoo.net position = (8000, 0, 0)
- mastodon.cloud position = (4000, 6928.2, 0)
- Triangle edge length = 8000 units
- Triangle is equilateral (all sides equal)
- All three stars on Z=0 plane
- Center of triangle calculation
- isTopMastodon() function correctness

#### B. Mastodon Orbital System (8 tests)
- Non-top Mastodon instances orbit around nearest star
- Orbital distance based on user count (larger = closer)
- Orbital angle deterministic (domain hash)
- Orbital inclination (Z-axis variation)
- Max orbital radius = 40% of triangle edge (3200 units)
- findNearestThreeStar() correctness
- 100 Mastodon instances don't collide
- Orbital distribution is even

#### C. Galaxy Center Positioning (6 tests)
- 66 software types → 66 unique galaxy centers
- Galaxies arranged in 4 rings
- Ring radius calculation
- 12 galaxies per ring
- Ring angle offset for spacing
- Z-offset alternates by ring (±2000 * ring)

#### D. Galaxy Orbital System (6 tests)
- Largest instance of software type = galaxy center
- Other instances orbit around center
- Orbital distance based on user rank
- Max orbital radius = 5000 units
- Deterministic positioning (domain hash)
- Small instances scattered evenly

#### E. Outer Rim Fallback (3 tests)
- Unknown software types → outer rim
- Distance > 50000 units from origin
- Random but deterministic placement

#### F. Position Type Classification (4 tests)
- three_star_center: Exactly 2 instances
- mastodon_orbital: All other Mastodon instances
- galaxy_center: Largest instance per software
- galaxy_orbital: Other instances per software

#### G. Collision Detection (5 tests)
- No two instances share exact same position
- Minimum distance between instances > 10 units
- Position rounding (0.1 precision)
- 10,000 instances test (no collisions)
- Deterministic placement (same input → same output)

#### H. Integration Tests (5 tests)
- Process 80 test instances
- Verify all position types assigned
- Verify spatial distribution
- Verify position ranges (X, Y, Z within bounds)
- Compare with known good output

**Total Test Cases**: 45 comprehensive tests

### 2.2: User Approval

**Deliverable**: Present `positions_test.go` for review

### 2.3: Verify Failure (RED)

**Expected Outcome**: All 45 tests FAIL

### 2.4: Implementation (GREEN)

**Action**: Rewrite `positions.go` guided by tests

### 2.5: Refactor

**Actions**: Optimize spatial algorithms while keeping tests green

---

## Phase 3: Main Pipeline (PRIORITY 3)

### Component: `scripts/fediverse-processor/main.go`

### 3.1: Write Test Suite

**File**: `scripts/fediverse-processor/main_test.go`

**Test Categories** (15 tests):
- File I/O (loadInstances, saveInstances)
- Error handling (missing files, corrupt JSON)
- Pipeline integration (end-to-end)
- Statistics calculation correctness
- Output format validation

### 3.2-3.5: TDD Workflow

Same RED → APPROVE → VERIFY → GREEN → REFACTOR cycle

---

## Phase 4: Fetch Script (PRIORITY 4)

### Component: `scripts/fetch-fediverse-data.js`

### 4.1: Write Test Suite

**File**: `scripts/fetch-fediverse-data.test.js`

**Test Categories** (20 tests):
- Rate limiting logic
- Incremental save (every 10 pages)
- Resume from cursor
- Progress tracking
- Error handling (network failures, API errors)
- Mock API responses

### 4.2-4.5: TDD Workflow

---

## Phase 5: Frontend Extraction (PRIORITY 5)

### Component: Extract from `index_files/fediverse.js`

### 5.1: Create Library

**New Module**: `scripts/fediverse-lib/`

**Files**:
- `data-loader.js` (CLI-compatible)
- `instance-transformer.js`
- `size-calculator.js`
- `color-parser.js`

### 5.2: Write Tests First

**Before extracting any code**:
- Write tests for each extracted function
- Get user approval
- Verify tests fail
- Extract and implement

---

## Execution Timeline

### Week 1: Core Algorithm Rebuild
- **Day 1-2**: Phase 1 (Color Algorithm TDD)
  - Write 38 tests
  - User approval
  - Reimplement colors.go
- **Day 3-4**: Phase 2 (Position Algorithm TDD)
  - Write 45 tests
  - User approval
  - Reimplement positions.go
- **Day 5**: Phase 3 (Main Pipeline TDD)
  - Write 15 tests
  - Reimplement main.go

### Week 2: Infrastructure & Frontend
- **Day 6-7**: Phase 4 (Fetch Script TDD)
- **Day 8-10**: Phase 5 (Frontend Library Extraction)

### Week 3: CI/CD & Documentation
- Setup GitHub Actions
- Add pre-commit hooks
- Update documentation
- Final integration testing

---

## Success Metrics

### Code Quality
- [ ] 100% test coverage for new code
- [ ] All tests pass
- [ ] Zero linting errors
- [ ] Performance maintained or improved

### Process Compliance
- [ ] Every feature has tests written FIRST
- [ ] User approved every test suite
- [ ] Confirmed RED phase before GREEN phase
- [ ] No implementation without failing tests

### Constitutional Compliance
- [x] Article I: Library-First (100%)
- [x] Article II: CLI Interface (100%)
- [x] Article III: Test-First (100%)

---

## Risk Mitigation

### Backup Strategy
- Keep old code in `scripts/fediverse-processor-legacy/`
- Can rollback if refactoring fails
- Compare outputs: old vs new implementation

### Incremental Approach
- One component at a time
- Validate each phase before next
- User approval at each checkpoint

### Quality Gates
- Cannot proceed to next phase without passing tests
- Cannot merge without user approval
- Cannot deploy without CI/CD green

---

## Current Status

- [x] Audit complete
- [x] Plan created
- [ ] **READY TO START PHASE 1**

**Next Action**: Write `colors_test.go` (38 test cases)

**Waiting for**: User confirmation to proceed

---

**Commitment**: I will NOT write any implementation code before:
1. Writing comprehensive tests
2. Getting your approval
3. Confirming tests FAIL
4. Only THEN implementing

This is non-negotiable per Article III.
