from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from matplotlib.gridspec import GridSpec
from matplotlib.patches import Rectangle
from matplotlib.lines import Line2D

BASE_DIR = Path(r"C:\Users\BPJS 9.2\Desktop\EOD saham")
CSV_PATH = BASE_DIR / "NICL_eod (1).csv"
OUTPUT_PATH = BASE_DIR / "NICL_fase3.png"
TICKER = "NICL"

# Wave date boundaries
WAVE_BOUNDS = {
    "W1": ("2024-05-13", "2024-11-19"),
    "W2": ("2024-11-19", "2025-01-24"),
    "W3": ("2025-01-24", "2025-06-02"),
    "W4": ("2025-06-02", "2025-11-05"),
    "W5": ("2025-11-05", "2026-01-15"),
    "Corr": ("2026-01-15", "2026-04-14"),
}

WAVE_COLORS = {
    "W1": "#4CAF50",
    "W2": "#FFC107",
    "W3": "#2196F3",
    "W4": "#9C27B0",
    "W5": "#FF5722",
    "Corr": "#F44336",
}

WAVE_LABELS_DISPLAY = {
    "W1": "Wave (1)",
    "W2": "Wave (2)",
    "W3": "Wave (3)",
    "W4": "Wave (4)",
    "W5": "Wave (5)",
    "Corr": "Koreksi",
}


def load_ticker_frame() -> pd.DataFrame:
    rows: list[dict] = []
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["<ticker>"] != TICKER:
                continue
            nbsa_raw = row.get("<nbsa>", "").strip()
            freq_raw = row.get("<freq>", "").strip()
            rows.append(
                {
                    "date": datetime.strptime(row["<date>"], "%m/%d/%Y"),
                    "open": float(row["<open>"]),
                    "high": float(row["<high>"]),
                    "low": float(row["<low>"]),
                    "close": float(row["<close>"]),
                    "volume": float(row["<volume>"]) if row["<volume>"].strip() else 0.0,
                    "freq": float(freq_raw) if freq_raw else 0.0,
                    "nbsa": float(nbsa_raw) if nbsa_raw else 0.0,
                }
            )
    frame = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    frame = frame[frame["date"].dt.year >= 2024].reset_index(drop=True)
    frame["x"] = range(len(frame))
    frame["cum_nbsa"] = frame["nbsa"].cumsum()
    frame["month_tag"] = frame["date"].dt.strftime("%b %Y")
    frame["vol_m"] = frame["volume"] / 1e6
    frame["freq_k"] = frame["freq"] / 1e3
    frame["cum_nbsa_m"] = frame["cum_nbsa"] / 1e6
    frame["nbsa_m"] = frame["nbsa"] / 1e6
    return frame


def get_wave_mask(frame: pd.DataFrame, start: str, end: str) -> pd.Series:
    return (frame["date"] >= pd.Timestamp(start)) & (frame["date"] <= pd.Timestamp(end))


def draw_candles(ax, frame):
    up_c, dn_c = "#0b8f67", "#c43d3d"
    w = 0.72
    for r in frame.itertuples(index=False):
        c = up_c if r.close >= r.open else dn_c
        ax.vlines(r.x, r.low, r.high, color=c, linewidth=0.8, alpha=0.85, zorder=2)
        lo = min(r.open, r.close)
        h = max(abs(r.close - r.open), 1.0)
        ax.add_patch(Rectangle((r.x - w/2, lo), w, h, fc=c, ec=c, lw=0.6, zorder=3))
    return up_c, dn_c


def month_ticks(frame):
    mc = frame["date"].dt.to_period("M").ne(frame["date"].dt.to_period("M").shift())
    tf = frame.loc[mc, ["x", "month_tag"]].reset_index(drop=True).iloc[::2]
    return tf["x"].astype(int).tolist(), tf["month_tag"].tolist()


def get_x(frame, date_str):
    row = frame.loc[frame["date"] == pd.Timestamp(date_str)]
    return float(row.iloc[0]["x"]) if not row.empty else None


def shade_wave_periods(ax, frame, alpha=0.08):
    """Add subtle background shading for each wave period."""
    for wname, (start, end) in WAVE_BOUNDS.items():
        x_s = get_x(frame, start)
        x_e = get_x(frame, end)
        if x_s is not None and x_e is not None:
            ax.axvspan(x_s, x_e, color=WAVE_COLORS[wname], alpha=alpha, zorder=0)


