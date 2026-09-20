import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, Activity, Clock, Terminal, Search, Download, Trash2, 
  CheckCircle2, AlertTriangle, ShieldAlert, Cpu, ArrowDownCircle, 
  Sparkles, Check, Filter, Layers, Navigation
} from 'lucide-react';

export default function AnalyticsTemplate({
  systemState,
  robotPose,
  velocity,
  battery,
  navStatus
}) {
  const [logs, setLogs] = useState(() => {
    const initialLogs = [
      { id: 1, time: '22:15:02', level: 'INFO', category: 'SYSTEM', msg: 'BumbleB AMR boot sequence completed. Drivetrain state: READY.' },
      { id: 2, time: '22:15:04', level: 'INFO', category: 'LIDAR', msg: 'RPLiDAR A1 initialized on /dev/rplidar. Sampling rate: 10.2 Hz.' },
      { id: 3, time: '22:15:05', level: 'INFO', category: 'CANBUS', msg: 'ZLAC706 CAN dual hub motor driver handshake verified (Node 1 & 2).' },
      { id: 4, time: '22:15:10', level: 'INFO', category: 'NAV2', msg: 'Map server loaded map: warehouse_main.yaml (resolution: 0.05m).' },
      { id: 5, time: '22:15:12', level: 'INFO', category: 'SAFETY', msg: 'Hardware emergency stop circuit closed. 20Hz clamp monitor armed.' },
      { id: 6, time: '22:15:20', level: 'WARN', category: 'COSTMAP', msg: 'Dynamic obstacle detected near coordinates (X: 3.12, Y: 1.45).' },
      { id: 7, time: '22:15:45', level: 'INFO', category: 'NAV2', msg: 'Goal pose received: Shelf 2. Computing global DWB trajectory.' },
      { id: 8, time: '22:16:12', level: 'INFO', category: 'NAV2', msg: 'Goal reached successfully within 0.08m tolerance.' }
    ];
    return initialLogs;
  });

  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const logContainerRef = useRef(null);

  // Auto-scroll when new logs arrive if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Periodic heartbeat log generator to demonstrate live scrolling
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const heartbeats = [
        { level: 'INFO', category: 'TELEMETRY', msg: `Odometry pose heartbeat: X: ${(robotPose?.x || 0).toFixed(2)}m, Y: ${(robotPose?.y || 0).toFixed(2)}m, Bat: ${Math.round((battery?.percentage || 0.95) * 100)}%` },
        { level: 'INFO', category: 'LIDAR', msg: '360° laser scan sweep cycle nominal. 360 rays validated.' },
        { level: 'INFO', category: 'CANBUS', msg: 'Motor current feedback nominal: Left: 0.82A, Right: 0.85A. CAN-bus load: 18%' }
      ];
      const randomMsg = heartbeats[Math.floor(Math.random() * heartbeats.length)];
      setLogs(prev => [...prev.slice(-99), { id: Date.now(), time: timeStr, ...randomMsg }]);
    }, 6000);

    return () => clearInterval(timer);
  }, [robotPose, battery]);

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bumbleb_amr_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = searchTerm === '' || 
      l.msg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || l.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Top Fleet Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 font-mono">
        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-xs hover:border-slate-400 transition-all">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">DISTANCE TRAVELLED</div>
          <div className="text-xl font-black text-slate-900">12.84 <span className="text-xs text-slate-500 font-normal">km</span></div>
          <div className="text-[10px] text-emerald-700 font-bold">● +2.4km today</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-xs hover:border-slate-400 transition-all">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MISSION UPTIME</div>
          <div className="text-xl font-black text-slate-900">04:42:15</div>
          <div className="text-[10px] text-slate-600 font-bold">99.9% availability</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-xs hover:border-slate-400 transition-all">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">NAV2 SUCCESS RATE</div>
          <div className="text-xl font-black text-emerald-700">98.6 <span className="text-xs text-slate-600 font-normal">%</span></div>
          <div className="text-[10px] text-slate-600 font-bold">71/72 goals reached</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-xs hover:border-slate-400 transition-all">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CRUISE VELOCITY</div>
          <div className="text-xl font-black text-slate-900">0.25 <span className="text-xs text-slate-600 font-normal">m/s</span></div>
          <div className="text-[10px] text-slate-600 font-bold">Max 0.45 m/s</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-xs hover:border-slate-400 transition-all">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BATTERY CYCLES</div>
          <div className="text-xl font-black text-amber-700">42 <span className="text-xs text-slate-600 font-normal">cycles</span></div>
          <div className="text-[10px] text-emerald-700 font-bold">100% SOH (Good)</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-xs hover:border-slate-400 transition-all">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">E-STOP INCIDENTS</div>
          <div className="text-xl font-black text-emerald-700">0 <span className="text-xs text-slate-600 font-normal">faults</span></div>
          <div className="text-[10px] text-emerald-700 font-bold">Zero safety violations</div>
        </div>
      </div>

      {/* Main Rolling Event Logs & Diagnostics Terminal */}
      <div className="panel flex-1 flex flex-col overflow-hidden min-h-[500px]">
        {/* Terminal Header Bar */}
        <div className="panel-header py-2.5 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-xs text-white tracking-wider font-mono">
              REAL-TIME ROLLING SYSTEM EVENT STREAM
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto Scroll Toggle Button */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                autoScroll
                  ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-2xs font-extrabold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Automatically scroll down as new event logs arrive"
            >
              <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
              <span>AUTO-SCROLL: {autoScroll ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={handleExportLogs}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Export logs as JSON file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setLogs([])}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Clear log buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter logs by keyword..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold">LEVEL:</span>
            {['ALL', 'INFO', 'WARN', 'ERROR'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-yellow-400 text-slate-950 font-extrabold shadow-2xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Smooth Scrolling Log Stream Console */}
        <div
          ref={logContainerRef}
          className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-200/40 smooth-scroll select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 italic">
              No matching log records found in buffer.
            </div>
          ) : (
            filteredLogs.map(log => {
              const isError = log.level === 'ERROR';
              const isWarn = log.level === 'WARN';

              return (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg border font-mono text-[11px] flex items-start gap-2.5 transition-all shadow-2xs ${
                    isError
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : isWarn
                      ? 'bg-amber-100/90 border-amber-300 text-amber-950'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  <span className="text-slate-500 select-none shrink-0 font-semibold">{log.time}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                    isError ? 'bg-red-600 text-white' :
                    isWarn ? 'bg-amber-500 text-slate-950' :
                    'bg-slate-200 text-slate-800 border border-slate-300'
                  }`}>
                    {log.level}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-extrabold uppercase border border-amber-300 shrink-0">
                    {log.category}
                  </span>
                  <span className="flex-1 text-slate-800 leading-relaxed break-words">{log.msg}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-2 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredLogs.length}</strong> of <strong className="text-white">{logs.length}</strong> logged events
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">ROS 2 /rosout WebSocket Listener Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
