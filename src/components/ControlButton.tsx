import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface ControlButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
  size?: "md" | "lg" | "xl";
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  variant = "secondary",
  disabled = false,
  className = "",
  size = "md",
}) => {
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 border-emerald-500/50",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/40 border-rose-900/50",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 border-slate-800",
  };

  const sizes = {
    md: "py-3 px-4 text-xs",
    lg: "py-4 px-6 text-sm",
    xl: "py-6 px-8 text-xl",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        rounded-xl font-black uppercase tracking-widest 
        flex items-center justify-center gap-3 
        transition-all border-2 
        disabled:opacity-30 disabled:cursor-not-allowed 
        ${className}
      `}
    >
      <Icon className={`${size === "xl" ? "w-8 h-8" : "w-5 h-5"}`} />
      <span>{label}</span>
    </motion.button>
  );
};
