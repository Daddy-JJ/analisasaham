from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pandas as pd
from matplotlib.gridspec import GridSpec
from matplotlib.patches import Rectangle, FancyBboxPatch
from matplotlib.lines import Line2D
import numpy as np

BASE_DIR = Path(r"C:\Users\BPJS 9.2\Desktop\EOD saham")
CSV_PATH = BASE_DIR / "NICL_eod (1).csv"
OUTPUT_PATH = BASE_DIR / "NICL_fase2.png"
TICKER = "NICL"


@dataclass(frozen=True)
class WavePoint:
    date: str
    price_field: str
    label: str
    color: str
    x_shift: float = 0.0
    y_shift: float = 0.0
    fontsize: float = 10.0


def load_ticker_frame() -> pd.DataFrame:
    rows: list[dict] = []
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["<ticker>"] != TICKER:
                continue
            nbsa_raw = row.get("<nbsa>", "").strip()
            freq_raw = row.get("<freq>", "").strip()
            val_raw = row.get("<valuasi>", "").strip()
            rows.append(
                {
                    "date": datetime.strptime(row["<date>"], "%m/%d/%Y"),
                    "open": float(row["<open>"]),
                    "high": float(row["<high>"]),
                    "low": float(row["<low>"]),
                    "close": float(row["<close>"]),
                    "volume": float(row["<volume>"]) if row["<volume>"].strip() else 0.0,
                    "freq": float(freq_raw) if freq_raw else 0.0,
                    "valuasi": float(val_raw) if val_raw else 0.0,
                    "nbsa": float(nbsa_raw) if nbsa_raw else 0.0,
                }
            )

    frame = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    frame = frame[frame["date"].dt.year >= 2024].reset_index(drop=True)
    frame["x"] = range(len(frame))
    frame["cum_nbsa"] = frame["nbsa"].cumsum()
    frame["month_tag"] = frame["date"].dt.strftime("%b %Y")
    return frame


def draw_candles(ax: plt.Axes, frame: pd.DataFrame) -> tuple[str, str]:
    up_color = "#0b8f67"
    down_color = "#c43d3d"
    width = 0.72
    for row in frame.itertuples(index=False):
        color = up_color if row.close >= row.open else down_color
        ax.vlines(row.x, row.low, row.high, color=color, linewidth=0.9, alpha=0.9, zorder=2)
        lower = min(row.open, row.close)
        height = max(abs(row.close - row.open), 1.0)
        rect = Rectangle(
            (row.x - width / 2, lower), width, height,
            facecolor=color, edgecolor=color, linewidth=0.7, zorder=3,
        )
        ax.add_patch(rect)
    return up_color, down_color


def annotate_wave(ax, frame, points, line_style, linewidth=1.6, line_alpha=0.9):
    xs, ys = [], []
    for point in points:
        row = frame.loc[frame["date"] == pd.Timestamp(point.date)]
        if row.empty:
            continue
        row = row.iloc[0]
        x, y = float(row["x"]), float(row[point.price_field])
        xs.append(x); ys.append(y)
        ax.scatter(x, y, s=24, color=point.color, zorder=5)
        if point.label:
            ax.annotate(
                point.label, xy=(x, y),
                xytext=(x + point.x_shift, y + point.y_shift),
                fontsize=point.fontsize, fontweight="bold", color=point.color,
                arrowprops=dict(arrowstyle="-", color=point.color, lw=0.8, alpha=0.7),
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec=point.color, lw=0.6, alpha=0.9),
                zorder=6,
            )
    if xs:
        ax.plot(xs, ys, line_style, color=points[0].color, linewidth=linewidth, alpha=line_alpha, zorder=4)


def month_ticks(frame):
    mc = frame["date"].dt.to_period("M").ne(frame["date"].dt.to_period("M").shift())
    tf = frame.loc[mc, ["x", "month_tag"]].reset_index(drop=True).iloc[::2]
    return tf["x"].astype(int).tolist(), tf["month_tag"].tolist()


def format_axes(price_ax, vol_ax, nbsa_ax, frame):
    for ax in (price_ax, vol_ax, nbsa_ax):
        ax.set_xlim(-1, len(frame) + 1)
        ax.grid(axis="y", color="#d9d9d9", linestyle="--", linewidth=0.5, alpha=0.6)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
    ticks, labels = month_ticks(frame)
    nbsa_ax.set_xticks(ticks)
    nbsa_ax.set_xticklabels(labels, rotation=0, fontsize=9)
    price_ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)
    vol_ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)


