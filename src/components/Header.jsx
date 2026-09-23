import React, { useState } from 'react';
import { 
  Wifi, WifiOff, AlertOctagon, ShieldAlert, Cpu,
  LayoutDashboard, Navigation, Settings2, PowerOff, BookOpen, Bot, Terminal
} from 'lucide-react';

export default function Header({ 
  connected, 
  systemState, 
  rosUrl, 
  onConnectRos, 
  onDisconnectRos,
  onEmergencyStop, 
  onResetEmergencyStop,
  activeTemplate,
  onSelectTemplate,
  onOpenSop
}) {
  const isEstop = systemState?.is_emergency_stop || systemState?.state === 'EMERGENCY_STOP';
  const state = systemState?.state || 'READY';
  const activeMap = systemState?.active_map || 'warehouse_main';
  const [showConnSettings, setShowConnSettings] = useState(false);
  const [customWsUrl, setCustomWsUrl] = useState(rosUrl || 'ws://localhost:9090');

  const handleReconnect = (urlToConnect) => {
    const target = urlToConnect || customWsUrl;
    if (onConnectRos) {
      onConnectRos(target);
    }
  };

  const templates = [
    { id: 'COCKPIT', label: 'Cockpit', icon: LayoutDashboard },
    { id: 'DISPATCHER', label: 'POI Dispatcher', icon: Navigation },
    { id: 'ANALYTICS', label: 'System Logs', icon: Terminal },
  ];

  return (
    <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-50 shadow-md text-white">
      {/* 1. BUMBLEB AMR Aesthetic Autonomous Robot Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-mono font-black text-sm sm:text-base shadow-md border border-orange-400/50 shrink-0">
          <Bot className="w-5 h-5 text-white" />
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 ${
            connected ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
        </div>

        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1 font-mono">
              BUMBLEB
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 ml-0.5">
                AMR
              </span>
            </h1>

            <span className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap hidden xs:inline-block ${
              connected 
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/70' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {connected ? 'AUTONOMOUS • ROS 2' : 'HARDWARE STANDBY'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 hidden lg:block leading-tight mt-0.5">
            Map: <strong className="text-slate-200">{activeMap}</strong> • Precision Autonomous Robot Console
          </p>
        </div>
      </div>

      {/* 2. Professional Template Navigation Pills (Glassmorphic Segmented Control) */}
      <div className="hidden md:flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner gap-1">
        {templates.map(tmpl => {
          const Icon = tmpl.icon;
          const isActive = activeTemplate === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => onSelectTemplate?.(tmpl.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm border border-orange-400/50 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tmpl.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Connection, State & Emergency Stop */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* ROS Bridge Status & Settings Button */}
        {/* Unified Bridge Connection & Control Pill */}
        <div className="relative flex items-center rounded-2xl bg-slate-900/90 border border-slate-800 p-0.5 shadow-inner">
          {/* Status & Config Toggle */}
          <button
            onClick={() => setShowConnSettings(!showConnSettings)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              connected
                ? 'text-emerald-400 hover:bg-slate-800/90'
                : 'text-amber-400 hover:bg-slate-800/90'
            }`}
            title="Configure WebSocket Bridge URL & Presets"
          >
            {connected ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            )}
            <span className="text-[10px] sm:text-xs">
              {connected ? 'ONLINE' : 'STANDBY'}
            </span>
            <Settings2 className="w-3 h-3 text-slate-400 ml-0.5 opacity-60" />
          </button>

          {/* Thin Hairline Divider */}
          <div className="h-4 w-[1px] bg-slate-800 my-auto" />

          {/* Connect / Disconnect Action Button */}
          {connected ? (
            <button
              onClick={onDisconnectRos}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-mono font-bold text-red-400 hover:text-white hover:bg-red-950/80 transition-all cursor-pointer active:scale-95"
              title="Disconnect from ROS 2 WebSocket bridge"
            >
              <PowerOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>DISCONNECT</span>
            </button>
          ) : (
            <button
              onClick={() => onConnectRos?.(customWsUrl)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-mono font-extrabold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Connect to ROS 2 WebSocket bridge"
            >
              <Wifi className="w-3.5 h-3.5 text-white shrink-0" />
              <span>CONNECT</span>
            </button>
          )}

          {/* Connection Popover Dialog */}
          {showConnSettings && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-84 max-w-[calc(100vw-1.5rem)] p-4 bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl text-xs z-50 font-mono space-y-3.5 text-white backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-orange-400" />
                  BUMBLEB rosbridge
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  connected ? 'bg-emerald-900/80 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {connected ? 'LIVE • ONLINE' : 'HARDWARE STANDBY'}
                </span>
              </div>

              {/* Target WebSocket URL Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block font-semibold">
                  Target WebSocket Bridge URL:
                </label>
                <input
                  type="text"
                  value={customWsUrl}
                  onChange={(e) => setCustomWsUrl(e.target.value)}
                  placeholder="ws://localhost:9090"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500 font-mono"
                />

                {/* Symmetrical Connect & Disconnect Button Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleReconnect(customWsUrl)}
                    className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>{connected ? 'Reconnect' : 'Connect'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onDisconnectRos?.();
                      setShowConnSettings(false);
                    }}
                    disabled={!connected}
                    className="w-full py-2 bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-300 border border-slate-700 hover:border-red-800 font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Disconnect WebSocket"
                  >
                    <PowerOff className="w-3.5 h-3.5 text-red-400" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <div className="font-semibold text-slate-400">Quick Presets:</div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setCustomWsUrl('ws://localhost:9090');
                      handleReconnect('ws://localhost:9090');
                    }}
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-center font-mono cursor-pointer truncate"
                    title="localhost:9090"
                  >
                    localhost:9090
                  </button>
                  <button
                    onClick={() => {
                      setCustomWsUrl('ws://192.168.1.100:9090');
                      handleReconnect('ws://192.168.1.100:9090');
                    }}
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-center font-mono cursor-pointer truncate"
                    title="192.168.1.100:9090"
                  >
                    192.168.1.100
                  </button>
                  <button
                    onClick={() => {
                      setCustomWsUrl('ws://bumbleb.local:9090');
                      handleReconnect('ws://bumbleb.local:9090');
                    }}
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-center font-mono cursor-pointer truncate"
                    title="bumbleb.local:9090"
                  >
                    bumbleb.local
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowConnSettings(false)}
                className="text-[10px] text-slate-400 hover:text-white block text-center w-full pt-1.5 border-t border-slate-800/80 cursor-pointer font-semibold"
              >
                Close Settings
              </button>
            </div>
          )}
        </div>

        {/* Standard Operating Procedure (SOP) Guide Button */}
        {onOpenSop && (
          <button
            onClick={onOpenSop}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-orange-400 hover:text-orange-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Standard Operating Procedure (SOP) Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden lg:inline">SOP GUIDE</span>
            <span className="lg:hidden">SOP</span>
          </button>
        )}

        {/* State Badge */}
        <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${
          isEstop ? 'bg-red-950 border-red-600 text-red-300 animate-estop text-white' :
          state === 'NAVIGATION' ? 'bg-orange-950/80 border-orange-500/60 text-orange-300' :
          state === 'MAPPING' ? 'bg-purple-950/80 border-purple-500/60 text-purple-300' :
          'bg-slate-800/90 border-slate-700 text-orange-400'
        }`}>
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">{state}</span>
        </div>

        {/* Emergency Stop Button (Claymorphic Tactile E-STOP) */}
        {isEstop ? (
          <button
            onClick={onResetEmergencyStop}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-mono font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap border border-emerald-500/40"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">RESET </span><span>E-STOP</span>
          </button>
        ) : (
          <button
            onClick={onEmergencyStop}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-mono font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap border border-red-500/40"
            title="Immediate zero-velocity motor clamp"
          >
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>E-STOP</span>
          </button>
        )}
      </div>
    </header>
  );
}
