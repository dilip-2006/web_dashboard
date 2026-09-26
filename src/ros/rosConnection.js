/**
 * ROS 2 Bridge WebSocket Manager using roslibjs
 * Connects to rosbridge_server (port 9090) and manages subscriptions/publishers.
 */

import ROSLIB from 'roslib';

class ROSConnectionManager {
  constructor() {
    this.ros = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.callbacks = {
      connection: [],
      error: [],
      close: [],
      state: [],
      health: [],
      pose: [],
      navStatus: [],
      locations: [],
      maps: [],
      battery: [],
      map: [],
      globalCostmap: [],
      localCostmap: [],
      scan: [],
      plan: [],
      localPlan: [],
      odom: [],
      operationResult: []
    };

    this.topics = {};
    this.manualDisconnect = false;

    let queryUrl = null;
    if (typeof window !== 'undefined' && window.location) {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('ros_url')) {
          queryUrl = params.get('ros_url');
        } else if (params.get('ros_host')) {
          const port = params.get('ros_port') || '9090';
          queryUrl = `ws://${params.get('ros_host')}:${port}`;
        }
      } catch (_) {}
    }

    const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('rosbridge_url') : null;
    const configuredUrl = import.meta.env.VITE_ROSBRIDGE_URL;
    const defaultHost = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';
    this.url = queryUrl || savedUrl || configuredUrl || `ws://${defaultHost}:9090`;
  }

  connect(customUrl = null) {
    this.manualDisconnect = false;
    if (customUrl) {
      this.url = customUrl;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rosbridge_url', customUrl);
      }
      if (this.ros) {
        try {
          this.ros.close();
        } catch (_) {}
        this.ros = null;
      }
      this.connected = false;
      this.connecting = false;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }

    if (this.ros && (this.connected || this.connecting)) {
      return;
    }

    this.connecting = true;
    try {
      this.ros = new ROSLIB.Ros({ url: this.url });

      this.ros.on('connection', () => {
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempt = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this._setupTopics();
        this._emit('connection');
      });

      this.ros.on('error', (error) => {
        this.connecting = false;
        this._emit('error', error);
      });

      this.ros.on('close', () => {
        this.connected = false;
        this.connecting = false;
        this._emit('close');
        this._scheduleReconnect();
      });
    } catch (err) {
      this.connecting = false;
      this._emit('error', err);
      this._scheduleReconnect();
    }
  }

  disconnect() {
    this.manualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clean up existing topic subscriptions
    Object.values(this.topics).forEach((t) => {
      try {
        if (t && typeof t.unsubscribe === 'function') t.unsubscribe();
      } catch (_) {}
    });
    this.topics = {};

    if (this.ros) {
      try {
        this.ros.close();
      } catch (_) {}
      this.ros = null;
    }

    this.connected = false;
    this.connecting = false;
    this._emit('close');
  }

  _scheduleReconnect() {
    if (this.manualDisconnect) return;
    if (!this.reconnectTimer) {
      // Do not hammer rosbridge while the robot is rebooting or the network
      // is unavailable.  Repeated handshakes can fill rosbridge's queues and
      // also leave stale browser subscriptions behind.
      const delays = [1000, 2000, 4000, 8000, 15000, 30000];
      const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
      this.reconnectAttempt += 1;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    }
  }

  _setupTopics() {
    if (!this.ros) return;

    // Clean up existing topic subscriptions
    Object.values(this.topics).forEach((t) => {
      try {
        if (t && typeof t.unsubscribe === 'function') t.unsubscribe();
      } catch (_) {}
    });
    this.topics = {};

    // 1. System State
    this.topics.state = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/system_state',
      messageType: 'std_msgs/String'
    });
    this.topics.state.subscribe((msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        this._emit('state', parsed);
      } catch (e) {
        console.warn('Failed to parse system_state', e);
      }
    });

    // 2. System Health
    this.topics.health = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/system_health',
      messageType: 'std_msgs/String'
    });
    this.topics.health.subscribe((msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        this._emit('health', parsed);
      } catch (e) {
        console.warn('Failed to parse system_health', e);
      }
    });

    // 3. Robot Pose
    this.topics.pose = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/robot_pose',
      messageType: 'geometry_msgs/PoseStamped',
      // The pose publisher runs at 30 Hz. Keep the newest sample moving
      // through rosbridge instead of allowing a slow WebSocket client to
      // build up a backlog and render old robot positions.
      queue_length: 1,
      throttle_rate: 33
    });
    this.topics.pose.subscribe((msg) => {
      this._emit('pose', msg);
    });

    // 4. Navigation Status
    this.topics.navStatus = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/navigation_status',
      messageType: 'std_msgs/String'
    });
    this.topics.navStatus.subscribe((msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        this._emit('navStatus', parsed);
      } catch (e) {
        console.warn('Failed to parse navigation_status', e);
      }
    });

    // 5. Locations list
    this.topics.locations = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/locations',
      messageType: 'std_msgs/String'
    });
    this.topics.locations.subscribe((msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        this._emit('locations', parsed);
      } catch (e) {
        console.warn('Failed to parse locations', e);
      }
    });

    // 6. Available Maps
    this.topics.maps = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/maps',
      messageType: 'std_msgs/String'
    });
    this.topics.maps.subscribe((msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        this._emit('maps', parsed);
      } catch (e) {
        console.warn('Failed to parse maps', e);
      }
    });

    // 7. Battery State
    this.topics.battery = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/battery_state',
      messageType: 'sensor_msgs/BatteryState'
    });
    this.topics.battery.subscribe((msg) => {
      this._emit('battery', msg);
    });

    // 8. Map (OccupancyGrid)
    this.topics.map = new ROSLIB.Topic({
      ros: this.ros,
      name: '/map',
      messageType: 'nav_msgs/OccupancyGrid',
      compression: 'cbor',
      throttle_rate: 10000,
      queue_length: 1
    });
    this.topics.map.subscribe((msg) => {
      this._emit('map', msg);
    });

    // Nav2 costmaps. These are separate OccupancyGrids and must be
    // subscribed to explicitly; they are not included in /map.
    const subscribeGrid = (key, name, event) => {
      this.topics[key] = new ROSLIB.Topic({
        ros: this.ros,
        name,
        messageType: 'nav_msgs/OccupancyGrid',
        compression: 'cbor',
        throttle_rate: 5000,
        queue_length: 1
      });
      this.topics[key].subscribe((msg) => this._emit(event, msg));
    };
    subscribeGrid('globalCostmap', '/global_costmap/costmap', 'globalCostmap');
    subscribeGrid('localCostmap', '/local_costmap/costmap', 'localCostmap');

    // 9. LaserScan
    this.topics.scan = new ROSLIB.Topic({
      ros: this.ros,
      name: '/scan',
      messageType: 'sensor_msgs/LaserScan',
      compression: 'cbor',
      // Keep at most one current scan in flight.  A 500 ms throttle makes
      // the laser overlay visibly lag behind the robot while driving.
      throttle_rate: 100,
      queue_length: 1 // drop stale scans instead of buffering them
    });
    this.topics.scan.subscribe((msg) => {
      this._emit('scan', msg);
    });

    // 10. Nav2 Global Path
    const subscribePath = (key, name, event) => {
      this.topics[key] = new ROSLIB.Topic({
        ros: this.ros,
        name,
        messageType: 'nav_msgs/Path',
        throttle_rate: 2000,
        queue_length: 1
      });
      this.topics[key].subscribe((msg) => this._emit(event, msg));
    };
    // Humble exposes these standard topics. Avoid subscribing to duplicate
    // namespaced aliases: they carry the same paths and can saturate
    // rosbridge when costmaps and scans are active too.
    subscribePath('plan', '/plan', 'plan');

    // DWB's commanded trajectory/local plan is useful feedback while the
    // global planner path is being followed.
    subscribePath('localPlan', '/local_plan', 'localPlan');

    // 11. Odometry (for current linear/angular speed)
    this.topics.odom = new ROSLIB.Topic({
      ros: this.ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry',
      compression: 'cbor',
      // Odometry is the fast live-motion fallback while AMCL/SLAM is not
      // active. One second makes the robot marker visibly jump during drive.
      throttle_rate: 50,
      queue_length: 1
    });
    this.topics.odom.subscribe((msg) => this._emit('odom', msg));
    // 12. Map Operation Result
    this.topics.operationResult = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/map_operation_result',
      messageType: 'std_msgs/String'
    });
    this.topics.operationResult.subscribe((msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        this._emit('operationResult', parsed);
      } catch (e) {
        console.warn('Failed to parse map_operation_result', e);
      }
    });

    // Publishers
    this.topics.cmdVel = new ROSLIB.Topic({
      ros: this.ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/Twist',
      queue_length: 1
    });
    // Advertise explicitly so rosbridge registers the teleoperation publisher
    // as soon as the dashboard connects, before the first button press.
    this.topics.cmdVel.advertise();

    this.topics.command = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/command',
      messageType: 'std_msgs/String'
    });
    this.topics.command.advertise();

    this.topics.locationCommand = new ROSLIB.Topic({
      ros: this.ros,
      name: '/amr/location_command',
      messageType: 'std_msgs/String'
    });
    this.topics.locationCommand.advertise();

    this.topics.goalPose = new ROSLIB.Topic({
      ros: this.ros,
      name: '/goal_pose',
      messageType: 'geometry_msgs/PoseStamped'
    });
    this.topics.goalPose.advertise();

    this.topics.initialPose = new ROSLIB.Topic({
      ros: this.ros,
      name: '/initialpose',
      messageType: 'geometry_msgs/PoseWithCovarianceStamped'
    });
    this.topics.initialPose.advertise();
  }

  // Event Subscription
  on(event, cb) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(cb);
    }
  }

  off(event, cb) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(fn => fn !== cb);
    }
  }

  _emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  // Velocity Publisher
  sendVelocity(linearX, angularZ) {
    if (!this.connected || !this.topics.cmdVel) return;
    const twist = new ROSLIB.Message({
      linear: { x: Number(linearX) || 0.0, y: 0.0, z: 0.0 },
      angular: { x: 0.0, y: 0.0, z: Number(angularZ) || 0.0 }
    });
    this.topics.cmdVel.publish(twist);
  }

  // System & Mode Control Commands
  sendCommand(payload) {
    if (!this.connected || !this.topics.command) return;
    const msg = new ROSLIB.Message({
      data: JSON.stringify(payload)
    });
    this.topics.command.publish(msg);
  }

  // Location Management Commands
  sendLocationCommand(payload) {
    if (!this.connected || !this.topics.locationCommand) return;
    const msg = new ROSLIB.Message({
      data: JSON.stringify(payload)
    });
    this.topics.locationCommand.publish(msg);
  }

  // Send Navigation Goal to /goal_pose or Nav2
  sendGoal(x, y, yaw = 0.0, frameId = 'map') {
    if (!this.connected || !this.topics.goalPose) return;
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);

    const goal = new ROSLIB.Message({
      header: {
        stamp: { sec: 0, nanosec: 0 },
        frame_id: frameId
      },
      pose: {
        position: { x: Number(x), y: Number(y), z: 0.0 },
        orientation: { x: 0.0, y: 0.0, z: sy, w: cy }
      }
    });
    this.topics.goalPose.publish(goal);
  }

  // Service call helper
  callService(serviceName, serviceType, requestData = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ros) {
        return reject(new Error('ROS is not connected'));
      }
      const client = new ROSLIB.Service({
        ros: this.ros,
        name: serviceName,
        serviceType: serviceType
      });
      const request = new ROSLIB.ServiceRequest(requestData);
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`ROS service timeout: ${serviceName}`));
      }, 3000);
      client.callService(request, (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      }, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Set Autonomy Mode (via typed bumbleb_bot/srv/SetMode service or topic fallback)
  async setMode(mode, mapName = '') {
    try {
      return await this.callService('/amr/set_mode', 'bumbleb_bot/srv/SetMode', {
        mode: String(mode).toUpperCase(),
        map_name: String(mapName || '')
      });
    } catch (err) {
      console.warn('set_mode service call fallback to topic:', err);
      this.sendCommand({ action: 'set_mode', mode, map_name: mapName });
      return { success: true, message: `Mode '${mode}' dispatched via topic` };
    }
  }

  // Map Operations (save_map, serialize_pose_graph, resume_mapping, deserialize_pose_graph)
  async mapOperation(operation, mapName = '') {
    try {
      return await this.callService('/amr/map_operation', 'bumbleb_bot/srv/MapOperation', {
        operation: String(operation),
        map_name: String(mapName || '')
      });
    } catch (err) {
      console.warn('map_operation service call fallback to topic:', err);
      this.sendCommand({ action: operation, map_name: mapName });
      return { success: true, message: `Operation '${operation}' dispatched via topic` };
    }
  }

  // Navigate to Pose (via typed service with topic fallback)
  async navigateToPose(x, y, yaw = 0.0) {
    const numX = Number(x) || 0.0;
    const numY = Number(y) || 0.0;
    const numYaw = Number(yaw) || 0.0;

    // Publish immediately. The location manager subscribes to /goal_pose and
    // forwards it to Nav2 asynchronously. Calling the navigation service
    // first can block until Nav2 finishes the goal, making the dashboard look
    // frozen and delaying the actual goal dispatch.
    // /goal_pose is consumed by the robot location manager and forwarded to
    // Nav2. Do not also send the JSON command: that would dispatch the same
    // goal twice through two subscriptions.
    this.sendGoal(numX, numY, numYaw);
    return { success: true, message: `Goal dispatched to (${numX.toFixed(2)}, ${numY.toFixed(2)})` };
  }

  // Set AMCL Initial Pose Estimate (via typed service, /initialpose topic, and fallback)
  async setInitialPose(x, y, yaw = 0.0, frameId = 'map') {
    const numX = Number(x) || 0.0;
    const numY = Number(y) || 0.0;
    const numYaw = Number(yaw) || 0.0;

    try {
      return await this.callService('/amr/set_initial_pose', 'bumbleb_bot/srv/SetInitialPose', {
        x: numX,
        y: numY,
        yaw: numYaw
      });
    } catch (err) {
      console.warn('set_initial_pose service call fallback:', err);
      // The service is the authoritative path. Only publish the fallback
      // topic when the service is unavailable or times out.
      if (this.connected && this.topics.initialPose) {
        const cy = Math.cos(numYaw * 0.5);
        const sy = Math.sin(numYaw * 0.5);
        const cov = new Array(36).fill(0);
        cov[0] = 0.25;
        cov[7] = 0.25;
        cov[35] = 0.068;
        this.topics.initialPose.publish(new ROSLIB.Message({
          header: { stamp: { sec: 0, nanosec: 0 }, frame_id: frameId },
          pose: {
            pose: {
              position: { x: numX, y: numY, z: 0.0 },
              orientation: { x: 0.0, y: 0.0, z: sy, w: cy }
            },
            covariance: cov
          }
        }));
      }
      this.sendCommand({ action: 'set_initial_pose', x: numX, y: numY, yaw: numYaw });
      return { success: true, message: `Initial pose set to (${numX.toFixed(2)}, ${numY.toFixed(2)})` };
    }
  }

  // Cancel Active Nav2 Goal
  async cancelNavigation() {
    try {
      return await this.callService('/amr/cancel_navigation', 'std_srvs/srv/Trigger', {});
    } catch (err) {
      this.sendCommand({ action: 'cancel_navigation' });
      return { success: true, message: 'Cancel requested via topic' };
    }
  }

  // Emergency Stop Safety Protocol
  async emergencyStop() {
    this.sendVelocity(0.0, 0.0);
    try {
      return await this.callService('/amr/emergency_stop', 'std_srvs/srv/Trigger', {});
    } catch (err) {
      this.sendCommand({ action: 'emergency_stop' });
      return { success: true, message: 'Emergency stop requested via topic' };
    }
  }

  // Reset Emergency Stop
  async resetEmergencyStop() {
    try {
      return await this.callService('/amr/reset_emergency_stop', 'std_srvs/srv/Trigger', {});
    } catch (err) {
      this.sendCommand({ action: 'reset_emergency_stop' });
      return { success: true, message: 'Reset emergency stop requested via topic' };
    }
  }

  // System Reset
  async systemReset() {
    try {
      return await this.callService('/amr/system_reset', 'std_srvs/srv/Trigger', {});
    } catch (err) {
      this.sendCommand({ action: 'system_reset' });
      return { success: true, message: 'System reset requested via topic' };
    }
  }
}

export const rosConnection = new ROSConnectionManager();
export default rosConnection;
