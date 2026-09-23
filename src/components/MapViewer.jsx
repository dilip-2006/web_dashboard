import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Crosshair, Navigation, MapPin, ZoomIn, ZoomOut, RotateCcw, Compass, Eye, EyeOff, Layers } from 'lucide-react';

export default function MapViewer({
  mapData,
  robotPose,
  laserScan,
  globalPath,
  localPath,
  globalCostmap,
  localCostmap,
  locations,
  onSendGoal,
  onSaveLocationAtPose,
  onSetInitialPose,
  // Fixed base_link -> lidar_link URDF transform (x = 0.22 m / 22cm)
  lidarOffsetX = 0.22
}) {
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Viewport transform (camera in map meters)
  const [camera, setCamera] = useState({ x: 0.0, y: 0.0, scale: 45 }); // scale = pixels per meter
  const [toolMode, setToolMode] = useState('PAN'); // 'PAN' | 'NAV_GOAL' | 'MARK_LOC'
  const [dragStart, setDragStart] = useState(null);
  const [goalDragStart, setGoalDragStart] = useState(null);
  const [goalDragCurrent, setGoalDragCurrent] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);
  const [mouseMapPos, setMouseMapPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Layers visibility - Grid disabled by default for clean minimal view
  const [showLaser, setShowLaser] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showLocations, setShowLocations] = useState(true);
  const [showGlobalCostmap, setShowGlobalCostmap] = useState(true);

  // Robot trajectory trail (history)
  const [trail, setTrail] = useState([]);
  const lastTrailPoseRef = useRef({ x: null, y: null });

  // Clean up any legacy localStorage offset
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('amr_lidar_offset_x');
      }
    } catch (_) {}
  }, []);

  // Update trail when robot moves
  useEffect(() => {
    if (!robotPose || robotPose.x == null || robotPose.y == null) return;
    const { x, y } = robotPose;
    const last = lastTrailPoseRef.current;
    if (last.x === null || Math.hypot(x - last.x, y - last.y) > 0.08) {
      lastTrailPoseRef.current = { x, y };
      setTrail(prev => [...prev.slice(-180), { x, y }]);
    }
  }, [robotPose]);

  // Update offscreen canvas when mapData changes
  useEffect(() => {
    if (!mapData || !mapData.info || !mapData.data) return;

    const { width, height } = mapData.info;
    if (width <= 0 || height <= 0) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    const raw = mapData.data;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const rosIdx = (height - 1 - row) * width + col;
        const pVal = raw[rosIdx];
        const pixelIdx = (row * width + col) * 4;

        if (pVal === -1) {
          // Unknown: soft light gray
          pixels[pixelIdx] = 203;
          pixels[pixelIdx + 1] = 213;
          pixels[pixelIdx + 2] = 225;
          pixels[pixelIdx + 3] = 255;
        } else if (pVal === 0) {
          // Free navigable space: crisp clean white/off-white floor
          pixels[pixelIdx] = 248;
          pixels[pixelIdx + 1] = 250;
          pixels[pixelIdx + 2] = 252;
          pixels[pixelIdx + 3] = 255;
        } else {
          // Occupied obstacle/wall: high-contrast dark obsidian
          pixels[pixelIdx] = 15;
          pixels[pixelIdx + 1] = 23;
          pixels[pixelIdx + 2] = 42;
          pixels[pixelIdx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    offscreenCanvasRef.current = offscreen;
  }, [mapData]);

  // Transform coordinates: Map (meters) -> Canvas (pixels)
  const mapToCanvas = useCallback((mx, my, w, h) => {
    const cx = w / 2 + (mx - camera.x) * camera.scale;
    const cy = h / 2 - (my - camera.y) * camera.scale; // Y-up in ROS, Y-down in Canvas
    return { x: cx, y: cy };
  }, [camera]);

  // Canvas (pixels) -> Map (meters)
  const canvasToMap = useCallback((cx, cy, w, h) => {
    const mx = camera.x + (cx - w / 2) / camera.scale;
    const my = camera.y - (cy - h / 2) / camera.scale;
    return { x: mx, y: my };
  }, [camera]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 800;
    const height = canvas.height = canvas.parentElement.clientHeight || 550;

    // Background - Clean Light Gray Canvas Floor
    ctx.fillStyle = '#f4f6f9';
    ctx.fillRect(0, 0, width, height);

    // 1. Grid Lines & Meter Coordinates
    if (showGrid) {
      const minM = canvasToMap(0, height, width, height);
      const maxM = canvasToMap(width, 0, width, height);
      const startX = Math.floor(minM.x);
      const endX = Math.ceil(maxM.x);
      const startY = Math.floor(minM.y);
      const endY = Math.ceil(maxM.y);

      // Minor 1m grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e1';
      for (let x = startX; x <= endX; x++) {
        if (x % 5 === 0) continue;
        const p = mapToCanvas(x, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, height);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y++) {
        if (y % 5 === 0) continue;
        const p = mapToCanvas(0, y, width, height);
        ctx.beginPath();
        ctx.moveTo(0, p.y);
        ctx.lineTo(width, p.y);
        ctx.stroke();
      }

      // Major 5m grid with numbers
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#94a3b8';
      ctx.fillStyle = '#475569';
      ctx.font = '10px JetBrains Mono';
      for (let x = startX; x <= endX; x++) {
        if (x % 5 !== 0) continue;
        const p = mapToCanvas(x, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, height);
        ctx.stroke();
        ctx.fillText(`${x}m`, p.x + 4, height - 8);
      }
      for (let y = startY; y <= endY; y++) {
        if (y % 5 !== 0) continue;
        const p = mapToCanvas(0, y, width, height);
        ctx.beginPath();
        ctx.moveTo(0, p.y);
        ctx.lineTo(width, p.y);
        ctx.stroke();
        ctx.fillText(`${y}m`, 8, p.y - 4);
      }

      // World Origin (0,0) Axis Cross
      const origin = mapToCanvas(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(origin.x - 16, origin.y);
      ctx.lineTo(origin.x + 16, origin.y);
      ctx.moveTo(origin.x, origin.y - 16);
      ctx.lineTo(origin.x, origin.y + 16);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText('(0,0)', origin.x + 5, origin.y - 5);
    }

    // 2. Draw Occupancy Grid Map
    if (offscreenCanvasRef.current && mapData && mapData.info) {
      const { resolution, origin: mapOrigin, width: mw, height: mh } = mapData.info;
      const ox = mapOrigin.position.x;
      const oy = mapOrigin.position.y;

      const pTopLeft = mapToCanvas(ox, oy + mh * resolution, width, height);
      const pBottomRight = mapToCanvas(ox + mw * resolution, oy, width, height);

      const renderW = pBottomRight.x - pTopLeft.x;
      const renderH = pBottomRight.y - pTopLeft.y;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreenCanvasRef.current, pTopLeft.x, pTopLeft.y, renderW, renderH);

      // Map boundary frame
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(pTopLeft.x, pTopLeft.y, renderW, renderH);
    }

    // Draw Nav2's global costmap above the static map. It is already in the
    // map frame, so the OccupancyGrid origin/resolution provide an exact
    // overlay. Unknown cells stay transparent to keep the base map visible.
    if (showGlobalCostmap && globalCostmap?.info && Array.isArray(globalCostmap.data)) {
      const { width: cw, height: ch, resolution: cr, origin: co } = globalCostmap.info;
      const cox = co?.position?.x || 0;
      const coy = co?.position?.y || 0;
      for (let row = 0; row < ch; row += 1) {
        for (let col = 0; col < cw; col += 1) {
          const value = globalCostmap.data[(ch - 1 - row) * cw + col];
          if (value == null || value < 1) continue;
          const p1 = mapToCanvas(cox + col * cr, coy + (row + 1) * cr, width, height);
          const p2 = mapToCanvas(cox + (col + 1) * cr, coy + row * cr, width, height);
          const alpha = Math.min(0.62, 0.08 + (Math.max(0, value) / 100) * 0.54);
          ctx.fillStyle = value >= 99 ? `rgba(239,68,68,${alpha})` : `rgba(245,158,11,${alpha})`;
          ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        }
      }
    }

    // 3. Draw Robot Trajectory Trail
    if (showTrail && trail.length > 1) {
      ctx.strokeStyle = '#06b6d488';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      trail.forEach((pos, idx) => {
        const cp = mapToCanvas(pos.x, pos.y, width, height);
        if (idx === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw LaserScan Points & Field of View
    if (showLaser && laserScan && laserScan.ranges && robotPose) {
      const rx = robotPose.x || 0;
      const ry = robotPose.y || 0;
      const ryaw = robotPose.yaw || 0;
      const minAngle = laserScan.angle_min || -Math.PI;
      const angleInc = laserScan.angle_increment || (Math.PI / 180);
      const ranges = laserScan.ranges;

      // Physical LiDAR sensor origin in map frame:
      // Offset forward from the differential drive wheel axle center (base_link) along the robot's heading
      const lidarMapX = rx + lidarOffsetX * Math.cos(ryaw);
      const lidarMapY = ry + lidarOffsetX * Math.sin(ryaw);

      ctx.fillStyle = '#ef4444ee';
      for (let i = 0; i < ranges.length; i += 2) {
        const r = ranges[i];
        if (r >= (laserScan.range_min || 0.1) && r <= (laserScan.range_max || 12.0)) {
          const angle = ryaw + minAngle + i * angleInc;
          const lx = lidarMapX + r * Math.cos(angle);
          const ly = lidarMapY + r * Math.sin(angle);
          const cp = mapToCanvas(lx, ly, width, height);
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Draw Global Nav2 Path
    if (globalPath && globalPath.poses && globalPath.poses.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      globalPath.poses.forEach((poseStamped, idx) => {
        const p = mapToCanvas(poseStamped.pose.position.x, poseStamped.pose.position.y, width, height);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // DWB local trajectory/path, when published by the controller server.
    if (localPath?.poses?.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      localPath.poses.forEach((poseStamped, idx) => {
        const p = mapToCanvas(poseStamped.pose.position.x, poseStamped.pose.position.y, width, height);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Saved Warehouse Locations (POIs)
    if (showLocations && locations && locations.length > 0) {
      locations.forEach((loc) => {
        const p = mapToCanvas(loc.x, loc.y, width, height);
        const color = loc.type === 'charging' ? '#f59e0b' : loc.type === 'loading' ? '#a855f7' : '#38bdf8';

        // Outer glow
        ctx.fillStyle = `${color}33`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Pin center
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction orientation tick if yaw is present
        if (loc.yaw != null) {
          const tickLen = 14;
          const tx = p.x + tickLen * Math.cos(-loc.yaw);
          const ty = p.y + tickLen * Math.sin(-loc.yaw);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }

        // Label Tag
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        const text = loc.name;
        ctx.font = 'bold 10px JetBrains Mono';
        const tw = ctx.measureText(text).width;
        ctx.beginPath();
        ctx.roundRect(p.x + 10, p.y - 10, tw + 10, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.fillText(text, p.x + 15, p.y + 3);
      });
    }

    // 7. Active Goal Target Marker
    if (activeGoal) {
      const gp = mapToCanvas(activeGoal.x, activeGoal.y, width, height);
      ctx.save();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gp.x - 18, gp.y);
      ctx.lineTo(gp.x + 18, gp.y);
      ctx.moveTo(gp.x, gp.y - 18);
      ctx.lineTo(gp.x, gp.y + 18);
      ctx.stroke();

      if (activeGoal.yaw != null) {
        const arrowLen = 26;
        const ax = gp.x + arrowLen * Math.cos(-activeGoal.yaw);
        const ay = gp.y + arrowLen * Math.sin(-activeGoal.yaw);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gp.x, gp.y);
        ctx.lineTo(ax, ay);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. Interactive Dragging for Nav Goal or Initial Pose Orientation
    if (goalDragStart && goalDragCurrent) {
      const startP = mapToCanvas(goalDragStart.x, goalDragStart.y, width, height);
      const currP = mapToCanvas(goalDragCurrent.x, goalDragCurrent.y, width, height);
      const isInitPose = toolMode === 'INITIAL_POSE';

      // Target circle
      ctx.strokeStyle = isInitPose ? '#10b981' : '#ea580c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startP.x, startP.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Heading arrow from start to current drag
      ctx.strokeStyle = isInitPose ? '#34d399' : '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startP.x, startP.y);
      ctx.lineTo(currP.x, currP.y);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(currP.y - startP.y, currP.x - startP.x);
      ctx.fillStyle = isInitPose ? '#34d399' : '#f97316';
      ctx.beginPath();
      ctx.moveTo(currP.x, currP.y);
      ctx.lineTo(currP.x - 10 * Math.cos(angle - Math.PI / 6), currP.y - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(currP.x - 10 * Math.cos(angle + Math.PI / 6), currP.y - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    // 9. Draw BUMBLEB Robot Footprint (Orange & Black Bumblebee theme)
    if (robotPose) {
      const rx = robotPose.x || 0;
      const ry = robotPose.y || 0;
      const ryaw = robotPose.yaw || 0;
      const rp = mapToCanvas(rx, ry, width, height);

      ctx.save();
      ctx.translate(rp.x, rp.y);
      ctx.rotate(-ryaw); // Canvas inverted Y

      // Robot dimensions: 0.60m length, 0.40m width
      const lengthPx = 0.60 * camera.scale;
      const widthPx = 0.40 * camera.scale;

      // Forward Headlight Illumination Cone (Cyber Orange High-Beam)
      const headlightBeam = 1.4 * camera.scale;
      const headlightGrad = ctx.createRadialGradient(lengthPx / 2, 0, 0, lengthPx / 2 + headlightBeam / 2, 0, headlightBeam);
      headlightGrad.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
      headlightGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.12)');
      headlightGrad.addColorStop(1, 'rgba(234, 88, 12, 0.0)');

      ctx.fillStyle = headlightGrad;
      ctx.beginPath();
      ctx.moveTo(lengthPx / 2, 0);
      ctx.arc(lengthPx / 2, 0, headlightBeam, -0.42, 0.42);
      ctx.closePath();
      ctx.fill();

      // Ambient Chassis Glow
      ctx.shadowColor = 'rgba(234, 88, 12, 0.55)';
      ctx.shadowBlur = 14;

      // Main Autonomous Robot Body Chassis (Safety Orange & Carbon Black Bumblebee Style)
      const chassisGrad = ctx.createLinearGradient(-lengthPx / 2, -widthPx / 2, lengthPx / 2, widthPx / 2);
      chassisGrad.addColorStop(0, '#ff7a1a');
      chassisGrad.addColorStop(0.5, '#f97316');
      chassisGrad.addColorStop(1, '#ea580c');

      ctx.fillStyle = chassisGrad;
      ctx.strokeStyle = '#090d16'; // sleek black perimeter
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-lengthPx / 2, -widthPx / 2, lengthPx, widthPx, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Carbon Fiber Racing Stripes down the spine (Matte Black)
      ctx.fillStyle = '#090d16';
      const stripeW = 0.07 * camera.scale;
      const stripeGap = 0.02 * camera.scale;
      ctx.fillRect(-lengthPx / 2 + 2, -stripeW - stripeGap, lengthPx - 4, stripeW);
      ctx.fillRect(-lengthPx / 2 + 2, stripeGap, lengthPx - 4, stripeW);

      // Left and Right High-Grip Drive Wheels (Axle at x = 0) (Matte Black with Orange Rim line)
      const wheelL = 0.20 * camera.scale;
      const wheelW = 0.06 * camera.scale;
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      // Left wheel (centered at axle x = 0)
      ctx.fillRect(-wheelL / 2, -widthPx / 2 - wheelW / 2, wheelL, wheelW);
      ctx.strokeRect(-wheelL / 2, -widthPx / 2 - wheelW / 2, wheelL, wheelW);
      // Right wheel (centered at axle x = 0)
      ctx.fillRect(-wheelL / 2, widthPx / 2 - wheelW / 2, wheelL, wheelW);
      ctx.strokeRect(-wheelL / 2, widthPx / 2 - wheelW / 2, wheelL, wheelW);

      // Wheel Axle Line connecting the two wheels across the chassis at x = 0
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -widthPx / 2);
      ctx.lineTo(0, widthPx / 2);
      ctx.stroke();

      // Differential Drive Center Point (base_link origin between the two wheels)
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Dual Front LED Headlights
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lengthPx / 2 - 2, -widthPx / 3, 3, 0, Math.PI * 2);
      ctx.arc(lengthPx / 2 - 2, widthPx / 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Dual Rear Red Tail Markers
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(-lengthPx / 2 + 2, -widthPx / 3, 2.5, 0, Math.PI * 2);
      ctx.arc(-lengthPx / 2 + 2, widthPx / 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Front Directional Arrow / Chevron at Nose
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(lengthPx / 2 - 2, 0);
      ctx.lineTo(lengthPx / 2 - 0.05 * camera.scale, -widthPx / 6);
      ctx.lineTo(lengthPx / 2 - 0.05 * camera.scale, widthPx / 6);
      ctx.closePath();
      ctx.fill();

      // Front LiDAR Scanner (Offset forward from center between the two wheels)
      const lidarOffsetPx = lidarOffsetX * camera.scale;

      // Offset Connector Guide Line from Wheel Axle Center to Front LiDAR
      if (lidarOffsetPx > 2) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(lidarOffsetPx, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Front LiDAR Mount Turret Pedestal Bracket
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(
        lidarOffsetPx - 0.075 * camera.scale,
        -0.065 * camera.scale,
        0.15 * camera.scale,
        0.13 * camera.scale,
        4
      );
      ctx.fill();
      ctx.stroke();

      // Rotary LiDAR Scanner Puck (Rotary Head)
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lidarOffsetPx, 0, 0.065 * camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Optical Sensor Core
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lidarOffsetPx, 0, 0.04 * camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Scanning Diode on LiDAR
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lidarOffsetPx + 0.035 * camera.scale, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  }, [
    mapData, robotPose, laserScan, globalPath, localPath, globalCostmap, locations, activeGoal,
    camera, mapToCanvas, canvasToMap, showGrid, showLaser, showTrail,
    showLocations, showGlobalCostmap, trail, goalDragStart, goalDragCurrent, lidarOffsetX
  ]);

  // Mouse Handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const mPos = canvasToMap(clickX, clickY, rect.width, rect.height);

      if (toolMode === 'NAV_GOAL' || toolMode === 'INITIAL_POSE') {
        // Start dragging to set goal/pose position and heading
        setGoalDragStart({ x: mPos.x, y: mPos.y });
        setGoalDragCurrent({ x: mPos.x, y: mPos.y });
      } else if (toolMode === 'MARK_LOC') {
        onSaveLocationAtPose?.(mPos.x, mPos.y, 0.0);
        setToolMode('PAN');
      } else {
        setDragStart({ x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y });
      }
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const mPos = canvasToMap(clickX, clickY, rect.width, rect.height);
    setMouseMapPos(mPos);

    if (goalDragStart) {
      setGoalDragCurrent({ x: mPos.x, y: mPos.y });
    } else if (dragStart) {
      const dx = (e.clientX - dragStart.x) / camera.scale;
      const dy = (e.clientY - dragStart.y) / camera.scale;
      setCamera(prev => ({
        ...prev,
        x: dragStart.camX - dx,
        y: dragStart.camY + dy
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (goalDragStart) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const mPos = canvasToMap(clickX, clickY, rect.width, rect.height);

      // Compute yaw from drag vector: start -> current
      const dx = mPos.x - goalDragStart.x;
      const dy = mPos.y - goalDragStart.y;
      const yaw = Math.hypot(dx, dy) > 0.15 ? Math.atan2(dy, dx) : 0.0;

      if (toolMode === 'INITIAL_POSE') {
        onSetInitialPose?.(goalDragStart.x, goalDragStart.y, yaw);
      } else {
        setActiveGoal({ x: goalDragStart.x, y: goalDragStart.y, yaw });
        onSendGoal?.(goalDragStart.x, goalDragStart.y, yaw);
      }

      setGoalDragStart(null);
      setGoalDragCurrent(null);
      setToolMode('PAN');
    }
    setDragStart(null);
  };

  const pinchDistRef = useRef(null);

  // Mobile Touch Handlers: single-finger pan/goal and two-finger pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = touch.clientX - rect.left;
      const clickY = touch.clientY - rect.top;
      const mPos = canvasToMap(clickX, clickY, rect.width, rect.height);
      setMouseMapPos(mPos);

      if (toolMode === 'NAV_GOAL' || toolMode === 'INITIAL_POSE') {
        setGoalDragStart({ x: mPos.x, y: mPos.y });
        setGoalDragCurrent({ x: mPos.x, y: mPos.y });
      } else if (toolMode === 'MARK_LOC') {
        onSaveLocationAtPose?.(mPos.x, mPos.y, 0.0);
        setToolMode('PAN');
      } else {
        setDragStart({ x: touch.clientX, y: touch.clientY, camX: camera.x, camY: camera.y });
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = touch.clientX - rect.left;
      const clickY = touch.clientY - rect.top;
      const mPos = canvasToMap(clickX, clickY, rect.width, rect.height);
      setMouseMapPos(mPos);

      if (goalDragStart) {
        setGoalDragCurrent({ x: mPos.x, y: mPos.y });
      } else if (dragStart) {
        const dx = (touch.clientX - dragStart.x) / camera.scale;
        const dy = (touch.clientY - dragStart.y) / camera.scale;
        setCamera(prev => ({
          ...prev,
          x: dragStart.camX - dx,
          y: dragStart.camY + dy
        }));
      }
    } else if (e.touches.length === 2 && pinchDistRef.current) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = newDist / pinchDistRef.current;
      if (Math.abs(ratio - 1) > 0.015) {
        setCamera(prev => ({
          ...prev,
          scale: Math.max(8, Math.min(300, prev.scale * ratio))
        }));
        pinchDistRef.current = newDist;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (goalDragStart) {
      const current = goalDragCurrent || goalDragStart;
      const dx = current.x - goalDragStart.x;
      const dy = current.y - goalDragStart.y;
      const yaw = Math.hypot(dx, dy) > 0.15 ? Math.atan2(dy, dx) : 0.0;

      if (toolMode === 'INITIAL_POSE') {
        onSetInitialPose?.(goalDragStart.x, goalDragStart.y, yaw);
      } else {
        setActiveGoal({ x: goalDragStart.x, y: goalDragStart.y, yaw });
        onSendGoal?.(goalDragStart.x, goalDragStart.y, yaw);
      }

      setGoalDragStart(null);
      setGoalDragCurrent(null);
      setToolMode('PAN');
    }
    setDragStart(null);
    pinchDistRef.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setCamera(prev => ({
      ...prev,
      scale: Math.max(8, Math.min(300, prev.scale * zoomFactor))
    }));
  };

  const fitMap = () => {
    if (mapData?.info) {
      const { width, height, resolution, origin } = mapData.info;
      const centerX = origin.position.x + (width * resolution) / 2;
      const centerY = origin.position.y + (height * resolution) / 2;
      setCamera({ x: centerX, y: centerY, scale: 35 });
    } else {
      setCamera({ x: 0, y: 0, scale: 45 });
    }
  };

  const centerOnRobot = () => {
    if (robotPose) {
      setCamera(prev => ({
        ...prev,
        x: robotPose.x || 0,
        y: robotPose.y || 0
      }));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`clay-card flex flex-col flex-1 relative overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'h-full min-h-[360px] sm:min-h-[460px]'
      }`}
    >
      {/* Map Header Toolbar */}
      <div className="panel-header py-2.5 px-4 bg-slate-950 border-b border-slate-800 text-white">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-slate-800 text-orange-500">
            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          </div>
          <span className="text-xs font-bold tracking-wide text-white font-mono truncate">
            2D OCCUPANCY GRID & AUTONOMY MAP
          </span>
        </div>

        {/* Real-time map telemetry HUD */}
        <div className="flex items-center gap-3 sm:gap-4 font-mono text-[10px] sm:text-[11px] text-slate-400">
          <div className="hidden sm:flex items-center gap-1.5">
            <span>CURSOR:</span>
            <span className="text-slate-200 font-semibold">({mouseMapPos.x.toFixed(2)}m, {mouseMapPos.y.toFixed(2)}m)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>ZOOM:</span>
            <span className="text-orange-400 font-bold">{camera.scale.toFixed(0)} px/m</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative w-full h-full bg-slate-100 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="w-full h-full block cursor-crosshair touch-none select-none"
        />

        {/* Responsive Floating HUD Top Container (Zero Overlap Layout) */}
        <div className="absolute top-2.5 sm:top-3 inset-x-2.5 sm:inset-x-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none z-10">
          {/* Primary Interactive Action Toolbar */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-xl backdrop-blur-md pointer-events-auto">
            <button
              onClick={() => setToolMode('PAN')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                toolMode === 'PAN'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Pan Viewport (Click/touch and drag map)"
            >
              Pan
            </button>

            <button
              onClick={() => setToolMode('NAV_GOAL')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                toolMode === 'NAV_GOAL'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Click & Drag on map to set Nav2 Goal + Orientation heading"
            >
              <Crosshair className={`w-3.5 h-3.5 ${toolMode === 'NAV_GOAL' ? 'text-white' : 'text-orange-400'}`} />
              <span className="hidden sm:inline">Set Nav Goal</span>
              <span className="sm:hidden">Goal</span>
            </button>

            <button
              onClick={() => setToolMode('INITIAL_POSE')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                toolMode === 'INITIAL_POSE'
                  ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Click & Drag on map to set AMCL 2D Initial Pose Estimate"
            >
              <Navigation className={`w-3.5 h-3.5 ${toolMode === 'INITIAL_POSE' ? 'text-white' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">2D Pose Estimate</span>
              <span className="sm:hidden">Pose</span>
            </button>

            {onSetInitialPose && (
              <button
                onClick={() => onSetInitialPose(0, 0, 0)}
                className="px-2 py-1.5 rounded-xl text-[10px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Reset AMCL initial pose to (0, 0, 0)"
              >
                (0,0)
              </button>
            )}

            <button
              onClick={() => setToolMode('MARK_LOC')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                toolMode === 'MARK_LOC'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Click map to create a new named waypoint location pin"
            >
              <MapPin className={`w-3.5 h-3.5 ${toolMode === 'MARK_LOC' ? 'text-white' : 'text-orange-400'}`} />
              <span className="hidden sm:inline">Mark Pin</span>
              <span className="sm:hidden">Pin</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 sm:mx-1 hidden xs:block" />

            {/* Quick Zoom & Center buttons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCamera(prev => ({ ...prev, scale: Math.min(300, prev.scale * 1.25) }))}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
              <button
                onClick={() => setCamera(prev => ({ ...prev, scale: Math.max(8, prev.scale * 0.8) }))}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
              <button
                onClick={fitMap}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fit Map to View"
              >
                <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
              <button
                onClick={centerOnRobot}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Center View on Robot"
              >
                <Navigation className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-orange-400" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Toggle Fullscreen Map"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
              </button>
            </div>
          </div>

          {/* Layer Controls Bar */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-xl text-xs font-mono pointer-events-auto backdrop-blur-md">
            <button
              onClick={() => setShowLaser(!showLaser)}
              className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] transition-all font-semibold flex items-center gap-1 cursor-pointer ${
                showLaser ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle LiDAR Laser Scan Points"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
              LiDAR
            </button>

            <button
              onClick={() => setShowTrail(!showTrail)}
              className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] transition-all font-semibold flex items-center gap-1 cursor-pointer ${
                showTrail ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle Odometry Trail"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 inline-block"></span>
              Trail
            </button>
            <button
              onClick={() => setShowGlobalCostmap(!showGlobalCostmap)}
              className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] transition-all font-semibold cursor-pointer ${
                showGlobalCostmap ? 'bg-orange-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle Nav2 global costmap"
            >
              Costmap
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] transition-all font-semibold cursor-pointer ${
                showGrid ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle Meter Grid"
            >
              Grid
            </button>
          </div>
        </div>

        {/* Legend Overlay (Bottom Right - Fixed Boundary to prevent overlap) */}
        <div className="absolute bottom-2.5 sm:bottom-3 right-2.5 sm:right-3 px-3 py-1.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-xl text-[10px] sm:text-[11px] font-mono flex items-center gap-2.5 sm:gap-3.5 z-10 text-slate-300 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-orange-500 ring-1 ring-orange-400"></span>
            <span className="font-bold text-white">BUMBLEB</span>
          </div>
          <div className="hidden xs:flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>LiDAR (+{Math.round(lidarOffsetX * 100)}cm)</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="h-1.5 w-3.5 bg-emerald-400 rounded-xs"></span>
            <span>Nav2 Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-orange-400 bg-orange-500/25"></span>
            <span>Goal</span>
          </div>
        </div>

        {/* Nav Goal Instruction Notice when active (Bottom Left with safe width) */}
        {toolMode === 'NAV_GOAL' && (
          <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 max-w-[calc(100vw-230px)] sm:max-w-xs md:max-w-sm px-3.5 py-1.5 rounded-2xl bg-slate-950/95 border border-orange-500 text-[10px] sm:text-xs font-mono text-orange-400 shadow-2xl flex items-center gap-2 z-10 animate-bounce backdrop-blur-md">
            <Crosshair className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-orange-400 shrink-0" />
            <span className="truncate sm:whitespace-normal">Click or drag on map to set Nav2 goal & heading</span>
          </div>
        )}

        {/* Initial Pose Instruction Notice when active (Bottom Left with safe width) */}
        {toolMode === 'INITIAL_POSE' && (
          <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 max-w-[calc(100vw-230px)] sm:max-w-xs md:max-w-sm px-3.5 py-1.5 rounded-2xl bg-slate-950/95 border border-emerald-400 text-[10px] sm:text-xs font-mono text-emerald-400 shadow-2xl flex items-center gap-2 z-10 animate-bounce backdrop-blur-md">
            <Navigation className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate sm:whitespace-normal">Click or drag on map to set AMCL 2D Pose Estimate</span>
          </div>
        )}
      </div>
    </div>
  );
}
