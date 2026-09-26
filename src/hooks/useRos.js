import { useState, useEffect, useRef, useCallback } from 'react';
import rosConnection from '../ros/rosConnection';

const INITIAL_LOCATIONS = [];

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
  const [globalCostmap, setGlobalCostmap] = useState(null);
  const [localCostmap, setLocalCostmap] = useState(null);
  const [laserScan, setLaserScan] = useState(null);
  const [globalPath, setGlobalPath] = useState(null);
  const [localPath, setLocalPath] = useState(null);
  const [velocity, setVelocity] = useState({ linear: 0.0, angular: 0.0 });
  const [operationResult, setOperationResult] = useState(null);
  const [notice, setNotice] = useState('');

  const simVelRef = useRef({ vx: 0.0, wz: 0.0 });
  const lastBridgePoseAtRef = useRef(0);
  const lastPoseStampRef = useRef(0);

  useEffect(() => {
    rosConnection.connect();

    const onConn = () => {
      setConnected(true);
      setNotice('Connected to BumbleB ROS 2 WebSocket Bridge');
      setTimeout(() => setNotice(''), 4000);
    };
    const onClose = () => {
      setConnected(false);
      setNotice('ROS Bridge disconnected');
    };
    const onError = () => {
      setConnected(false);
      setNotice(`ROS Bridge connection error (${rosConnection.url})`);
    };
    const onState = (data) => setSystemState(data);
    const onHealth = (data) => setSystemHealth(data);
    const onNav = (data) => {
      setNavStatus(data);
    };
    const onLocs = (data) => setLocations(Array.isArray(data) ? data : []);
    const onMaps = (data) => setMaps(Array.isArray(data) && data.length > 0 ? data : INITIAL_MAPS);
    const onBat = (data) => setBattery({ percentage: data.percentage, voltage: data.voltage });
    const onMap = (data) => setMapData(data);
    const onGlobalCostmap = (data) => setGlobalCostmap(data);
    const onLocalCostmap = (data) => setLocalCostmap(data);
    const onScan = (data) => setLaserScan(data);
    const onPlan = (data) => setGlobalPath(data);
    const onLocalPlan = (data) => setLocalPath(data);
    const onOperation = (data) => {
      setOperationResult(data);
      if (data && data.message) {
        setNotice(data.message);
        setTimeout(() => setNotice(''), 6000);
      }
    };
    const onOdom = (data) => {
      if (data.twist && data.twist.twist) {
        setVelocity({
          linear: data.twist.twist.linear.x,
          angular: data.twist.twist.angular.z
        });
      }

      // /odom is the live motion source while SLAM/AMCL is stopped. Use it
      // only when the TF-derived bridge pose is not fresh; once map->base_link
      // is available, /amr/robot_pose remains authoritative in the map frame.
      if (
        data.pose && data.pose.pose &&
        Date.now() - lastBridgePoseAtRef.current > 500
      ) {
        const p = data.pose.pose;
        const q = p.orientation || {};
        const sinyCosp = 2 * ((q.w || 0) * (q.z || 0) + (q.x || 0) * (q.y || 0));
        const cosyCosp = 1 - 2 * ((q.y || 0) * (q.y || 0) + (q.z || 0) * (q.z || 0));
        const yaw = Math.atan2(sinyCosp, cosyCosp);
        setRobotPose({
          x: p.position?.x || 0,
          y: p.position?.y || 0,
          yaw,
          yaw_deg: yaw * 180 / Math.PI,
          frame_id: data.header?.frame_id || 'odom',
          valid: true
        });
      }
    };
    const onPose = (msg) => {
      if (!msg) return;
      // rosbridge can deliver queued messages after a reconnect or under
      // network load. Reject an older ROS-time sample so a delayed packet
      // cannot move the marker backwards.
      const stamp = msg.header?.stamp;
      const stampSec = stamp
        ? Number(stamp.sec || 0) + Number(stamp.nanosec || stamp.nsec || 0) / 1e9
        : 0;
      if (stampSec > 0 && stampSec < lastPoseStampRef.current) return;
      if (stampSec > 0) lastPoseStampRef.current = stampSec;
      lastBridgePoseAtRef.current = Date.now();
      if (msg.x != null && msg.y != null) {
        setRobotPose({ ...msg, frame_id: msg.frame_id || 'map' });
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
          frame_id: msg.header?.frame_id || 'map',
          valid: true
        });
      }
    };

    rosConnection.on('connection', onConn);
    rosConnection.on('close', onClose);
    rosConnection.on('error', onError);
    rosConnection.on('state', onState);
    rosConnection.on('health', onHealth);
    rosConnection.on('navStatus', onNav);
    rosConnection.on('pose', onPose);
    rosConnection.on('locations', onLocs);
    rosConnection.on('maps', onMaps);
    rosConnection.on('battery', onBat);
    rosConnection.on('map', onMap);
    rosConnection.on('globalCostmap', onGlobalCostmap);
    rosConnection.on('localCostmap', onLocalCostmap);
    rosConnection.on('scan', onScan);
    rosConnection.on('plan', onPlan);
    rosConnection.on('localPlan', onLocalPlan);
    rosConnection.on('odom', onOdom);
    rosConnection.on('operationResult', onOperation);

    return () => {
      rosConnection.off('connection', onConn);
      rosConnection.off('close', onClose);
      rosConnection.off('error', onError);
      rosConnection.off('state', onState);
      rosConnection.off('health', onHealth);
      rosConnection.off('navStatus', onNav);
      rosConnection.off('pose', onPose);
      rosConnection.off('locations', onLocs);
      rosConnection.off('maps', onMaps);
      rosConnection.off('battery', onBat);
      rosConnection.off('map', onMap);
      rosConnection.off('globalCostmap', onGlobalCostmap);
      rosConnection.off('localCostmap', onLocalCostmap);
      rosConnection.off('scan', onScan);
      rosConnection.off('plan', onPlan);
      rosConnection.off('localPlan', onLocalPlan);
      rosConnection.off('odom', onOdom);
      rosConnection.off('operationResult', onOperation);
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

  // Keep this callback identity stable while telemetry updates arrive. If it
  // changes on every pose update, Teleop's cleanup effect publishes an extra
  // zero command on every render and can saturate rosbridge's input queue.
  const sendVelocity = useCallback((vx, wz) => {
    simVelRef.current = { vx, wz };
    setVelocity({ linear: vx, angular: wz });
    if (connected) {
      rosConnection.sendVelocity(vx, wz);
    }
  }, [connected]);

  const sendGoal = (x, y, yaw = 0.0, frame = 'map') => {
    if (connected) {
      rosConnection.navigateToPose(x, y, yaw);
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

  const setInitialPose = (x, y, yaw = 0.0) => {
    if (connected) {
      rosConnection.setInitialPose(x, y, yaw);
    } else {
      setRobotPose({ x: Number(x) || 0, y: Number(y) || 0, yaw: Number(yaw) || 0, yaw_deg: ((Number(yaw) || 0) * 180 / Math.PI) % 360, valid: true });
      setNotice(`Initial pose set to (${Number(x).toFixed(2)}, ${Number(y).toFixed(2)})`);
      setTimeout(() => setNotice(''), 4000);
    }
  };

  const setMode = (mode, mapName = '') => {
    if (connected) {
      rosConnection.setMode(mode, mapName);
    } else {
      setSystemState(prev => ({
        ...prev,
        state: mode,
        active_map: mapName || prev.active_map
      }));
    }
  };

  const mapOperation = (operation, mapName = '') => {
    if (connected) {
      rosConnection.mapOperation(operation, mapName);
    } else {
      setNotice(`Simulated ${operation} on map '${mapName || 'active'}'`);
      setTimeout(() => setNotice(''), 4000);
    }
  };

  const saveMap = (mapName) => mapOperation('save_map', mapName);
  const serializePoseGraph = (mapName) => mapOperation('serialize_pose_graph', mapName);
  const resumeMapping = (mapName) => mapOperation('resume_mapping', mapName);

  const cancelNavigation = () => {
    if (connected) {
      rosConnection.cancelNavigation();
    } else {
      setNavStatus({ status: 'IDLE', target: '', distance_remaining: 0.0 });
      setGlobalPath(null);
    }
  };

  const emergencyStop = () => {
    simVelRef.current = { vx: 0, wz: 0 };
    setVelocity({ linear: 0, angular: 0 });
    if (connected) {
      rosConnection.emergencyStop();
    } else {
      setSystemState(prev => ({ ...prev, is_emergency_stop: true, state: 'EMERGENCY_STOP' }));
    }
  };

  const resetEmergencyStop = () => {
    if (connected) {
      rosConnection.resetEmergencyStop();
    } else {
      setSystemState(prev => ({ ...prev, is_emergency_stop: false, state: 'READY' }));
    }
  };

  const systemReset = () => {
    if (connected) {
      rosConnection.systemReset();
    } else {
      setSystemState(prev => ({ ...prev, state: 'READY', is_emergency_stop: false }));
    }
  };

  const sendCommand = (cmd) => {
    if (connected) {
      if (cmd.action === 'start_robot') setMode('READY');
      else if (cmd.action === 'stop_robot') setMode('READY');
      else if (cmd.action === 'start_mapping') setMode('MAPPING', cmd.map_name);
      else if (cmd.action === 'stop_mapping') setMode('READY');
      else if (cmd.action === 'start_localization' || (cmd.action === 'set_mode' && cmd.mode === 'LOCALIZATION') || cmd.action === 'load_map') {
        setMode('LOCALIZATION', cmd.map_name);
      }
      else if (cmd.action === 'stop_localization') setMode('READY');
      else if (cmd.action === 'start_navigation' || (cmd.action === 'set_mode' && cmd.mode === 'NAVIGATION')) {
        setMode('NAVIGATION', cmd.map_name);
      }
      else if (cmd.action === 'stop_navigation') setMode('READY');
      else if (cmd.action === 'set_mode') setMode(cmd.mode, cmd.map_name);
      else if (cmd.action === 'save_map') mapOperation('save_map', cmd.map_name);
      else if (cmd.action === 'serialize_map' || cmd.action === 'serialize_pose_graph') mapOperation('serialize_pose_graph', cmd.map_name);
      else if (cmd.action === 'deserialize_map' || cmd.action === 'deserialize_pose_graph' || cmd.action === 'resume_mapping') mapOperation('resume_mapping', cmd.map_name);
      else if (cmd.action === 'emergency_stop') emergencyStop();
      else if (cmd.action === 'reset_emergency_stop') resetEmergencyStop();
      else if (cmd.action === 'system_reset') systemReset();
      else if (cmd.action === 'cancel_navigation') cancelNavigation();
      else if (cmd.action === 'set_initial_pose') setInitialPose(cmd.x, cmd.y, cmd.yaw);
      else if (cmd.action === 'navigate_to_pose') sendGoal(cmd.x, cmd.y, cmd.yaw);
      else rosConnection.sendCommand(cmd);
    } else {
      if (cmd.action === 'start_mapping') setSystemState(prev => ({ ...prev, state: 'MAPPING' }));
      else if (cmd.action === 'stop_mapping') setSystemState(prev => ({ ...prev, state: 'READY' }));
      else if (cmd.action === 'start_localization') setSystemState(prev => ({ ...prev, state: 'LOCALIZATION', active_map: cmd.map_name || prev.active_map }));
      else if (cmd.action === 'stop_localization') setSystemState(prev => ({ ...prev, state: 'READY' }));
      else if (cmd.action === 'start_navigation') setSystemState(prev => ({ ...prev, state: 'NAVIGATION', active_map: cmd.map_name || prev.active_map }));
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
    }
    // Optimistic local state update (always active in sim/disconnected, and ensures instant UI feedback)
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
      setLocations(prev => [...prev.filter(l => l.name !== payload.name), newLoc]);
    } else if (payload.action === 'delete_location') {
      setLocations(prev => prev.filter(l => l.name !== payload.name));
    } else if (payload.action === 'clear_all_locations' || payload.action === 'clear_all') {
      setLocations([]);
    } else if (payload.action === 'navigate_to_location') {
      const loc = locations.find(l => l.name === payload.name);
      if (loc) {
        sendGoal(loc.x, loc.y, loc.yaw || 0.0);
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
    globalCostmap,
    localCostmap,
    laserScan,
    globalPath,
    localPath,
    velocity,
    operationResult,
    notice,
    setNotice,
    sendCommand,
    sendLocationCommand,
    sendGoal,
    sendVelocity,
    setMode,
    mapOperation,
    saveMap,
    serializePoseGraph,
    resumeMapping,
    setInitialPose,
    cancelNavigation,
    emergencyStop,
    resetEmergencyStop,
    systemReset,
    rosUrl: rosConnection.url,
    connectRos: (url) => rosConnection.connect(url),
    disconnectRos: () => rosConnection.disconnect()
  };
}
