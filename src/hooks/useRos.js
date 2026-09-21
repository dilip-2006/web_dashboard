import { useState, useEffect, useRef } from 'react';
import rosConnection from '../ros/rosConnection';

const INITIAL_LOCATIONS = [
  { id: 'loc-1', name: 'Inbound Dock A', type: 'loading', x: 1.50, y: 2.00, yaw: 0.0, map: 'warehouse_main' },
  { id: 'loc-2', name: 'Shelf 01 (Fast Pick)', type: 'shelf', x: 3.20, y: 1.10, yaw: 1.57, map: 'warehouse_main' },
  { id: 'loc-3', name: 'Shelf 04 (Heavy Staging)', type: 'shelf', x: 2.80, y: -1.80, yaw: -1.57, map: 'warehouse_main' },
  { id: 'loc-4', name: 'Inspection Bay', type: 'staging', x: -1.20, y: 1.50, yaw: 3.14, map: 'warehouse_main' },
  { id: 'loc-5', name: 'Rapid Charger #01', type: 'charging', x: -2.00, y: -1.20, yaw: 0.0, map: 'warehouse_main' }
];

const INITIAL_MAPS = ['warehouse_main', 'warehouse_sector_b', 'assembly_floor'];

export function useRos() {
  const [connected, setConnected] = useState(rosConnection.connected);
  const [systemState, setSystemState] = useState({
    state: 'READY',
    previous_state: 'OFF',
    active_map: 'warehouse_main',
    is_emergency_stop: false,
    error_reason: ''
  });
  const [systemHealth, setSystemHealth] = useState({
    overall: 'OK',
    components: {
      lidar: { status: 'OK', message: '10.2 Hz • 360 rays' },
      odometry: { status: 'OK', message: '50.0 Hz • ±0.02m drift' },
      tf: { status: 'OK', message: 'map->odom->base_link nominal' },
      controller: { status: 'OK', message: 'ZLAC706 CAN dual drivers OK' },
      slam_toolbox: { status: 'OK', message: 'Graph optimizer active' },
      map_server: { status: 'OK', message: 'warehouse_main active' },
      amcl: { status: 'OK', message: 'Particle filter localized' },
      nav2: { status: 'OK', message: 'Behavior tree ready' }
    }
  });
  const [robotPose, setRobotPose] = useState({ x: 0.0, y: 0.0, yaw: 0.5, yaw_deg: 28.6, valid: true });
  const [navStatus, setNavStatus] = useState({ status: 'IDLE', target: '', distance_remaining: 0.0 });
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [maps, setMaps] = useState(INITIAL_MAPS);
  const [battery, setBattery] = useState({ percentage: 0.95, voltage: 25.4 });
  const [mapData, setMapData] = useState(null);
  const [laserScan, setLaserScan] = useState(null);
  const [globalPath, setGlobalPath] = useState(null);
  const [velocity, setVelocity] = useState({ linear: 0.0, angular: 0.0 });

  const simVelRef = useRef({ vx: 0.0, wz: 0.0 });

  useEffect(() => {
    rosConnection.connect();

    const onConn = () => setConnected(true);
    const onClose = () => setConnected(false);
    const onState = (data) => setSystemState(data);
    const onHealth = (data) => setSystemHealth(data);
    const onNav = (data) => {
      setNavStatus(data);
      if (data.robot_pose) {
        setRobotPose(data.robot_pose);
      }
    };
    const onLocs = (data) => setLocations(Array.isArray(data) && data.length > 0 ? data : INITIAL_LOCATIONS);
    const onMaps = (data) => setMaps(Array.isArray(data) && data.length > 0 ? data : INITIAL_MAPS);
    const onBat = (data) => setBattery({ percentage: data.percentage, voltage: data.voltage });
    const onMap = (data) => setMapData(data);
    const onScan = (data) => setLaserScan(data);
    const onPlan = (data) => setGlobalPath(data);
    const onOdom = (data) => {
      if (data.twist && data.twist.twist) {
        setVelocity({
          linear: data.twist.twist.linear.x,
          angular: data.twist.twist.angular.z
        });
      }
    };
    const onPose = (msg) => {
      if (!msg) return;
      if (msg.x != null && msg.y != null) {
        setRobotPose(msg);
      } else if (msg.pose && msg.pose.position) {
        const q = msg.pose.orientation;
        let yaw = 0;
        if (q) {
          const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
          const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
          yaw = Math.atan2(siny_cosp, cosy_cosp);
        }
        setRobotPose({
          x: msg.pose.position.x,
          y: msg.pose.position.y,
          yaw,
          yaw_deg: (yaw * 180 / Math.PI) % 360,
          valid: true
        });
      }
    };

    rosConnection.on('connection', onConn);
    rosConnection.on('close', onClose);
    rosConnection.on('state', onState);
    rosConnection.on('health', onHealth);
    rosConnection.on('navStatus', onNav);
    rosConnection.on('pose', onPose);
    rosConnection.on('locations', onLocs);
    rosConnection.on('maps', onMaps);
    rosConnection.on('battery', onBat);
    rosConnection.on('map', onMap);
    rosConnection.on('scan', onScan);
    rosConnection.on('plan', onPlan);
    rosConnection.on('odom', onOdom);

    return () => {
      rosConnection.off('connection', onConn);
      rosConnection.off('close', onClose);
      rosConnection.off('state', onState);
      rosConnection.off('health', onHealth);
      rosConnection.off('navStatus', onNav);
      rosConnection.off('pose', onPose);
      rosConnection.off('locations', onLocs);
      rosConnection.off('maps', onMaps);
      rosConnection.off('battery', onBat);
      rosConnection.off('map', onMap);
      rosConnection.off('scan', onScan);
      rosConnection.off('plan', onPlan);
      rosConnection.off('odom', onOdom);
    };
  }, []);

  // Standby kinematic odometry integration when awaiting bridge connection
  useEffect(() => {
    if (connected) return;

    const dt = 0.05; // 20Hz update
    const simInterval = setInterval(() => {
      const { vx, wz } = simVelRef.current;
      if (vx !== 0 || wz !== 0) {
        setRobotPose(prev => {
          const newYaw = prev.yaw + wz * dt;
          const newX = prev.x + vx * Math.cos(newYaw) * dt;
          const newY = prev.y + vx * Math.sin(newYaw) * dt;
          return {
            x: newX,
            y: newY,
            yaw: newYaw,
            yaw_deg: (newYaw * 180 / Math.PI) % 360,
            valid: true
          };
        });
      }
    }, 50);

    return () => clearInterval(simInterval);
  }, [connected]);

  const sendVelocity = (vx, wz) => {
    simVelRef.current = { vx, wz };
    setVelocity({ linear: vx, angular: wz });
    if (connected) {
      rosConnection.sendVelocity(vx, wz);
    }
  };

  const sendGoal = (x, y, yaw = 0.0, frame = 'map') => {
    if (connected) {
      rosConnection.sendGoal(x, y, yaw, frame);
    } else {
      // Standby autonomous dispatch loop when bridge is offline
      setNavStatus({
        status: 'NAVIGATING',
        target: `(${Number(x).toFixed(2)}, ${Number(y).toFixed(2)})`,
        distance_remaining: Math.hypot(x - robotPose.x, y - robotPose.y).toFixed(2)
      });
      setSystemState(prev => ({ ...prev, state: 'NAVIGATION' }));

      // Generate a mock global path to target
      const steps = 20;
      const poses = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        poses.push({
          pose: {
            position: {
              x: robotPose.x + (x - robotPose.x) * t,
              y: robotPose.y + (y - robotPose.y) * t,
              z: 0
            }
          }
        });
      }
      setGlobalPath({ poses });

      setTimeout(() => {
        setRobotPose({ x, y, yaw, yaw_deg: (yaw * 180 / Math.PI) % 360, valid: true });
        setNavStatus({ status: 'SUCCEEDED', target: '', distance_remaining: 0.0 });
        setGlobalPath(null);
      }, 3500);
    }
  };

  const sendCommand = (cmd) => {
    if (connected) {
      rosConnection.sendCommand(cmd);
    } else {
      if (cmd.action === 'start_mapping') setSystemState(prev => ({ ...prev, state: 'MAPPING' }));
      else if (cmd.action === 'stop_mapping') setSystemState(prev => ({ ...prev, state: 'READY' }));
      else if (cmd.action === 'start_localization') setSystemState(prev => ({ ...prev, state: 'LOCALIZATION' }));
      else if (cmd.action === 'stop_localization') setSystemState(prev => ({ ...prev, state: 'READY' }));
      else if (cmd.action === 'start_navigation') setSystemState(prev => ({ ...prev, state: 'NAVIGATION' }));
      else if (cmd.action === 'stop_navigation') setSystemState(prev => ({ ...prev, state: 'READY' }));
      else if (cmd.action === 'emergency_stop') {
        simVelRef.current = { vx: 0, wz: 0 };
        setVelocity({ linear: 0, angular: 0 });
        setSystemState(prev => ({ ...prev, is_emergency_stop: true, state: 'EMERGENCY_STOP' }));
      } else if (cmd.action === 'reset_emergency_stop') {
        setSystemState(prev => ({ ...prev, is_emergency_stop: false, state: 'READY' }));
      } else if (cmd.action === 'system_reset') {
        setSystemState(prev => ({ ...prev, state: 'READY', is_emergency_stop: false }));
      }
    }
  };

  const sendLocationCommand = (payload) => {
    if (connected) {
      rosConnection.sendLocationCommand(payload);
    } else {
      if (payload.action === 'save_location') {
        const newLoc = {
          id: `loc-${Date.now()}`,
          name: payload.name,
          type: payload.type || 'shelf',
          x: payload.use_current_pose ? robotPose.x : payload.x,
          y: payload.use_current_pose ? robotPose.y : payload.y,
          yaw: payload.yaw || 0.0,
          map: payload.map || 'warehouse_main'
        };
        setLocations(prev => [...prev, newLoc]);
      } else if (payload.action === 'delete_location') {
        setLocations(prev => prev.filter(l => l.name !== payload.name));
      } else if (payload.action === 'navigate_to_location') {
        const loc = locations.find(l => l.name === payload.name);
        if (loc) {
          sendGoal(loc.x, loc.y, loc.yaw || 0.0);
        }
      }
    }
  };

  return {
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
    rosUrl: rosConnection.url,
    connectRos: (url) => rosConnection.connect(url),
    disconnectRos: () => rosConnection.disconnect()
  };
}

