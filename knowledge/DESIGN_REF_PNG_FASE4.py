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
OUTPUT_PATH = BASE_DIR / "NICL_fase4.png"
TICKER = "NICL"

def load_ticker_frame() -> pd.DataFrame:
    rows: list[dict] = []
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["<ticker>"] != TICKER:
                continue
            rows.append(
                {
                    "date": datetime.strptime(row["<date>"], "%m/%d/%Y"),
                    "open": float(row["<open>"]),
                    "high": float(row["<high>"]),
                    "low": float(row["<low>"]),
                    "close": float(row["<close>"]),
                    "volume": float(row["<volume>"]) if row["<volume>"].strip() else 0.0,
                }
            )
    frame = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    # Filter to only show 2025 onwards to zoom in on the relevant structure for trading
    frame = frame[frame["date"] >= pd.Timestamp("2025-01-01")].reset_index(drop=True)
    frame["x"] = range(len(frame))
    frame["month_tag"] = frame["date"].dt.strftime("%b %Y")
    return frame

def draw_candles(ax, frame):
    up_c, dn_c = "#0b8f67", "#c43d3d"
    w = 0.72
    for r in frame.itertuples(index=False):
        c = up_c if r.close >= r.open else dn_c
        ax.vlines(r.x, r.low, r.high, color=c, linewidth=1.0, alpha=0.9, zorder=2)
        lo = min(r.open, r.close)
        h = max(abs(r.close - r.open), 1.0)
        ax.add_patch(Rectangle((r.x - w/2, lo), w, h, fc=c, ec=c, lw=0.6, zorder=3))

def month_ticks(frame):
    mc = frame["date"].dt.to_period("M").ne(frame["date"].dt.to_period("M").shift())
    tf = frame.loc[mc, ["x", "month_tag"]].reset_index(drop=True).iloc[::1]
    return tf["x"].astype(int).tolist(), tf["month_tag"].tolist()

def get_x(frame, date_str):
    row = frame.loc[frame["date"] == pd.Timestamp(date_str)]
    return float(row.iloc[0]["x"]) if not row.empty else None

