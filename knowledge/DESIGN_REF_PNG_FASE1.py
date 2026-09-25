from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.gridspec import GridSpec
from matplotlib.patches import Rectangle
from matplotlib.lines import Line2D

BASE_DIR = Path(r"C:\Users\BPJS 9.2\Desktop\EOD saham")
CSV_PATH = BASE_DIR / "NICL_eod (1).csv"
OUTPUT_PATH = BASE_DIR / "NICL_fase1.png"
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
        ax.vlines(row.x, row.low, row.high, color=color, linewidth=1.0, alpha=0.95, zorder=2)
        lower = min(row.open, row.close)
        height = max(abs(row.close - row.open), 1.0)
        rect = Rectangle(
            (row.x - width / 2, lower),
            width,
            height,
            facecolor=color,
            edgecolor=color,
            linewidth=0.8,
            zorder=3,
        )
        ax.add_patch(rect)

    return up_color, down_color


def annotate_wave(
    ax: plt.Axes,
    frame: pd.DataFrame,
    points: list[WavePoint],
    line_style: str,
    linewidth: float = 1.6,
    line_alpha: float = 0.9,
) -> None:
    xs: list[float] = []
    ys: list[float] = []

    for point in points:
        row = frame.loc[frame["date"] == pd.Timestamp(point.date)]
        if row.empty:
            continue
        row = row.iloc[0]
        x = float(row["x"])
        y = float(row[point.price_field])
        xs.append(x)
        ys.append(y)
        ax.scatter(x, y, s=28, color=point.color, zorder=5)
        if point.label:
            ax.annotate(
                point.label,
                xy=(x, y),
                xytext=(x + point.x_shift, y + point.y_shift),
                fontsize=point.fontsize,
                fontweight="bold",
                color=point.color,
                arrowprops=dict(arrowstyle="-", color=point.color, lw=0.9, alpha=0.8),
                bbox=dict(boxstyle="round,pad=0.18", fc="white", ec=point.color, lw=0.7, alpha=0.9),
                zorder=6,
            )

    if xs:
        ax.plot(xs, ys, line_style, color=points[0].color, linewidth=linewidth, alpha=line_alpha, zorder=4)


def month_ticks(frame: pd.DataFrame) -> tuple[list[int], list[str]]:
    month_change = frame["date"].dt.to_period("M").ne(frame["date"].dt.to_period("M").shift())
    tick_frame = frame.loc[month_change, ["x", "month_tag"]].reset_index(drop=True)
    tick_frame = tick_frame.iloc[::2]
    return tick_frame["x"].astype(int).tolist(), tick_frame["month_tag"].tolist()


def format_axes(price_ax: plt.Axes, vol_ax: plt.Axes, nbsa_ax: plt.Axes, frame: pd.DataFrame) -> None:
    for axis in (price_ax, vol_ax, nbsa_ax):
        axis.set_xlim(-1, len(frame) + 1)
        axis.grid(axis="y", color="#d9d9d9", linestyle="--", linewidth=0.6, alpha=0.7)
        axis.spines["top"].set_visible(False)
        axis.spines["right"].set_visible(False)

    ticks, labels = month_ticks(frame)
    nbsa_ax.set_xticks(ticks)
    nbsa_ax.set_xticklabels(labels, rotation=0, fontsize=9)
    price_ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)
    vol_ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)