def get_x(frame, date_str):
    """Helper to get x position for a date."""
    row = frame.loc[frame["date"] == pd.Timestamp(date_str)]
    if row.empty:
        return None
    return float(row.iloc[0]["x"])


def build_chart(frame: pd.DataFrame) -> None:
    plt.style.use("default")
    fig = plt.figure(figsize=(26, 17), facecolor="#f7f4ed")
    grid = GridSpec(3, 1, height_ratios=[7, 1.3, 1.5], hspace=0.05)
    price_ax = fig.add_subplot(grid[0])
    vol_ax = fig.add_subplot(grid[1], sharex=price_ax)
    nbsa_ax = fig.add_subplot(grid[2], sharex=price_ax)

    up_color, down_color = draw_candles(price_ax, frame)

    # Volume bars
    colors = [up_color if c >= o else down_color for o, c in zip(frame["open"], frame["close"])]
    vol_ax.bar(frame["x"], frame["volume"] / 1e6, color=colors, width=0.72, alpha=0.8)

    # Cumulative NBSA
    nbsa_ax.plot(frame["x"], frame["cum_nbsa"] / 1e6, color="#2f5aa8", linewidth=1.8)
    nbsa_ax.fill_between(frame["x"], 0, frame["cum_nbsa"] / 1e6, color="#7aa5ff", alpha=0.2)
    nbsa_ax.axhline(0, color="#888", linewidth=0.5, alpha=0.5)

    # Key x-positions
    x_start = get_x(frame, "2024-05-13")
    x_w1    = get_x(frame, "2024-11-19")
    x_w2    = get_x(frame, "2025-01-24")
    x_w3    = get_x(frame, "2025-06-02")
    x_w4    = get_x(frame, "2025-11-05")
    x_w5    = get_x(frame, "2026-01-15")
    x_cA    = get_x(frame, "2026-02-03")
    x_cB    = get_x(frame, "2026-02-19")
    x_cC    = get_x(frame, "2026-03-31")
    x_last  = get_x(frame, "2026-04-14")
    n = len(frame)

    # ==========================================================
    # GHOST WAVE STRUCTURE (subtle background reference)
    # ==========================================================
    ghost_color = "#aaaaaa"
    ghost_pts = [
        WavePoint("2024-05-13", "low",  "(1)s",  ghost_color, -12, -50, 7.5),
        WavePoint("2024-11-19", "high", "(1)",    ghost_color,   6,  30, 7.5),
        WavePoint("2025-01-24", "low",  "(2)",    ghost_color,  -8, -40, 7.5),
        WavePoint("2025-06-02", "high", "(3)ext", ghost_color, -18,  45, 7.5),
        WavePoint("2025-11-05", "low",  "(4)",    ghost_color,   8, -45, 7.5),
        WavePoint("2026-01-15", "high", "(5)",    ghost_color,   8,  40, 7.5),
    ]
    annotate_wave(price_ax, frame, ghost_pts, "-", linewidth=1.4, line_alpha=0.35)

    # ==========================================================
    # FIBONACCI RETRACEMENT — Full Impulse 141 -> 2010
    # ==========================================================
    impulse_low = 141
    impulse_high = 2010
    impulse_range = impulse_high - impulse_low  # 1869

    fib_levels_full = [
        (0.0,   impulse_high, "#2e7d32", "-",   1.0, True),
        (0.236, impulse_high - 0.236 * impulse_range, "#1565C0", "--", 0.7, True),
        (0.382, impulse_high - 0.382 * impulse_range, "#1976D2", "--", 0.8, True),
        (0.500, impulse_high - 0.500 * impulse_range, "#F57F17", "--", 0.8, True),
        (0.618, impulse_high - 0.618 * impulse_range, "#E65100", "-",  1.2, True),
        (0.786, impulse_high - 0.786 * impulse_range, "#B71C1C", "--", 0.7, True),
        (1.0,   impulse_low, "#8B0000", ":",  1.4, True),
    ]

    # Draw fib lines from the ATH x-position to the right edge
    right_margin = n + 18
    for ratio, price, color, ls, lw, show_label in fib_levels_full:
        price_ax.axhline(price, color=color, linestyle=ls, linewidth=lw, alpha=0.55, zorder=1)
        if show_label:
            pct_str = f"{ratio*100:.1f}%"
            label = f"  {pct_str} = {price:.0f}"
            if ratio == 0.618:
                label += " << KRITIS"
            elif ratio == 1.0:
                label += " (INVALIDASI)"
            elif ratio == 0.0:
                label += " (ATH)"
            price_ax.text(right_margin, price, label, color=color,
                          fontsize=8, fontweight="bold" if ratio in (0.618, 1.0) else "normal",
                          va="center", ha="left", zorder=7)

    # ==========================================================
    # FIBONACCI RETRACEMENT — Wave (3) only: 234 -> 1540
    # ==========================================================
    w3_low = 234
    w3_high = 1540
    w3_range = w3_high - w3_low  # 1306

    w3_fib = [
        (0.382, w3_high - 0.382 * w3_range),  # 1041
        (0.500, w3_high - 0.500 * w3_range),  # 887
        (0.618, w3_high - 0.618 * w3_range),  # 733
    ]

    for ratio, price in w3_fib:
        # Draw only from W3 start area to end
        if x_w2 is not None:
            price_ax.hlines(price, x_w2, n, colors="#9C27B0", linestyles=":",
                           linewidth=0.8, alpha=0.5, zorder=1)
            price_ax.text(right_margin, price, f"  W3 {ratio*100:.1f}%={price:.0f}",
                          color="#9C27B0", fontsize=7.5, va="center", ha="left")

    # ==========================================================
    # CONFLUENCE ZONES (shaded)
    # ==========================================================
    # Zone 1: 835-890 — strongest confluence
    price_ax.axhspan(820, 895, color="#FF6F00", alpha=0.08, zorder=0)
    price_ax.text(3, 858, "CONFLUENCE ZONE 1: Fib 61.8%(855) + W4 area(840) + W3 50%(887)",
                  color="#E65100", fontsize=8, fontweight="bold", va="center",
                  bbox=dict(fc="#FFF3E0", ec="#E65100", lw=0.6, alpha=0.85, boxstyle="round,pad=0.2"))

    # Zone 2: 730-745
    price_ax.axhspan(725, 750, color="#D50000", alpha=0.06, zorder=0)
    price_ax.text(3, 738, "ZONE 2: W3 61.8%(733) + C=0.5A(742)",
                  color="#B71C1C", fontsize=7.5, va="center",
                  bbox=dict(fc="#FFEBEE", ec="#B71C1C", lw=0.5, alpha=0.85, boxstyle="round,pad=0.15"))

    # ==========================================================
    # CORRECTION A-B-C with ratio annotations
    # ==========================================================
    corr_color = "#b22222"
    corr_pts = [
        WavePoint("2026-01-15", "high", "",          corr_color,  0,   0, 1),
        WavePoint("2026-02-03", "low",  "A 985",     corr_color, -16, -60, 9),
        WavePoint("2026-02-19", "high", "B 1255",    corr_color,  10,  45, 9),
        WavePoint("2026-03-31", "low",  "C? 805",    corr_color,  10, -50, 9),
    ]
    annotate_wave(price_ax, frame, corr_pts, "--", linewidth=1.6, line_alpha=0.8)

    # Ratio annotations for correction
    if x_cA and x_cB:
        mid_ab = (x_cA + x_cB) / 2
        price_ax.annotate(
            "B/A = 26.3%\n(~Fib 23.6%)",
            xy=(mid_ab, 1120), fontsize=8, fontweight="bold", color="#8B0000",
            ha="center",
            bbox=dict(boxstyle="round,pad=0.25", fc="#FFEBEE", ec="#8B0000", lw=0.7, alpha=0.9),
            zorder=7,
        )

    if x_cB and x_cC:
        mid_bc = (x_cB + x_cC) / 2
        price_ax.annotate(
            "C/A = 0.439\n(antara 0.382-0.500)",
            xy=(mid_bc, 1020), fontsize=8, fontweight="bold", color="#8B0000",
            ha="center",
            bbox=dict(boxstyle="round,pad=0.25", fc="#FFEBEE", ec="#8B0000", lw=0.7, alpha=0.9),
            zorder=7,
        )

    # ==========================================================
    # WAVE RATIO ANALYSIS BOX (top-left)
    # ==========================================================
    ratio_box = (
        "RATIO ANALYSIS (Fibonacci):\n"
        "====================================\n"
        "IMPULSE RATIOS:\n"
        "  W(1)= +169pts (+120%)\n"
        "  W(3)= +1306pts (+558%) EXTENDED\n"
        "  W(5)= +1060pts (+112%)\n"
        "  W1% vs W5%: 120% vs 112% = EQUALITY!\n"
        "------------------------------------\n"
        "RETRACE RATIOS:\n"
        "  W(2)/W(1) = 45.0% (Fib ~0.447)\n"
        "  W(4)/W(3) = 45.2% (Fib ~0.447)\n"
        "  Simetri W2=W4 retrace depth!\n"
        "------------------------------------\n"
        "CORRECTION FROM ATH:\n"
        "  Total ret  = 64.5% (> Fib 61.8%)\n"
        "  B/A ratio  = 26.3% (~Fib 23.6%)\n"
        "  C/A ratio  = 0.439 (non-standard)\n"
        "  C=0.5A tgt = 742 (belum tercapai)"
    )
    price_ax.text(
        0.006, 0.99, ratio_box,
        transform=price_ax.transAxes, ha="left", va="top",
        fontsize=7.2, fontfamily="monospace", color="#282828",
        bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#1565C0", lw=1.2, alpha=0.94),
    )

    # ==========================================================
    # CONFLUENCE SUMMARY BOX (mid-left)
    # ==========================================================
    conf_box = (
        "FIBONACCI CONFLUENCE ZONES:\n"
        "================================\n"
        "ZONE 1 (820-895) <<TERKUAT>>\n"
        "  Fib 61.8% impulse   = 855\n"
        "  W(4) intraday low   = 840\n"
        "  Fib 50% wave(3)     = 887\n"
        "  >> LOW 805 sedikit breach\n"
        "--------------------------------\n"
        "ZONE 2 (725-750)\n"
        "  Fib 61.8% wave(3)   = 733\n"
        "  C = 0.500 x A proj  = 742\n"
        "  >> Jika Zone 1 gagal hold\n"
        "--------------------------------\n"
        "RESISTANCE (jika rally):\n"
        "  R1: 950  (W4 low)\n"
        "  R2: 1025 (cA low)\n"
        "  R3: 1076 (Fib 50%)\n"
        "  R4: 1255 (cB high)\n"
        "  R5: 1296 (Fib 38.2%)"
    )
    price_ax.text(
        0.006, 0.47, conf_box,
        transform=price_ax.transAxes, ha="left", va="top",
        fontsize=7.2, fontfamily="monospace", color="#E65100",
        bbox=dict(boxstyle="round,pad=0.38", fc="#FFF8E1", ec="#E65100", lw=1.0, alpha=0.94),
    )

    # ==========================================================
    # TIME FIBONACCI BOX (bottom-left of price)
    # ==========================================================
    time_box = (
        "TIME FIBONACCI:\n"
        "========================\n"
        "Impulse = 611 hari\n"
        "Koreksi = 89 hari (14.6%)\n"
        "------------------------\n"
        "Time projections:\n"
        "  0.236x = 144d ~Jun 2026\n"
        "  0.382x = 233d ~Sep 2026\n"
        "  0.500x = 306d ~Nov 2026\n"
        "------------------------\n"
        "W2/W1 time = 0.35 (~0.382)\n"
        "W5/W1 time = 0.37 (~0.382)"
    )
    price_ax.text(
        0.006, 0.10, time_box,
        transform=price_ax.transAxes, ha="left", va="top",
        fontsize=7, fontfamily="monospace", color="#4527A0",
        bbox=dict(boxstyle="round,pad=0.35", fc="#EDE7F6", ec="#4527A0", lw=0.8, alpha=0.92),
    )

    # ==========================================================
    # WAVE EQUALITY ANNOTATION on chart
    # ==========================================================
    # Draw bracket showing W1 = W5 equality
    if x_start and x_w1:
        mid_w1 = (x_start + x_w1) / 2
        price_ax.annotate(
            "W1\n+120%\n169pts",
            xy=(mid_w1, 228), fontsize=7.5, fontweight="bold",
            color="#1a6b3a", ha="center",
            bbox=dict(boxstyle="round,pad=0.2", fc="#E8F5E9", ec="#1a6b3a", lw=0.6, alpha=0.9),
            zorder=7,
        )

    if x_w4 and x_w5:
        mid_w5 = (x_w4 + x_w5) / 2
        price_ax.annotate(
            "W5\n+112%\n1060pts",
            xy=(mid_w5, 1480), fontsize=7.5, fontweight="bold",
            color="#1a6b3a", ha="center",
            bbox=dict(boxstyle="round,pad=0.2", fc="#E8F5E9", ec="#1a6b3a", lw=0.6, alpha=0.9),
            zorder=7,
        )

    # Equality arrow
    if x_w1 and x_w4:
        price_ax.annotate(
            "", xy=(x_w4 + 15, 1420), xytext=(mid_w1 + 10, 280),
            arrowprops=dict(arrowstyle="<->", color="#1a6b3a", lw=1.5,
                           connectionstyle="arc3,rad=0.15", alpha=0.5),
            zorder=4,
        )
        # Midpoint label
        mid_x = (mid_w1 + x_w4 + 15) / 2
        mid_y = (280 + 1420) / 2
        price_ax.text(
            mid_x - 30, mid_y, "W1% = W5%\nEQUALITY",
            fontsize=8, fontweight="bold", color="#1a6b3a",
            ha="center", va="center", rotation=50,
            bbox=dict(boxstyle="round,pad=0.2", fc="#E8F5E9", ec="#1a6b3a",
                      lw=0.6, alpha=0.85),
            zorder=7,
        )

    # ==========================================================
    # W2 and W4 retrace symmetry annotation
    # ==========================================================
    if x_w1 and x_w2:
        price_ax.annotate(
            "W2 ret\n45.0%",
            xy=((x_w1 + x_w2) / 2, 275), fontsize=7, fontweight="bold",
            color="#6A1B9A", ha="center",
            bbox=dict(boxstyle="round,pad=0.15", fc="#F3E5F5", ec="#6A1B9A", lw=0.5, alpha=0.9),
            zorder=7,
        )

    if x_w3 and x_w4:
        price_ax.annotate(
            "W4 ret\n45.2%",
            xy=((x_w3 + x_w4) / 2, 1240), fontsize=7, fontweight="bold",
            color="#6A1B9A", ha="center",
            bbox=dict(boxstyle="round,pad=0.15", fc="#F3E5F5", ec="#6A1B9A", lw=0.5, alpha=0.9),
            zorder=7,
        )

    # Symmetry connector
    if x_w1 and x_w3:
        price_ax.annotate(
            "", xy=((x_w3 + x_w4) / 2, 1200), xytext=((x_w1 + x_w2) / 2, 310),
            arrowprops=dict(arrowstyle="<->", color="#6A1B9A", lw=1.0,
                           connectionstyle="arc3,rad=0.2", alpha=0.4, linestyle="--"),
            zorder=4,
        )
        mid_sym_x = ((x_w1 + x_w2) / 2 + (x_w3 + x_w4) / 2) / 2
        price_ax.text(
            mid_sym_x - 15, 750, "SIMETRI\n45%=45%",
            fontsize=7, fontweight="bold", color="#6A1B9A",
            ha="center", rotation=40,
            bbox=dict(boxstyle="round,pad=0.15", fc="#F3E5F5", ec="#6A1B9A",
                      lw=0.5, alpha=0.8),
            zorder=7,
        )

    # ==========================================================
    # Current bounce annotation
    # ==========================================================
    if x_last:
        last_close = float(frame.iloc[-1]["close"])
        price_ax.annotate(
            f"Bounce\n{last_close:.0f}",
            xy=(x_last, last_close),
            xytext=(x_last + 6, last_close + 70),
            fontsize=9, fontweight="bold", color="#0b8f67",
            arrowprops=dict(arrowstyle="->", color="#0b8f67", lw=1.3),
            bbox=dict(boxstyle="round,pad=0.2", fc="#E8F5E9", ec="#0b8f67", lw=0.7, alpha=0.95),
            zorder=7,
        )

    # ==========================================================
    # C=0.5A projection line
    # ==========================================================
    c_05a_target = 742
    if x_cB:
        price_ax.hlines(c_05a_target, x_cB, n + 5, colors="#D50000",
                        linestyles="--", linewidth=1.0, alpha=0.6)
        price_ax.text(n + 1, c_05a_target + 8, f"C=0.5A: {c_05a_target}",
                      color="#D50000", fontsize=8, fontweight="bold", va="bottom")

    # C=0.618A projection line
    c_618a_target = 622
    if x_cB:
        price_ax.hlines(c_618a_target, x_cB, n + 5, colors="#D50000",
                        linestyles=":", linewidth=0.8, alpha=0.5)
        price_ax.text(n + 1, c_618a_target + 8, f"C=0.618A: {c_618a_target}",
                      color="#D50000", fontsize=7.5, va="bottom")

    # ==========================================================
    # Last data summary box
    # ==========================================================
    last_row = frame.iloc[-1]
    nbsa_val = last_row["nbsa"]
    nbsa_s = f"+{nbsa_val/1e6:.1f}M" if nbsa_val >= 0 else f"{nbsa_val/1e6:.1f}M"
    summary = (
        f"Terakhir: {last_row['date'].strftime('%d %b %Y')}\n"
        f"Close: {last_row['close']:.0f} | High: {last_row['high']:.0f}\n"
        f"Volume: {last_row['volume']/1e6:.1f}M | Freq: {last_row['freq']:.0f}\n"
        f"NBSA: {nbsa_s}"
    )
    price_ax.text(
        0.985, 0.03, summary,
        transform=price_ax.transAxes, ha="right", va="bottom",
        fontsize=9.5, color="#1f1f1f",
        bbox=dict(boxstyle="round,pad=0.3", fc="#fffaf0", ec="#b6a57a", lw=1.0, alpha=0.94),
    )

    # ==========================================================
    # Titles and labels
    # ==========================================================
    fig.suptitle(
        "NICL | Analisa Elliott Wave - Fase 2: Fibonacci Retracement, Extension & Ratio Analysis",
        x=0.06, y=0.985, ha="left", fontsize=18, fontweight="bold", color="#202020",
    )
    price_ax.text(
        0.0, 1.005,
        "Fib retrace impulse 141-2010 | Fib retrace W(3) 234-1540 | "
        "Confluence zones | Wave equality W1%=W5% | "
        "Correction ratios A-B-C | Time Fibonacci",
        transform=price_ax.transAxes, ha="left", va="bottom",
        fontsize=10, color="#555555",
    )

    price_ax.set_ylabel("Harga (Rp)", fontsize=11)
    vol_ax.set_ylabel("Vol\n(Jt)", fontsize=10)
    nbsa_ax.set_ylabel("Cum NBSA\n(Rp Jt)", fontsize=10)
    nbsa_ax.set_xlabel("Waktu trading berurutan", fontsize=11)

    format_axes(price_ax, vol_ax, nbsa_ax, frame)

    # Extend x-axis to show labels
    price_ax.set_xlim(-2, n + 22)

    fig.text(
        0.995, 0.005,
        "Sumber: NICL_eod (1).csv | Ref: Elliott Wave Principle - Frost & Prechter | "
        "Disclaimer: Simulasi probabilitas, bukan nasihat finansial",
        ha="right", va="bottom", fontsize=8.5, color="#5b5b5b",
    )

    # Legend
    legend_elements = [
        Line2D([0], [0], color=ghost_color, linewidth=1.4, alpha=0.5, label="Wave structure (reference)"),
        Line2D([0], [0], color="#E65100", linewidth=1.2, label="Fib 61.8% = 855 (KRITIS)"),
        Line2D([0], [0], color="#1976D2", linewidth=0.8, linestyle="--", label="Fib retrace impulse"),
        Line2D([0], [0], color="#9C27B0", linewidth=0.8, linestyle=":", label="Fib retrace wave(3)"),
        Line2D([0], [0], color=corr_color, linewidth=1.6, linestyle="--", label="Correction A-B-C"),
        Line2D([0], [0], color="#D50000", linewidth=1.0, linestyle="--", label="C projection targets"),
    ]
    price_ax.legend(
        handles=legend_elements, loc="upper right",
        fontsize=8, framealpha=0.92, edgecolor="#aaa",
    )

    fig.subplots_adjust(top=0.95, bottom=0.06)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUTPUT_PATH, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Chart saved: {OUTPUT_PATH}")


def main() -> None:
    frame = load_ticker_frame()
    print(f"Loaded {len(frame)} rows for {TICKER}")
    build_chart(frame)


if __name__ == "__main__":
    main()
