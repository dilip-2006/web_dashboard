import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, RotateCw, Plus, ArrowUp, ArrowDown, Trash2, 
  MapPin, CheckCircle2, Clock, Navigation, Flag, Check
} from 'lucide-react';
import MapViewer from '../MapViewer';
import WaypointScrollBar from '../WaypointScrollBar';

export default function MissionDispatcherTemplate({
  locations,
  robotPose,
  mapData,
  laserScan,
  globalPath,
  navStatus,
  systemState,
  onSendGoal,
  onNavigateToLocation,
  onSaveLocationAtPose
}) {
  const [route, setRoute] = useState(() => {
    if (locations && locations.length >= 2) {
      return locations.slice(0, 3).map((l, i) => ({ ...l, routeId: `route-${Date.now()}-${i}`, waitSeconds: 3 }));
    }
    return [];
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [missionLog, setMissionLog] = useState([]);
  const [selectedLocationToAdd, setSelectedLocationToAdd] = useState('');

  useEffect(() => {
    if (!isRunning || route.length === 0) return;

    if (navStatus?.status === 'SUCCEEDED') {
      const currentStop = route[currentStopIndex];
      const nextIdx = currentStopIndex + 1;

      addLog(`Reached stop [${currentStopIndex + 1}/${route.length}]: ${currentStop?.name || 'Waypoint'}`);

      if (nextIdx < route.length) {
        setCurrentStopIndex(nextIdx);
        const nextStop = route[nextIdx];
        addLog(`Navigating to stop [${nextIdx + 1}/${route.length}]: ${nextStop.name}`);
        onSendGoal?.(nextStop.x, nextStop.y, nextStop.yaw || 0.0);
      } else {
        if (isLooping) {
          setLoopCount(c => c + 1);
          setCurrentStopIndex(0);
          const firstStop = route[0];
          addLog(`Loop #${loopCount + 1} finished. Restarting loop at ${firstStop.name}`);
          onSendGoal?.(firstStop.x, firstStop.y, firstStop.yaw || 0.0);
        } else {
          setIsRunning(false);
          addLog('Full mission route completed successfully!');
        }
      }
    }
  }, [navStatus?.status]);

  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setMissionLog(prev => [{ time: timestamp, message: msg }, ...prev.slice(0, 49)]);
  };

  const handleStartMission = () => {
    if (route.length === 0) return;
    setIsRunning(true);
    setCurrentStopIndex(0);
    const target = route[0];
    addLog(`Mission started. Dispatching to stop 1: ${target.name}`);
    onSendGoal?.(target.x, target.y, target.yaw || 0.0);
  };

  const handlePauseMission = () => {
    setIsRunning(false);
    addLog('Mission paused by operator.');
  };

  const handleAbortMission = () => {
    setIsRunning(false);
    setCurrentStopIndex(0);
    addLog('Mission aborted. AMR halted.');
  };

  const handleAddToRoute = (loc) => {
    if (!loc) return;
    setRoute(prev => [
      ...prev,
      { ...loc, routeId: `route-${Date.now()}-${Math.random()}`, waitSeconds: 3 }
    ]);
    addLog(`Added ${loc.name} to route.`);
  };

  const handleRemoveFromRoute = (index) => {
    setRoute(prev => prev.filter((_, i) => i !== index));
    if (currentStopIndex >= index && currentStopIndex > 0) {
      setCurrentStopIndex(currentStopIndex - 1);
    }
  };

  const handleMoveStop = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= route.length) return;
    setRoute(prev => {
      const copy = [...prev];
      const item = copy.splice(index, 1)[0];
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const currentStop = route[currentStopIndex];
  const progressPercent = route.length > 0 ? Math.round((currentStopIndex / route.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Quick Waypoint Dispatch Strip */}
      <WaypointScrollBar
        locations={locations}
        robotPose={robotPose}
        onNavigateToLocation={onNavigateToLocation}
      />

      {/* Main Grid: Left Map + Right Mission Sequencer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch min-h-[620px] flex-1">
        {/* Left: Map */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
          <MapViewer
            mapData={mapData}
            robotPose={robotPose}
            laserScan={laserScan}
            globalPath={globalPath}
            locations={locations}
            onSendGoal={onSendGoal}
            onSaveLocationAtPose={onSaveLocationAtPose}
          />
        </div>

        {/* Right: Mission Dispatcher Panel */}
        <div className="lg:col-span-5 flex flex-col panel overflow-hidden">
          {/* Header */}
          <div className="panel-header py-2.5 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-slate-800 text-yellow-400">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-white tracking-wider font-mono">
                MISSION ROUTE SEQUENCER
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded border font-bold ${
                isRunning 
                  ? 'bg-yellow-400 text-slate-950 border-yellow-500 animate-pulse' 
                  : 'bg-slate-800 border-slate-700 text-yellow-400'
              }`}>
                {isRunning ? 'DISPATCHING' : 'IDLE'}
              </span>
              {isLooping && (
                <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 font-bold">
                  LOOP x{loopCount}
                </span>
              )}
            </div>
          </div>

          {/* Mission Controls Banner */}
          <div className="p-3 bg-slate-200/60 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <button
                  onClick={handleStartMission}
                  disabled={route.length === 0}
                  className="btn btn-bumble text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-2xs font-bold cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>START ROUTE</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseMission}
                  className="btn btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 text-amber-800 border-amber-300 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE</span>
                </button>
              )}

              <button
                onClick={handleAbortMission}
                disabled={!isRunning}
                className="btn btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>ABORT</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isLooping
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-300'
                }`}
                title="Continuous patrol loop"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLooping ? 'animate-spin-slow' : ''}`} />
                <span>LOOP</span>
              </button>

              <div className="text-[11px] font-mono text-slate-600">
                <span>{route.length} stops</span>
              </div>
            </div>
          </div>

          {/* Active Mission Progress Bar */}
          {isRunning && (
            <div className="p-3 bg-amber-50/50 border-b border-amber-200">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-amber-800 font-bold flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 animate-bounce" />
                  Stop #{currentStopIndex + 1}: <strong className="text-slate-900">{currentStop?.name}</strong>
                </span>
                <span className="text-slate-500 font-mono">
                  {currentStopIndex + 1} / {route.length} ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Route Sequencer List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[380px] smooth-scroll">
            {route.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-200/50 text-slate-500 text-xs font-mono space-y-1.5">
                <MapPin className="w-7 h-7 text-amber-500/60 mx-auto" />
                <p className="font-bold text-slate-700">Mission route is empty</p>
                <p className="text-[11px]">Select saved warehouse locations below to build an automated delivery or patrol route.</p>
              </div>
            ) : (
              route.map((stop, idx) => {
                const isActive = isRunning && currentStopIndex === idx;
                const isCompleted = isRunning && currentStopIndex > idx;

                return (
                  <div
                    key={stop.routeId || idx}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 font-mono shadow-2xs ${
                      isActive
                        ? 'bg-amber-100/80 border-amber-300 text-slate-900 ring-1 ring-amber-300'
                        : isCompleted
                        ? 'bg-emerald-100/60 border-emerald-300 text-slate-700'
                        : 'bg-slate-200/70 border-slate-300 hover:border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{stop.name}</span>
                          <span className="text-[9px] font-normal uppercase px-1.5 py-0.2 rounded bg-slate-300/80 text-slate-700">
                            {stop.type || 'shelf'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Coords: ({Number(stop.x).toFixed(2)}, {Number(stop.y).toFixed(2)})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveStop(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveStop(idx, 1)}
                        disabled={idx === route.length - 1}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromRoute(idx)}
                        className="p-1 rounded bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 border border-slate-300 cursor-pointer"
                        title="Remove from Route"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Stop Dropdown Form */}
          <div className="p-3 bg-slate-200/70 border-t border-slate-300">
            <div className="text-[10px] font-mono text-slate-700 font-bold uppercase mb-1.5 flex items-center gap-1">
              <Plus className="w-3 h-3 text-amber-600" />
              Add Saved Waypoint:
            </div>
            <div className="flex gap-2">
              <select
                value={selectedLocationToAdd}
                onChange={(e) => setSelectedLocationToAdd(e.target.value)}
                className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-none"
              >
                <option value="">Select warehouse location...</option>
                {locations.map(loc => (
                  <option key={loc.name} value={loc.name}>
                    {loc.name} ({loc.type}) • ({Number(loc.x).toFixed(1)}, {Number(loc.y).toFixed(1)})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const targetLoc = locations.find(l => l.name === selectedLocationToAdd);
                  if (targetLoc) {
                    handleAddToRoute(targetLoc);
                    setSelectedLocationToAdd('');
                  }
                }}
                disabled={!selectedLocationToAdd}
                className="btn btn-bumble text-xs px-3 py-1.5 shrink-0 font-bold cursor-pointer"
              >
                + Add Stop
              </button>
            </div>
          </div>

          {/* Mission Execution Log Stream */}
          <div className="p-3 bg-slate-200/50 border-t border-slate-300">
            <div className="text-[10px] font-mono text-slate-600 font-bold uppercase mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Mission Activity Log:
              </span>
              <span className="text-[9px] text-slate-500 font-normal">Real-time</span>
            </div>
            <div className="h-24 overflow-y-auto font-mono text-[10px] space-y-1 bg-slate-100 p-2 rounded-lg border border-slate-300 smooth-scroll">
              {missionLog.length === 0 ? (
                <div className="text-slate-500 italic">No mission events yet. Click "Start Route" to begin execution.</div>
              ) : (
                missionLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-slate-700">
                    <span className="text-amber-800 font-bold">[{entry.time}]</span>
                    <span>{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
