import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Radio, Disc, Boxes, Compass, Layers, Map, Navigation } from 'lucide-react';

export default function SensorStatus({ systemHealth }) {
  const comps = systemHealth?.components || {};

  const items = [
    { key: 'lidar', label: 'LiDAR (/scan)', icon: Radio, data: comps.lidar },
    { key: 'odometry', label: 'Odometry (/odom)', icon: Disc, data: comps.odometry },
    { key: 'tf', label: 'TF Tree', icon: Compass, data: comps.tf },
    { key: 'controller', label: 'Drivetrain', icon: Boxes, data: comps.controller },
    { key: 'slam_toolbox', label: 'SLAM Toolbox', icon: Layers, data: comps.slam_toolbox },
    { key: 'map_server', label: 'Map Server', icon: Map, data: comps.map_server },
    { key: 'amcl', label: 'AMCL', icon: Compass, data: comps.amcl },
    { key: 'nav2', label: 'Nav2 Stack', icon: Navigation, data: comps.nav2 },
  ];

  return (
    <div className="panel flex flex-col">
      <div className="panel-header py-2 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
        <span className="flex items-center gap-2 font-bold text-white text-xs">
          <Activity className="w-4 h-4 text-yellow-400" />
          SYSTEM & SENSOR HEALTH
        </span>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
          systemHealth?.overall === 'OK' ? 'badge-ok' :
          systemHealth?.overall === 'WARNING' ? 'badge-warning' : 
          'badge-error'
        }`}>
          HEALTH: {systemHealth?.overall || 'OK (NOMINAL)'}
        </span>
      </div>

      <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const status = item.data?.status || 'OK';
          const isOk = status === 'OK';
          const isWarn = status === 'WARNING';
          const isRunning = item.data?.running ?? true;

          return (
            <div
              key={item.key}
              className={`p-2.5 rounded-xl border transition-all ${
                isOk ? 'bg-slate-200/60 border-slate-300 hover:border-slate-400' :
                isWarn ? 'bg-amber-100 border-amber-300 text-amber-900' :
                'bg-red-100 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Icon className="w-3.5 h-3.5 text-amber-600" />
                  <span className="truncate">{item.label}</span>
                </div>
                {isOk ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : isWarn ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-500 truncate" title={item.data?.message}>
                {item.data?.message || (isRunning ? 'Running • Nominal' : 'Ready')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
