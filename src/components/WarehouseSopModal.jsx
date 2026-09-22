import React, { useState } from 'react';
import { 
  BookOpen, X, CheckCircle2, ChevronRight, Wifi, Power, Layers, 
  Map, Navigation, AlertOctagon, Compass, Crosshair, MapPin, 
  Radio, BatteryCharging, ArrowRight, ShieldCheck, Terminal
} from 'lucide-react';

export default function WarehouseSopModal({ isOpen, onClose }) {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'step-0',
      num: '0',
      title: 'WiFi & Bringup Launch',
      tag: 'PREREQUISITE',
      icon: Wifi,
      color: 'text-sky-500',
      badgeColor: 'bg-sky-950/80 text-sky-300 border-sky-700',
      summary: 'Connect to the robot WiFi and verify background hardware bringup.',
      details: [
        {
          heading: '1. Connect Operator Laptop/Tablet to Robot WiFi',
          text: 'Connect your device to the AMR’s local WiFi network (or ensure both device and robot are on the same warehouse LAN). Note the robot’s IP address (e.g., 192.168.1.100).'
        },
        {
          heading: '2. Unified Robot Bringup',
          text: 'On the robot SBC (or via auto-starting systemd service), run the unified physical bringup command which launches hardware drivers, RPLIDAR, rosbridge, system manager, and location manager:',
          code: 'ros2 launch bumbleb_bot bringup.launch.py'
        },
        {
          heading: '3. Open Web Dashboard',
          text: 'Open Google Chrome or any modern browser at http://<robot-ip>:3000. If connecting from a remote device, use the query parameters:',
          code: 'http://<robot-ip>:3000/?ros_host=<robot-ip>&ros_port=9090'
        },
        {
          heading: '4. Verify WebSocket Connection',
          text: 'Check the top-right header badge: it should display "REAL HARDWARE • ROS 2" with a pulsing green indicator.'
        }
      ]
    },
    {
      id: 'step-1',
      num: '1',
      title: 'Start Robot / Ready Mode',
      tag: 'SYSTEM BOOT',
      icon: Power,
      color: 'text-emerald-500',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
      summary: 'Initialize hardware, verify 50Hz odometry, and set mode to READY.',
      details: [
        {
          heading: '1. Click [1. START ROBOT / READY]',
          text: 'Click button 1 in the Autonomy Modes panel. If the robot was in OFF state, this sends the start_robot trigger to boot the state machine into READY.'
        },
        {
          heading: '2. Verify Subsystem Health',
          text: 'Switch to the HEALTH tab or check the Diagnostics panel. Ensure: LiDAR reports ~10 Hz (360 rays), Odometry reports 50 Hz from ZLAC motor drivers, and TF tree (odom -> base_link -> lidar_link) is nominal.'
        },
        {
          heading: '3. Test Safe Teleoperation',
          text: 'Switch to the DRIVE tab. Use WASD keys or keyboard arrow keys (or the on-screen joystick) to drive the robot forward/backward and rotate slowly. Verify velocity feedback in the telemetry HUD.'
        }
      ]
    },
    {
      id: 'step-2',
      num: '2',
      title: 'SLAM Warehouse Mapping',
      tag: 'MAPPING',
      icon: Layers,
      color: 'text-purple-500',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700',
      summary: 'Build high-resolution 2D warehouse map using SLAM Toolbox.',
      details: [
        {
          heading: '1. Click [2. MAPPING]',
          text: 'Click button 2 in the Autonomy Modes panel. The backend supervisor starts async_slam_toolbox_node, publishing the live occupancy grid to /map.'
        },
        {
          heading: '2. Drive Through Warehouse Aisles',
          text: 'Using the DRIVE tab (WASD or on-screen joystick), drive the AMR slowly (0.15 - 0.25 m/s) through all aisles, storage racks, and loading zones. Ensure loop closures occur by revisiting previously mapped intersections.'
        },
        {
          heading: '3. Inspect Map Quality in MapViewer',
          text: 'Verify that walls, rack pillars, and obstacles appear sharp in the canvas. Red laser scan points should overlay cleanly on mapped walls.'
        },
        {
          heading: '4. Save Occupancy Map & Serialize Pose Graph',
          text: 'In the MAPS tab, enter a name (e.g. warehouse_main) and click [SAVE MAP] (saves .yaml and .pgm). Then click [SERIALIZE] (saves pose graph for continuing SLAM later).'
        },
        {
          heading: '5. Stop Mapping',
          text: 'Click [STOP SLAM] to transition back to the safe READY state.'
        }
      ]
    },
    {
      id: 'step-3',
      num: '3',
      title: 'AMCL Localization & 2D Pose',
      tag: 'LOCALIZATION',
      icon: Map,
      color: 'text-teal-500',
      badgeColor: 'bg-teal-950/80 text-teal-300 border-teal-700',
      summary: 'Load the warehouse map and establish precise particle filter localization.',
      details: [
        {
          heading: '1. Select Stored Map & Click [3. AMCL]',
          text: 'In the MAPS tab or Mode Selector, select your saved warehouse map (e.g., warehouse_main) and click [3. AMCL] (or [LOAD MAP]). This launches Map Server and AMCL localization.'
        },
        {
          heading: '2. Set 2D Initial Pose Estimate',
          text: 'Click the [2D Pose Estimate] button in the MapViewer toolbar. Click and drag on the map canvas at the robot’s physical location in the direction it is facing. Or click [(0,0)] if the robot starts at the origin.'
        },
        {
          heading: '3. Verify AMCL Convergence',
          text: 'Watch the LiDAR scan rays align with the static map walls. The Sensor Health panel will confirm: "AMCL localized: Publishing AMCL pose". Rotate the robot in place slightly if needed to tighten particle covariance.'
        }
      ]
    },
    {
      id: 'step-4',
      num: '4',
      title: 'Define Warehouse POIs & Stations',
      tag: 'WAYPOINTS',
      icon: MapPin,
      color: 'text-amber-500',
      badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700',
      summary: 'Store warehouse racks, staging areas, loading docks, and chargers.',
      details: [
        {
          heading: '1. Station Robot at Desired Location',
          text: 'Drive the robot to the exact station or pallet spot (e.g. Inbound Dock A, Shelf Rack 01, Charging Pad).'
        },
        {
          heading: '2. Click [SAVE POSE] in POIS Tab',
          text: 'Open the POIS tab and click [SAVE POSE]. Enter a descriptive name (e.g. "Dock A", "Shelf 04") and select the location type (Shelf, Loading Dock, Charging Station, Staging Area).'
        },
        {
          heading: '3. Interactive Map Pinning',
          text: 'Alternatively, click [Mark Pin] in the MapViewer toolbar and click anywhere on the floor plan to create a waypoint without driving there.'
        },
        {
          heading: '4. Waypoint Storage Persistence',
          text: 'All coordinates are automatically stored in warehouse_locations.yaml by the Location Manager and survive reboots.'
        }
      ]
    },
    {
      id: 'step-5',
      num: '5',
      title: 'Autonomous Nav2 Navigation',
      tag: 'AUTONOMY',
      icon: Navigation,
      color: 'text-yellow-500',
      badgeColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-700',
      summary: 'Dispatch point-to-point goals and automated multi-stop warehouse routes.',
      details: [
        {
          heading: '1. Click [4. NAV2]',
          text: 'Click button 4 in the Autonomy Modes panel. The backend supervisor starts Nav2 (planner server, controller server, behavior tree navigator, and costmaps).'
        },
        {
          heading: '2. Click-to-Goal Navigation',
          text: 'Click [Set Nav Goal] on the map toolbar. Click and drag on any free space on the map. Nav2 plans a path (green line) avoiding static racks and dynamic obstacles, and drives autonomously.'
        },
        {
          heading: '3. POI Dispatch',
          text: 'In the POIS tab, simply click [DISPATCH] next to any saved location (e.g. "Dock A"). The AMR plans and executes navigation to that waypoint.'
        },
        {
          heading: '4. Multi-Stop Mission Dispatcher',
          text: 'Switch to the "Mission Dispatcher" template at the top. Build a sequential route (e.g. Inbound Dock -> Shelf 02 -> Inspection Bay -> Charger), set dwell wait times, and click [START MISSION] for automated continuous warehouse delivery cycles!'
        }
      ]
    },
    {
      id: 'step-6',
      num: '6',
      title: 'Safety, Recovery & Emergency Stop',
      tag: 'SAFETY PROTOCOLS',
      icon: ShieldAlert,
      color: 'text-red-500',
      badgeColor: 'bg-red-950/80 text-red-300 border-red-700',
      summary: 'Safety interventions, goal cancellation, and obstacle recovery.',
      details: [
        {
          heading: '1. Emergency Stop (E-STOP)',
          text: 'Click the red [E-STOP] button in the top header or side panel at any time. It immediately halts Nav2, commands zero motor velocities, and latches the state machine in EMERGENCY_STOP.'
        },
        {
          heading: '2. Resetting Emergency Stop',
          text: 'Once the area is clear, click [RESET E-STOP] to release the safety latch and return the robot to READY state.'
        },
        {
          heading: '3. Goal Cancellation',
          text: 'If the robot is navigating and you wish to stop without an emergency shutdown, click [STOP NAV2] or use [Cancel Goal]. The AMR smoothly decelerates to a stop.'
        },
        {
          heading: '4. System Reset',
          text: 'In case of any sensor timeout or recoverable node error, click [SYSTEM RESET] in the Autonomy Modes bar to reset the supervisor state back to READY.'
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-mono select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                BUMBLE•B WAREHOUSE OPERATING PROCEDURE (SOP)
              </h2>
              <p className="text-[10px] text-slate-400">
                Step-by-step standard procedure from WiFi connect to autonomous navigation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Ribbon */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto no-scrollbar p-1.5 gap-1">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-yellow-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? 'bg-slate-950 text-yellow-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {step.num}
                </span>
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 smooth-scroll">
          {/* Step Header Banner */}
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-3">
              {React.createElement(steps[activeStep].icon, {
                className: `w-7 h-7 ${steps[activeStep].color} shrink-0`
              })}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${steps[activeStep].badgeColor}`}>
                    {steps[activeStep].tag}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Step {steps[activeStep].num}: {steps[activeStep].title}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {steps[activeStep].summary}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Instructions */}
          <div className="space-y-3.5">
            {steps[activeStep].details.map((detail, dIdx) => (
              <div key={dIdx} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                <h4 className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                  {detail.heading}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pl-5.5">
                  {detail.text}
                </p>
                {detail.code && (
                  <div className="pl-5.5 pt-1">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between select-all">
                      <code>{detail.code}</code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="px-3 py-1.5 rounded-lg btn-secondary text-xs font-bold disabled:opacity-40 cursor-pointer"
          >
            ← Previous Step
          </button>

          <div className="text-[11px] text-slate-400">
            Step <strong className="text-yellow-400">{activeStep + 1}</strong> of <strong>{steps.length}</strong>
          </div>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
              className="px-4 py-1.5 rounded-lg btn-bumble text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Got It • Start Operating</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
