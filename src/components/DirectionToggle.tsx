import React from "react";
import { ArrowRightLeft, RotateCcw, RotateCw } from "lucide-react";
import { motion } from "motion/react";

interface DirectionToggleProps {
  direction: "CW" | "CCW";
  onChange: (direction: "CW" | "CCW") => void;
  label?: string;
}

export const DirectionToggle: React.FC<DirectionToggleProps> = ({
  direction,
  onChange,
  label = "ROTATION PHASE",
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
        <label className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{label}</label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange("CW")}
          className={`
            py-4 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase 
            flex flex-col items-center justify-center gap-2 transition-all 
            ${direction === "CW" 
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-900/10" 
              : "border-slate-800 bg-slate-800/50 text-slate-500 hover:border-slate-700"}
          `}
        >
          <RotateCw className={`w-6 h-6 ${direction === "CW" ? "animate-spin" : ""}`} />
          <span>CW (L1-L2-L3)</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange("CCW")}
          className={`
            py-4 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase 
            flex flex-col items-center justify-center gap-2 transition-all 
            ${direction === "CCW" 
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-900/10" 
              : "border-slate-800 bg-slate-800/50 text-slate-500 hover:border-slate-700"}
          `}
        >
          <RotateCcw className={`w-6 h-6 ${direction === "CCW" ? "animate-spin-reverse" : ""}`} />
          <span>CCW (L1-L3-L2)</span>
        </motion.button>
      </div>

      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800/50 text-[8px] text-slate-500 font-bold tracking-widest flex justify-between items-center">
        <span>PHASE SEQUENCE:</span>
        <span className="text-emerald-500">{direction === "CW" ? "ABC" : "ACB"}</span>
      </div>
    </div>
  );
};
