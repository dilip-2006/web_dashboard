import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Keyboard, Disc, 
  Gauge, Zap, RotateCcw, RotateCw, Crosshair, Activity, CornerUpLeft, CornerUpRight
} from 'lucide-react';

export default function Teleop({ 
  connected, 
  isEmergencyStop, 
  onSendVelocity,
  velocity,
  battery,
  laserScan,
  robotPose 
}) {
  const [maxLin, setMaxLin] = useState(0.25);
  const [maxAng, setMaxAng] = useState(0.60);
  const [isInchingMode, setIsInchingMode] = useState(false);
  const [activeKeys, setActiveKeys] = useState({});
  const [driveInputMode, setDriveInputMode] = useState('ALL'); // 'ALL' | 'JOYSTICK' | 'DPAD'
  const intervalRef = useRef(null);
  const buttonIntervalRef = useRef(null);

  // Virtual Joystick state
  const joystickContainerRef = useRef(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickPosRef = useRef({ x: 0, y: 0 });

  const [activeButtonDir, setActiveButtonDir] = useState(null);
  const buttonPressStartRef = useRef(0);
  const buttonPulseTimeoutRef = useRef(null);

  // Macro Maneuvers (Nudge, 90 deg turn, 180 deg spin)
  const [activeMacro, setActiveMacro] = useState(null);
  const macroTimeoutRef = useRef(null);
  const macroIntervalRef = useRef(null);

  // Effective speed limits based on Inching / Docking Mode
  const effectiveMaxLin = isInchingMode ? 0.08 : maxLin;
  const effectiveMaxAng = isInchingMode ? 0.25 : maxAng;

  const cancelMacro = useCallback(() => {
    if (macroTimeoutRef.current) {
      clearTimeout(macroTimeoutRef.current);
      macroTimeoutRef.current = null;
    }
    if (macroIntervalRef.current) {
      clearInterval(macroIntervalRef.current);
      macroIntervalRef.current = null;
    }
    setActiveMacro(null);
    onSendVelocity?.(0.0, 0.0);
  }, [onSendVelocity]);

  const executeMacro = useCallback((name, vx, wz, durationMs) => {
    if (isEmergencyStop) return;
    cancelMacro();
    setActiveMacro(name);

    onSendVelocity?.(vx, wz);
    macroIntervalRef.current = setInterval(() => {
      onSendVelocity?.(vx, wz);
    }, 100);

    macroTimeoutRef.current = setTimeout(() => {
      cancelMacro();
    }, durationMs);
  }, [cancelMacro, isEmergencyStop, onSendVelocity]);

  const stopRobot = useCallback(() => {
    cancelMacro();
    if (buttonIntervalRef.current) {
      clearInterval(buttonIntervalRef.current);
      buttonIntervalRef.current = null;
    }
    if (buttonPulseTimeoutRef.current) {
      clearTimeout(buttonPulseTimeoutRef.current);
      buttonPulseTimeoutRef.current = null;
    }
    setActiveButtonDir(null);
    setJoystickPos({ x: 0, y: 0 });
    joystickPosRef.current = { x: 0, y: 0 };
    onSendVelocity?.(0.0, 0.0);
  }, [cancelMacro, onSendVelocity]);

  const handleButtonRelease = useCallback(() => {
    if (buttonIntervalRef.current) {
      clearInterval(buttonIntervalRef.current);
      buttonIntervalRef.current = null;
    }

    const elapsed = Date.now() - (buttonPressStartRef.current || 0);
    const minPulseMs = 350; // Guarantee motor actuation

    if (elapsed < minPulseMs) {
      const remaining = minPulseMs - elapsed;
      if (buttonPulseTimeoutRef.current) clearTimeout(buttonPulseTimeoutRef.current);
      buttonPulseTimeoutRef.current = setTimeout(() => {
        setActiveButtonDir(null);
        onSendVelocity?.(0.0, 0.0);
        buttonPulseTimeoutRef.current = null;
      }, remaining);
    } else {
      setActiveButtonDir(null);
      onSendVelocity?.(0.0, 0.0);
    }
  }, [onSendVelocity]);

  const startButtonDrive = useCallback((linear, angular, dir, e) => {
    if (isEmergencyStop) return;
    cancelMacro();
    if (e) {
      if (e.cancelable) e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (buttonPulseTimeoutRef.current) {
      clearTimeout(buttonPulseTimeoutRef.current);
      buttonPulseTimeoutRef.current = null;
    }
    if (buttonIntervalRef.current) {
      clearInterval(buttonIntervalRef.current);
    }

    buttonPressStartRef.current = Date.now();
    setActiveButtonDir(dir);

    // Send immediate first command
    onSendVelocity?.(linear, angular);

    // Continuous 10Hz stream while holding
    buttonIntervalRef.current = setInterval(() => {
      onSendVelocity?.(linear, angular);
    }, 100);
  }, [cancelMacro, isEmergencyStop, onSendVelocity]);

  // Keyboard navigation listener (W/A/S/D and Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
        cancelMacro();
        setActiveKeys(prev => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      setActiveKeys(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (key === ' ') {
        stopRobot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cancelMacro, stopRobot]);

  // Drive loop at 10 Hz
  useEffect(() => {
    if (isEmergencyStop) {
      cancelMacro();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (buttonIntervalRef.current) {
        clearInterval(buttonIntervalRef.current);
        buttonIntervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (activeMacro) return; // Managed by macro runner

      let vx = 0.0;
      let wz = 0.0;

      // 1. Keyboard priority
      if (activeKeys['w'] || activeKeys['arrowup']) vx += effectiveMaxLin;
      if (activeKeys['s'] || activeKeys['arrowdown']) vx -= effectiveMaxLin;
      if (activeKeys['a'] || activeKeys['arrowleft']) wz += effectiveMaxAng;
      if (activeKeys['d'] || activeKeys['arrowright']) wz -= effectiveMaxAng;

      // 2. Virtual Joystick
      if (vx === 0.0 && wz === 0.0 && (joystickPosRef.current.x !== 0 || joystickPosRef.current.y !== 0)) {
        vx = -joystickPosRef.current.y * effectiveMaxLin;
        wz = -joystickPosRef.current.x * effectiveMaxAng;
      }

      if (vx !== 0.0 || wz !== 0.0) {
        onSendVelocity?.(vx, wz);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeKeys, activeMacro, cancelMacro, effectiveMaxAng, effectiveMaxLin, isEmergencyStop, onSendVelocity]);

  useEffect(() => () => {
    cancelMacro();
    if (buttonIntervalRef.current) clearInterval(buttonIntervalRef.current);
    if (buttonPulseTimeoutRef.current) clearTimeout(buttonPulseTimeoutRef.current);
  }, [cancelMacro]);

  // Virtual Joystick pointer events
  const handleJoystickStart = (e) => {
    if (isEmergencyStop) return;
    cancelMacro();
    if (e.cancelable) e.preventDefault();
    setJoystickActive(true);
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e) => {
    if (e.cancelable) e.preventDefault();
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2 - 16;
    const distance = Math.hypot(dx, dy);

    let normX = dx / maxRadius;
    let normY = dy / maxRadius;

    if (distance > maxRadius) {
      normX = (dx / distance);
      normY = (dy / distance);
    }

    const pos = { x: Math.max(-1, Math.min(1, normX)), y: Math.max(-1, Math.min(1, normY)) };
    setJoystickPos(pos);
    joystickPosRef.current = pos;
  };

  const handleJoystickEnd = (e) => {
    if (e && e.cancelable) e.preventDefault();
    setJoystickActive(false);
    stopRobot();
  };

  const setSpeedPreset = (lin, ang) => {
    setMaxLin(lin);
    setMaxAng(ang);
  };

  // Motion Dynamics Telemetry State
  const currentVx = velocity?.linear ?? 0.0;
  const currentWz = velocity?.angular ?? 0.0;
  const isMoving = Math.abs(currentVx) > 0.01 || Math.abs(currentWz) > 0.01;

  const motionStatusText = isEmergencyStop
    ? 'E-STOPPED'
    : activeMacro
    ? `MACRO: ${activeMacro.replace(/_/g, ' ')}`
    : Math.abs(currentVx) > 0.02
    ? currentVx > 0 ? 'DRIVING FORWARD' : 'REVERSING'
    : Math.abs(currentWz) > 0.05
    ? currentWz > 0 ? 'PIVOTING LEFT' : 'PIVOTING RIGHT'
    : 'STANDBY • IDLE';

  return (
    <div className="clay-card flex flex-col justify-between overflow-hidden shadow-sm">
      {/* 1. Header with Inching Mode Toggle & State */}
      <div className="panel-header py-2.5 px-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-orange-500" />
          <span className="font-bold text-white text-xs font-mono">
            BUMBLEB TELEOPERATION
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Docking / Inching Precision Mode Toggle */}
          <button
            onClick={() => setIsInchingMode(!isInchingMode)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer border ${
              isInchingMode
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400 shadow-xs'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Precision Docking Inching Mode (Capped at 0.08 m/s)"
          >
            <Crosshair className="w-3 h-3 text-orange-400" />
            <span>{isInchingMode ? 'INCHING (DOCK)' : 'NORMAL'}</span>
          </button>

          {/* Mobile Input Toggle */}
          <div className="flex md:hidden items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setDriveInputMode('ALL')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${driveInputMode === 'ALL' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400'}`}
            >
              Both
            </button>
            <button
              onClick={() => setDriveInputMode('JOYSTICK')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${driveInputMode === 'JOYSTICK' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400'}`}
            >
              Stick
            </button>
            <button
              onClick={() => setDriveInputMode('DPAD')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${driveInputMode === 'DPAD' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400'}`}
            >
              Pad
            </button>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-orange-400 font-bold hidden xs:inline">
            ZLAC706 • 10Hz
          </span>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col gap-3.5">
        {/* Active Macro Progress Notification Banner */}
        {activeMacro && (
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between text-xs font-mono font-bold shadow-xs animate-pulse">
            <div className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Autonomous Maneuver: {activeMacro.replace(/_/g, ' ')}...</span>
            </div>
            <button
              onClick={cancelMacro}
              className="bg-slate-950/80 hover:bg-slate-950 text-orange-300 hover:text-white px-2 py-0.5 rounded-lg text-[10px] cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        )}

        {/* 2. Primary Joystick & D-Pad Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-center">
          {/* Virtual Analog Joystick */}
          <div className={`flex-col items-center gap-2 ${
            driveInputMode === 'ALL' || driveInputMode === 'JOYSTICK' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
              TOUCH JOYSTICK
            </div>
            <div
              ref={joystickContainerRef}
              onMouseDown={handleJoystickStart}
              onMouseMove={joystickActive ? handleJoystickMove : undefined}
              onMouseUp={handleJoystickEnd}
              onMouseLeave={joystickActive ? handleJoystickEnd : undefined}
              onTouchStart={handleJoystickStart}
              onTouchMove={joystickActive ? handleJoystickMove : undefined}
              onTouchEnd={handleJoystickEnd}
              className={`clay-inset relative h-36 w-36 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer select-none touch-none ${
                joystickActive ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-slate-300 hover:border-slate-400'
              } ${isEmergencyStop ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-300 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-300 pointer-events-none" />
              <div className="absolute h-16 w-16 rounded-full border border-slate-300 pointer-events-none" />

              {/* Knob */}
              <div
                className={`h-12 w-12 rounded-full border flex items-center justify-center transition-transform duration-75 shadow-md select-none touch-none ${
                  joystickActive
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 text-white ring-2 ring-orange-300'
                    : 'bg-slate-900 border-slate-700 text-orange-400'
                }`}
                style={{
                  transform: `translate(${joystickPos.x * 48}px, ${joystickPos.y * 48}px)`
                }}
              >
                <Disc className="w-5 h-5 opacity-90" />
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Vx: <strong className="text-slate-900">{(-joystickPos.y * effectiveMaxLin).toFixed(2)}</strong> m/s • Wz: <strong className="text-slate-900">{(-joystickPos.x * effectiveMaxAng).toFixed(2)}</strong> rad/s
            </div>
          </div>

          {/* D-Pad Buttons & Keyboard Controls */}
          <div className={`flex-col items-center gap-2 ${
            driveInputMode === 'ALL' || driveInputMode === 'DPAD' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              WASD / ARROWS
            </div>

            <div className="flex flex-col items-center gap-1.5 select-none">
              {/* Up */}
              <button
                onPointerDown={(e) => startButtonDrive(effectiveMaxLin, 0.0, 'forward', e)}
                onPointerUp={handleButtonRelease}
                onPointerCancel={handleButtonRelease}
                disabled={isEmergencyStop}
                className={`h-10 w-12 rounded-xl flex items-center justify-center border font-mono font-bold transition-all cursor-pointer touch-none select-none ${
                  activeKeys['w'] || activeKeys['arrowup'] || activeButtonDir === 'forward'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400 shadow-md ring-2 ring-orange-400/40'
                    : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-orange-400'
                }`}
                title="Forward (W / Up Arrow)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              {/* Left, Brake, Right */}
              <div className="flex items-center gap-1.5">
                <button
                  onPointerDown={(e) => startButtonDrive(0.0, effectiveMaxAng, 'left', e)}
                  onPointerUp={handleButtonRelease}
                  onPointerCancel={handleButtonRelease}
                  disabled={isEmergencyStop}
                  className={`h-10 w-12 rounded-xl flex items-center justify-center border font-mono font-bold transition-all cursor-pointer touch-none select-none ${
                    activeKeys['a'] || activeKeys['arrowleft'] || activeButtonDir === 'left'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400 shadow-md ring-2 ring-orange-400/40'
                      : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-orange-400'
                  }`}
                  title="Turn Left (A / Left Arrow)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={stopRobot}
                  className="h-10 w-14 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-mono font-extrabold transition-all shadow-md active:scale-95 text-[10px] touch-none select-none cursor-pointer border border-red-500/40"
                  title="Brake / Stop (Spacebar)"
                >
                  <Square className="w-3.5 h-3.5 fill-white mr-1" />
                  STOP
                </button>

                <button
                  onPointerDown={(e) => startButtonDrive(0.0, -effectiveMaxAng, 'right', e)}
                  onPointerUp={handleButtonRelease}
                  onPointerCancel={handleButtonRelease}
                  disabled={isEmergencyStop}
                  className={`h-10 w-12 rounded-xl flex items-center justify-center border font-mono font-bold transition-all cursor-pointer touch-none select-none ${
                    activeKeys['d'] || activeKeys['arrowright'] || activeButtonDir === 'right'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400 shadow-md ring-2 ring-orange-400/40'
                      : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-orange-400'
                  }`}
                  title="Turn Right (D / Right Arrow)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Down */}
              <button
                onPointerDown={(e) => startButtonDrive(-effectiveMaxLin, 0.0, 'backward', e)}
                onPointerUp={handleButtonRelease}
                onPointerCancel={handleButtonRelease}
                disabled={isEmergencyStop}
                className={`h-10 w-12 rounded-xl flex items-center justify-center border font-mono font-bold transition-all cursor-pointer touch-none select-none ${
                  activeKeys['s'] || activeKeys['arrowdown'] || activeButtonDir === 'backward'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400 shadow-md ring-2 ring-orange-400/40'
                    : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-orange-400'
                }`}
                title="Reverse (S / Down Arrow)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Live Kinematics & Velocity Gauges (Fills empty space with real feedback) */}
        <div className="clay-inset p-3 rounded-2xl border border-slate-200/90 flex flex-col gap-2 font-mono">
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200/80 pb-1.5">
            <span className="text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-orange-500" />
              LIVE MOTION DYNAMICS
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              isMoving 
                ? 'bg-orange-50 text-orange-600 border-orange-200 animate-pulse' 
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}>
              {motionStatusText}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Linear Velocity Meter */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                <span>LINEAR VELOCITY</span>
                <span className="font-bold text-slate-800">{Math.abs(currentVx).toFixed(2)} m/s</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 ${currentVx >= 0 ? 'bg-orange-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (Math.abs(currentVx) / (maxLin || 0.25)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>{currentVx < 0 ? '◀ REVERSE' : 'FORWARD ▶'}</span>
                <span>MAX {effectiveMaxLin.toFixed(2)}</span>
              </div>
            </div>

            {/* Angular Velocity Meter */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                <span>ANGULAR YAW</span>
                <span className="font-bold text-slate-800">{Math.abs(currentWz).toFixed(2)} rad/s</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 transition-all duration-150"
                  style={{ width: `${Math.min(100, (Math.abs(currentWz) / (maxAng || 0.60)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>{currentWz > 0 ? '↺ LEFT' : currentWz < 0 ? '↻ RIGHT' : '● STRAIGHT'}</span>
                <span>MAX {effectiveMaxAng.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Precision Docking & Maneuver Macros (Nudge & Pivot Buttons) */}
        <div className="clay-card p-3 rounded-2xl border border-slate-200/90 flex flex-col gap-2 font-mono">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-orange-500" />
              PRECISION MANEUVER MACROS
            </span>
            <span className="text-[9px] text-slate-500 font-semibold">1-CLICK ACTIONS</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => executeMacro('NUDGE_FWD', 0.12, 0.0, 850)}
              disabled={isEmergencyStop}
              className="btn-clay-white py-1.5 px-1 rounded-xl text-[10px] font-bold text-center hover:text-orange-600 transition-all cursor-pointer flex flex-col items-center gap-0.5"
              title="Nudge robot forward ~10cm"
            >
              <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
              <span>+10cm</span>
            </button>

            <button
              onClick={() => executeMacro('NUDGE_BACK', -0.12, 0.0, 850)}
              disabled={isEmergencyStop}
              className="btn-clay-white py-1.5 px-1 rounded-xl text-[10px] font-bold text-center hover:text-orange-600 transition-all cursor-pointer flex flex-col items-center gap-0.5"
              title="Nudge robot backward ~10cm"
            >
              <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
              <span>-10cm</span>
            </button>

            <button
              onClick={() => executeMacro('PIVOT_90_L', 0.0, 0.40, 3920)}
              disabled={isEmergencyStop}
              className="btn-clay-white py-1.5 px-1 rounded-xl text-[10px] font-bold text-center hover:text-orange-600 transition-all cursor-pointer flex flex-col items-center gap-0.5"
              title="Pivot 90 degrees counter-clockwise"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-slate-700" />
              <span>90° L</span>
            </button>

            <button
              onClick={() => executeMacro('PIVOT_90_R', 0.0, -0.40, 3920)}
              disabled={isEmergencyStop}
              className="btn-clay-white py-1.5 px-1 rounded-xl text-[10px] font-bold text-center hover:text-orange-600 transition-all cursor-pointer flex flex-col items-center gap-0.5"
              title="Pivot 90 degrees clockwise"
            >
              <CornerUpRight className="w-3.5 h-3.5 text-slate-700" />
              <span>90° R</span>
            </button>

            <button
              onClick={() => executeMacro('SPIN_180', 0.0, 0.45, 6980)}
              disabled={isEmergencyStop}
              className="btn-clay-white py-1.5 px-1 rounded-xl text-[10px] font-bold text-center hover:text-orange-600 transition-all cursor-pointer flex flex-col items-center gap-0.5"
              title="180 degree U-Turn spin"
            >
              <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
              <span>180° Spin</span>
            </button>
          </div>
        </div>

        {/* Speed Limit Presets & Sliders */}
        <div className="clay-card p-3 rounded-2xl border border-slate-200/90 flex flex-col gap-2.5 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-900 flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              SPEED PRESETS:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSpeedPreset(0.12, 0.35)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  maxLin === 0.12 ? 'btn-clay-orange shadow-xs font-extrabold' : 'btn-clay-white'
                }`}
              >
                Slow (0.12)
              </button>
              <button
                onClick={() => setSpeedPreset(0.25, 0.60)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  maxLin === 0.25 ? 'btn-clay-orange shadow-xs font-extrabold' : 'btn-clay-white'
                }`}
              >
                Cruise (0.25)
              </button>
              <button
                onClick={() => setSpeedPreset(0.45, 0.90)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  maxLin === 0.45 ? 'btn-clay-orange shadow-xs font-extrabold' : 'btn-clay-white'
                }`}
              >
                Fast (0.45)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Linear Cap:</span>
                <span className="text-slate-900 font-bold">{effectiveMaxLin.toFixed(2)} m/s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={maxLin}
                onChange={(e) => setMaxLin(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Angular Cap:</span>
                <span className="text-slate-900 font-bold">{effectiveMaxAng.toFixed(2)} rad/s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={maxAng}
                onChange={(e) => setMaxAng(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
