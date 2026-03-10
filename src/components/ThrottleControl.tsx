import React from "react";
import { Gauge } from "lucide-react";
import { motion } from "motion/react";

interface ThrottleControlProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export const ThrottleControl: React.FC<ThrottleControlProps> = ({
  value,
  onChange,
  label = "THROTTLE CONTROL",
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-500" />
          <label className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{label}</label>
        </div>
        <span className="text-emerald-500 font-black text-xl tabular-nums">{value}%</span>
      </div>

      <div className="relative h-12 flex items-center">
        {/* Background Track */}
        <div className="absolute inset-0 bg-slate-800/50 rounded-lg border border-slate-700/50" />
        
        {/* Progress Fill */}
        <motion.div 
          className="absolute left-0 h-full bg-emerald-500/20 border-r-2 border-emerald-500 rounded-l-lg"
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />

        {/* Range Input Overlay */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="
            absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10
          "
        />

        {/* Visual Markers */}
        <div className="absolute inset-0 flex justify-between px-4 pointer-events-none">
          {[0, 25, 50, 75, 100].map((tick) => (
            <div key={tick} className="flex flex-col items-center justify-center h-full">
              <div className={`w-0.5 h-2 ${value >= tick ? "bg-emerald-500" : "bg-slate-700"}`} />
              <span className={`text-[8px] mt-1 font-bold ${value >= tick ? "text-emerald-500" : "text-slate-600"}`}>
                {tick}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-[8px] text-slate-600 font-bold tracking-tighter">
        <span>IDLE</span>
        <span>NOMINAL</span>
        <span>OVERDRIVE</span>
      </div>
    </div>
  );
};
