"use client";

import React from "react";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

interface DynamicIconProps {
  children: React.ReactNode;
  className?: string;
  color?: "primary" | "accent" | "success" | "danger" | "warning" | "muted";
}

export function DynamicIcon({ children, className, color = "primary" }: DynamicIconProps) {
  const { project } = useProject();
  
  const colorClasses = {
    primary: {
      chase: "text-emerald-500 dark:text-emerald-400",
      quattrex: "text-violet-500 dark:text-violet-400"
    },
    accent: {
      chase: "text-emerald-600 dark:text-emerald-500",
      quattrex: "text-violet-600 dark:text-violet-500"
    },
    success: {
      chase: "text-emerald-500 dark:text-emerald-400",
      quattrex: "text-violet-500 dark:text-violet-400"
    },
    danger: "text-red-500 dark:text-red-400",
    warning: "text-amber-500 dark:text-amber-400",
    muted: "text-gray-500 dark:text-gray-400"
  };

  const getColorClass = () => {
    if (color === "danger" || color === "warning" || color === "muted") {
      return colorClasses[color];
    }
    return colorClasses[color][project];
  };

  return (
    <span className={cn(getColorClass(), className)}>
      {children}
    </span>
  );
}

// Специальные компоненты для часто используемых случаев
export function PrimaryIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const { project } = useProject();
  const colorClass = project === "quattrex" 
    ? "text-violet-500 dark:text-violet-400" 
    : "text-emerald-500 dark:text-emerald-400";
  
  return <span className={cn(colorClass, className)}>{children}</span>;
}

export function AccentIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const { project } = useProject();
  const colorClass = project === "quattrex" 
    ? "text-violet-600 dark:text-violet-500" 
    : "text-emerald-600 dark:text-emerald-500";
  
  return <span className={cn(colorClass, className)}>{children}</span>;
}