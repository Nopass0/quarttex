"use client";

import React, { useState, useEffect } from "react";
import QuattrexLogo from "./QuattrexLogo";
import { Logo } from "./ui/logo";

export function DynamicLogo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [project, setProject] = useState<string>("quattrex");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Immediately check localStorage on mount
    const savedProject = localStorage.getItem("selectedProject");
    const dataProject = document.documentElement.getAttribute('data-project');
    const finalProject = savedProject || dataProject || "quattrex";
    
    setProject(finalProject);
    setMounted(true);
  }, []);

  // Always return Quattrex during SSR and initial render to prevent flash
  if (!mounted) {
    return <QuattrexLogo className={className} size={size} />;
  }

  // After mount, use the determined project
  if (project === "quattrex") {
    return <QuattrexLogo className={className} size={size} />;
  }

  return <Logo className={className} size={size} />;
}