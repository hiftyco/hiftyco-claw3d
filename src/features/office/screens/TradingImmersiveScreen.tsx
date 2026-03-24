"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  Clock,
  Shield,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface TradingData {
  btcPrice: number;
  btcChange24h: number;
  fearGreed: number;
  fearGreedUpdated: string;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  rsiCompliance: number;
  riskPerTrade: number;
  positionSize: number;
  maxDrawdown: number;
  consecLoss: number;
  portfolioRisk: string;
  apiCalls: number;
  apiCallsThisHour: number;
  recentTrades: TradingTrade[];
  cronJobs: CronJob[];
  channels: Channel[];
  liveLogs: LiveLog[];
  agentStatus: AgentStatus[];
}

interface TradingTrade {
  id: number;
  date: string;
  entry: number;
  exit: number;
  rr: string;
  pnl: number;
  status: "win" | "loss" | "pending";
}

interface CronJob {
  name: string;
  nextRun: string;
  status: "ready" | "running" | "paused";
}

interface Channel {
  name: string;
  icon: string;
  count: number;
}

interface LiveLog {
  time: string;
  message: string;
}

interface AgentStatus {
  name: string;
  status: "active" | "idle" | "error";
  task: string;
  cost: string;
}

const RSI_COLOR = (rsi: number) => {
  if (rsi <= 30) return "text-emerald-400";
  if (rsi >= 70) return "text-red-400";
  return "text-amber-400";
};

const RSI_LABEL = (rsi: number) => {
  if (rsi <= 30) return "OVERSOLD";
  if (rsi >= 70) return "OVERBOUGHT";
  return "NEUTRAL";
};

const FG_COLOR = (fg: number) => {
  if (fg <= 25) return "text-red-400";
  if (fg <= 45) return "text-orange-400";
  if (fg <= 55) return "text-yellow-400";
  if (fg <= 75) return "text-lime-400";
  return "text-emerald-400";
};

const FG_LABEL = (fg: number) => {
  if (fg <= 25) return "Extreme Fear";
  if (fg <= 45) return "Fear";
  if (fg <= 55) return "Neutral";
  if (fg <= 75) return "Greed";
  return "Extreme Greed";
};

const RISK_COLOR = (risk: string) => {
  if (risk === "SAFE") return "text-emerald-400";
  if (risk === "ELEVATED") return "text-orange-400";
  return "text-red-400";
};

const STATUS_COLOR = (status: "ready" | "running" | "paused") => {
  if (status === "running") return "text-cyan-400";
  if (status === "paused") return "text-orange-400";
  return "text-emerald-400";
};

