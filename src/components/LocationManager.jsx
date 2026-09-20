import React, { useState } from 'react';
import { MapPin, Navigation, Trash2, Plus, BatteryCharging, Box, Truck } from 'lucide-react';

export default function LocationManager({ locations, robotPose, activeMap, onSaveLocation, onDeleteLocation, onNavigateToLocation }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState('shelf');
  const [customX, setCustomX] = useState('');
  const [customY, setCustomY] = useState('');
  const [useCurrentPose, setUseCurrentPose] = useState(true);

  const handleOpenModal = (presetX = null, presetY = null) => {
    if (presetX !== null && presetY !== null) {
      setCustomX(presetX.toFixed(2));
      setCustomY(presetY.toFixed(2));
      setUseCurrentPose(false);
    } else {
      setCustomX(Number(robotPose?.x || 0).toFixed(2));
      setCustomY(Number(robotPose?.y || 0).toFixed(2));
      setUseCurrentPose(true);
    }
    setLocName(`Shelf ${locations.length + 1}`);
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!locName.trim()) return;

    onSaveLocation({
      action: 'save_location',
      name: locName.trim(),
      type: locType,
      use_current_pose: useCurrentPose,
      x: parseFloat(customX) || 0.0,
      y: parseFloat(customY) || 0.0,
      yaw: robotPose?.yaw || 0.0,
      map: activeMap || 'warehouse_main'
    });
    setModalOpen(false);
    setLocName('');
  };

  const getDistanceToRobot = (locX, locY) => {
    if (!robotPose || robotPose.x == null) return null;
    const d = Math.hypot(locX - robotPose.x, locY - robotPose.y);
    return d.toFixed(2);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'charging':
        return <BatteryCharging className="w-3.5 h-3.5 text-amber-600" />;
      case 'loading':
        return <Truck className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Box className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="panel flex flex-col h-full justify-between">
      <div className="panel-header py-2 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
        <span className="flex items-center gap-2 font-bold text-white text-xs">
          <MapPin className="w-4 h-4 text-yellow-400" />
          WAREHOUSE POIS ({locations.length})
        </span>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-bumble text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-2xs font-extrabold"
        >
          <Plus className="w-3 h-3 text-slate-950" />
          <span>SAVE POSE</span>
        </button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-2 max-h-[380px] smooth-scroll">
        {locations.length === 0 ? (
          <div className="text-center py-10 text-xs font-mono text-slate-500">
            No warehouse locations stored.<br />Click "Save Pose" or "Mark Pin" on the map.
          </div>
        ) : (
          locations.map((loc) => {
            const dist = getDistanceToRobot(loc.x, loc.y);
            return (
              <div
                key={loc.id || loc.name}
                className="p-2.5 rounded-xl bg-slate-200/60 border border-slate-300 hover:border-slate-400 transition-all flex items-center justify-between gap-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-300 shrink-0">
                    {getTypeIcon(loc.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5 font-mono">
                      {loc.name}
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-300/80 text-slate-700">
                        {loc.type}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>({Number(loc.x).toFixed(2)}m, {Number(loc.y).toFixed(2)}m)</span>
                      {dist && (
                        <span className="text-amber-800 font-bold">• {dist}m away</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onNavigateToLocation(loc.name)}
                    className="px-2.5 py-1.5 rounded-lg btn-bumble text-slate-950 transition-all text-xs font-mono font-bold flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    title={`Send Nav2 dispatch to ${loc.name}`}
                  >
                    <Navigation className="w-3 h-3" />
                    DISPATCH
                  </button>
                  <button
                    onClick={() => onDeleteLocation(loc.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-300/50 transition-colors cursor-pointer"
                    title="Delete location"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 border border-slate-300 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                Save Warehouse POI
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">LOCATION NAME</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="e.g. Shelf 4, Dock B, Charging Station"
                  className="w-full bg-slate-200/80 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">LOCATION TYPE</label>
                <select
                  value={locType}
                  onChange={(e) => setLocType(e.target.value)}
                  className="w-full bg-slate-200/80 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="shelf">Shelf / Storage Rack</option>
                  <option value="charging">Charging Station</option>
                  <option value="loading">Loading / Unloading Dock</option>
                  <option value="staging">Staging Area</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">X (METERS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customX}
                    onChange={(e) => { setCustomX(e.target.value); setUseCurrentPose(false); }}
                    className="w-full bg-slate-200/80 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Y (METERS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customY}
                    onChange={(e) => { setCustomY(e.target.value); setUseCurrentPose(false); }}
                    className="w-full bg-slate-200/80 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary text-xs px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-bumble text-xs px-4 font-bold"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
