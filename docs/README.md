# 📚 Documentation Index

Welcome to the fedi-night-with-100k-stars / Fediverse documentation hub.

---

## 🚀 Quick Start

| Document | Description | For |
|----------|-------------|-----|
| [Project README](../README.md) | Project overview and getting started | Everyone |
| [Coordinate Systems](./architecture/coordinate-systems.md) | 3D coordinate system reference | Developers |
| [Coding Guidelines](../AGENTS.md) | Coding standards and workflows | Contributors |

---

## 📖 Developer Guides

Guides for understanding and contributing to the codebase.

| Guide | Description | Last Updated |
|-------|-------------|--------------|
| [**Coding Guidelines (AGENTS.md)**](../AGENTS.md) | Constitutional rules, code patterns, git workflow | 2026-01-12 |
| [**Coordinate Systems**](./architecture/coordinate-systems.md) | Scene graph hierarchy, coordinate transforms, common pitfalls | 2026-01-12 |

### What's in AGENTS.md?

- **Constitutional Foundation**: Library-first principle, CLI mandate, TDD imperative
- **Project Structure**: File organization, naming conventions
- **Code Style**: JavaScript patterns, Three.js r158 usage, CSS guidelines
- **Agent Workflows**: Documentation updates, Git commit rules (gitmoji)

### What's in Coordinate Systems?

- Three.js global coordinates (right-hand rule)
- Scene graph hierarchy (`rotating` → `galacticCentering` → `translating`)
- Individual coordinate systems (Hipparcos, Fediverse, Supergiants, Grid)
- Camera system and zoom levels
- Common transformation pitfalls and solutions

---

## 📋 Implementation Plans

Strategic planning documents for major features and refactorings.

| Plan | Status | Description | Last Updated |
|------|--------|-------------|--------------|
| [**Fediverse Implementation**](./plans/fediverse-implementation.md) | ✅ Complete | Fediverse visualization integration (8 phases) | 2026-01-12 |
| [**Modernization Plan**](./plans/modernization.md) | ✅ Complete | Three.js r158, ES Modules, performance optimization (6 phases) | 2026-01-12 |
| [**High-Priority Improvements**](./plans/improvements.md) | ✅ Phase 1 Done | Debug tools, constants, tests, documentation | 2026-01-12 |

### Fediverse Implementation Plan

**Goal**: Integrate 40k+ Fediverse instances into the stellar visualization.

**Key Phases**:
1. ✅ Data fetching (FediDB API)
2. ✅ Color mapping (age-based hue algorithm)
3. ✅ Spatial clustering (multi-galaxy layout)
4. ✅ Data transformation (Golang processor)
5. ✅ WebGL interaction (raycasting)
6. ✅ Canvas labels (smart collision avoidance)
7. ✅ Directory refactoring
8. ✅ Modernization integration

### Modernization Plan

**Goal**: Upgrade to modern web standards while maintaining simplicity.

**Key Phases**:
1. ✅ Three.js r58 → r158 (BufferGeometry, modern APIs)
2. ✅ ES Modules refactoring (31 files modularized)
3. ✅ jQuery removal (zero dependencies)
4. ✅ CSS modernization (vendor prefixes removed, CSS variables)
5. ✅ Performance optimization (InstancedMesh, GPU animation)
6. ✅ Loading optimization (async modules, preloading)

**Impact**: 2-5× performance improvement, 60fps on mid-range devices.

### High-Priority Improvements

**Goal**: Prevent P0/P1 incidents from recurring (based on postmortem analysis).

**Phase 1 Complete**:
- ✅ Visual debug tools (console-based GUI)
- ✅ Coordinate system documentation (400+ lines)
- ✅ Semantic constants (600+ lines, 12 groups)
- ✅ Interaction test suite (12 tests, 100% pass rate)

**Expected ROI**: 80% reduction in coordinate bugs, 50% faster 3D debugging.

---

## 🔍 Postmortem Reports

Analysis of past incidents to improve development practices.

| Report | Description | Incidents Analyzed |
|--------|-------------|-------------------|
| [**Postmortem Index**](./postmortems/README.md) | Incident catalog (P0-P3) | 14 incidents |
| [**Executive Summary**](./postmortems/EXECUTIVE-SUMMARY.md) | High-level findings and recommendations | 60 commits analyzed |
| [**Common Issues**](./postmortems/P2-SUMMARY-common-issues.md) | Recurring patterns and solutions | 6 P2 incidents |

### Sample Incidents

