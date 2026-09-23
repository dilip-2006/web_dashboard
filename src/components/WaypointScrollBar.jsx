import React, { useRef } from 'react';
import { MapPin, Navigation, ChevronLeft, ChevronRight, BatteryCharging, Box, Truck, Sparkles, Plus } from 'lucide-react';

export default function WaypointScrollBar({ locations, robotPose, onNavigateToLocation, onQuickAdd }) {
  const scrollRef = useRef(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const getDistance = (x, y) => {
    if (!robotPose || robotPose.x == null) return null;
    const d = Math.hypot(x - robotPose.x, y - robotPose.y);
    return `${d.toFixed(1)}m`;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'charging':
        return <BatteryCharging className="w-3.5 h-3.5 text-orange-600" />;
      case 'loading':
        return <Truck className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Box className="w-3.5 h-3.5 text-orange-600" />;
    }
  };

  return (
    <div className="clay-card p-2 sm:p-2.5 flex items-center gap-2 overflow-hidden">
      {/* Scroll Left Button */}
      <button
        onClick={scrollLeft}
        className="btn-clay-white p-2 rounded-xl text-slate-600 hover:text-orange-600 transition-colors shrink-0 cursor-pointer"
        title="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Label Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-600 text-xs font-mono font-extrabold shrink-0 shadow-2xs">
        <MapPin className="w-3.5 h-3.5 text-orange-500" />
        <span>QUICK WAYPOINTS:</span>
      </div>

      {/* Horizontally Scrollable Waypoint Chips */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar smooth-scroll py-0.5"
      >
        {locations && locations.length > 0 ? (
          locations.map((loc) => {
            const dist = getDistance(loc.x, loc.y);
            return (
              <button
                key={loc.id || loc.name}
                onClick={() => onNavigateToLocation?.(loc.name)}
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-orange-50/50 border border-slate-200/80 hover:border-orange-400 transition-all shrink-0 text-left cursor-pointer active:scale-95 shadow-2xs"
                title={`Dispatch AMR to ${loc.name}`}
              >
                <div className="p-1 rounded-lg bg-white border border-slate-200 group-hover:border-orange-400 shrink-0">
                  {getTypeIcon(loc.type)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-slate-950 truncate max-w-[130px] font-mono">
                    {loc.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <span>{loc.type || 'shelf'}</span>
                    {dist && <span className="text-orange-600 font-bold">• {dist}</span>}
                  </div>
                </div>
                <Navigation className="w-3 h-3 text-slate-400 group-hover:text-orange-600 transition-colors shrink-0 ml-0.5" />
              </button>
            );
          })
        ) : (
          <div className="text-xs font-mono text-slate-500 px-3 py-1 italic flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            No saved waypoints yet. Use "Mark Pin" on the map.
          </div>
        )}
      </div>

      {/* Quick Save Current Pose Button */}
      {onQuickAdd && (
        <button
          onClick={onQuickAdd}
          className="btn-clay-orange text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 font-mono font-black"
          title="Save current robot position as a new waypoint"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>PIN</span>
        </button>
      )}

      {/* Scroll Right Button */}
      <button
        onClick={scrollRight}
        className="btn-clay-white p-2 rounded-xl text-slate-600 hover:text-orange-600 transition-colors shrink-0 cursor-pointer"
        title="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
