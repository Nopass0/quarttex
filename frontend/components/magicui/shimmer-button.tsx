import { cn } from "@/lib/utils";
import React from "react";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 96, 57, 0.9)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as React.CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-[1px]",
          "hover:scale-105",
          className
        )}
        {...props}
      >
        <style jsx>{`
          @keyframes shimmer {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <div
          className={cn(
            "absolute inset-0 overflow-visible [container-type:size]",
            "before:absolute before:inset-0 before:h-[calc(100%*2)] before:w-[calc(100%*2)] before:animate-[shimmer_var(--speed)_infinite] before:bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--shimmer-color)_360deg)] before:content-[''] before:[translate:-50%_-50%]",
            "after:absolute after:inset-[var(--cut)] after:rounded-[var(--radius)] after:bg-[var(--bg)] after:content-['']"
          )}
          style={{
            borderRadius: "var(--radius)",
          }}
        />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";