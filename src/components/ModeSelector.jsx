import React, { useState } from 'react';
import { Play, Square, Layers, Map, Navigation, Power, RefreshCw, AlertCircle, BookOpen } from 'lucide-react';

export default function ModeSelector({ systemState, onCommand, activeMap, onOpenSop }) {
  const currentMode = systemState?.state || 'READY';
  const isEstop = systemState?.is_emergency_stop || systemState?.state === 'EMERGENCY_STOP';
  const [confirmModal, setConfirmModal] = useState(null);

  const handleAction = (action, label, requiresConfirm = false) => {
    if (requiresConfirm) {
      setConfirmModal({ action, label });
    } else {
      onCommand({ action });
    }
  };

  const confirmAndExecute = () => {
    if (confirmModal) {
      onCommand({ action: confirmModal.action });
      setConfirmModal(null);
    }
  };

  return (
    <div className="panel flex flex-col h-full justify-between">
      <div className="panel-header py-2 px-3.5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Power className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-white text-xs">BUMBLE•B AUTONOMY MODES</span>
          {onOpenSop && (
            <button
              onClick={onOpenSop}
              className="flex items-center gap-1 text-[10px] font-mono text-yellow-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 transition-colors ml-1 cursor-pointer"
              title="View Warehouse Operating Procedure (SOP)"
            >
              <BookOpen className="w-3 h-3 text-yellow-400" />
              <span className="hidden xs:inline">SOP GUIDE</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-slate-400 font-semibold">STATE:</span>
          <span className={`px-2 py-0.5 rounded border font-bold ${
            isEstop ? 'bg-red-950 border-red-600 text-red-300 animate-estop text-white' :
            currentMode === 'NAVIGATION' ? 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300' :
            currentMode === 'MAPPING' ? 'bg-purple-950/80 border-purple-500/60 text-purple-300' :
            'bg-slate-800 border-slate-700 text-yellow-400'
          }`}>
            {currentMode}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5 justify-between flex-1">
        {/* Step-by-Step Mode Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. Start Robot / Ready */}
          <button
            onClick={() => {
              if (currentMode === 'OFF') {
                handleAction('start_robot', 'Start Robot');
              } else if (currentMode !== 'READY') {
                handleAction('start_robot', 'Stop Active Process & Return to READY', true);
              } else {
                handleAction('start_robot', 'Verify Readiness');
              }
            }}
            className={`btn py-2.5 flex flex-col items-center gap-1 transition-all cursor-pointer ${
              currentMode === 'READY'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs ring-2 ring-emerald-400/40'
                : 'btn-secondary hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
            title="Start / Verify Robot hardware and set mode to READY"
          >
            <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono text-emerald-700">
              <Power className={`w-3.5 h-3.5 ${currentMode === 'READY' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>1. {currentMode === 'OFF' ? 'START ROBOT' : 'READY'}</span>
            </div>
            <span className="text-[9px] text-slate-500 font-normal">
              {currentMode === 'READY' ? '● Drivetrain Active' : currentMode === 'OFF' ? 'Click to Boot' : 'Return to Ready'}
            </span>
          </button>

          {/* 2. SLAM Mapping */}
          {currentMode === 'MAPPING' ? (
            <button
              onClick={() => handleAction('stop_mapping', 'Stop SLAM Mapping', true)}
              className="btn btn-danger py-2.5 flex flex-col items-center gap-1 animate-pulse"
            >
              <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono">
                <Square className="w-3.5 h-3.5" />
                <span>STOP SLAM</span>
              </div>
              <span className="text-[9px] text-red-100 font-normal">Mapping Active</span>
            </button>
          ) : (
            <button
              onClick={() => handleAction('start_mapping', 'Start SLAM Mapping', currentMode !== 'READY')}
              className="btn btn-secondary py-2.5 flex flex-col items-center gap-1 hover:border-purple-300 hover:bg-purple-50/40"
            >
              <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono text-purple-700">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>2. MAPPING</span>
              </div>
              <span className="text-[9px] text-slate-500 font-normal">SLAM Toolbox</span>
            </button>
          )}

          {/* 3. Localization Mode */}
          {currentMode === 'LOCALIZATION' ? (
            <button
              onClick={() => handleAction('stop_localization', 'Stop Localization', true)}
              className="btn btn-danger py-2.5 flex flex-col items-center gap-1"
            >
              <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono">
                <Square className="w-3.5 h-3.5" />
                <span>STOP AMCL</span>
              </div>
              <span className="text-[9px] text-red-100 font-normal">AMCL Active</span>
            </button>
          ) : (
            <button
              onClick={() => onCommand({ action: 'start_localization', map_name: activeMap })}
              className="btn btn-secondary py-2.5 flex flex-col items-center gap-1 hover:border-teal-300 hover:bg-teal-50/40"
            >
              <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono text-teal-700">
                <Map className="w-3.5 h-3.5 text-teal-600" />
                <span>3. AMCL</span>
              </div>
              <span className="text-[9px] text-slate-500 font-normal">Map Localization</span>
            </button>
          )}

          {/* 4. Nav2 Navigation Mode */}
          {currentMode === 'NAVIGATION' ? (
            <button
              onClick={() => handleAction('stop_navigation', 'Stop Nav2 Navigation')}
              className="btn btn-danger py-2.5 flex flex-col items-center gap-1 shadow-sm"
            >
              <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono">
                <Square className="w-3.5 h-3.5" />
                <span>STOP NAV2</span>
              </div>
              <span className="text-[9px] text-red-100 font-normal">Nav2 Autonomy</span>
            </button>
          ) : (
            <button
              onClick={() => onCommand({ action: 'start_navigation', map_name: activeMap })}
              className="btn btn-bumble py-2.5 flex flex-col items-center gap-1 shadow-sm"
            >
              <div className="flex items-center gap-1 text-[11px] font-extrabold font-mono">
                <Navigation className="w-3.5 h-3.5" />
                <span>4. NAV2</span>
              </div>
              <span className="text-[9px] text-slate-800 font-semibold">Autonomous Goals</span>
            </button>
          )}
        </div>

        {/* Subsystem Controls Bar */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('system_reset', 'System Reset')}
              className="btn btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 hover:border-slate-400"
              title="Reset state machine to READY"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              SYSTEM RESET
            </button>
            <button
              onClick={() => handleAction('stop_robot', 'Stop Robot & Subsystems', true)}
              className="btn btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              <Square className="w-3 h-3 text-red-500" />
              STOP ALL
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
            <span>ACTIVE:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
              {currentMode === 'MAPPING' ? 'SLAM_TOOLBOX' :
               currentMode === 'LOCALIZATION' ? 'MAP_SERVER + AMCL' :
               currentMode === 'NAVIGATION' ? 'NAV2_CONTROLLER' :
               currentMode === 'READY' ? 'DRIVETRAIN_ACTIVE' : 'IDLE'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 border border-slate-300 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Confirm Action</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-mono">
              Execute <strong className="text-slate-900">{confirmModal.label}</strong>? This transitions active ROS 2 nodes.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndExecute}
                className="btn btn-bumble text-xs px-4 py-1.5"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
