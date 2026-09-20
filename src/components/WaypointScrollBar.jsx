import React, { useRef } from 'react';
import { MapPin, Navigation, ChevronLeft, ChevronRight, BatteryCharging, Box, Truck, Sparkles } from 'lucide-react';

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
        return <BatteryCharging className="w-3.5 h-3.5 text-amber-600" />;
      case 'loading':
        return <Truck className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Box className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-100 border border-slate-300 rounded-xl shadow-xs">
      {/* Scroll Left Button */}
      <button
        onClick={scrollLeft}
        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-yellow-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        title="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Label Badge */}
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-yellow-400 text-xs font-mono font-extrabold shrink-0">
        <MapPin className="w-3.5 h-3.5 text-yellow-400" />
        <span>QUICK DISPATCH:</span>
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
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200/80 border border-slate-300 hover:border-yellow-500 hover:bg-yellow-400/20 transition-all shrink-0 text-left cursor-pointer active:scale-95 shadow-2xs"
                title={`Dispatch AMR to ${loc.name}`}
              >
                <div className="p-1 rounded bg-slate-100 border border-slate-300 group-hover:border-yellow-500">
                  {getTypeIcon(loc.type)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-slate-950 truncate max-w-[130px] font-mono">
                    {loc.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <span>{loc.type || 'shelf'}</span>
                    {dist && <span className="text-yellow-700 font-bold">• {dist}</span>}
                  </div>
                </div>
                <Navigation className="w-3 h-3 text-slate-400 group-hover:text-yellow-600 transition-colors shrink-0 ml-1" />
              </button>
            );
          })
        ) : (
          <div className="text-xs font-mono text-slate-500 px-3 py-1 italic flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            No saved POIs yet.
          </div>
        )}
      </div>

      {/* Quick Save Current Pose Button */}
      {onQuickAdd && (
        <button
          onClick={onQuickAdd}
          className="btn btn-bumble text-xs px-2.5 py-1.5 flex items-center gap-1 shrink-0 font-mono font-extrabold"
          title="Save current robot position as a new waypoint"
        >
          <span>+ PIN</span>
        </button>
      )}

      {/* Scroll Right Button */}
      <button
        onClick={scrollRight}
        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-yellow-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        title="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
