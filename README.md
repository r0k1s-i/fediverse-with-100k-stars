# Fediverse with 100k Stars

An interactive 3D WebGL visualization of the Fediverse, showing instances as stars in a galaxy.  
基于中文说明请见 `README.zh.md`。

---

## Overview

This project visualizes Fediverse instances as stars in a 3D galaxy. It supports zoom, click interactions, labels, and close-range GLB planet models. Built with Three.js (r158) and ES Modules, it runs in modern WebGL-capable browsers.

## Quick Start

This is a static site—no build step required. Start a local server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open: `http://localhost:8000`

## Key Features

- Fediverse instances rendered as stars, clustered by software/ecosystem
- Activity/age-driven color mapping with a temperature-style spectrum
- Interactive stars (click/zoom/labels) plus close-range GLB planet preview
- Minimap and grid view for navigation

## Data & Processing

Data lives under `data/`. Raw data should use the ServerEntity structure defined in the FediDB API docs: https://fedidb.com/resources/api-docs. Processing is handled by a Golang CLI in `scripts/fediverse-processor/`:

```bash
cd scripts/fediverse-processor
go build
./fediverse-processor -input ../../data/fediverse_raw.json -output ../../data/fediverse_final.json -verbose
```

The CLI reads/writes JSON and can emit summary stats to stdout.

## Tests

Browser-based unit tests run with Mocha/Chai. Start the server and open:

```
http://localhost:8000/tests/runner.html
```

## Structure

```
fediverse-with-100k-stars/
├── index.html                # Entry point
├── src/                      # Frontend source (JS/CSS/Shaders/Assets)
├── data/                     # Fediverse raw/processed data
├── scripts/fediverse-processor/  # Golang data processor CLI
├── tests/                    # Browser-based unit tests
├── docs/                     # Plans/architecture/postmortems
├── AGENTS.md                 # Contribution rules & workflow
└── README.md
```

## Contributing

We only accept:

- Bug reports via issues
- Suggestions for new GLB models

No new features are planned.

## Roadmap

Once FediDB opens bulk data access, we plan to refresh data monthly. The stars on this page will grow and fade along with the real Fediverse.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Originally forked from [Jude-Clarke/100k-Star-Challenge](https://github.com/Jude-Clarke/100k-Star-Challenge), based on [Chrome Experiments: 100,000 Stars](https://stars.chromeexperiments.com).
