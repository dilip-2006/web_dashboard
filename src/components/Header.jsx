import React, { useState } from 'react';
import { 
  Wifi, WifiOff, AlertOctagon, ShieldAlert, Cpu, 
  LayoutDashboard, Navigation, Radio, BarChart3, Settings2, PowerOff, BookOpen
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
    { id: 'COCKPIT', label: 'Operations Cockpit', icon: LayoutDashboard },
    { id: 'DISPATCHER', label: 'Mission Dispatcher', icon: Navigation },
    { id: 'DIAGNOSTICS', label: 'Sensors & Radar', icon: Radio },
    { id: 'ANALYTICS', label: 'Fleet Analytics', icon: BarChart3 }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 sticky top-0 z-50 backdrop-blur-md shadow-md text-white">
      {/* 1. BumbleB Real AMR Fleet Brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-yellow-400 text-slate-950 font-mono font-black text-sm sm:text-base shadow-sm border border-yellow-500 shrink-0">
          <span>B</span>
          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
            connected ? 'bg-emerald-400' : 'bg-yellow-500'
          }`} />
        </div>

        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1 font-mono">
              BUMBLE<span className="text-yellow-400">•</span>B
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 ml-0.5 sm:ml-1">
                AMR #01
              </span>
            </h1>

            <span className={`text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${
              connected 
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {connected ? 'REAL HARDWARE • ROS 2' : 'HARDWARE STANDBY'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 hidden md:block">
            Map: <strong className="text-slate-200">{activeMap}</strong> • Warehouse Autonomous Mobile Robot
          </p>
        </div>
      </div>

      {/* 2. Professional Template Navigation Pills (desktop/tablet) */}
      <div className="hidden md:flex order-3 lg:order-2 w-full lg:w-auto items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shadow-inner gap-1 overflow-x-auto no-scrollbar">
        {templates.map(tmpl => {
          const Icon = tmpl.icon;
          const isActive = activeTemplate === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => onSelectTemplate?.(tmpl.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-yellow-400 text-slate-950 shadow-xs border border-yellow-500 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{tmpl.label}</span>
              <span className="sm:hidden">{tmpl.id}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Connection, State & Emergency Stop */}
      <div className="order-2 lg:order-3 flex items-center gap-1.5 sm:gap-2">
        {/* ROS Bridge Status & Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowConnSettings(!showConnSettings)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
              connected
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Configure WebSocket Bridge URL & Connection"
          >
            {connected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] text-emerald-400 hidden xs:inline">ONLINE</span>
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                <WifiOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] text-slate-300 hidden xs:inline">STANDBY</span>
              </>
            )}
            <Settings2 className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {/* Connection Popover */}
          {showConnSettings && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-84 max-w-[calc(100vw-1.5rem)] p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-xs z-50 font-mono space-y-3 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-yellow-400" />
                  BumbleB rosbridge
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  connected ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {connected ? 'CONNECTED • LIVE' : 'HARDWARE STANDBY'}
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Robot WebSocket Bridge URL:</label>
                <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
                  <input
                    type="text"
                    value={customWsUrl}
                    onChange={(e) => setCustomWsUrl(e.target.value)}
                    placeholder="ws://localhost:9090"
                    className="flex-1 min-w-[140px] bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-yellow-400 font-mono"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReconnect(customWsUrl)}
                      className="px-2.5 sm:px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      {connected ? 'Reconnect' : 'Connect'}
                    </button>
                    {connected && (
                      <button
                        onClick={() => {
                          onDisconnectRos?.();
                          setShowConnSettings(false);
                        }}
                        className="px-2 sm:px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                        title="Disconnect WebSocket"
                      >
                        <PowerOff className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[10px] text-slate-400">
                <div>Quick Presets:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setCustomWsUrl('ws://localhost:9090');
                      handleReconnect('ws://localhost:9090');
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                  >
                    localhost:9090
                  </button>
                  <button
                    onClick={() => {
                      setCustomWsUrl('ws://192.168.1.100:9090');
                      handleReconnect('ws://192.168.1.100:9090');
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                  >
                    192.168.1.100:9090
                  </button>
                  <button
                    onClick={() => {
                      setCustomWsUrl('ws://bumbleb.local:9090');
                      handleReconnect('ws://bumbleb.local:9090');
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                  >
                    bumbleb.local:9090
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowConnSettings(false)}
                className="text-[10px] text-slate-400 hover:text-white block text-right w-full pt-1 cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Disconnect / Connect Button */}
        {connected ? (
          <button
            onClick={onDisconnectRos}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Disconnect from ROS 2 WebSocket bridge"
          >
            <PowerOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="hidden sm:inline">DISCONNECT</span>
            <span className="sm:hidden">DISC</span>
          </button>
        ) : (
          <button
            onClick={() => onConnectRos?.(customWsUrl)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 border border-yellow-500 font-mono text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Connect to ROS 2 WebSocket bridge"
          >
            <Wifi className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="hidden sm:inline">CONNECT</span>
            <span className="sm:hidden">CONN</span>
          </button>
        )}

        {/* Warehouse SOP Procedure Guide Button */}
        {onOpenSop && (
          <button
            onClick={onOpenSop}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-yellow-400 font-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Warehouse Operating Procedure Guide (SOP)"
          >
            <BookOpen className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="hidden md:inline">SOP GUIDE</span>
            <span className="md:hidden">SOP</span>
          </button>
        )}

        {/* State Badge */}
        <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${
          isEstop ? 'bg-red-950 border-red-600 text-red-300 animate-estop text-white' :
          state === 'NAVIGATION' ? 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300' :
          state === 'MAPPING' ? 'bg-purple-950/80 border-purple-500/60 text-purple-300' :
          'bg-slate-800 border-slate-700 text-yellow-400'
        }`}>
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">{state}</span>
        </div>

        {/* Emergency Stop Button */}
        {isEstop ? (
          <button
            onClick={onResetEmergencyStop}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">RESET </span><span>E-STOP</span>
          </button>
        ) : (
          <button
            onClick={onEmergencyStop}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
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
