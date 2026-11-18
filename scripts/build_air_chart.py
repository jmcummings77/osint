"""Build the website's chart assets from its published daily CSV."""

import csv
import json
from datetime import date, timedelta
from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, MaxNLocator


PAGE = Path(__file__).resolve().parents[1] / "docs" / "ukraine-air-activity"
COLUMNS = ("ru_min", "ru_trend_30d", "ua_claimed_intercepted", "ua_trend_30d")
COLORS = ("#236456", "#a44835")


def main():
    with (PAGE / "daily_aerial_activity_with_trends.csv").open(newline="") as source:
        rows = list(csv.DictReader(source))
    dates = [date.fromisoformat(row["date"]) for row in rows]
    if len(dates) < 2 or any(b - a != timedelta(days=1) for a, b in zip(dates, dates[1:])):
        raise ValueError("The chart requires consecutive calendar dates")
    values = [[float(row[column]) if row[column] else None for column in COLUMNS] for row in rows]
    (PAGE / "chart-data.json").write_text(
        json.dumps({"start": dates[0].isoformat(), "values": values}, separators=(",", ":"), allow_nan=False) + "\n"
    )
    render_png(dates, values)


def render_png(dates, values):
    fig, ax = plt.subplots(figsize=(11, 5.5), layout="constrained")
    fig.set_facecolor("#fffdf7")
    ax.set_facecolor("#fffdf7")
    for column in (0, 2, 1, 3):
        side = column // 2
        direction = 1 if side == 0 else -1
        series = [direction * row[column] if row[column] is not None else float("nan") for row in values]
        trend = column % 2
        ax.plot(dates, series, color=COLORS[side], alpha=1 if trend else .42,
                linewidth=1.8 if trend else .65, marker=None if trend else ".", markersize=1.15)
    largest = max(value for row in values for value in row if value is not None)
    limit = largest * 1.08
    ax.set(ylim=(-limit, limit), xlim=(dates[0], dates[-1]))
    ax.yaxis.set_major_locator(MaxNLocator(nbins=8, symmetric=True))
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{abs(value):,.0f}"))
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.grid(color="#d7dacf", linewidth=.7)
    ax.set_axisbelow(True)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.spines["bottom"].set(position=("data", 0), color="#7c887e", visible=True)
    for label in ax.get_xticklabels():
        label.set_bbox({"facecolor": "#fffdf7", "edgecolor": "none", "pad": 1})
    ax.tick_params(length=0, labelcolor="#526056")
    ax.text(.01, .97, "Russian drone and missile launches", transform=ax.transAxes,
            color=COLORS[0], weight="bold", va="top")
    ax.text(.01, .03, "Ukrainian drone interception claims", transform=ax.transAxes,
            color=COLORS[1], weight="bold", va="bottom")
    fig.savefig(PAGE / "daily_aerial_activity_mirrored.png", dpi=175)
    plt.close(fig)


if __name__ == "__main__":
    main()
