import React, { useRef, useEffect, useState } from 'react';
import { 
  Activity, Radio, Disc, Boxes, Compass, Layers, Map, Navigation, 
  Cpu, Zap, AlertTriangle, CheckCircle2, ShieldCheck, Thermometer,
  RotateCw, Gauge, Server, RefreshCw
} from 'lucide-react';

export default function DiagnosticsTemplate({
  laserScan,
  robotPose,
  velocity,
  battery,
  systemHealth,
  connected
}) {
  const radarCanvasRef = useRef(null);
  const [radarZoom, setRadarZoom] = useState(4.0); // max meters displayed
  const [sweepAngle, setSweepAngle] = useState(0);

  // Animate circular radar sweep
  useEffect(() => {
    let animId;
    const animate = () => {
      setSweepAngle(prev => (prev + 0.05) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Draw 360° LiDAR Radar Scope Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width = canvas.height = 360;
    const center = size / 2;
    const radius = center - 16;

    // Background - Soothing Light Gray Radar Floor
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, size, size);

    // Circular Range Rings
    const rings = [1, 2, 3, 4];
    rings.forEach((r) => {
      const ringPx = (r / radarZoom) * radius;
      if (ringPx > radius) return;

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(center, center, ringPx, 0, Math.PI * 2);
      ctx.stroke();

      // Ring distance text
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(`${r}m`, center + ringPx - 18, center - 4);
    });

    // Outer perimeter ring with amber accent
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs & Compass angles
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center - radius, center);
    ctx.lineTo(center + radius, center);
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center, center + radius);
    ctx.stroke();

    // Diagonal angle lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(center - radius * 0.707, center - radius * 0.707);
    ctx.lineTo(center + radius * 0.707, center + radius * 0.707);
    ctx.moveTo(center - radius * 0.707, center + radius * 0.707);
    ctx.lineTo(center + radius * 0.707, center - radius * 0.707);
    ctx.stroke();

    // Angle degree labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('0° FRONT', center - 22, center - radius + 12);
    ctx.fillText('180° REAR', center - 24, center + radius - 4);
    ctx.fillText('90° R', center + radius - 30, center + 4);
    ctx.fillText('270° L', center - radius + 6, center + 4);

    // Rotating Radar Sweep Line with Gradient Fan
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(sweepAngle);

    const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    sweepGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.4, 0);
    ctx.closePath();
    ctx.fill();

    // Main Sweep Ray
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.restore();

    // Plot LaserScan points
    let pointsCount = 0;
    let closestObstacle = 999;

    if (laserScan && laserScan.ranges) {
      const ranges = laserScan.ranges;
      const minAngle = laserScan.angle_min || -Math.PI;
      const inc = laserScan.angle_increment || (Math.PI / 180);

      ctx.fillStyle = '#dc2626';
      ctx.shadowColor = 'rgba(220, 38, 38, 0.4)';
      ctx.shadowBlur = 4;

      for (let i = 0; i < ranges.length; i += 2) {
        const r = ranges[i];
        if (r >= 0.1 && r <= radarZoom) {
          pointsCount++;
          if (r < closestObstacle) closestObstacle = r;

          const ang = minAngle + i * inc - Math.PI / 2; // -90 deg so 0 is up
          const px = center + (r / radarZoom) * radius * Math.cos(ang);
          const py = center + (r / radarZoom) * radius * Math.sin(ang);

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    } else {
      // Standby field laser radar points when awaiting active /scan topic stream
      const standbyPoints = [
        { r: 1.2, a: -0.8 }, { r: 1.25, a: -0.75 }, { r: 1.3, a: -0.7 },
        { r: 2.1, a: 1.2 }, { r: 2.15, a: 1.25 }, { r: 2.2, a: 1.3 },
        { r: 2.8, a: 2.8 }, { r: 2.85, a: 2.85 }, { r: 2.9, a: 2.9 },
        { r: 1.8, a: -2.1 }, { r: 1.85, a: -2.05 }
      ];
      ctx.fillStyle = '#dc2626';
      standbyPoints.forEach(pt => {
        pointsCount++;
        const ang = pt.a - Math.PI / 2;
        const px = center + (pt.r / radarZoom) * radius * Math.cos(ang);
        const py = center + (pt.r / radarZoom) * radius * Math.sin(ang);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      closestObstacle = 1.2;
    }

    // AMR Footprint Icon: LiDAR is at radar origin (center, center), chassis & drive wheels are positioned behind it
    const chassisTop = center - 4;
    const axleY = center + 9;

    // Chassis body
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(center - 10, chassisTop, 20, 26, 4);
    ctx.fill();
    ctx.stroke();

    // Drive wheels (on axle behind front LiDAR)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(center - 13, axleY - 4, 3, 8);
    ctx.fillRect(center + 10, axleY - 4, 3, 8);

    // Axle center mark
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center - 10, axleY);
    ctx.lineTo(center + 10, axleY);
    ctx.stroke();

    // Front LiDAR scanner at radar origin
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red laser emitter diode
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(center, center - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }, [laserScan, radarZoom, sweepAngle]);

  const linVel = Math.abs(Number(velocity?.linear || 0)).toFixed(2);
  const angVel = Number(velocity?.angular || 0).toFixed(2);
  const batVolt = Number(battery?.voltage || 25.4).toFixed(1);
  const batPct = Math.round((battery?.percentage || 0.95) * 100);

  // Wheel RPM computation based on differential drive kinematics (wheel radius ~ 0.085m, baseline 0.38m)
  const wheelRadius = 0.085;
  const wheelBase = 0.38;
  const vLeft = (velocity?.linear || 0) - ((velocity?.angular || 0) * wheelBase) / 2;
  const vRight = (velocity?.linear || 0) + ((velocity?.angular || 0) * wheelBase) / 2;
  const rpmLeft = Math.round((vLeft / (2 * Math.PI * wheelRadius)) * 60);
  const rpmRight = Math.round((vRight / (2 * Math.PI * wheelRadius)) * 60);

  const rosNodes = [
    { name: '/robot_state_publisher', type: 'Broadcaster', rate: '30 Hz', latency: '2 ms', status: 'ACTIVE' },
    { name: '/rplidar_node', type: 'LiDAR Driver', rate: '10.2 Hz', latency: '4 ms', status: 'ACTIVE' },
    { name: '/diff_drive_controller', type: 'Hardware CAN', rate: '50 Hz', latency: '1 ms', status: 'ACTIVE' },
    { name: '/ekf_filter_node', type: 'State Estimation', rate: '50 Hz', latency: '3 ms', status: 'ACTIVE' },
    { name: '/slam_toolbox', type: '2D SLAM Mapping', rate: '15 Hz', latency: '8 ms', status: 'ACTIVE' },
    { name: '/nav2_bt_navigator', type: 'Behavior Tree', rate: '20 Hz', latency: '5 ms', status: 'ACTIVE' },
    { name: '/nav2_controller', type: 'DWB Path Follower', rate: '20 Hz', latency: '6 ms', status: 'ACTIVE' },
    { name: '/costmap_2d', type: 'Inflation Layer', rate: '10 Hz', latency: '9 ms', status: 'ACTIVE' }
  ];

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Top Banner: Diagnostics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RPLiDAR A1 (Front)</div>
            <div className="text-xl font-black text-slate-900">10.2 <span className="text-xs text-slate-500 font-normal">Hz</span></div>
            <div className="text-[10px] text-emerald-700 font-bold">● 360° LASER • +0.20m OFFSET</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-800">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CAN BUS LOAD</div>
            <div className="text-xl font-black text-slate-900">18.4 <span className="text-xs text-slate-500 font-normal">%</span></div>
            <div className="text-[10px] text-slate-500 font-bold">500 kbps • 0 Err</div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-100/80 border border-sky-300 text-sky-800">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MOTOR DRIVERS</div>
            <div className="text-xl font-black text-slate-900">ZLAC706</div>
            <div className="text-[10px] text-emerald-700 font-bold">● DUAL SYNCHRONIZED</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-200/60 border border-slate-300 shadow-sm flex items-center justify-between hover:border-slate-400 transition-all">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">POWER PACK</div>
            <div className="text-xl font-black text-amber-700">{batVolt} <span className="text-xs text-slate-500 font-normal">V</span></div>
            <div className="text-[10px] text-slate-500 font-bold">{batPct}% • LiFePO4 8S</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-800">
            <Gauge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1">
        {/* Left: 360° Circular LiDAR Radar Scope (5 cols) */}
        <div className="lg:col-span-5 flex flex-col panel overflow-hidden">
          <div className="panel-header py-2.5 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="font-bold text-xs text-white tracking-wider font-mono">
                360° LIDAR SCANNER RADAR SCOPE
              </span>
            </div>

            {/* Zoom selector */}
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-slate-400 font-semibold">RANGE:</span>
              {[2, 4, 8].map(z => (
                <button
                  key={z}
                  onClick={() => setRadarZoom(z)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    radarZoom === z
                      ? 'bg-yellow-400 text-slate-950 font-extrabold shadow-2xs'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {z}m
                </button>
              ))}
            </div>
          </div>

          {/* Radar Canvas Container */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
            <canvas
              ref={radarCanvasRef}
              className="rounded-full shadow-md border-2 border-slate-300 max-w-[320px] max-h-[320px] w-full h-auto aspect-square bg-[#e2e8f0]"
            />

            {/* Radar Scope Stats Footer */}
            <div className="w-full mt-3 pt-3 border-t border-slate-300 grid grid-cols-3 text-center font-mono text-[11px]">
              <div>
                <div className="text-slate-500 text-[10px]">OBSTACLE PROXIMITY</div>
                <div className="text-amber-700 font-bold">1.20 m</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">POINTS VISIBLE</div>
                <div className="text-slate-800 font-bold">360 / 360</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">ANGULAR RES</div>
                <div className="text-emerald-700 font-bold">1.0°</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Motors & ROS 2 Node Health (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Dual Motor Driver Real-Time Telemetry */}
          <div className="panel p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  ZLAC706-CAN DUAL HUB MOTOR CONTROLLERS
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                CAN BUS: NORMAL (0 ERR)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              {/* Left Motor Card */}
              <div className="p-3 rounded-xl bg-slate-200/60 border border-slate-300 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    LEFT DRIVE MOTOR (ID #01)
                  </span>
                  <span className="text-amber-700 font-bold">{rpmLeft} RPM</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1">
                  <div className="bg-slate-100 border border-slate-300 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">CURRENT</span>
                    <span className="text-slate-800 font-bold">0.82 A</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">TEMP</span>
                    <span className="text-emerald-700 font-bold">34.2 °C</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">VOLTAGE</span>
                    <span className="text-slate-800 font-bold">{batVolt} V</span>
                  </div>
                </div>
              </div>

              {/* Right Motor Card */}
              <div className="p-3 rounded-xl bg-slate-200/60 border border-slate-300 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    RIGHT DRIVE MOTOR (ID #02)
                  </span>
                  <span className="text-amber-700 font-bold">{rpmRight} RPM</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1">
                  <div className="bg-slate-100 border border-slate-300 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">CURRENT</span>
                    <span className="text-slate-800 font-bold">0.85 A</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">TEMP</span>
                    <span className="text-emerald-700 font-bold">35.0 °C</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-300 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">VOLTAGE</span>
                    <span className="text-slate-800 font-bold">{batVolt} V</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROS 2 Node Health Matrix */}
          <div className="panel flex-1 flex flex-col overflow-hidden">
            <div className="panel-header py-2.5 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white tracking-wide font-mono">
                  ROS 2 HUMBLE NODE & TOPIC GRAPH MONITOR
                </span>
              </div>
              <span className="text-[10px] font-mono text-yellow-400">
                8 NODES REGISTERED
              </span>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-2 max-h-[300px] smooth-scroll">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rosNodes.map(node => (
                  <div
                    key={node.name}
                    className="p-2.5 rounded-xl bg-slate-200/60 border border-slate-300 font-mono text-xs flex items-center justify-between hover:border-slate-400 hover:bg-slate-200 transition-all shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="text-slate-800 font-bold truncate text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{node.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {node.type} • {node.latency}
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                        {node.rate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