def build_chart(frame: pd.DataFrame) -> None:
    plt.style.use("default")
    fig = plt.figure(figsize=(26, 20), facecolor="#f7f4ed")
    grid = GridSpec(4, 1, height_ratios=[5, 2, 1.5, 2], hspace=0.06)
    price_ax = fig.add_subplot(grid[0])
    vol_ax = fig.add_subplot(grid[1], sharex=price_ax)
    freq_ax = fig.add_subplot(grid[2], sharex=price_ax)
    nbsa_ax = fig.add_subplot(grid[3], sharex=price_ax)

    n = len(frame)

    # --- PANEL 1: PRICE with ghost wave structure ---
    up_c, dn_c = draw_candles(price_ax, frame)
    shade_wave_periods(price_ax, frame, alpha=0.06)

    # Ghost wave lines
    ghost_dates = ["2024-05-13", "2024-11-19", "2025-01-24", "2025-06-02",
                   "2025-11-05", "2026-01-15"]
    ghost_fields = ["low", "high", "low", "high", "low", "high"]
    ghost_labels = ["START\n141", "(1)316", "(2)234", "(3)1540", "(4)950", "(5)ATH\n2010"]
    gxs, gys = [], []
    for d, f, lab in zip(ghost_dates, ghost_fields, ghost_labels):
        row = frame.loc[frame["date"] == pd.Timestamp(d)]
        if row.empty:
            continue
        r = row.iloc[0]
        x, y = float(r["x"]), float(r[f])
        gxs.append(x); gys.append(y)
        yoff = 50 if f == "high" else -60
        price_ax.annotate(lab, xy=(x, y), xytext=(x, y + yoff),
                          fontsize=7.5, fontweight="bold", color="#777", ha="center",
                          arrowprops=dict(arrowstyle="-", color="#999", lw=0.6),
                          bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="#aaa",
                                    lw=0.5, alpha=0.8), zorder=5)
    price_ax.plot(gxs, gys, "-", color="#999", linewidth=1.2, alpha=0.4, zorder=3)

    # Correction A-B-C
    corr_dates = ["2026-01-15", "2026-02-03", "2026-02-19", "2026-03-31"]
    corr_fields = ["high", "low", "high", "low"]
    corr_labs = ["", "A 985", "B 1255", "C? 805"]
    cxs, cys = [], []
    for d, f, lab in zip(corr_dates, corr_fields, corr_labs):
        row = frame.loc[frame["date"] == pd.Timestamp(d)]
        if row.empty:
            continue
        r = row.iloc[0]
        x, y = float(r["x"]), float(r[f])
        cxs.append(x); cys.append(y)
        if lab:
            yoff = 45 if f == "high" else -50
            price_ax.annotate(lab, xy=(x, y), xytext=(x + 5, y + yoff),
                              fontsize=8, fontweight="bold", color="#b22222",
                              arrowprops=dict(arrowstyle="-", color="#b22222", lw=0.7),
                              bbox=dict(boxstyle="round,pad=0.15", fc="white",
                                        ec="#b22222", lw=0.5, alpha=0.9), zorder=6)
    price_ax.plot(cxs, cys, "--", color="#b22222", linewidth=1.4, alpha=0.7, zorder=4)

    # Volume divergence annotation on price
    price_ax.annotate(
        "VOL DIVERGENCE\nW5 vol >> W3 vol\nHarga naik, distribusi!",
        xy=(get_x(frame, "2026-01-06") or n-60, 1840),
        xytext=((get_x(frame, "2025-11-05") or n-100) - 30, 1750),
        fontsize=8, fontweight="bold", color="#FF5722", ha="center",
        arrowprops=dict(arrowstyle="->", color="#FF5722", lw=1.2),
        bbox=dict(boxstyle="round,pad=0.3", fc="#FFF3E0", ec="#FF5722", lw=0.8, alpha=0.92),
        zorder=7,
    )

    # Selling exhaustion annotation
    price_ax.annotate(
        "SELLING EXHAUSTION\nA: -54 pts/hari\nC: -11 pts/hari\nMomentum -79%!",
        xy=(get_x(frame, "2026-03-31") or n-10, 805),
        xytext=((get_x(frame, "2026-03-15") or n-25) - 20, 630),
        fontsize=8, fontweight="bold", color="#1a6b3a", ha="center",
        arrowprops=dict(arrowstyle="->", color="#1a6b3a", lw=1.2),
        bbox=dict(boxstyle="round,pad=0.3", fc="#E8F5E9", ec="#1a6b3a", lw=0.8, alpha=0.92),
        zorder=7,
    )

    # Bounce annotation
    last_row = frame.iloc[-1]
    x_last = float(last_row["x"])
    price_ax.annotate(
        f"BOUNCE\n{last_row['close']:.0f}\nVol: {last_row['volume']/1e6:.0f}M",
        xy=(x_last, last_row["close"]),
        xytext=(x_last + 5, last_row["close"] + 70),
        fontsize=8.5, fontweight="bold", color="#0b8f67",
        arrowprops=dict(arrowstyle="->", color="#0b8f67", lw=1.3),
        bbox=dict(boxstyle="round,pad=0.25", fc="#E8F5E9", ec="#0b8f67", lw=0.8, alpha=0.95),
        zorder=7,
    )

    # --- PANEL 2: VOLUME with wave-colored bars and average lines ---
    shade_wave_periods(vol_ax, frame, alpha=0.06)

    # Color volume bars by wave period
    bar_colors = []
    for _, row in frame.iterrows():
        d = row["date"]
        assigned = False
        for wname, (start, end) in WAVE_BOUNDS.items():
            if pd.Timestamp(start) <= d <= pd.Timestamp(end):
                bar_colors.append(WAVE_COLORS[wname])
                assigned = True
                break
        if not assigned:
            bar_colors.append("#aaa")

    vol_ax.bar(frame["x"], frame["vol_m"], color=bar_colors, width=0.72, alpha=0.75)

    # Average volume lines per wave
    for wname, (start, end) in WAVE_BOUNDS.items():
        mask = get_wave_mask(frame, start, end)
        wf = frame.loc[mask]
        if wf.empty:
            continue
        avg_vol = wf["vol_m"].mean()
        x_s, x_e = float(wf["x"].min()), float(wf["x"].max())
        vol_ax.hlines(avg_vol, x_s, x_e, colors=WAVE_COLORS[wname],
                      linewidth=2.2, alpha=0.9, zorder=5)
        # Label
        vol_ax.text(
            (x_s + x_e) / 2, avg_vol + 3,
            f"{WAVE_LABELS_DISPLAY[wname]}\navg={avg_vol:.1f}M",
            fontsize=7, fontweight="bold", color=WAVE_COLORS[wname],
            ha="center", va="bottom",
            bbox=dict(boxstyle="round,pad=0.15", fc="white",
                      ec=WAVE_COLORS[wname], lw=0.6, alpha=0.9),
            zorder=6,
        )

    # W5 vs W3 divergence arrow on volume
    x_w3_mid = get_x(frame, "2025-04-15") or 250
    x_w5_mid = get_x(frame, "2025-12-15") or 450
    vol_ax.annotate(
        "", xy=(x_w5_mid, 48), xytext=(x_w3_mid, 18),
        arrowprops=dict(arrowstyle="<->", color="#FF5722", lw=2.0,
                        connectionstyle="arc3,rad=0.15"),
        zorder=7,
    )
    mid_x_div = (x_w3_mid + x_w5_mid) / 2
    vol_ax.text(
        mid_x_div, 55, "W5 avg = 2.8x W3 avg\nDIVERGENCE!",
        fontsize=8.5, fontweight="bold", color="#FF5722", ha="center",
        bbox=dict(boxstyle="round,pad=0.25", fc="#FFF3E0", ec="#FF5722",
                  lw=0.8, alpha=0.92),
        zorder=7,
    )

    # W2 dry-up annotation
    x_w2_mid = get_x(frame, "2024-12-20") or 200
    mask_w2 = get_wave_mask(frame, "2024-11-19", "2025-01-24")
    w2_avg = frame.loc[mask_w2, "vol_m"].mean()
    vol_ax.annotate(
        f"W2 DRY-UP\navg={w2_avg:.1f}M\n-88% dari W1",
        xy=(x_w2_mid, w2_avg + 1),
        xytext=(x_w2_mid, 35),
        fontsize=7.5, fontweight="bold", color="#FFC107", ha="center",
        arrowprops=dict(arrowstyle="->", color="#FFC107", lw=1.0),
        bbox=dict(boxstyle="round,pad=0.2", fc="#FFF8E1", ec="#FFC107",
                  lw=0.7, alpha=0.92),
        zorder=7,
    )

    # --- PANEL 3: FREQUENCY ---
    shade_wave_periods(freq_ax, frame, alpha=0.06)
    freq_ax.bar(frame["x"], frame["freq_k"], color=bar_colors, width=0.72, alpha=0.65)

    # Avg frequency per wave
    for wname, (start, end) in WAVE_BOUNDS.items():
        mask = get_wave_mask(frame, start, end)
        wf = frame.loc[mask]
        if wf.empty:
            continue
        avg_f = wf["freq_k"].mean()
        x_s, x_e = float(wf["x"].min()), float(wf["x"].max())
        freq_ax.hlines(avg_f, x_s, x_e, colors=WAVE_COLORS[wname],
                       linewidth=1.8, alpha=0.8, zorder=5)

    # W2 capitulation vs current correction comparison
    mask_corr = get_wave_mask(frame, "2026-01-15", "2026-04-14")
    corr_avg_f = frame.loc[mask_corr, "freq_k"].mean()
    w2_avg_f = frame.loc[mask_w2, "freq_k"].mean()
    freq_ax.text(
        0.98, 0.92,
        f"W2 avg freq: {w2_avg_f:.1f}K (capitulated)\n"
        f"Koreksi avg freq: {corr_avg_f:.1f}K (BELUM capitulate!)\n"
        f"Ratio: {corr_avg_f/w2_avg_f:.0f}x  masih tinggi",
        transform=freq_ax.transAxes, ha="right", va="top",
        fontsize=7.5, fontfamily="monospace", color="#F44336", fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.3", fc="#FFEBEE", ec="#F44336",
                  lw=0.8, alpha=0.92),
    )

    # --- PANEL 4: CUMULATIVE NBSA ---
    shade_wave_periods(nbsa_ax, frame, alpha=0.06)

    # Cum NBSA line
    nbsa_ax.plot(frame["x"], frame["cum_nbsa_m"], color="#1565C0", linewidth=2.0, zorder=4)
    nbsa_ax.fill_between(frame["x"], 0, frame["cum_nbsa_m"],
                         where=frame["cum_nbsa_m"] >= 0,
                         color="#42A5F5", alpha=0.15)
    nbsa_ax.fill_between(frame["x"], 0, frame["cum_nbsa_m"],
                         where=frame["cum_nbsa_m"] < 0,
                         color="#EF5350", alpha=0.15)
    nbsa_ax.axhline(0, color="#888", linewidth=0.5, alpha=0.4)

    # Daily NBSA bars (subtle)
    nbsa_colors = ["#2196F3" if v >= 0 else "#EF5350" for v in frame["nbsa_m"]]
    nbsa_ax.bar(frame["x"], frame["nbsa_m"], color=nbsa_colors, width=0.6, alpha=0.35, zorder=2)

    # Key NBSA annotations
    # ATH day negative NBSA
    x_ath = get_x(frame, "2026-01-15")
    if x_ath:
        row_ath = frame.loc[frame["date"] == pd.Timestamp("2026-01-15")].iloc[0]
        nbsa_ax.annotate(
            "ATH: NBSA -2.8M\nAsing JUAL di puncak!",
            xy=(x_ath, row_ath["nbsa_m"]),
            xytext=(x_ath - 25, row_ath["nbsa_m"] - 15),
            fontsize=8, fontweight="bold", color="#D32F2F", ha="center",
            arrowprops=dict(arrowstyle="->", color="#D32F2F", lw=1.2),
            bbox=dict(boxstyle="round,pad=0.25", fc="#FFEBEE", ec="#D32F2F",
                      lw=0.8, alpha=0.92),
            zorder=7,
        )

    # W5 massive buying annotation
    x_w5_start = get_x(frame, "2025-12-01")
    if x_w5_start:
        nbsa_ax.annotate(
            "W5: Asing beli masif\n+95M cumulative\nEuphoria buying!",
            xy=(x_w5_start, frame.loc[frame["date"] == pd.Timestamp("2025-12-01"),
                                       "cum_nbsa_m"].values[0] if not frame.loc[
                frame["date"] == pd.Timestamp("2025-12-01")].empty else 100),
            xytext=(x_w5_start - 40, 130),
            fontsize=8, fontweight="bold", color="#FF5722", ha="center",
            arrowprops=dict(arrowstyle="->", color="#FF5722", lw=1.0),
            bbox=dict(boxstyle="round,pad=0.25", fc="#FFF3E0", ec="#FF5722",
                      lw=0.8, alpha=0.92),
            zorder=7,
        )

    # Correction flat NBSA
    nbsa_ax.text(
        0.98, 0.08,
        "Koreksi: Cum NBSA FLAT\nAsing wait-and-see\nBelum panic exit",
        transform=nbsa_ax.transAxes, ha="right", va="bottom",
        fontsize=8, fontfamily="monospace", color="#1565C0", fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.3", fc="#E3F2FD", ec="#1565C0",
                  lw=0.8, alpha=0.92),
    )

    # ==========================================================
    # SUMMARY BOX on price panel
    # ==========================================================
    summary_box = (
        "FASE 3: VOLUME & MOMENTUM SUMMARY\n"
        "======================================\n"
        "POSITIF:\n"
        "  + Momentum turun melambat (-79%)\n"
        "  + Bounce vol naik progresif\n"
        "  + Bullish engulfing + breakout\n"
        "  + Cum NBSA masih uptrend\n"
        "--------------------------------------\n"
        "WARNING:\n"
        "  ! Vol W5 >> W3 (divergence)\n"
        "  ! Frequency belum capitulate\n"
        "  ! NBSA mixed di bounce\n"
        "  ! Vol koreksi 20x W2 vol\n"
        "======================================\n"
        "Status: EARLY RECOVERY\n"
        "       Belum terkonfirmasi"
    )
    price_ax.text(
        0.005, 0.99, summary_box,
        transform=price_ax.transAxes, ha="left", va="top",
        fontsize=7, fontfamily="monospace", color="#282828",
        bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#333",
                  lw=1.0, alpha=0.94),
    )

    # ==========================================================
    # Volume comparison table box
    # ==========================================================
    vol_table = (
        "VOLUME COMPARISON TABLE:\n"
        "========================\n"
        "Wave  AvgVol  PeakVol  AvgFreq\n"
        "W1    16.0M   273.9M   3.5K\n"
        "W2     1.9M     4.0M   0.2K\n"
        "W3    16.4M    66.9M   3.2K\n"
        "W4    21.7M   222.2M   4.1K\n"
        "W5    46.6M   134.0M   5.8K\n"
        "Corr  38.5M    81.5M   5.1K\n"
        "========================\n"
        "W5/W3 vol ratio: 2.84x\n"
        "Corr/W2 vol: 20x (degree!)"
    )
    price_ax.text(
        0.995, 0.99, vol_table,
        transform=price_ax.transAxes, ha="right", va="top",
        fontsize=6.8, fontfamily="monospace", color="#1565C0",
        bbox=dict(boxstyle="round,pad=0.38", fc="#E3F2FD", ec="#1565C0",
                  lw=0.8, alpha=0.94),
    )

    # ==========================================================
    # Titles and formatting
    # ==========================================================
    fig.suptitle(
        "NICL | Analisa Elliott Wave - Fase 3: Volume, NBSA & Momentum Analysis",
        x=0.06, y=0.99, ha="left", fontsize=18, fontweight="bold", color="#202020",
    )
    price_ax.text(
        0.0, 1.005,
        "Volume divergence W5>>W3 | Selling exhaustion di wave C | "
        "Frequency belum capitulate | Cum NBSA flat di koreksi | "
        "Status: Early Recovery",
        transform=price_ax.transAxes, ha="left", va="bottom",
        fontsize=10, color="#555",
    )

    price_ax.set_ylabel("Harga (Rp)", fontsize=11)
    vol_ax.set_ylabel("Volume\n(Juta lot)", fontsize=10)
    freq_ax.set_ylabel("Freq\n(Ribu)", fontsize=10)
    nbsa_ax.set_ylabel("NBSA\n(Rp Juta)", fontsize=10)
    nbsa_ax.set_xlabel("Waktu trading berurutan", fontsize=11)

    # Format all axes
    for ax in (price_ax, vol_ax, freq_ax, nbsa_ax):
        ax.set_xlim(-1, n + 1)
        ax.grid(axis="y", color="#d9d9d9", linestyle="--", linewidth=0.5, alpha=0.6)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

    ticks, labels = month_ticks(frame)
    nbsa_ax.set_xticks(ticks)
    nbsa_ax.set_xticklabels(labels, rotation=0, fontsize=9)
    for ax in (price_ax, vol_ax, freq_ax):
        ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)

    fig.text(
        0.995, 0.003,
        "Sumber: NICL_eod (1).csv | Ref: Elliott Wave Principle - Frost & Prechter | "
        "Disclaimer: Simulasi probabilitas, bukan nasihat finansial",
        ha="right", va="bottom", fontsize=8.5, color="#5b5b5b",
    )

    # Legend for wave colors
    legend_elements = [
        Line2D([0], [0], color=WAVE_COLORS[w], linewidth=6, alpha=0.6,
               label=f"{WAVE_LABELS_DISPLAY[w]}")
        for w in WAVE_BOUNDS
    ]
    vol_ax.legend(
        handles=legend_elements, loc="upper left", ncol=6,
        fontsize=7.5, framealpha=0.88, edgecolor="#aaa",
    )

    fig.subplots_adjust(top=0.955, bottom=0.045)
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
