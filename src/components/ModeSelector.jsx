import React from 'react';
import { Power, Layers, Compass, Navigation, Cpu } from 'lucide-react';

export default function ModeSelector({ systemState, onCommand, activeMap }) {
  const currentMode = systemState?.state || 'READY';
  const isEstop = systemState?.is_emergency_stop || systemState?.state === 'EMERGENCY_STOP';

  const modes = [
    {
      id: 'READY',
      label: 'READY',
      sublabel: 'Drives Armed',
      icon: Power,
      isActive: currentMode === 'READY' || currentMode === 'OFF',
      activeStyle: 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 text-white border-emerald-300/90 ring-2 ring-emerald-400/40 shadow-md',
      activeBadge: 'bg-emerald-950/80 text-emerald-200 border-emerald-400/50',
      activeBadgeText: 'LIVE READY',
      dotColor: 'bg-emerald-300',
      pingColor: 'bg-emerald-400',
      iconGlow: 'text-emerald-100',
      action: () => onCommand({ action: 'start_robot' }),
    },
    {
      id: 'MAPPING',
      label: 'MAPPING',
      sublabel: 'SLAM 2D Carto',
      icon: Layers,
      isActive: currentMode === 'MAPPING',
      activeStyle: 'bg-gradient-to-br from-purple-800 via-purple-900 to-slate-950 text-white border-purple-400 ring-2 ring-purple-400/40 shadow-md',
      activeBadge: 'bg-purple-950/80 text-purple-200 border-purple-400/60',
      activeBadgeText: 'ACTIVE SLAM',
      dotColor: 'bg-purple-300',
      pingColor: 'bg-purple-400',
      iconGlow: 'text-purple-200',
      action: () => {
        if (currentMode === 'MAPPING') {
          onCommand({ action: 'stop_mapping' });
        } else {
          onCommand({ action: 'start_mapping' });
        }
      },
    },
    {
      id: 'LOCALIZATION',
      label: 'AMCL',
      sublabel: '2D Pose Lock',
      icon: Compass,
      isActive: currentMode === 'LOCALIZATION',
      activeStyle: 'bg-gradient-to-br from-teal-700 via-teal-900 to-slate-950 text-white border-teal-400 ring-2 ring-teal-400/40 shadow-md',
      activeBadge: 'bg-teal-950/80 text-teal-200 border-teal-400/60',
      activeBadgeText: 'LOCKED',
      dotColor: 'bg-teal-300',
      pingColor: 'bg-teal-400',
      iconGlow: 'text-teal-200',
      action: () => {
        if (currentMode === 'LOCALIZATION') {
          onCommand({ action: 'stop_localization' });
        } else {
          onCommand({ action: 'start_localization', map_name: activeMap });
        }
      },
    },
    {
      id: 'NAVIGATION',
      label: 'NAV2',
      sublabel: 'Full Autonomy',
      icon: Navigation,
      isActive: currentMode === 'NAVIGATION',
      activeStyle: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white border-orange-300 ring-2 ring-orange-300/50 shadow-md',
      activeBadge: 'bg-orange-800/90 text-white border-orange-300/60',
      activeBadgeText: 'ARMED',
      dotColor: 'bg-white',
      pingColor: 'bg-orange-200',
      iconGlow: 'text-white',
      action: () => {
        if (currentMode === 'NAVIGATION') {
          onCommand({ action: 'stop_navigation' });
        } else {
          onCommand({ action: 'start_navigation', map_name: activeMap });
        }
      },
    },
  ];

  return (
    <div className="clay-card flex flex-col justify-between h-full overflow-hidden">
      {/* Header */}
      <div className="panel-header py-2.5 px-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold text-white text-xs font-mono">
          <Cpu className="w-4 h-4 text-orange-500" />
          AUTONOMY COMMAND DECK
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className={`px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${
            isEstop 
              ? 'bg-red-950 border-red-600 text-red-300 animate-pulse text-white' 
              : currentMode === 'NAVIGATION' 
              ? 'bg-orange-500 text-white border-orange-400 shadow-xs' 
              : currentMode === 'MAPPING' 
              ? 'bg-purple-950/80 border-purple-500 text-purple-300' 
              : currentMode === 'LOCALIZATION'
              ? 'bg-teal-950/80 border-teal-500 text-teal-300'
              : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 shadow-xs'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              isEstop ? 'bg-red-400 animate-ping' :
              currentMode === 'NAVIGATION' ? 'bg-white animate-ping' :
              'bg-emerald-400 animate-ping'
            }`} />
            <span>{isEstop ? 'E-STOP' : currentMode === 'OFF' ? 'STANDBY' : currentMode === 'READY' ? 'READY • LIVE' : currentMode}</span>
          </span>
        </div>
      </div>

      {/* 4 Tactile Autonomy Mode Cards */}
      <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono flex-1">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={m.action}
              className={`relative overflow-hidden p-3 rounded-2xl flex flex-col justify-between items-start transition-all cursor-pointer select-none text-left border active:scale-95 group ${
                m.isActive
                  ? m.activeStyle
                  : 'clay-inset bg-slate-50 border-slate-200/90 hover:border-slate-300 text-slate-800 hover:bg-slate-100/60'
              }`}
              title={`Switch autonomy state to ${m.label}`}
            >
              {/* Subtle top glossy highlight shimmer for active card */}
              {m.isActive && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
              )}

              {/* Top row: Icon + Status Pill */}
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-1.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${
                  m.isActive 
                    ? 'bg-white/20 border-white/30 text-white shadow-xs backdrop-blur-xs' 
                    : 'bg-white border-slate-200 text-slate-700 group-hover:text-orange-600 group-hover:border-orange-300 shadow-xs'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${m.isActive ? (m.iconGlow || 'text-white') : ''}`} />
                </div>
                
                <span className={`text-[8.5px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                  m.isActive ? m.activeBadge : 'bg-slate-200/80 text-slate-500 border-slate-300/60'
                }`}>
                  {m.isActive && (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${m.pingColor || 'bg-white'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${m.dotColor || 'bg-white'}`}></span>
                    </span>
                  )}
                  <span>{m.isActive ? m.activeBadgeText : 'OFF'}</span>
                </span>
              </div>

              {/* Bottom row: Mode Label + Sublabel */}
              <div className="w-full">
                <div className="flex items-baseline justify-between">
                  <div className={`text-sm font-black tracking-tight ${
                    m.isActive ? 'text-white drop-shadow-xs' : 'text-slate-900 group-hover:text-orange-600'
                  }`}>
                    {m.label}
                  </div>
                  {m.isActive && m.id === 'READY' && (
                    <span className="text-[9px] font-bold text-emerald-200 tracking-wider">ON</span>
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 font-medium ${
                  m.isActive ? 'text-white/80' : 'text-slate-400'
                }`}>
                  {m.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
