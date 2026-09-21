import React, { useState } from 'react';
import { Activity, Battery, Cpu, Gauge, Navigation, Radio, Shield, Zap, Pause, Play } from 'lucide-react';

export default function ScrollingTicker({
  systemState,
  robotPose,
  velocity,
  battery,
  navStatus,
  connected,
  onItemClick
}) {
  const [isPaused, setIsPaused] = useState(false);

  const x = Number(robotPose?.x || 0).toFixed(2);
  const y = Number(robotPose?.y || 0).toFixed(2);
  const yaw = Number(robotPose?.yaw_deg ?? ((robotPose?.yaw || 0) * 180 / Math.PI)).toFixed(1);
  const linVel = Math.abs(Number(velocity?.linear || 0)).toFixed(2);
  const batPct = Math.round((battery?.percentage || 0.95) * 100);
  const batVolt = Number(battery?.voltage || 25.4).toFixed(1);
  const state = systemState?.state || 'READY';
  const activeMap = systemState?.active_map || 'warehouse_main';
  const isEstop = systemState?.is_emergency_stop;

  const tickerItems = [
    {
      id: 'fleet',
      icon: Shield,
      color: 'text-yellow-400',
      label: 'FLEET',
      value: 'BUMBLE•B #01',
      badge: connected ? 'ONLINE (REAL AMR)' : 'HARDWARE STANDBY',
      badgeColor: connected ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'mode',
      icon: Cpu,
      color: 'text-yellow-400',
      label: 'MODE',
      value: state,
      badge: isEstop ? 'E-STOP' : 'ACTIVE',
      badgeColor: isEstop ? 'bg-red-950 text-red-300 border-red-800' : 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'pose',
      icon: Navigation,
      color: 'text-cyan-400',
      label: 'POSE',
      value: `X:${x}m Y:${y}m θ:${yaw}°`,
      badge: activeMap,
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
    },
    {
      id: 'speed',
      icon: Gauge,
      color: 'text-emerald-400',
      label: 'SPEED',
      value: `${linVel} m/s`,
      badge: '50Hz',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
    },
    {
      id: 'battery',
      icon: Battery,
      color: 'text-yellow-400',
      label: 'POWER',
      value: `${batPct}% (${batVolt}V)`,
      badge: 'NOMINAL',
      badgeColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-800'
    },
    {
      id: 'nav',
      icon: Activity,
      color: 'text-purple-400',
      label: 'NAV2',
      value: navStatus?.status || 'IDLE',
      badge: navStatus?.target ? navStatus.target : 'STANDBY',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800'
    },
    {
      id: 'sensors',
      icon: Radio,
      color: 'text-red-400',
      label: 'LIDAR',
      value: 'RPLiDAR A1 (10.2 Hz)',
      badge: '360° FOV',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'canbus',
      icon: Zap,
      color: 'text-yellow-400',
      label: 'CAN-BUS',
      value: 'ZLAC706 DUAL MOTORS',
      badge: '0 ERR',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
    }
  ];

  const displayItems = [...tickerItems, ...tickerItems];

  return (
    <div className="relative bg-slate-950 border-b border-slate-800 overflow-hidden py-1 px-3 flex items-center text-xs font-mono select-none text-slate-300">
      {/* Fixed Left Tag */}
      <div className="shrink-0 flex items-center gap-2 pr-3 mr-3 border-r border-slate-800 z-10 bg-slate-950">
        <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="font-extrabold text-yellow-400 text-[10px] uppercase tracking-wider">
          TELEMETRY
        </span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-0.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isPaused ? 'Resume Ticker' : 'Pause Ticker'}
        >
          {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
        </button>
      </div>

      {/* Scrolling Ticker Line */}
      <div className="ticker-wrap flex-1 overflow-hidden">
        <div
          className="ticker-move flex items-center gap-6"
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        >
          {displayItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.id}-${index}`}
                onClick={() => onItemClick?.(item.id)}
                className="flex items-center gap-1.5 cursor-pointer py-0.5 px-2 rounded hover:bg-slate-900 transition-colors shrink-0"
              >
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-slate-400 text-[10px] font-semibold">{item.label}:</span>
                <span className="text-white font-bold text-[11px]">{item.value}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${item.badgeColor}`}>
                  {item.badge}
                </span>
                <span className="text-slate-600 mx-1">•</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