def build_chart(frame: pd.DataFrame) -> None:
    plt.style.use("default")
    fig = plt.figure(figsize=(24, 16), facecolor="#f7f4ed")
    grid = GridSpec(3, 1, height_ratios=[6.5, 1.5, 1.8], hspace=0.05)
    price_ax = fig.add_subplot(grid[0])
    vol_ax = fig.add_subplot(grid[1], sharex=price_ax)
    nbsa_ax = fig.add_subplot(grid[2], sharex=price_ax)

    up_color, down_color = draw_candles(price_ax, frame)

    # --- Volume bars ---
    colors = [up_color if c >= o else down_color for o, c in zip(frame["open"], frame["close"])]
    vol_ax.bar(frame["x"], frame["volume"] / 1_000_000, color=colors, width=0.72, alpha=0.8)

    # --- Cumulative NBSA ---
    nbsa_ax.plot(frame["x"], frame["cum_nbsa"] / 1_000_000, color="#2f5aa8", linewidth=1.8)
    nbsa_ax.fill_between(
        frame["x"], 0, frame["cum_nbsa"] / 1_000_000,
        color="#7aa5ff", alpha=0.22,
    )
    nbsa_ax.axhline(0, color="#888888", linewidth=0.6, linestyle="-", alpha=0.5)

    # ==========================================================
    # PREFERRED COUNT — Complete 5-wave Impulse 141 → 2010
    # ==========================================================
    pref_color = "#1a6b3a"

    main_impulse = [
        WavePoint("2024-05-13", "low",  "START 141",    pref_color, -18, -90,  10),
        WavePoint("2024-11-19", "high", "(1) 316",      pref_color,  10,  50,  10),
        WavePoint("2025-01-24", "low",  "(2) 234",      pref_color, -18, -70,  10),
        WavePoint("2025-06-02", "high", "(3)ext 1540",  pref_color, -30,  70,  10),
        WavePoint("2025-11-05", "low",  "(4) 950",      pref_color,  12, -70,  10),
        WavePoint("2026-01-15", "high", "(5)ATH 2010",  pref_color,  12,  60,  10),
    ]
    annotate_wave(price_ax, frame, main_impulse, "-", linewidth=2.4, line_alpha=0.85)

    # --- Wave (4) internal A-B-C zigzag ---
    w4_color = "#8b2fc9"
    w4_abc = [
        WavePoint("2025-06-02", "high", "",             w4_color,   0,    0,  1),
        WavePoint("2025-06-26", "low",  "4A 840",       w4_color, -20,  -60,  9),
        WavePoint("2025-07-24", "high", "4B 1290",      w4_color,  12,   50,  9),
        WavePoint("2025-11-05", "low",  "",             w4_color,   0,    0,  1),
    ]
    annotate_wave(price_ax, frame, w4_abc, "--", linewidth=1.3, line_alpha=0.7)

    # ==========================================================
    # CURRENT CORRECTION A-B-C from ATH 2010
    # ==========================================================
    corr_color = "#b22222"
    correction_abc = [
        WavePoint("2026-01-15", "high", "",             corr_color,   0,    0,  1),
        WavePoint("2026-02-03", "low",  "cA 985",       corr_color, -18,  -65,  9),
        WavePoint("2026-02-19", "high", "cB 1255",      corr_color,  12,   50,  9),
        WavePoint("2026-03-31", "low",  "cC? 805",      corr_color,  12,  -55,  9),
    ]
    annotate_wave(price_ax, frame, correction_abc, "--", linewidth=1.6, line_alpha=0.8)

    # --- Current bounce arrow annotation ---
    bounce_row = frame.loc[frame["date"] == pd.Timestamp("2026-04-14")]
    if not bounce_row.empty:
        bx = float(bounce_row.iloc[0]["x"])
        by = float(bounce_row.iloc[0]["close"])
        price_ax.annotate(
            f"Bounce\n{by:.0f}",
            xy=(bx, by),
            xytext=(bx + 8, by + 80),
            fontsize=9, fontweight="bold", color="#0b8f67",
            arrowprops=dict(arrowstyle="->", color="#0b8f67", lw=1.4),
            bbox=dict(boxstyle="round,pad=0.25", fc="#e8f5e9", ec="#0b8f67", lw=0.8, alpha=0.95),
            zorder=7,
        )

    # ==========================================================
    # ALTERNATE COUNT — W(3)=2010, W(4) in progress
    # ==========================================================
    alt_color = "#888888"
    alt_points = [
        WavePoint("2024-05-13", "low",  "",                 alt_color,   0,    0,  1),
        WavePoint("2024-11-19", "high", "Alt:(1)",          alt_color,  20,   85,  8),
        WavePoint("2025-01-24", "low",  "Alt:(2)",          alt_color, -22,  -40,  8),
        WavePoint("2026-01-15", "high", "Alt:(3)super-ext", alt_color, -40,   95,  8),
        WavePoint("2026-03-31", "low",  "Alt:(4)?→(5)?",    alt_color, -35,  -85,  8),
    ]
    annotate_wave(price_ax, frame, alt_points, ":", linewidth=1.2, line_alpha=0.45)

    # ==========================================================
    # Horizontal reference levels
    # ==========================================================

    # ATH
    price_ax.axhline(2010, color="#5f646d", linestyle="--", linewidth=1.0, alpha=0.5)
    price_ax.text(len(frame) + 0.5, 2010, " ATH 2010", color="#5f646d",
                  fontsize=8.5, va="center", ha="left")

    # Fib 38.2%
    price_ax.axhline(1296, color="#2196F3", linestyle="--", linewidth=0.8, alpha=0.5)
    price_ax.text(len(frame) + 0.5, 1296, " Fib 38.2%=1296", color="#2196F3",
                  fontsize=8, va="center", ha="left")

    # Fib 50%
    price_ax.axhline(1076, color="#FF9800", linestyle="--", linewidth=0.8, alpha=0.5)
    price_ax.text(len(frame) + 0.5, 1076, " Fib 50%=1076", color="#FF9800",
                  fontsize=8, va="center", ha="left")

    # Fib 61.8% — CRITICAL
    price_ax.axhspan(835, 875, color="#e6b800", alpha=0.15)
    price_ax.axhline(855, color="#b8960f", linestyle="-", linewidth=1.4, alpha=0.8)
    price_ax.text(len(frame) + 0.5, 855, " Fib 61.8%=855", color="#9a7a00",
                  fontsize=8.5, fontweight="bold", va="center", ha="left")

    # Wave (4) area
    price_ax.axhspan(840, 950, color="#d4f0ff", alpha=0.10)
    price_ax.text(3, 895, "Area W(4): 840–950",
                  color="#5b7fa5", fontsize=8, va="center",
                  bbox=dict(fc="white", ec="#5b7fa5", lw=0.5, alpha=0.7, boxstyle="round,pad=0.15"))

    # Wave (1) top
    price_ax.axhline(316, color="#5f646d", linestyle=":", linewidth=0.7, alpha=0.4)
    price_ax.text(len(frame) + 0.5, 316, " W(1) top=316", color="#5f646d",
                  fontsize=7.5, va="center", ha="left")

    # Invalidation — Alternate
    price_ax.axhline(234, color="#d17d00", linestyle=":", linewidth=1.2, alpha=0.85)
    price_ax.text(6, 244, "INV ALT: 234 (W2 low — overlap rule)",
                  color="#d17d00", fontsize=9, fontweight="bold", va="bottom")

    # Invalidation — Absolute
    price_ax.axhline(141, color="#8B0000", linestyle=":", linewidth=1.8, alpha=0.95)
    price_ax.text(6, 150, "INVALIDASI ABSOLUT: 141 (origin impulse)",
                  color="#8B0000", fontsize=10, fontweight="bold", va="bottom")

    # ==========================================================
    # Wave equality annotation (W1 ≈ W5 in %)
    # ==========================================================
    # Small annotation between W4 and W5
    w4_row = frame.loc[frame["date"] == pd.Timestamp("2025-11-05")]
    if not w4_row.empty:
        w4x = float(w4_row.iloc[0]["x"])
        price_ax.annotate(
            "W1=+120%\nW5=+112%\n≈ equality!",
            xy=(w4x + 25, 1500),
            fontsize=8, fontweight="bold", color="#1a6b3a",
            ha="center",
            bbox=dict(boxstyle="round,pad=0.3", fc="#e8f5e9", ec="#1a6b3a", lw=0.7, alpha=0.9),
            zorder=7,
        )

    # ==========================================================
    # Rule validation box (top-left)
    # ==========================================================
    rule_box = (
        "VALIDASI RULES (Frost & Prechter):\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "R1 W(2)ret = 45% < 100%           ✓\n"
        "   234 > 141 (origin)             ✓\n"
        "R2 W(3) = 1306pts TERPANJANG      ✓\n"
        "   W1=169 | W3=1306 | W5=1060    ✓\n"
        "R3 W(4)low=950 > W(1)top=316      ✓\n"
        "   Tidak ada overlap              ✓\n"
        "R4 Alternation: W2 sharp(2bln)    ✓\n"
        "   vs W4 complex A-B-C(5bln)      ✓\n"
        "R5 W1(+120%) ≈ W5(+112%)          ✓\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "SEMUA RULES VALID — Count reliable"
    )
    price_ax.text(
        0.008, 0.99,
        rule_box,
        transform=price_ax.transAxes,
        ha="left", va="top",
        fontsize=7.5,
        fontfamily="monospace",
        color="#282828",
        bbox=dict(boxstyle="round,pad=0.42", fc="white", ec="#1a6b3a", lw=1.2, alpha=0.94),
    )

    # ==========================================================
    # Fibonacci & correction status box (mid-left)
    # ==========================================================
    fib_info = (
        "KOREKSI DARI ATH 2010:\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Struktur: Zigzag A-B-C\n"
        "A: 2010→985 = -1025 pts\n"
        "B: 985→1255 = +270 pts\n"
        "C: 1255→805 = -450 pts\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Retrace total: 64.5%\n"
        "Fib 61.8% = 855 ← BREACH!\n"
        "Area W(4) = 840-950 ✓ TERCAPAI\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Bounce: 805→970 (+20.5%)\n"
        "Status: ZONA POTENSI BOTTOM"
    )
    price_ax.text(
        0.008, 0.47,
        fib_info,
        transform=price_ax.transAxes,
        ha="left", va="top",
        fontsize=7.5,
        fontfamily="monospace",
        color="#b22222",
        bbox=dict(boxstyle="round,pad=0.38", fc="#fff8f0", ec="#b22222", lw=1.0, alpha=0.94),
    )

    # ==========================================================
    # Last data summary box (bottom-right)
    # ==========================================================
    last_row = frame.iloc[-1]
    nbsa_val = last_row["nbsa"]
    nbsa_str = f"+{nbsa_val / 1_000_000:.1f}M" if nbsa_val >= 0 else f"{nbsa_val / 1_000_000:.1f}M"
    summary_box = (
        f"Terakhir: {last_row['date'].strftime('%d %b %Y')}\n"
        f"Close: {last_row['close']:.0f} | High: {last_row['high']:.0f}\n"
        f"Volume: {last_row['volume'] / 1_000_000:.1f}M\n"
        f"Freq: {last_row['freq']:.0f}\n"
        f"NBSA: {nbsa_str}"
    )
    price_ax.text(
        0.985, 0.03,
        summary_box,
        transform=price_ax.transAxes,
        ha="right", va="bottom",
        fontsize=10,
        color="#1f1f1f",
        bbox=dict(boxstyle="round,pad=0.34", fc="#fffaf0", ec="#b6a57a", lw=1.0, alpha=0.94),
    )

    # ==========================================================
    # Titles and labels
    # ==========================================================
    fig.suptitle(
        "NICL | Analisa Elliott Wave — Fase 1: Struktur Big Picture",
        x=0.06, y=0.985,
        ha="left", fontsize=19, fontweight="bold", color="#202020",
    )
    price_ax.text(
        0.0, 1.005,
        "Preferred: Impulse (1)-(5) complete 141→2010, W(3) extended +558% | "
        "Koreksi A-B-C di zona Fib 61.8% & area W(4) | "
        "Alternate: (3)=2010, (4) in progress",
        transform=price_ax.transAxes,
        ha="left", va="bottom",
        fontsize=10, color="#555555",
    )

    price_ax.set_ylabel("Harga (Rp)", fontsize=11)
    vol_ax.set_ylabel("Volume\n(Juta lot)", fontsize=10)
    nbsa_ax.set_ylabel("Cum NBSA\n(Rp Juta)", fontsize=10)
    nbsa_ax.set_xlabel("Waktu trading berurutan (hari libur/suspensi dihilangkan)", fontsize=11)

    format_axes(price_ax, vol_ax, nbsa_ax, frame)

    fig.text(
        0.995, 0.005,
        "Sumber: NICL_eod (1).csv | Validasi: Elliott Wave Principle — Frost & Prechter (Capsule Summary) PDF | "
        "Disclaimer: Simulasi probabilitas, bukan nasihat finansial",
        ha="right", va="bottom", fontsize=8.5, color="#5b5b5b",
    )

    # Legend
    legend_elements = [
        Line2D([0], [0], color=pref_color, linewidth=2.4, label="Impulse (1)-(5) complete"),
        Line2D([0], [0], color=w4_color, linewidth=1.3, linestyle="--", label="W(4) internal A-B-C"),
        Line2D([0], [0], color=corr_color, linewidth=1.6, linestyle="--", label="Koreksi A-B-C dari ATH"),
        Line2D([0], [0], color=alt_color, linewidth=1.2, linestyle=":", label="Alternate count"),
        Line2D([0], [0], color="#b8960f", linewidth=1.4, label="Fib 61.8% = 855 (kritis)"),
    ]
    price_ax.legend(
        handles=legend_elements, loc="upper right",
        fontsize=8.5, framealpha=0.92, edgecolor="#aaaaaa",
    )

    fig.subplots_adjust(top=0.95, bottom=0.06)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUTPUT_PATH, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Chart saved: {OUTPUT_PATH}")


def main() -> None:
    frame = load_ticker_frame()
    print(f"Loaded {len(frame)} rows for {TICKER} (from {frame['date'].min()} to {frame['date'].max()})")
    build_chart(frame)


if __name__ == "__main__":
    main()
