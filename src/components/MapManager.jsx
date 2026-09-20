import React, { useState } from 'react';
import { Map, Save, FolderOpen, Check, AlertCircle } from 'lucide-react';

export default function MapManager({ maps, activeMap, onSaveMap, onLoadMap }) {
  const [mapInput, setMapInput] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    if (!mapInput.trim()) return;

    if (!/^[a-zA-Z0-9_\-]+$/.test(mapInput.trim())) {
      setSaveStatus({ ok: false, msg: 'Invalid name. Letters, numbers, - and _ only.' });
      return;
    }

    onSaveMap(mapInput.trim());
    setSaveStatus({ ok: true, msg: `Map '${mapInput.trim()}' save requested.` });
    setTimeout(() => setSaveStatus(null), 4000);
    setMapInput('');
  };

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header py-2 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
        <span className="flex items-center gap-2 font-bold text-white text-xs">
          <Map className="w-4 h-4 text-yellow-400" />
          MAP MANAGEMENT & STORAGE
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-yellow-400 font-bold">
          STORAGE
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Save Map Form */}
        <form onSubmit={handleSave} className="space-y-2">
          <label className="block text-xs font-mono font-bold text-slate-700 uppercase">
            SAVE CURRENT SLAM MAP (/map)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={mapInput}
              onChange={(e) => setMapInput(e.target.value)}
              placeholder="e.g. warehouse_sector_b"
              className="flex-1 bg-slate-200/80 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="btn btn-bumble text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0 font-bold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              SAVE MAP
            </button>
          </div>

          {saveStatus && (
            <div className={`text-[11px] font-mono flex items-center gap-1.5 mt-1 ${
              saveStatus.ok ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {saveStatus.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{saveStatus.msg}</span>
            </div>
          )}
        </form>

        {/* Available Maps List */}
        <div>
          <label className="block text-xs font-mono font-bold text-slate-700 mb-2 uppercase">
            STORED WAREHOUSE MAPS ({maps.length})
          </label>
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 smooth-scroll">
            {maps.length === 0 ? (
              <div className="text-center py-4 text-xs font-mono text-slate-500">
                No saved maps found in maps/
              </div>
            ) : (
              maps.map((name) => {
                const isActive = name === activeMap;
                return (
                  <div
                    key={name}
                    className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                      isActive 
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs' 
                        : 'bg-slate-200/70 border-slate-300 text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className="truncate font-bold">{name}</span>
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onLoadMap(name)}
                      disabled={isActive}
                      className={`btn text-[11px] px-2.5 py-1 shrink-0 ${
                        isActive ? 'btn-secondary opacity-50' : 'btn-bumble'
                      }`}
                    >
                      {isActive ? 'LOADED' : 'LOAD MAP'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
