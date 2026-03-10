import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("motor_logs.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const logEvent = (event: string, details: string) => {
  const stmt = db.prepare("INSERT INTO logs (event, details) VALUES (?, ?)");
  stmt.run(event, details);
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const PORT = 3000;

  // Single Phase Motor State
  let motorState = {
    status: "OFF", // OFF, STARTING, RUNNING, FAULT, ESTOP
    direction: "CW", // CW, CCW
    targetSpeed: 0, // 0-100%
    actualRPM: 0,
    temperature: 22.0,
    line: { voltage: 0, current: 0 },
    powerFactor: 0.85,
    faultCode: null as string | null,
    runtime: 0,
    timestamp: Date.now(),
    piConnected: false,
    systemLocked: true
  };

  const SYSTEM_PIN = "1234";

  // Simulation Loop (runs every 500ms)
  setInterval(() => {
    if (motorState.status === "ESTOP" || motorState.status === "FAULT") {
      motorState.actualRPM = Math.max(0, motorState.actualRPM - 60);
      motorState.line.voltage = 0;
      motorState.line.current = 0;
    } else if (motorState.status === "RUNNING" || motorState.status === "STARTING") {
      const maxRPM = 3450; // Typical single phase 2-pole motor
      const targetRPM = (motorState.targetSpeed / 100) * maxRPM;
      
      // Smooth RPM transition
      motorState.actualRPM += (targetRPM - motorState.actualRPM) * 0.08;
      
      // Single Phase Simulation: 230V AC
      const baseVoltage = 230;
      const noise = () => (Math.random() - 0.5) * 3;
      motorState.line.voltage = baseVoltage + noise();
      
      // Current proportional to load/speed
      const baseCurrent = (motorState.actualRPM / maxRPM) * 12; // 12A max
      motorState.line.current = baseCurrent + Math.random() * 0.5;
      
      // Temperature simulation
      motorState.temperature += (motorState.actualRPM / maxRPM) * 0.04;
      if (motorState.temperature > 75) {
        motorState.status = "FAULT";
        motorState.faultCode = "THERMAL_OVERLOAD";
        logEvent("FAULT", "Thermal Overload: " + motorState.temperature.toFixed(1) + "°C");
      }

      motorState.runtime += 0.5;
    } else {
      // OFF state
      motorState.actualRPM = Math.max(0, motorState.actualRPM - 30);
      motorState.temperature = Math.max(22, motorState.temperature - 0.03);
      motorState.line.voltage = 0;
      motorState.line.current = 0;
    }

    motorState.timestamp = Date.now();
    io.emit("motor_state_update", motorState);
  }, 500);

  let piSocketId: string | null = null;

  io.on("connection", (socket) => {
    socket.emit("motor_state_update", motorState);

    socket.on("register_pi", () => {
      piSocketId = socket.id;
      motorState.piConnected = true;
      console.log("Pi Client Registered:", socket.id);
      io.emit("motor_state_update", motorState);
      logEvent("SYSTEM", "Remote Pi Controller Connected");
    });

    socket.on("disconnect", () => {
      if (socket.id === piSocketId) {
        piSocketId = null;
        motorState.piConnected = false;
        console.log("Pi Client Disconnected");
        io.emit("motor_state_update", motorState);
        logEvent("SYSTEM", "Remote Pi Controller Disconnected");
      }
    });

    socket.on("motor_cmd", (cmd: { type: string; value?: any; pin?: string }) => {
      console.log("Command received:", cmd);
      
      if (cmd.type === "UNLOCK") {
        if (cmd.pin === SYSTEM_PIN) {
          motorState.systemLocked = false;
          io.emit("motor_state_update", motorState);
          logEvent("SECURITY", "System Unlocked by User");
        } else {
          logEvent("SECURITY", "Unauthorized Access Attempt - Wrong PIN");
        }
        return;
      }

      if (cmd.type === "LOCK") {
        motorState.systemLocked = true;
        io.emit("motor_state_update", motorState);
        logEvent("SECURITY", "System Locked by User");
        return;
      }

      // Block commands if locked
      if (motorState.systemLocked && cmd.type !== "ESTOP") {
        console.log("Command blocked: System is LOCKED");
        return;
      }

      switch (cmd.type) {
        case "START":
          if (motorState.status === "OFF") {
            motorState.status = "STARTING";
            logEvent("CMD", "Motor Start Sequence Initiated");
            setTimeout(() => {
              if (motorState.status === "STARTING") motorState.status = "RUNNING";
            }, 2000);
          }
          break;
        case "STOP":
          motorState.status = "OFF";
          motorState.targetSpeed = 0;
          logEvent("CMD", "Motor Stop Command");
          break;
        case "ESTOP":
          motorState.status = "ESTOP";
          motorState.targetSpeed = 0;
          motorState.faultCode = "EMERGENCY_STOP";
          logEvent("ALARM", "EMERGENCY STOP ACTIVATED");
          break;
        case "RESET":
          if (motorState.status === "ESTOP" || motorState.status === "FAULT") {
            motorState.status = "OFF";
            motorState.faultCode = null;
            motorState.temperature = 40; // Cool down slightly on reset
            logEvent("CMD", "System Reset");
          }
          break;
        case "SET_SPEED":
          motorState.targetSpeed = cmd.value;
          break;
        case "SET_DIR":
          motorState.direction = cmd.value;
          logEvent("CMD", "Direction changed to " + cmd.value);
          break;
      }
      io.emit("motor_state_update", motorState);
    });

    socket.on("get_logs", () => {
      const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50").all();
      socket.emit("logs_update", logs);
    });
  });

  app.get("/api/motor/status", (req, res) => res.json(motorState));
  app.get("/api/motor/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Industrial Motor Controller running on http://localhost:${PORT}`);
  });
}

startServer();
