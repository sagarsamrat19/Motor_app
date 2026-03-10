import { useState, useEffect, useRef, ChangeEvent } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Power, 
  PowerOff, 
  AlertTriangle, 
  RotateCcw, 
  Activity, 
  Thermometer, 
  Zap, 
  History,
  Settings,
  ShieldAlert,
  Lock,
  Gauge,
  Clock,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ControlButton } from "./components/ControlButton";
import { ThrottleControl } from "./components/ThrottleControl";
import { DirectionToggle } from "./components/DirectionToggle";

type MotorStatus = "OFF" | "STARTING" | "RUNNING" | "FAULT" | "ESTOP";
type MotorDirection = "CW" | "CCW";

interface MotorState {
  status: MotorStatus;
  direction: MotorDirection;
  targetSpeed: number;
  actualRPM: number;
  temperature: number;
  line: { voltage: number, current: number };
  powerFactor: number;
  faultCode: string | null;
  runtime: number;
  timestamp: number;
  piConnected: boolean;
  systemLocked: boolean;
}

interface LogEntry {
  id: number;
  event: string;
  details: string;
  timestamp: string;
}

export default function App() {
  const [motorState, setMotorState] = useState<MotorState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs">("dashboard");
  const socketRef = useRef<Socket | null>(null);
  const [history, setHistory] = useState<{ time: string, rpm: number }[]>([]);
  const [pin, setPin] = useState("");

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("motor_state_update", (data: MotorState) => {
      setMotorState(data);
      setHistory(prev => {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), rpm: data.actualRPM }];
        return newHistory.slice(-20); // Keep last 20 points
      });
    });

    socket.on("logs_update", (data: LogEntry[]) => setLogs(data));

    // Initial log fetch
    socket.emit("get_logs");
    const logInterval = setInterval(() => socket.emit("get_logs"), 5000);

    return () => {
      socket.disconnect();
      clearInterval(logInterval);
    };
  }, []);

  const sendCmd = (type: string, value?: any) => {
    socketRef.current?.emit("motor_cmd", { type, value });
  };

  const handleUnlock = () => {
    socketRef.current?.emit("motor_cmd", { type: "UNLOCK", pin });
    setPin("");
  };

  const handleLock = () => {
    socketRef.current?.emit("motor_cmd", { type: "LOCK" });
  };

  if (!motorState) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <Activity className="w-12 h-12 animate-pulse text-emerald-500" />
        <p className="font-mono tracking-widest animate-pulse">INITIALIZING SYSTEM...</p>
      </div>
    </div>
  );

  const getStatusColor = () => {
    switch (motorState.status) {
      case "RUNNING": return "text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]";
      case "STARTING": return "text-amber-400 animate-pulse";
      case "FAULT": return "text-rose-500 animate-bounce";
      case "ESTOP": return "text-rose-600 font-black";
      default: return "text-slate-500";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono selection:bg-emerald-500/30">
      {/* PIN Lock Overlay */}
      {motorState.systemLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">System Locked</h2>
              <p className="text-slate-400 text-sm">Enter 4-digit security PIN to access motor controls</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center gap-2 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin.length > i 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" 
                        : "border-slate-800 bg-slate-800/50 text-slate-600"
                    }`}
                  >
                    {pin.length > i ? "•" : ""}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "OK"].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      if (val === "C") setPin("");
                      else if (val === "OK") handleUnlock();
                      else if (typeof val === 'number' && pin.length < 4) setPin(prev => prev + val);
                    }}
                    className={`h-14 rounded-xl font-bold text-lg transition-all ${
                      val === "OK" 
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                        : val === "C"
                        ? "bg-rose-600/10 hover:bg-rose-600/20 text-rose-500"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div className="pt-4 text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Default PIN: 1234</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <Settings className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase">Industrial Motor Control v4.0</h1>
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`} />
                {isConnected ? "WEB LINK: OK" : "WEB LINK: FAIL"}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${motorState.piConnected ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                {motorState.piConnected ? "REMOTE PI: ONLINE" : "REMOTE PI: OFFLINE"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button 
            onClick={handleLock}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            title="Lock System"
          >
            <Lock className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === "dashboard" ? "bg-emerald-500 text-slate-950" : "hover:bg-slate-800"}`}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === "logs" ? "bg-emerald-500 text-slate-950" : "hover:bg-slate-800"}`}
            >
              EVENT LOGS
            </button>
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {activeTab === "dashboard" ? (
          <>
            {/* Left Column: Status & Controls */}
            <div className="lg:col-span-4 space-y-6">
              {/* Status Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-24 h-24" />
                </div>
                <label className="text-[10px] text-slate-500 font-bold tracking-widest mb-2 block">SYSTEM STATUS</label>
                <div className={`text-4xl font-black tracking-tighter mb-4 ${getStatusColor()}`}>
                  {motorState.status}
                </div>
                {motorState.faultCode && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded text-xs flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4" />
                    FAULT: {motorState.faultCode}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold">
                  <div className="bg-slate-800/50 p-3 rounded">
                    <div className="text-slate-500 mb-1">RUNTIME</div>
                    <div className="text-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {Math.floor(motorState.runtime / 3600)}h {Math.floor((motorState.runtime % 3600) / 60)}m {Math.floor(motorState.runtime % 60)}s
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <div className="text-slate-500 mb-1">DIRECTION</div>
                    <div className="text-slate-200 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3" /> {motorState.direction === "CW" ? "CLOCKWISE" : "COUNTER-CW"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ControlButton 
                    variant="primary"
                    disabled={motorState.status !== "OFF"}
                    onClick={() => sendCmd("START")}
                    icon={Power}
                    label="START"
                    size="lg"
                  />
                  <ControlButton 
                    variant="secondary"
                    onClick={() => sendCmd("STOP")}
                    icon={PowerOff}
                    label="STOP"
                    size="lg"
                  />
                </div>

                <ControlButton 
                  variant="danger"
                  onClick={() => sendCmd("ESTOP")}
                  icon={ShieldAlert}
                  label="EMERGENCY STOP"
                  size="xl"
                  className="w-full"
                />

                <ControlButton 
                  variant="ghost"
                  onClick={() => sendCmd("RESET")}
                  icon={RotateCcw}
                  label="SYSTEM RESET"
                  size="md"
                  className="w-full"
                />
              </div>

              {/* Speed & Direction Config */}
              <div className="space-y-6">
                <ThrottleControl 
                  value={motorState.targetSpeed}
                  onChange={(val) => sendCmd("SET_SPEED", val)}
                />
                
                <DirectionToggle 
                  direction={motorState.direction}
                  onChange={(dir) => sendCmd("SET_DIR", dir)}
                />
              </div>
            </div>

            {/* Right Column: Telemetry & Charts */}
            <div className="lg:col-span-8 space-y-6">
              {/* Main Telemetry Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Gauge className="w-4 h-4" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Velocity</span>
                  </div>
                  <div className="text-4xl font-black text-slate-100 tabular-nums">
                    {Math.round(motorState.actualRPM)}
                    <span className="text-xs text-slate-500 ml-2 font-normal">RPM</span>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Thermometer className="w-4 h-4" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Thermal</span>
                  </div>
                  <div className={`text-4xl font-black tabular-nums ${motorState.temperature > 70 ? "text-rose-500" : "text-slate-100"}`}>
                    {motorState.temperature.toFixed(1)}
                    <span className="text-xs text-slate-500 ml-2 font-normal">°C</span>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Current Load</span>
                  </div>
                  <div className="text-4xl font-black text-slate-100 tabular-nums">
                    {motorState.line.current.toFixed(1)}
                    <span className="text-xs text-slate-500 ml-2 font-normal">AMP</span>
                  </div>
                </div>
              </div>

              {/* Single Phase Analysis */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <label className="text-[10px] text-slate-500 font-bold tracking-widest mb-6 block uppercase">Power Analysis (Single Phase)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-emerald-500">L1 / NEUTRAL</span>
                      <span className="text-[10px] text-slate-500">ACTIVE</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">VOLTAGE</span>
                        <span className="text-slate-200 font-bold">{Math.round(motorState.line.voltage)}V</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <motion.div 
                          className="bg-emerald-500 h-full"
                          animate={{ width: `${(motorState.line.voltage / 250) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">CURRENT</span>
                        <span className="text-slate-200 font-bold">{motorState.line.current.toFixed(2)}A</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <motion.div 
                          className="bg-amber-500 h-full"
                          animate={{ width: `${(motorState.line.current / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-lg flex flex-col justify-center gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold">POWER FACTOR</span>
                      <span className="text-xs font-bold text-emerald-500">{motorState.powerFactor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold">EST. POWER</span>
                      <span className="text-xs font-bold text-slate-200">
                        {((motorState.line.voltage * motorState.line.current * motorState.powerFactor) / 1000).toFixed(2)} kW
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[300px]">
                <label className="text-[10px] text-slate-500 font-bold tracking-widest mb-6 block uppercase">RPM Trend Analysis</label>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis stroke="#475569" fontSize={10} domain={[0, 2000]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rpm" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      dot={false} 
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          /* Logs Tab */
          <div className="lg:col-span-12">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  SYSTEM EVENT LOGS
                </h2>
                <div className="text-[10px] text-slate-500 font-bold">LATEST 50 EVENTS</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-800/50 text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Event Type</th>
                      <th className="px-6 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-slate-400 tabular-nums">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded font-black ${
                            log.event === 'FAULT' || log.event === 'ALARM' ? 'bg-rose-500/20 text-rose-500' : 
                            log.event === 'CMD' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {log.event}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{log.details}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-600 font-bold italic">
                          NO SYSTEM EVENTS RECORDED
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer System Info */}
      <footer className="p-8 border-t border-slate-800 bg-slate-900/30 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-slate-500">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-emerald-500" />
              SAFETY PROTOCOL: ACTIVE
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500" />
              HEARTBEAT: {new Date(motorState.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <div className="tracking-widest">
            INDUSTRIAL CONTROL INTERFACE &copy; 2026 | SECURE LINK
          </div>
        </div>
      </footer>
    </div>
  );
}
