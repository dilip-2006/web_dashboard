import React, { useState } from 'react';
import { useRos } from './hooks/useRos';
import Header from './components/Header';
import ScrollingTicker from './components/ScrollingTicker';
import WaypointScrollBar from './components/WaypointScrollBar';
import RobotStatus from './components/RobotStatus';
import SensorStatus from './components/SensorStatus';
import ModeSelector from './components/ModeSelector';
import MapViewer from './components/MapViewer';
import LocationManager from './components/LocationManager';
import MapManager from './components/MapManager';
import Teleop from './components/Teleop';

// Professional Dashboard Templates
import MissionDispatcherTemplate from './components/templates/MissionDispatcherTemplate';
import DiagnosticsTemplate from './components/templates/DiagnosticsTemplate';
import AnalyticsTemplate from './components/templates/AnalyticsTemplate';

import { Gamepad2, MapPin, Layers, Activity, Sparkles, CheckCircle2, ChevronRight, Cpu } from 'lucide-react';

export default function App() {
  const {
    connected,
    systemState,
    systemHealth,
    robotPose,
    navStatus,
    locations,
    maps,
    battery,
    mapData,
    laserScan,
    globalPath,
    velocity,
    sendCommand,
    sendLocationCommand,
    sendGoal,
    sendVelocity,
    rosUrl,
    connectRos,
    disconnectRos
  } = useRos();

  // Active Top-Level Template: 'COCKPIT' | 'DISPATCHER' | 'DIAGNOSTICS' | 'ANALYTICS'
  const [activeTemplate, setActiveTemplate] = useState('COCKPIT');

  // Cockpit Drawer Tab: 'TELEOP' | 'LOCATIONS' | 'MAPS' | 'DIAGNOSTICS'
  const [controlTab, setControlTab] = useState('TELEOP');

  const handleEmergencyStop = () => {
    sendCommand({ action: 'emergency_stop' });
  };

  const handleResetEmergencyStop = () => {
    sendCommand({ action: 'reset_emergency_stop' });
  };

  const handleSaveMap = (name) => {
    sendCommand({ action: 'save_map', map_name: name });
  };

  const handleLoadMap = (name) => {
    sendCommand({ action: 'load_map', map_name: name });
  };

  const handleSaveLocation = (payload) => {
    sendLocationCommand(payload);
  };

  const handleDeleteLocation = (name) => {
    sendLocationCommand({ action: 'delete_location', name });
  };

  const handleNavigateToLocation = (name) => {
    sendLocationCommand({ action: 'navigate_to_location', name });
  };

  const handleQuickAddPose = () => {
    const name = prompt(
      `Save current position as warehouse waypoint (${Number(robotPose.x).toFixed(2)}, ${Number(robotPose.y).toFixed(2)}):`,
      `Shelf ${locations.length + 1}`
    );
    if (name) {
      sendLocationCommand({
        action: 'save_location',
        name,
        type: 'shelf',
        use_current_pose: true,
        x: robotPose.x,
        y: robotPose.y,
        yaw: robotPose.yaw,
        map: systemState?.active_map || 'warehouse_main'
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-carbon-pattern text-slate-800 selection:bg-amber-400 selection:text-slate-950">
      {/* 1. Global Navigation Header with Template Switcher */}
      <Header
        connected={connected}
        systemState={systemState}
        rosUrl={rosUrl}
        onConnectRos={connectRos}
        onDisconnectRos={disconnectRos}
        onEmergencyStop={handleEmergencyStop}
        onResetEmergencyStop={handleResetEmergencyStop}
        activeTemplate={activeTemplate}
        onSelectTemplate={setActiveTemplate}
      />

      {/* 2. Real-Time Rolling Telemetry Marquee Ticker */}
      <ScrollingTicker
        systemState={systemState}
        robotPose={robotPose}
        velocity={velocity}
        battery={battery}
        navStatus={navStatus}
        connected={connected}
        onItemClick={(id) => {
          if (id === 'sensors' || id === 'canbus') setActiveTemplate('DIAGNOSTICS');
          else if (id === 'nav') setActiveTemplate('DISPATCHER');
          else if (id === 'mode') setActiveTemplate('COCKPIT');
        }}
      />

      {/* 3. Main Operational Viewport */}
      <main className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col gap-2.5 sm:gap-3 max-w-[1920px] w-full mx-auto overflow-x-hidden">
        {/* TEMPLATE 1: OPERATIONS COCKPIT */}
        {activeTemplate === 'COCKPIT' && (
          <div className="flex flex-col gap-3 flex-1">
            {/* Top Telemetry & Autonomous Mode Command Deck */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
              <div className="xl:col-span-5">
                <ModeSelector
                  systemState={systemState}
                  onCommand={sendCommand}
                  activeMap={systemState?.active_map}
                />
              </div>
              <div className="xl:col-span-7">
                <RobotStatus
                  robotPose={robotPose}
                  velocity={velocity}
                  battery={battery}
                  navStatus={navStatus}
                />
              </div>
            </div>

            {/* Quick Waypoint Horizontal Scrollbar */}
            <WaypointScrollBar
              locations={locations}
              robotPose={robotPose}
              onNavigateToLocation={handleNavigateToLocation}
              onQuickAdd={handleQuickAddPose}
            />

            {/* Central Cockpit Workspace: Interactive Map (8 cols) + Multi-Tab Panel (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch min-h-0 lg:min-h-[560px]">
              {/* Main 2D Map & LiDAR Radar */}
              <div className="lg:col-span-8 flex flex-col h-full min-h-[380px] sm:min-h-[480px]">
                <MapViewer
                  mapData={mapData}
                  robotPose={robotPose}
                  laserScan={laserScan}
                  globalPath={globalPath}
                  locations={locations}
                  onSendGoal={(x, y, yaw) => sendGoal(x, y, yaw, 'map')}
                  onSaveLocationAtPose={(x, y, yaw) => {
                    const name = prompt(
                      `Enter Location Name for coordinates (${x.toFixed(2)}, ${y.toFixed(2)}):`,
                      `Shelf ${locations.length + 1}`
                    );
                    if (name) {
                      sendLocationCommand({
                        action: 'save_location',
                        name,
                        type: 'shelf',
                        use_current_pose: false,
                        x,
                        y,
                        yaw,
                        map: systemState?.active_map || 'warehouse_main'
                      });
                    }
                  }}
                />
              </div>

              {/* Integrated Multi-Tab Mission Control Panel (4 cols) */}
              <div className="lg:col-span-4 flex flex-col panel overflow-hidden min-h-[420px] sm:min-h-[500px]">
                {/* Control Panel Tab Navigation */}
                <div className="flex items-center bg-slate-950 border-b border-slate-800 p-1 sm:p-1.5 gap-1 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setControlTab('TELEOP')}
                    className={`flex-1 py-2 px-1.5 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-mono font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      controlTab === 'TELEOP'
                        ? 'bg-yellow-400 text-slate-950 shadow-xs border border-yellow-500 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                    <span>DRIVE</span>
                  </button>

                  <button
                    onClick={() => setControlTab('LOCATIONS')}
                    className={`flex-1 py-2 px-1.5 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-mono font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      controlTab === 'LOCATIONS'
                        ? 'bg-yellow-400 text-slate-950 shadow-xs border border-yellow-500 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>POIS ({locations.length})</span>
                  </button>

                  <button
                    onClick={() => setControlTab('MAPS')}
                    className={`flex-1 py-2 px-1.5 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-mono font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      controlTab === 'MAPS'
                        ? 'bg-yellow-400 text-slate-950 shadow-xs border border-yellow-500 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>MAPS</span>
                  </button>

                  <button
                    onClick={() => setControlTab('DIAGNOSTICS')}
                    className={`flex-1 py-2 px-1.5 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-mono font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      controlTab === 'DIAGNOSTICS'
                        ? 'bg-yellow-400 text-slate-950 shadow-xs border border-yellow-500 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <span>HEALTH</span>
                  </button>
                </div>

                {/* Tab Viewport */}
                <div className="flex-1 p-3 overflow-y-auto smooth-scroll">
                  {controlTab === 'TELEOP' && (
                    <Teleop
                      connected={connected}
                      isEmergencyStop={systemState?.is_emergency_stop}
                      onSendVelocity={sendVelocity}
                    />
                  )}

                  {controlTab === 'LOCATIONS' && (
                    <LocationManager
                      locations={locations}
                      robotPose={robotPose}
                      activeMap={systemState?.active_map}
                      onSaveLocation={handleSaveLocation}
                      onDeleteLocation={handleDeleteLocation}
                      onNavigateToLocation={handleNavigateToLocation}
                    />
                  )}

                  {controlTab === 'MAPS' && (
                    <MapManager
                      maps={maps}
                      activeMap={systemState?.active_map}
                      onSaveMap={handleSaveMap}
                      onLoadMap={handleLoadMap}
                    />
                  )}

                  {controlTab === 'DIAGNOSTICS' && (
                    <div className="space-y-3">
                      <SensorStatus systemHealth={systemHealth} />

                      {/* Hardware Architecture Card */}
                      <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 text-xs font-mono space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                          <Cpu className="w-4 h-4 text-amber-600" />
                          <span>HARDWARE COMPATIBILITY MATRIX</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          100% hardware-compatible architecture:
                        </p>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center gap-2 text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>LiDAR: RPLiDAR A1 publishes to <code className="text-amber-900 font-bold bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300">/scan</code></span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Drivetrain: ZLAC706-CAN driver listens to <code className="text-amber-900 font-bold bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300">/cmd_vel</code></span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Launch flag: <code className="text-amber-900 font-bold bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300">simulation:=false</code></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE 2: MISSION DISPATCHER */}
        {activeTemplate === 'DISPATCHER' && (
          <MissionDispatcherTemplate
            locations={locations}
            robotPose={robotPose}
            mapData={mapData}
            laserScan={laserScan}
            globalPath={globalPath}
            navStatus={navStatus}
            systemState={systemState}
            onSendGoal={(x, y, yaw) => sendGoal(x, y, yaw, 'map')}
            onNavigateToLocation={handleNavigateToLocation}
            onSaveLocationAtPose={(x, y, yaw) => {
              const name = prompt(`Enter waypoint name for (${x.toFixed(2)}, ${y.toFixed(2)}):`, `Shelf ${locations.length + 1}`);
              if (name) {
                sendLocationCommand({
                  action: 'save_location',
                  name,
                  type: 'shelf',
                  use_current_pose: false,
                  x,
                  y,
                  yaw,
                  map: systemState?.active_map || 'warehouse_main'
                });
              }
            }}
          />
        )}

        {/* TEMPLATE 3: SENSORS & HARDWARE DIAGNOSTICS */}
        {activeTemplate === 'DIAGNOSTICS' && (
          <DiagnosticsTemplate
            laserScan={laserScan}
            robotPose={robotPose}
            velocity={velocity}
            battery={battery}
            systemHealth={systemHealth}
            connected={connected}
          />
        )}

        {/* TEMPLATE 4: FLEET ANALYTICS & LOGS */}
        {activeTemplate === 'ANALYTICS' && (
          <AnalyticsTemplate
            systemState={systemState}
            robotPose={robotPose}
            velocity={velocity}
            battery={battery}
            navStatus={navStatus}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 border-t border-slate-800 text-center text-[10px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
          <span className="font-bold text-white">BumbleB Autonomous Mobile Robot Fleet Platform</span>
        </div>
        <div className="hidden md:block">
          Gazebo Classic simulation • ROS 2 Humble • WebSocket :9090 • Diff-Drive DWB Navigator
        </div>
        <div className="text-slate-950 font-extrabold px-2 py-0.5 rounded bg-yellow-400 border border-yellow-500">
          UNIT #01 • READY
        </div>
      </footer>
    </div>
  );
}
