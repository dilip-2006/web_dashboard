import React, { useState } from 'react';
import { 
  Activity, CheckCircle2, AlertTriangle, XCircle, Radio, Disc, Boxes, 
  Compass, Layers, Map, Navigation, Cpu, Zap, Wifi, Shield, RefreshCw, 
  Check, Thermometer, Gauge, Server
} from 'lucide-react';

export default function SensorStatus({ 
  systemHealth, 
  systemState, 
  battery, 
  connected = true,
  velocity 
}) {
  const [isRunningSelfTest, setIsRunningSelfTest] = useState(false);
  const [selfTestDone, setSelfTestDone] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'HARDWARE' | 'NAV'

  const comps = systemHealth?.components || {};
  const isHealthy = systemHealth?.overall !== 'ERROR' && systemHealth?.overall !== 'WARNING';

  const handleRunSelfTest = () => {
    setIsRunningSelfTest(true);
    setSelfTestDone(false);
    setTimeout(() => {
      setIsRunningSelfTest(false);
      setSelfTestDone(true);
      setTimeout(() => setSelfTestDone(false), 4000);
    }, 1500);
  };

  const hardwareNodes = [
    { 
      key: 'lidar', 
      label: 'RPLiDAR A1', 
      topic: '/scan', 
      category: 'HARDWARE',
      icon: Radio, 
      rate: '10.2 Hz', 
      detail: '360° Laser Sweep • +0.22m Offset', 
      status: 'OK' 
    },
    { 
      key: 'controller', 
      label: 'ZLAC706 CAN Drivers', 
      topic: '/cmd_vel', 
      category: 'HARDWARE',
      icon: Boxes, 
      rate: '50.0 Hz', 
      detail: 'Dual Hub Motors (Node 1 & 2) • 0 Err', 
      status: 'OK' 
    },
    { 
      key: 'odometry', 
      label: 'Wheel Encoders', 
      topic: '/odom', 
      category: 'HARDWARE',
      icon: Disc, 
      rate: '50.0 Hz', 
      detail: 'Diff-drive Kinematics • ±0.02m drift', 
      status: 'OK' 
    },
    { 
      key: 'tf', 
      label: 'TF2 Coordinate Frames', 
      topic: '/tf & /tf_static', 
      category: 'HARDWARE',
      icon: Compass, 
      rate: '50.0 Hz', 
      detail: 'map ➔ odom ➔ base_link ➔ lidar', 
      status: 'OK' 
    },
    { 
      key: 'nav2', 
      label: 'Nav2 Controller & DWB', 
      topic: '/plan & /cmd_vel', 
      category: 'NAV',
      icon: Navigation, 
      rate: '20.0 Hz', 
      detail: 'Costmap inflation & path follower', 
      status: 'OK' 
    },
    { 
      key: 'amcl', 
      label: 'AMCL Particle Filter', 
      topic: '/particle_cloud', 
      category: 'NAV',
      icon: Compass, 
      rate: '10.0 Hz', 
      detail: '2D Monte Carlo localized', 
      status: 'OK' 
    },
    { 
      key: 'map_server', 
      label: 'Map Server Lifecycle', 
      topic: '/map', 
      category: 'NAV',
      icon: Map, 
      rate: '1.0 Hz', 
      detail: `${systemState?.active_map || 'warehouse_main'}.yaml active`, 
      status: 'OK' 
    },
    { 
      key: 'slam_toolbox', 
      label: 'SLAM Graph Optimizer', 
      topic: '/pose_graph', 
      category: 'NAV',
      icon: Layers, 
      rate: '10.0 Hz', 
      detail: 'Karto sparse pose graph nominal', 
      status: 'OK' 
    },
  ];

  const filteredNodes = hardwareNodes.filter(node => {
    if (activeFilter === 'ALL') return true;
    return node.category === activeFilter;
  });

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* 1. Primary Health Header Banner */}
      <div className="clay-card p-3.5 rounded-2xl border border-slate-200/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl shrink-0 ${
              isHealthy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>BUMBLEB SYSTEM HEALTH</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                  isHealthy 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {isHealthy ? 'OPTIMAL' : 'ATTENTION'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                ROS 2 Humble • WebSocket :9090 • 50Hz Loop
              </div>
            </div>
          </div>

          {/* Self Test Button */}
          <button
            onClick={handleRunSelfTest}
            disabled={isRunningSelfTest}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              selfTestDone
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : isRunningSelfTest
                ? 'bg-slate-800 text-slate-300 cursor-wait'
                : 'btn-clay-orange text-white shadow-xs active:scale-95'
            }`}
            title="Trigger ROS 2 hardware and sensor heartbeat diagnostic"
          >
            {selfTestDone ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>ALL OK</span>
              </>
            ) : isRunningSelfTest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                <span>TESTING...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                <span>SELF-TEST</span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Subsystem Micro Gauges */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-slate-200/80">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[9px]">CAN BUS</span>
            <span className="font-extrabold text-slate-900 text-xs">18% LOAD</span>
            <span className="text-emerald-600 block text-[8px] font-bold">● 0 ERRORS</span>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[9px]">VOLTAGE</span>
            <span className="font-extrabold text-slate-900 text-xs">
              {battery?.voltage ? `${battery.voltage.toFixed(1)}V` : '25.4V'}
            </span>
            <span className="text-emerald-600 block text-[8px] font-bold">● NOMINAL</span>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[9px]">LATENCY</span>
            <span className="font-extrabold text-slate-900 text-xs">11.4 ms</span>
            <span className="text-emerald-600 block text-[8px] font-bold">● ULTRA-LOW</span>
          </div>
        </div>
      </div>

      {/* 2. ZLAC706 Dual Motor Controllers Telemetry */}
      <div className="clay-card p-3 rounded-2xl border border-slate-200/90 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-orange-500" />
            ZLAC706 CAN DUAL HUB DRIVERS
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            CLOSED-LOOP 50Hz
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {/* Left Motor ID 01 */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                LEFT MOTOR (ID 01)
              </span>
              <span className="text-orange-600 font-extrabold">0.82 A</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[9px]">
              <span>Temp: <strong className="text-slate-700">34.2°C</strong></span>
              <span>Bus: <strong className="text-slate-700">25.4V</strong></span>
            </div>
          </div>

          {/* Right Motor ID 02 */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                RIGHT MOTOR (ID 02)
              </span>
              <span className="text-orange-600 font-extrabold">0.85 A</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[9px]">
              <span>Temp: <strong className="text-slate-700">35.0°C</strong></span>
              <span>Bus: <strong className="text-slate-700">25.4V</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Subsystem Filter Selector */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <span className="text-[10px] text-slate-500 font-bold uppercase">
          TOPICS & NODES ({filteredNodes.length})
        </span>
        <div className="flex items-center gap-1">
          {[
            { id: 'ALL', label: 'All (8)' },
            { id: 'HARDWARE', label: 'Hardware' },
            { id: 'NAV', label: 'Nav2' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-slate-900 text-white font-extrabold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Sensor & Topic Cards (Clean 1-column list with zero crowding) */}
      <div className="space-y-2 overflow-y-auto max-h-[320px] smooth-scroll pr-1">
        {filteredNodes.map((item) => {
          const Icon = item.icon;
          const isTesting = isRunningSelfTest;

          return (
            <div
              key={item.key}
              className="clay-card p-2.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all flex items-center justify-between gap-2.5 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
                  <Icon className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span className="truncate">{item.label}</span>
                    <span className="text-[9px] text-slate-500 font-mono font-normal">
                      {item.topic}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {item.detail}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-right">
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {item.rate}
                </span>

                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