- **P0-001**: Fediverse planet model not displaying (2 hours, 7 commits)
- **P0-002**: Fediverse instances not clickable (4 hours, 14 commits)
- **P1-001**: Grid view camera positioning (2 hours, 11 commits)
- **P1-002**: Three.js migration issues (6 hours, 17 commits)

### Key Lessons

1. **Coordinate confusion** caused 30% of bugs → Solved by [coordinate-systems.md](./architecture/coordinate-systems.md)
2. **Magic numbers** caused 15% of bugs → Solved by [constants.js](../src/js/core/constants.js)
3. **Lack of visual debugging** → Solved by [debug-tools.js](../src/js/utils/debug-tools.js)
4. **No regression tests** → Solved by [interaction.test.html](../tests/interaction.test.html)

---

## 🗂️ Document Organization

```
docs/
├── README.md                          # 👈 You are here (navigation hub)
├── architecture/
│   └── coordinate-systems.md          # Technical reference
├── plans/
│   ├── fediverse-implementation.md    # Feature plan (complete)
│   ├── modernization.md               # Refactoring plan (complete)
│   └── improvements.md                # Quality improvements (phase 1 done)
├── postmortems/
│   ├── README.md                      # Incident index
│   ├── EXECUTIVE-SUMMARY.md           # Leadership overview
│   ├── P0-001-fediverse-planet-model-not-displaying.md
│   ├── P0-002-fediverse-instances-not-clickable.md
│   ├── P1-001-grid-view-camera-positioning.md
│   ├── P1-002-threejs-migration-issues.md
│   └── P2-SUMMARY-common-issues.md
└── ../AGENTS.md                       # Developer guidelines (Root)
```

---

## 🎯 Finding What You Need

### "I want to understand the codebase"

1. Start with [Project README](../README.md)
2. Review [Coordinate Systems](./architecture/coordinate-systems.md)
3. Read [Coding Guidelines](../AGENTS.md)

### "I want to add a new feature"

1. Follow [Coding Guidelines](../AGENTS.md) (Library-first, TDD)
2. Reference [Coordinate Systems](./architecture/coordinate-systems.md) for 3D logic
3. Use [Debug Tools](../src/js/utils/debug-tools.js) (press 'D' key)
4. Check [Constants](../src/js/core/constants.js) for magic number replacements

### "I encountered a bug"

1. Check [Common Issues](./postmortems/P2-SUMMARY-common-issues.md) for known patterns
2. Review [Postmortem Reports](./postmortems/README.md) for similar incidents
3. Use [Debug Tools](../src/js/utils/debug-tools.js) to visualize the issue
4. Run [Tests](../tests/interaction.test.html) to check for regressions

### "I want to understand a past decision"

1. Check [Implementation Plans](./plans/) for strategic context
2. Review [Postmortem Reports](./postmortems/) for incident-driven decisions
3. Read [Modernization Plan](./plans/modernization.md) for architecture evolution

---

## 📝 Document Maintenance

### When to Update Documentation

| Trigger | Update | Responsible |
|---------|--------|-------------|
| New feature planned | Create/update plan in `docs/plans/` | Feature author |
| Major refactoring | Update relevant guide in `docs/guides/` | Refactor author |
| Bug incident | Create postmortem in `docs/postmortems/` | Bug resolver |
| Code pattern change | Update [AGENTS.md](../AGENTS.md) | Team lead |
| Coordinate system change | Update [coordinate-systems.md](./architecture/coordinate-systems.md) | Graphics developer |

### Documentation Standards

- Use **Markdown** (GitHub-flavored)
- Include **last updated date** at the top
- Add **status badges** (✅ Complete, 🚧 In Progress, 📋 Planned)
- Link to **related documents** liberally
- Keep **TODOs** in implementation plans, not guides

---

## 🤝 Contributing

Before contributing:

1. Read [Coding Guidelines](../AGENTS.md)
2. Follow TDD workflow (Red → Approval → Green → Refactor)
3. Use [gitmoji](https://gitmoji.dev/) for commit messages
4. Update relevant documentation

Example commit:
```bash
✨ feat: add instance filtering by software type

- Implement dropdown UI in minimap
- Add filter logic in fediverse.js
- Update FEDIVERSE_IMPLEMENTATION_PLAN.md
```

---

## 📞 Getting Help

- **Codebase questions**: Check [AGENTS.md](../AGENTS.md)
- **3D coordinate issues**: Read [coordinate-systems.md](./architecture/coordinate-systems.md)
- **Past incidents**: Browse [postmortems/](./postmortems/)
- **Implementation strategy**: Review [plans/](./plans/)

---

**Last Updated**: 2026-01-12  
**Maintainer**: Project Team  
**Status**: ✅ Documentation hub complete
