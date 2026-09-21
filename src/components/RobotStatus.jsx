import React from 'react';
import { Compass, Gauge, BatteryCharging, Navigation, Activity } from 'lucide-react';

export default function RobotStatus({ robotPose, velocity, battery, navStatus }) {
  const x = Number(robotPose?.x || 0).toFixed(3);
  const y = Number(robotPose?.y || 0).toFixed(3);
  const rawYaw = robotPose?.yaw || 0;
  const yawDeg = Number(robotPose?.yaw_deg ?? (rawYaw * 180 / Math.PI)).toFixed(1);
  const yawRad = Number(rawYaw).toFixed(2);
  const linVel = Math.abs(Number(velocity?.linear || 0)).toFixed(2);
  const angVel = Number(velocity?.angular || 0).toFixed(2);
  const batPct = Math.round((battery?.percentage || 0.95) * 100);
  const batVolt = Number(battery?.voltage || 25.4).toFixed(1);

  return (
    <div className="panel flex flex-col justify-between h-full">
      <div className="panel-header py-2 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
        <span className="flex items-center gap-2 font-bold text-white text-xs">
          <Activity className="w-4 h-4 text-yellow-400" />
          BUMBLE•B KINEMATICS & TELEMETRY
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-yellow-400 font-bold">
          ZLAC706 50Hz
        </span>
      </div>

      <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* X Position */}
        <div className="bg-slate-200/60 rounded-xl p-2.5 border border-slate-300 hover:border-slate-400 transition-colors">
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-0.5">X POSITION</div>
          <div className="text-xl font-black font-mono text-slate-950 flex items-baseline gap-1">
            {x} <span className="text-[10px] font-normal text-slate-500">m</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400">Map Frame</div>
        </div>

        {/* Y Position */}
        <div className="bg-slate-200/60 rounded-xl p-2.5 border border-slate-300 hover:border-slate-400 transition-colors">
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-0.5">Y POSITION</div>
          <div className="text-xl font-black font-mono text-slate-950 flex items-baseline gap-1">
            {y} <span className="text-[10px] font-normal text-slate-500">m</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400">Map Frame</div>
        </div>

        {/* Heading Yaw + Compass Needle */}
        <div className="bg-slate-200/60 rounded-xl p-2.5 border border-slate-300 hover:border-slate-400 transition-colors flex items-center justify-between">
          <div>
            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-0.5">HEADING</div>
            <div className="text-xl font-black font-mono text-yellow-700">
              {yawDeg}°
            </div>
            <div className="text-[9px] font-mono text-slate-400">{yawRad} rad</div>
          </div>
          {/* Compass Dial */}
          <div className="relative h-9 w-9 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
            <div
              className="w-1 h-7 bg-gradient-to-t from-transparent via-yellow-400 to-yellow-500 rounded-full transition-transform duration-100 shadow-2xs"
              style={{ transform: `rotate(${yawDeg}deg)` }}
            />
            <div className="absolute w-2 h-2 rounded-full bg-white" />
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-slate-200/60 rounded-xl p-2.5 border border-slate-300 hover:border-slate-400 transition-colors flex items-center justify-between">
          <div>
            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-0.5">SPEED</div>
            <div className="text-xl font-black font-mono text-emerald-600 flex items-baseline gap-1">
              {linVel} <span className="text-[10px] font-normal text-slate-500">m/s</span>
            </div>
            <div className="text-[9px] font-mono text-slate-400">ω = {angVel} rad/s</div>
          </div>
          <Gauge className="w-5 h-5 text-emerald-500 opacity-80" />
        </div>
      </div>

      {/* Battery & Nav2 Status Bar */}
      <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Battery Health */}
        <div className="bg-slate-200/60 rounded-xl p-2.5 border border-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-900 text-yellow-400 border border-slate-800">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-900 font-bold">24V POWER PACK</div>
              <div className="text-[9px] font-mono text-slate-500">{batVolt} V • LiFePO4</div>
            </div>
          </div>
          <div className="w-28">
            <div className="flex justify-between text-[10px] font-mono font-bold mb-0.5">
              <span className={batPct > 20 ? 'text-yellow-700' : 'text-red-600'}>{batPct}%</span>
              <span className="text-slate-400">NOMINAL</span>
            </div>
            <div className="h-1.5 w-full bg-slate-300 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  batPct > 25 ? 'bg-yellow-400' : 'bg-red-500'
                }`}
                style={{ width: `${batPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation Feedback */}
        <div className="bg-slate-200/60 rounded-xl p-2.5 border border-slate-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg border ${
              navStatus?.status === 'NAVIGATING' ? 'bg-yellow-400 text-slate-950 border-yellow-500 animate-pulse' :
              navStatus?.status === 'SUCCEEDED' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
              'bg-slate-900 border-slate-800 text-yellow-400'
            }`}>
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-900 font-bold flex items-center gap-1">
                NAV2: <span className="text-yellow-700">{navStatus?.status || 'IDLE'}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-500 truncate">
                {navStatus?.target ? `Target: ${navStatus.target}` : 'Ready for goal dispatch'}
              </div>
            </div>
          </div>
          <div className="text-right font-mono shrink-0 pl-1">
            <div className="text-xs font-bold text-slate-800">
              {navStatus?.distance_remaining != null ? `${navStatus.distance_remaining}m` : '--'}
            </div>
            <div className="text-[8px] text-slate-400 uppercase">REMAINING</div>
          </div>
        </div>
      </div>
    </div>
  );
}
