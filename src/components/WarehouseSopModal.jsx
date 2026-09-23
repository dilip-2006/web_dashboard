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
          text: 'Connect your device to the AMR’s local WiFi network (or ensure both device and robot are on the same local network). Note the robot’s IP address (e.g., 192.168.1.100).'
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
          text: 'Check the top-right header badge: it should display "AUTONOMOUS • ROS 2" with a pulsing green indicator.'
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
      title: 'SLAM Environment Mapping',
      tag: 'MAPPING',
      icon: Layers,
      color: 'text-purple-500',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700',
      summary: 'Build high-resolution 2D map using SLAM Toolbox.',
      details: [
        {
          heading: '1. Click [2. MAPPING]',
          text: 'Click button 2 in the Autonomy Modes panel. The backend supervisor starts async_slam_toolbox_node, publishing the live occupancy grid to /map.'
        },
        {
          heading: '2. Drive Through Environment Aisles',
          text: 'Using the DRIVE tab (WASD or on-screen joystick), drive the AMR slowly (0.15 - 0.25 m/s) through all aisles and zones. Ensure loop closures occur by revisiting previously mapped intersections.'
        },
        {
          heading: '3. Inspect Map Quality in MapViewer',
          text: 'Verify that walls, pillars, and obstacles appear sharp in the canvas. Red laser scan points should overlay cleanly on mapped walls.'
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
      title: 'AMCL Localization',
      tag: 'LOCALIZATION',
      icon: Map,
      color: 'text-teal-500',
      badgeColor: 'bg-teal-950/80 text-teal-300 border-teal-700',
      summary: 'Load saved map and localize robot position with particle filters.',
      details: [
        {
          heading: '1. Select & Load Stored Map',
          text: 'In the MAPS tab, find your saved map and click [LOAD MAP], or click button 3 in Autonomy Modes. This activates nav2_map_server and amcl node.'
        },
        {
          heading: '2. Set 2D Initial Pose Estimate',
          text: 'Click the [2D Pose Estimate] tool in the MapViewer header. Click & drag on the map at the robot’s physical position and drag the green arrow to match its physical heading orientation.'
        },
        {
          heading: '3. Rotate Robot in Place to Converge Particles',
          text: 'Use the DRIVE tab (A/D keys) to rotate the robot 360° on the spot. AMCL particle cloud will rapidly converge, aligning the red LiDAR rays directly onto the map walls.'
        }
      ]
    },
    {
      id: 'step-4',
      num: '4',
      title: 'Autonomous Navigation (Nav2)',
      tag: 'AUTONOMY',
      icon: Navigation,
      color: 'text-orange-500',
      badgeColor: 'bg-orange-950/80 text-orange-300 border-orange-700',
      summary: 'Activate Nav2 stack to dispatch autonomous collision-free waypoint goals.',
      details: [
        {
          heading: '1. Click [4. NAV2]',
          text: 'Click button 4 in the Autonomy Modes panel. This launches the Nav2 Controller, Planner (DWB local planner + NavFn global planner), and Costmap layers.'
        },
        {
          heading: '2. Dispatch Point-and-Click Goals',
          text: 'Click [Set Nav Goal] in the MapViewer toolbar. Click on any free space on the map and drag the arrow in the desired arrival heading. Nav2 will instantly compute a green global path trajectory.'
        },
        {
          heading: '3. Monitor Real-Time Arrival',
          text: 'Watch the robot smoothly accelerate, navigate around static/dynamic obstacles, decelerate, and rotate to the target orientation upon arrival.'
        }
      ]
    },
    {
      id: 'step-5',
      num: '5',
      title: 'Waypoint Dispatch & Missions',
      tag: 'WORKFLOW',
      icon: MapPin,
      color: 'text-pink-500',
      badgeColor: 'bg-pink-950/80 text-pink-300 border-pink-700',
      summary: 'Create persistent POIs and execute multi-stop patrol missions.',
      details: [
        {
          heading: '1. Save Current Position as Waypoint',
          text: 'Drive to any target location and click [+ PIN] on the Waypoint Strip, or click [Save Pose] in the POIS tab. Give it a descriptive name (e.g. Shelf A-1, Dock 2).'
        },
        {
          heading: '2. Mark Pin by Clicking Map',
          text: 'Click [Mark Pin] in the MapViewer toolbar, then click anywhere on the floor map to create a waypoint marker without driving the robot there first.'
        },
        {
          heading: '3. Sequential Multi-Stop Mission Dispatcher',
          text: 'Switch to the "Mission Dispatcher" template view in the top header. Add waypoints into a sequential route and click [START ROUTE] for fully automated multi-stop navigation with optional looping.'
        }
      ]
    },
    {
      id: 'step-6',
      num: '6',
      title: 'Safety Interlocks & E-STOP',
      tag: 'SAFETY PROTOCOL',
      icon: AlertOctagon,
      color: 'text-red-500',
      badgeColor: 'bg-red-950/80 text-red-300 border-red-700',
      summary: 'Hardware emergency stop protocol, brake overrides, and recovery.',
      details: [
        {
          heading: '1. Emergency Stop (E-STOP)',
          text: 'Click the red [E-STOP] button in the top header at any time. It immediately halts Nav2, commands zero motor velocities, and latches the state machine in EMERGENCY_STOP.'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                BUMBLEB AUTONOMOUS OPERATING PROCEDURE (SOP)
              </h2>
              <p className="text-[10px] text-slate-400">
                Step-by-step standard procedure from WiFi connect to autonomous navigation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Ribbon */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto no-scrollbar p-2 gap-1.5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md font-extrabold border border-orange-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? 'bg-slate-950 text-orange-400' : 'bg-slate-800 text-slate-300'
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
          <div className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-3.5">
              {React.createElement(steps[activeStep].icon, {
                className: `w-7 h-7 ${steps[activeStep].color} shrink-0`
              })}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${steps[activeStep].badgeColor}`}>
                    {steps[activeStep].tag}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white">
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
          <div className="space-y-3">
            {steps[activeStep].details.map((detail, dIdx) => (
              <div key={dIdx} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
                <h4 className="text-xs font-bold text-orange-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                  {detail.heading}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pl-6">
                  {detail.text}
                </p>
                {detail.code && (
                  <div className="pl-6 pt-1">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between select-all">
                      <code>{detail.code}</code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="px-3.5 py-1.5 rounded-xl btn-clay-white text-xs font-bold disabled:opacity-40 cursor-pointer"
          >
            ← Previous
          </button>

          <div className="text-[11px] text-slate-400">
            Step <strong className="text-orange-400">{activeStep + 1}</strong> of <strong>{steps.length}</strong>
          </div>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
              className="px-4 py-1.5 rounded-xl btn-clay-orange text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
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
