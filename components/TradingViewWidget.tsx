'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  ticker: string;
  height?: string | number;
}

function TradingViewWidgetComponent({ ticker, height = '100%' }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Map ticker to TradingView IDX symbol
  const getTradingViewSymbol = (t: string) => {
    const clean = t.trim().toUpperCase().replace('.JK', '');
    if (clean === 'IHSG' || clean === '^JKSE' || clean === 'COMPOSITE') {
      return 'IDX:COMPOSITE';
    }
    return `IDX:${clean}`;
  };

  const symbol = getTradingViewSymbol(ticker);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Asia/Jakarta',
      theme: 'dark',
      style: '1', // Candlestick
      locale: 'id',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#080c14',
      gridColor: 'rgba(34, 53, 82, 0.4)',
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div
      className="tradingview-widget-container w-full rounded-xl overflow-hidden border border-terminal-800 bg-terminal-950 shadow-xl"
      ref={containerRef}
      style={{ height: height }}
    >
      <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
    </div>
  );
}

export default memo(TradingViewWidgetComponent);