const AGENT_STATUS_COLOR = (status: "active" | "idle" | "error") => {
  if (status === "active") return "bg-emerald-400";
  if (status === "error") return "bg-red-400";
  return "bg-gray-400";
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

const formatNumber = (val: number) =>
  new Intl.NumberFormat("en-US").format(val);

export function TradingImmersiveScreen() {
  const [data, setData] = useState<TradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchTradingData = useCallback(async () => {
    try {
      // Try to fetch from the hifty-mission-control server-api
      let tradingData: Partial<TradingData> = {};
      
      try {
        const res = await fetch("/api/trading/data", { 
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          tradingData = await res.json();
        }
      } catch {
        // API not available - use mock data for demo
      }

      // If no API data, use the live GitHub Pages data
      if (!tradingData.btcPrice) {
        try {
          const response = await fetch("https://hiftyco.github.io/hiftyco-mission-control/");
          const html = await response.text();
          // Parse the live dashboard data from the page
          const priceMatch = html.match(/Bitcoin Price[\s\S]*?\$([0-9,]+)/);
          const changeMatch = html.match(/\(([+-]?[\d.]+)%\s*\(24h\)/);
          const fgMatch = html.match(/Fear & Greed[\s\S]*?(\d+)/);
          
          Object.assign(tradingData, {
            btcPrice: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 71200,
            btcChange24h: changeMatch ? parseFloat(changeMatch[1]) : -2.5,
            fearGreed: fgMatch ? parseInt(fgMatch[1]) : 28,
            fearGreedUpdated: "23:59",
          });
        } catch {
          // Fallback defaults
          Object.assign(tradingData, {
            btcPrice: 71200,
            btcChange24h: -2.5,
            fearGreed: 28,
            fearGreedUpdated: "23:59",
          });
        }
      }

      // Merge with defaults
      const merged: TradingData = {
        btcPrice: tradingData.btcPrice ?? 71200,
        btcChange24h: tradingData.btcChange24h ?? -2.5,
        fearGreed: tradingData.fearGreed ?? 28,
        fearGreedUpdated: tradingData.fearGreedUpdated ?? "23:59",
        totalPnl: tradingData.totalPnl ?? 15399.06,
        winRate: tradingData.winRate ?? 100,
        totalTrades: tradingData.totalTrades ?? 4,
        avgWin: tradingData.avgWin ?? 3850,
        rsiCompliance: tradingData.rsiCompliance ?? 33,
        riskPerTrade: tradingData.riskPerTrade ?? 2,
        positionSize: tradingData.positionSize ?? 200,
        maxDrawdown: tradingData.maxDrawdown ?? 0,
        consecLoss: tradingData.consecLoss ?? 0,
        portfolioRisk: tradingData.portfolioRisk ?? "LOW",
        apiCalls: tradingData.apiCalls ?? 847,
        apiCallsThisHour: tradingData.apiCallsThisHour ?? 127,
        recentTrades: tradingData.recentTrades ?? [
          { id: 4, date: "Mar 18", entry: 66439, exit: 67740, rr: "2:1", pnl: 4000, status: "win" },
          { id: 3, date: "Mar 17", entry: 82100, exit: 84500, rr: "2:1", pnl: 4004, status: "win" },
          { id: 2, date: "Mar 16", entry: 78500, exit: 81940, rr: "2:1", pnl: 4930, status: "win" },
          { id: 1, date: "Mar 15", entry: 67200, exit: 69664, rr: "2:1", pnl: 2465, status: "win" },
        ],
        cronJobs: tradingData.cronJobs ?? [
          { name: "Morning Briefing", nextRun: "8:00 AM", status: "ready" },
          { name: "System Check", nextRun: "8:00 AM", status: "running" },
          { name: "Weather", nextRun: "8:00 AM", status: "ready" },
          { name: "Research", nextRun: "—", status: "paused" },
        ],
        channels: tradingData.channels ?? [
          { name: "Telegram", icon: "✈️", count: 12 },
          { name: "WhatsApp", icon: "📱", count: 0 },
          { name: "Discord", icon: "🎮", count: 5 },
          { name: "WebChat", icon: "💬", count: 3 },
        ],
        liveLogs: tradingData.liveLogs ?? [
          { time: "23:52", message: "BTC Price: $71,200 (-2.50%)" },
          { time: "23:51", message: "Trade #4 closed: +$4,000" },
          { time: "23:45", message: "Risk check: All clear" },
          { time: "23:40", message: "RSI Compliance at 33%" },
          { time: "23:30", message: "MintyTrades: Scanning for setups" },
          { time: "23:15", message: "BTC RSI 5m: 48 | 1h: 52 | Daily: 65" },
        ],
        agentStatus: tradingData.agentStatus ?? [
          { name: "Ollie (CEO)", status: "active", task: "Commanding team", cost: "$0.00" },
          { name: "MintyTrades", status: "active", task: "Market analysis", cost: "$0.02" },
          { name: "HiftyAnalyst", status: "idle", task: "Research", cost: "$0.01" },
          { name: "HiftyCodes", status: "idle", task: "Dev work", cost: "$0.00" },
          { name: "HiftyRiskManager", status: "active", task: "Monitoring risk", cost: "$0.01" },
        ],
      };

      setData(merged);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trading data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTradingData();
    const interval = setInterval(() => void fetchTradingData(), 30000);
    return () => clearInterval(interval);
  }, [fetchTradingData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="font-mono text-sm text-cyan-200/60">Loading trading data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <span className="font-mono text-sm text-red-200/60">{error || "No data"}</span>
          <button
            onClick={() => void fetchTradingData()}
            className="rounded border border-red-500/30 bg-red-950/30 px-4 py-2 font-mono text-xs text-red-300 transition-colors hover:bg-red-900/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isBearish = data.btcChange24h < 0;

  return (
    <div className="h-full overflow-y-auto bg-black/95 font-mono text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Hifty Trading Room</div>
              <div className="text-xs text-white/40">
                {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Live"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded bg-emerald-500/20 px-2 py-1 font-mono text-xs text-emerald-400">
              ● LIVE
            </div>
            <button
              onClick={() => void fetchTradingData()}
              className="rounded border border-white/20 p-1.5 text-white/40 transition-colors hover:border-white/40 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* BTC Banner */}
        <div className={`rounded-lg border ${isBearish ? "border-red-500/30 bg-red-950/20" : "border-emerald-500/30 bg-emerald-950/20"} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">₿</span>
              <div>
                <div className="text-xs text-white/50">Bitcoin Price</div>
                <div className="text-2xl font-bold">{formatCurrency(data.btcPrice)}</div>
                <div className={`flex items-center gap-1 text-sm ${isBearish ? "text-red-400" : "text-emerald-400"}`}>
                  {isBearish ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                  <span>{isBearish ? "" : "+"}{data.btcChange24h.toFixed(2)}% (24h)</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Fear & Greed</div>
              <div className={`text-3xl font-bold ${FG_COLOR(data.fearGreed)}`}>{data.fearGreed}</div>
              <div className={`text-xs ${FG_COLOR(data.fearGreed)}`}>{FG_LABEL(data.fearGreed)}</div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-white/40">
              <DollarSign className="h-3 w-3" /> Total P&L
            </div>
            <div className="text-lg font-bold text-emerald-400">{formatCurrency(data.totalPnl)}</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-white/40">
              <Percent className="h-3 w-3" /> Win Rate
            </div>
            <div className="text-lg font-bold text-white">{data.winRate}%</div>
            <div className="text-xs text-white/30">{data.totalTrades}/4 Trades</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-white/40">
              <Activity className="h-3 w-3" /> RSI Compliance
            </div>
            <div className={`text-lg font-bold ${data.rsiCompliance < 100 ? "text-orange-400" : "text-emerald-400"}`}>
              {data.rsiCompliance}%
            </div>
            <div className="text-xs text-white/30">Target: 100%</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-white/40">
              <BarChart3 className="h-3 w-3" /> Avg Win
            </div>
            <div className="text-lg font-bold text-white">{formatCurrency(data.avgWin)}</div>
            <div className="text-xs text-white/30">Per Trade</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-white/40">
              <Shield className="h-3 w-3" /> Risk/Trade
            </div>
            <div className="text-lg font-bold text-white">{data.riskPerTrade}%</div>
            <div className="text-xs text-white/30">Pos: {formatCurrency(data.positionSize)}</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-white/40">
              <AlertTriangle className="h-3 w-3" /> Max DD
            </div>
            <div className="text-lg font-bold text-white">{data.maxDrawdown}%</div>
            <div className="text-xs text-white/30">Consec Loss: {data.consecLoss}</div>
          </div>
        </div>

        {/* Agent Status */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            <Activity className="h-3 w-3" /> Agent Workspace
            <span className={`ml-1 h-2 w-2 rounded-full ${data.agentStatus.some(a => a.status === "active") ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
          </div>
          <div className="space-y-1.5">
            {data.agentStatus.map((agent) => (
              <div key={agent.name} className="flex items-center gap-2.5 rounded border border-white/10 bg-white/5 px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${AGENT_STATUS_COLOR(agent.status)} ${agent.status === "active" ? "animate-pulse" : ""}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-white">{agent.name}</div>
                  <div className="truncate text-xs text-white/30">{agent.task}</div>
                </div>
                <div className="font-mono text-xs text-emerald-400">{agent.cost}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            <BarChart3 className="h-3 w-3" /> Recent Trades
            <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">{data.recentTrades.length} Trades</span>
          </div>
          <div className="rounded border border-white/10 bg-white/5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Entry</th>
                  <th className="px-3 py-2 text-right font-medium">Exit</th>
                  <th className="px-3 py-2 text-center font-medium">R:R</th>
                  <th className="px-3 py-2 text-right font-medium">P&L</th>
                  <th className="px-3 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-white/60">{trade.id}</td>
                    <td className="px-3 py-2 text-white/80">{trade.date}</td>
                    <td className="px-3 py-2 text-right font-mono">${trade.entry.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">${trade.exit.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center font-mono text-white/60">{trade.rr}</td>
                    <td className={`px-3 py-2 text-right font-mono ${trade.status === "win" ? "text-emerald-400" : "text-red-400"}`}>
                      {trade.status === "win" ? "+" : ""}{formatCurrency(trade.pnl)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {trade.status === "win" ? (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-400">WIN</span>
                      ) : trade.status === "loss" ? (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">LOSS</span>
                      ) : (
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">PENDING</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cron Jobs */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            <Clock className="h-3 w-3" /> Cron Jobs
            <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">{data.cronJobs.length} Active</span>
          </div>
          <div className="space-y-1.5">
            {data.cronJobs.map((job) => (
              <div key={job.name} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${STATUS_COLOR(job.status)}`}>●</span>
                  <span className="text-xs text-white/80">{job.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-white/40">{job.nextRun}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    job.status === "running" ? "bg-cyan-500/20 text-cyan-400" :
                    job.status === "paused" ? "bg-orange-500/20 text-orange-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            <Activity className="h-3 w-3" /> Live Activity
          </div>
          <div className="space-y-0.5 rounded border border-white/10 bg-white/5 p-2 font-mono text-xs">
            {data.liveLogs.map((log, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-white/30">{log.time}</span>
                <span className="text-white/60">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Channels
          </div>
          <div className="flex gap-2">
            {data.channels.map((ch) => (
              <div key={ch.name} className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1.5">
                <span className="text-sm">{ch.icon}</span>
                <span className="text-xs text-white/60">{ch.name}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/80">{ch.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