def build_chart(frame: pd.DataFrame) -> None:
    plt.style.use("default")
    fig = plt.figure(figsize=(22, 14), facecolor="#f3f5f8")
    grid = GridSpec(2, 1, height_ratios=[5, 1], hspace=0.08)
    price_ax = fig.add_subplot(grid[0])
    vol_ax = fig.add_subplot(grid[1], sharex=price_ax)

    n = len(frame)
    draw_candles(price_ax, frame)

    # Simple Volume
    up_c, dn_c = "#0b8f67", "#c43d3d"
    colors = [up_c if c >= o else dn_c for o, c in zip(frame["open"], frame["close"])]
    vol_ax.bar(frame["x"], frame["volume"] / 1e6, color=colors, width=0.72, alpha=0.8)

    # Reference wave (muted)
    ref_color = "#b0bec5"
    ref_w = [
        ("2025-01-24", "low",  "(2) 234"),
        ("2025-06-02", "high", "(3) 1540"),
        ("2025-11-05", "low",  "(4) 950"),
        ("2026-01-15", "high", "(5) ATH 2010"),
        ("2026-03-31", "low",  "C 805"),
    ]
    xs, ys = [], []
    for d, f, lab in ref_w:
        row = frame.loc[frame["date"] == pd.Timestamp(d)]
        if not row.empty:
            x, y = float(row.iloc[0]["x"]), float(row.iloc[0][f])
            xs.append(x)
            ys.append(y)
            yoff = 35 if f == "high" else -35
            price_ax.annotate(lab, xy=(x, y), xytext=(x, y + yoff),
                              fontsize=8, fontweight="bold", color="#78909c", ha="center",
                              arrowprops=dict(arrowstyle="-", color=ref_color, lw=0.6))
    price_ax.plot(xs, ys, "-", color=ref_color, linewidth=1.5, alpha=0.5, zorder=1)

    right_margin = n + 15
    last_row = frame.iloc[-1]
    
    # ---------------------------------------------------------------------------------
    # TRADING PLAN ZONES (Executive Summary)
    # ---------------------------------------------------------------------------------

    # TARGET 3: ACH/Optimis (2010)
    price_ax.axhline(2010, color="#1565c0", linestyle=":", linewidth=1.5, alpha=0.8)
    price_ax.text(right_margin, 2010, "  TP 3: ATH 2010", color="#1565c0", fontsize=9, fontweight="bold", va="center")

    # TARGET 2: Puncak W3 (1540)
    price_ax.axhline(1540, color="#2e7d32", linestyle="--", linewidth=1.5, alpha=0.8)
    price_ax.text(right_margin, 1540, "  TP 2: 1540 (W3 Top)", color="#2e7d32", fontsize=9, fontweight="bold", va="center")

    # TARGET 1: Puncak W-B (1255)
    price_ax.axhline(1255, color="#2e7d32", linestyle="-", linewidth=2.0, alpha=0.9)
    price_ax.axhspan(1235, 1275, color="#a5d6a7", alpha=0.2)
    price_ax.text(right_margin, 1255, "  TP 1: 1255 (W-B Top)", color="#1b5e20", fontsize=9, fontweight="bold", va="center")

    # ENTRY 2: Solid Confirmation (>1076)
    price_ax.axhline(1076, color="#ff8f00", linestyle="-", linewidth=2.0, alpha=0.9)
    price_ax.text(right_margin, 1076, "  BUY CORE TIER :\n  > 1076 (Solid Conf.)", color="#e65100", fontsize=9, fontweight="bold", va="center")

    # ENTRY 1: Initial Test (>985)
    price_ax.axhline(985, color="#ffb300", linestyle="--", linewidth=2.0, alpha=0.9)
    price_ax.axhspan(985, 1025, color="#ffe082", alpha=0.2)
    price_ax.text(right_margin, 1005, "  BUY TEST TIER :\n  > 985-1025 (Initial Conf.)", color="#ff8f00", fontsize=9, fontweight="bold", va="center")

    # CURRENT PRICE
    price_ax.axhline(last_row["close"], color="#aaa", linestyle=":", linewidth=1.0)
    price_ax.text(n, last_row["close"], f"  NOW: {last_row['close']:.0f} ", color="#333", fontsize=9, fontweight="bold", va="center", ha="right")

    # STOP LOSS 1: Trailing (<840)
    price_ax.axhline(840, color="#f44336", linestyle="-", linewidth=2.0, alpha=0.9)
    price_ax.axhspan(820, 840, color="#ef9a9a", alpha=0.2)
    price_ax.text(right_margin, 840, "  SL 1 (Reduce) < 840", color="#c62828", fontsize=9, fontweight="bold", va="center")

    # STOP LOSS 2: Hard (<733)
    price_ax.axhline(733, color="#b71c1c", linestyle="-", linewidth=2.0, alpha=1.0)
    price_ax.text(right_margin, 733, "  SL 2 (EXIT ALL) < 733", color="#b71c1c", fontsize=9, fontweight="bold", va="center")

    # Arrow from current price showing the path
    price_ax.annotate("",
            xy=(n + 8, 1255), xytext=(len(frame)-2, 970),
            arrowprops=dict(arrowstyle="-|>", color="#00838f", lw=2.5, connectionstyle="arc3,rad=-0.1"),
            zorder=4)

    # ---------------------------------------------------------------------------------
    # INFO BOXES
    # ---------------------------------------------------------------------------------

    # Kesimpulan EW
    ew_summary = (
        "KESIMPULAN ELLIOTT WAVE:\n"
        "========================\n"
        "1. Impulse Utama (141-2010): KOMPLET\n"
        "2. Wave Equality W1=W5: Valid (Persentase)\n"
        "3. Koreksi A-B-C: Berada di 'Sweet Spot'\n"
        "   (Fib 61.8% & W4 Target Zone -> 805-855)\n"
        "4. Red Flag: Distribusi masif di Wave 5 ATH\n"
        "5. Early Green Flag: Selling exhaustion (W-C)\n"
        "   & rebound dengan volume di 805.\n\n"
        "STATUS: EARLY RECOVERY.\n"
        "Probabilitas 805 sbg bottom cukup tinggi,\n"
        "namun menanti breakout konfirmasi."
    )
    price_ax.text(
        0.015, 0.97, ew_summary,
        transform=price_ax.transAxes, ha="left", va="top",
        fontsize=8.5, fontfamily="monospace", color="#263238",
        bbox=dict(boxstyle="round,pad=0.4", fc="#eceff1", ec="#90a4ae", lw=1.2, alpha=0.9),
    )

    # Strategy Box
    trading_plan = (
        "TRADING PLAN (KONSERVATIF):\n"
        "===========================\n"
        "[+] ENTRY TAHAP 1 (Test 30%)\n"
        "    Tunggu breakout solid > 985-1025.\n"
        "    Validasi pantulan 805 = Reversal.\n\n"
        "[+] ENTRY TAHAP 2 (Core 70%)\n"
        "    Tunggu maintain > 1076.\n"
        "    Konfirmasi final: tembus resisten 1255.\n\n"
        "[-] STOP LOSS (Risk Management)\n"
        "    SL 1: < 840 (W-4 Low re-breach)\n"
        "    SL 2: < 733 (Hard Invalidate trend)\n\n"
        "[++] TAKE PROFIT (Reward)\n"
        "    TP 1: 1255 (Take 25%)\n"
        "    TP 2: 1540 (Take 50%)\n"
        "    TP 3: 2010 (Let run to ATH)"
    )
    price_ax.text(
        0.015, 0.65, trading_plan,
        transform=price_ax.transAxes, ha="left", va="top",
        fontsize=8.5, fontfamily="monospace", color="#1b5e20",
        bbox=dict(boxstyle="round,pad=0.4", fc="#e8f5e9", ec="#4caf50", lw=1.2, alpha=0.9),
    )

    fig.suptitle(
        "NICL | EKSEKUSI - FASE 4: Kesimpulan Akhir & Trading Plan (Konservatif)",
        x=0.01, y=0.97, ha="left", fontsize=18, fontweight="bold", color="#111",
    )
    price_ax.text(
        0.01, 1.01,
        "Analisa EW: Impulse Komplet | Koreksi di Fib 61.8% | Rebound Volume | Tunggu Konfirmasi Area 985-1025",
        transform=price_ax.transAxes, ha="left", va="bottom",
        fontsize=10, color="#555",
    )

    price_ax.set_xlim(-2, n + 28)
    vol_ax.set_xlim(-2, n + 28)
    
    price_ax.grid(axis="y", color="#d9d9d9", linestyle="--", linewidth=0.5, alpha=0.6)
    vol_ax.grid(axis="y", color="#d9d9d9", linestyle="--", linewidth=0.5, alpha=0.6)
    
    ticks, labels = month_ticks(frame)
    vol_ax.set_xticks(ticks)
    vol_ax.set_xticklabels(labels, rotation=0, fontsize=9)
    price_ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)

    price_ax.spines["top"].set_visible(False)
    price_ax.spines["right"].set_visible(False)
    vol_ax.spines["top"].set_visible(False)
    vol_ax.spines["right"].set_visible(False)

    price_ax.set_ylabel("Harga (Rp)", fontsize=11)
    vol_ax.set_ylabel("Volume\n(Juta)", fontsize=10)

    fig.text(
        0.99, 0.02,
        "Disclaimer: Analisa teknikal murni, disimulasikan dari metodologi Elliott Wave Principle. BUKAN SARAN FINANSIAL.",
        ha="right", va="bottom", fontsize=8, color="#777",
    )

    fig.subplots_adjust(top=0.93, bottom=0.06)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUTPUT_PATH, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Chart saved: {OUTPUT_PATH}")

def main() -> None:
    frame = load_ticker_frame()
    print(f"Loaded {len(frame)} rows for {TICKER} (Filtered from 2025)")
    build_chart(frame)

if __name__ == "__main__":
    main()
