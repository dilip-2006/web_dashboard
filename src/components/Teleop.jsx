import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Keyboard, Disc, Gauge, Zap } from 'lucide-react';

export default function Teleop({ connected, isEmergencyStop, onSendVelocity }) {
  const [maxLin, setMaxLin] = useState(0.25);
  const [maxAng, setMaxAng] = useState(0.60);
  const [activeKeys, setActiveKeys] = useState({});
  const [driveInputMode, setDriveInputMode] = useState('ALL'); // 'ALL' | 'JOYSTICK' | 'DPAD'
  const intervalRef = useRef(null);
  const buttonIntervalRef = useRef(null);

  // Virtual Joystick state
  const joystickContainerRef = useRef(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickPosRef = useRef({ x: 0, y: 0 });

  const stopRobot = useCallback(() => {
    if (buttonIntervalRef.current) {
      clearInterval(buttonIntervalRef.current);
      buttonIntervalRef.current = null;
    }
    setJoystickPos({ x: 0, y: 0 });
    joystickPosRef.current = { x: 0, y: 0 };
    onSendVelocity?.(0.0, 0.0);
  }, [onSendVelocity]);

  const startButtonDrive = useCallback((linear, angular) => {
    if (buttonIntervalRef.current) clearInterval(buttonIntervalRef.current);
    onSendVelocity?.(linear, angular);
    buttonIntervalRef.current = setInterval(() => {
      onSendVelocity?.(linear, angular);
    }, 100);
  }, [onSendVelocity]);

  // Keyboard navigation listener (W/A/S/D and Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
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
  }, [stopRobot]);

  // Drive loop at 10 Hz
  useEffect(() => {
    if (isEmergencyStop) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (buttonIntervalRef.current) {
        clearInterval(buttonIntervalRef.current);
        buttonIntervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      let vx = 0.0;
      let wz = 0.0;

      // 1. Keyboard priority
      if (activeKeys['w'] || activeKeys['arrowup']) vx += maxLin;
      if (activeKeys['s'] || activeKeys['arrowdown']) vx -= maxLin;
      if (activeKeys['a'] || activeKeys['arrowleft']) wz += maxAng;
      if (activeKeys['d'] || activeKeys['arrowright']) wz -= maxAng;

      // 2. Virtual Joystick
      if (vx === 0.0 && wz === 0.0 && (joystickPosRef.current.x !== 0 || joystickPosRef.current.y !== 0)) {
        vx = -joystickPosRef.current.y * maxLin;
        wz = -joystickPosRef.current.x * maxAng;
      }

      if (vx !== 0.0 || wz !== 0.0) {
        onSendVelocity?.(vx, wz);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeKeys, connected, isEmergencyStop, maxLin, maxAng, onSendVelocity]);

  useEffect(() => () => {
    if (buttonIntervalRef.current) clearInterval(buttonIntervalRef.current);
  }, []);

  // Virtual Joystick pointer events
  const handleJoystickStart = (e) => {
    if (isEmergencyStop) return;
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

  return (
    <div className="panel flex flex-col h-full justify-between">
      <div className="panel-header py-2 px-3.5 bg-slate-900 border-b border-slate-800 text-white">
        <span className="flex items-center gap-2 font-bold text-white text-xs">
          <Gauge className="w-4 h-4 text-yellow-400" />
          BUMBLE•B TELEOPERATION
        </span>
        <div className="flex items-center gap-1.5">
          {/* Mobile Input Toggle */}
          <div className="flex md:hidden items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setDriveInputMode('ALL')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${driveInputMode === 'ALL' ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Both
            </button>
            <button
              onClick={() => setDriveInputMode('JOYSTICK')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${driveInputMode === 'JOYSTICK' ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Stick
            </button>
            <button
              onClick={() => setDriveInputMode('DPAD')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${driveInputMode === 'DPAD' ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Pad
            </button>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-yellow-400 font-bold hidden xs:inline">
            ZLAC706 10Hz
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Joystick & D-Pad Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Virtual Analog Joystick */}
          <div className={`flex-col items-center gap-2 ${
            driveInputMode === 'ALL' || driveInputMode === 'JOYSTICK' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
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
              className={`relative h-36 w-36 rounded-full bg-slate-200 border-2 transition-all flex items-center justify-center cursor-pointer select-none touch-none ${
                joystickActive ? 'border-yellow-500 ring-4 ring-yellow-400/20' : 'border-slate-300 hover:border-slate-400'
              } ${isEmergencyStop ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-400/50 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-400/50 pointer-events-none" />
              <div className="absolute h-16 w-16 rounded-full border border-slate-300 pointer-events-none" />

              {/* Knob */}
              <div
                className={`h-12 w-12 rounded-full border flex items-center justify-center transition-transform duration-75 shadow-sm select-none touch-none ${
                  joystickActive
                    ? 'bg-yellow-400 border-yellow-500 text-slate-950 ring-2 ring-yellow-300'
                    : 'bg-slate-900 border-slate-700 text-yellow-400'
                }`}
                style={{
                  transform: `translate(${joystickPos.x * 48}px, ${joystickPos.y * 48}px)`
                }}
              >
                <Disc className="w-5 h-5 opacity-90" />
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Vx: <strong className="text-slate-900">{(-joystickPos.y * maxLin).toFixed(2)}</strong> m/s • Wz: <strong className="text-slate-900">{(-joystickPos.x * maxAng).toFixed(2)}</strong> rad/s
            </div>
          </div>

          {/* D-Pad Buttons & Keyboard Controls */}
          <div className={`flex-col items-center gap-2 ${
            driveInputMode === 'ALL' || driveInputMode === 'DPAD' ? 'flex' : 'hidden md:flex'
          }`}>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-semibold">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              WASD / ARROW KEYS
            </div>

            <div className="flex flex-col items-center gap-1.5 select-none">
              {/* Up */}
              <button
                onPointerDown={(e) => { e.preventDefault(); startButtonDrive(maxLin, 0.0); }}
                onPointerUp={stopRobot}
                onPointerCancel={stopRobot}
                onPointerLeave={stopRobot}
                disabled={isEmergencyStop}
                className={`h-11 w-13 rounded-lg flex items-center justify-center border font-mono font-bold transition-all active:scale-95 cursor-pointer touch-none select-none ${
                  activeKeys['w'] || activeKeys['arrowup']
                    ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
                    : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-yellow-400'
                }`}
                title="Forward (W / Up Arrow)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              {/* Left, Brake, Right */}
              <div className="flex items-center gap-1.5">
                <button
                  onPointerDown={(e) => { e.preventDefault(); startButtonDrive(0.0, maxAng); }}
                  onPointerUp={stopRobot}
                  onPointerCancel={stopRobot}
                  onPointerLeave={stopRobot}
                  disabled={isEmergencyStop}
                  className={`h-11 w-13 rounded-lg flex items-center justify-center border font-mono font-bold transition-all active:scale-95 cursor-pointer touch-none select-none ${
                    activeKeys['a'] || activeKeys['arrowleft']
                      ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
                      : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-yellow-400'
                  }`}
                  title="Turn Left (A / Left Arrow)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={stopRobot}
                  className="h-11 w-15 rounded-lg flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-mono font-bold transition-all shadow-xs active:scale-95 text-[11px] touch-none select-none cursor-pointer"
                  title="Brake / Stop (Spacebar)"
                >
                  <Square className="w-3.5 h-3.5 fill-white mr-1" />
                  STOP
                </button>

                <button
                  onPointerDown={(e) => { e.preventDefault(); startButtonDrive(0.0, -maxAng); }}
                  onPointerUp={stopRobot}
                  onPointerCancel={stopRobot}
                  onPointerLeave={stopRobot}
                  disabled={isEmergencyStop}
                  className={`h-11 w-13 rounded-lg flex items-center justify-center border font-mono font-bold transition-all active:scale-95 cursor-pointer touch-none select-none ${
                    activeKeys['d'] || activeKeys['arrowright']
                      ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
                      : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-yellow-400'
                  }`}
                  title="Turn Right (D / Right Arrow)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Down */}
              <button
                onPointerDown={(e) => { e.preventDefault(); startButtonDrive(-maxLin, 0.0); }}
                onPointerUp={stopRobot}
                onPointerCancel={stopRobot}
                onPointerLeave={stopRobot}
                disabled={isEmergencyStop}
                className={`h-11 w-13 rounded-lg flex items-center justify-center border font-mono font-bold transition-all active:scale-95 cursor-pointer touch-none select-none ${
                  activeKeys['s'] || activeKeys['arrowdown']
                    ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
                    : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:text-yellow-400'
                }`}
                title="Reverse (S / Down Arrow)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Speed Limit Presets & Sliders */}
        <div className="pt-3 border-t border-slate-300 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-900 flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              SPEED PRESETS:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSpeedPreset(0.12, 0.35)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  maxLin === 0.12 ? 'bg-yellow-400 text-slate-950 border border-yellow-500 shadow-xs font-extrabold' : 'bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-300'
                }`}
              >
                Slow (0.12)
              </button>
              <button
                onClick={() => setSpeedPreset(0.25, 0.60)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  maxLin === 0.25 ? 'bg-yellow-400 text-slate-950 border border-yellow-500 shadow-xs font-extrabold' : 'bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-300'
                }`}
              >
                Cruise (0.25)
              </button>
              <button
                onClick={() => setSpeedPreset(0.45, 0.90)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  maxLin === 0.45 ? 'bg-yellow-400 text-slate-950 border border-yellow-500 shadow-xs font-extrabold' : 'bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-300'
                }`}
              >
                Fast (0.45)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Linear:</span>
                <span className="text-slate-900 font-bold">{maxLin.toFixed(2)} m/s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={maxLin}
                onChange={(e) => setMaxLin(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Angular:</span>
                <span className="text-slate-900 font-bold">{maxAng.toFixed(2)} rad/s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={maxAng}
                onChange={(e) => setMaxAng(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
