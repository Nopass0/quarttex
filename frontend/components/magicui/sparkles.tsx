"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Sparkle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
}

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  sparkleCount?: number;
  sparkleColor?: string;
  minSize?: number;
  maxSize?: number;
}

export function Sparkles({
  children,
  className,
  sparkleCount = 50,
  sparkleColor = "#006039",
  minSize = 2,
  maxSize = 6,
}: SparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSparkles: Sparkle[] = Array.from({ length: sparkleCount }, (_, i) => ({
        id: `sparkle-${Date.now()}-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (maxSize - minSize) + minSize,
        opacity: Math.random(),
        color: sparkleColor,
      }));
      setSparkles(newSparkles);
    }, 3000);

    return () => clearInterval(interval);
  }, [sparkleCount, sparkleColor, minSize, maxSize]);

  return (
    <div className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="pointer-events-none absolute animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            fontSize: `${sparkle.size}px`,
            color: sparkle.color,
            opacity: 0,
          }}
        >
          ✨
        </span>
      ))}
      <style jsx>{`
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }
        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out;
        }
      `}</style>
      {children}
    </div>
  );
}