# osint
Fieldnotes — open-source intelligence, visual research, and reproducible analysis by J.M. Cummings.

[Open the OSINT index](https://jmcummings77.github.io/osint/)

GitHub Pages serves the static site from `main:/docs`. To add an analysis, give it a directory under `docs/` and link it from `docs/index.html`.

The Ukraine aerial activity page ships with the daily CSV and its calculated 30-day averages. To rebuild its chart assets after updating the CSV, run `python3 scripts/build_air_chart.py` with Matplotlib installed.
