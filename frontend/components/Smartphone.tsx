import React from "react"
import { cn } from "@/lib/utils"
import { Wifi, WifiOff, Battery, BatteryLow, Signal, SignalLow, SignalZero } from "lucide-react"

interface SmartphoneProps {
  children: React.ReactNode
  className?: string
  // Device type
  deviceType?: "iphone" | "android" | "minimal"
  // Network status
  networkType?: "none" | "2G" | "3G" | "4G" | "5G" | "wifi"
  signalStrength?: 0 | 1 | 2 | 3 | 4 // 0 = no signal, 4 = full signal
  // Battery
  batteryLevel?: number // 0-100
  isCharging?: boolean
  // Time
  time?: string
  // Frame
  frameColor?: string
  screenBackground?: string
  // Status bar
  statusBarStyle?: "light" | "dark" // light = white text, dark = black text
}

export function Smartphone({
  children,
  className,
  deviceType = "iphone",
  networkType = "4G",
  signalStrength = 4,
  batteryLevel = 85,
  isCharging = false,
  time = "12:52",
  frameColor = "#1a1a1a",
  screenBackground = "#ffffff",
  statusBarStyle = "dark",
}: SmartphoneProps) {
  const statusColor = statusBarStyle === "light" ? "#FFFFFF" : "#000000"
  const statusColorInactive = statusBarStyle === "light" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"
  
  // Get signal bars
  const getSignalBars = () => {
    const bars = []
    for (let i = 0; i < 4; i++) {
      const isActive = i < signalStrength
      bars.push(
        <div
          key={i}
          className="w-[3px] rounded-sm transition-all"
          style={{
            height: `${8 + i * 3}px`,
            backgroundColor: isActive ? statusColor : statusColorInactive
          }}
        />
      )
    }
    return bars
  }

  // Get battery color
  const getBatteryColor = () => {
    if (batteryLevel <= 20) return "#ef4444" // red
    if (batteryLevel <= 50) return "#f59e0b" // amber
    return statusColor
  }

  // Network indicator
  const getNetworkIndicator = () => {
    if (networkType === "wifi") {
      return <Wifi className="w-4 h-4" style={{ color: statusColor }} />
    }
    
    if (networkType === "none") {
      return (
        <div className="flex items-center gap-1">
          <SignalZero className="w-4 h-4" style={{ color: statusColorInactive }} />
          <span className="text-[10px]" style={{ color: statusColorInactive }}>Нет данных</span>
        </div>
      )
    }

    return (
      <div className="flex items-end gap-[2px]">
        {getSignalBars()}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative mx-auto",
        className
      )}
      style={{
        width: "375px",
        height: "812px",
      }}
    >
      {/* Phone Frame */}
      <div
        className={cn(
          "absolute inset-0 shadow-2xl",
          deviceType === "iphone" ? "rounded-[45px]" : "rounded-[35px]"
        )}
        style={{
          backgroundColor: frameColor,
          padding: deviceType === "iphone" ? "10px" : "8px",
        }}
      >
        {/* Power Button */}
        <div
          className="absolute right-[-3px] top-[140px] w-[3px] h-[60px] rounded-r-lg"
          style={{ backgroundColor: frameColor }}
        />
        
        {/* Volume Buttons */}
        <div
          className="absolute left-[-3px] top-[120px] w-[3px] h-[35px] rounded-l-lg"
          style={{ backgroundColor: frameColor }}
        />
        <div
          className="absolute left-[-3px] top-[165px] w-[3px] h-[35px] rounded-l-lg"
          style={{ backgroundColor: frameColor }}
        />

        {/* Screen Container */}
        <div
          className={cn(
            "relative w-full h-full overflow-hidden",
            deviceType === "iphone" ? "rounded-[35px]" : "rounded-[27px]"
          )}
          style={{ backgroundColor: screenBackground }}
        >
          {/* Status Bar */}
          <div className={cn(
            "absolute top-0 left-0 right-0 z-50",
            deviceType === "iphone" ? "h-14" : "h-11"
          )}>
            <div className="flex items-center justify-between h-full px-6 pt-1">
              {/* Left side - Time */}
              <div className="flex items-center">
                <span className="text-[15px] font-semibold tracking-tight" style={{ color: statusColor }}>
                  {time}
                </span>
              </div>

              {/* Right side - Status icons */}
              <div className="flex items-center gap-1">
                {/* Network */}
                {getNetworkIndicator()}
                
                {/* Battery */}
                <div className="flex items-center gap-1 ml-1">
                  <div className="relative">
                    <div
                      className="w-[24px] h-[12px] rounded-[3px]"
                      style={{
                        borderWidth: "1px",
                        borderColor: statusColor + "CC", // 80% opacity
                        borderStyle: "solid"
                      }}
                    >
                      <div
                        className="absolute inset-[1px] rounded-[2px] transition-all"
                        style={{
                          width: `${(batteryLevel / 100) * 20}px`,
                          backgroundColor: getBatteryColor(),
                        }}
                      />
                    </div>
                    <div className="absolute right-[-2px] top-[3px] w-[1px] h-[6px] rounded-r-full" style={{ backgroundColor: statusColor + "CC" }} />
                  </div>
                  <span className="text-[11px] ml-[2px]" style={{ color: statusColor }}>{batteryLevel}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Island / Notch */}
          {deviceType === "iphone" ? (
            <div className="absolute top-[14px] left-1/2 transform -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-full z-40" />
          ) : deviceType === "android" ? (
            // Android camera hole
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[12px] h-[12px] bg-black rounded-full z-40" />
          ) : null}

          {/* Content Area */}
          <div className={cn(
            "h-full overflow-hidden",
            deviceType === "iphone" ? "pt-14" : "pt-11",
            deviceType === "android" && "pb-12",
            deviceType === "minimal" && "pb-4"
          )}>
            {children}
          </div>

          {/* Home Indicator / Navigation Bar */}
          {deviceType === "iphone" ? (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[134px] h-[5px] bg-black/20 rounded-full" />
          ) : deviceType === "android" ? (
            // Android navigation buttons
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/5 flex items-center justify-center gap-12">
              <div className="w-5 h-5 rounded-full border-2 border-black/30" />
              <div className="w-4 h-4 bg-black/30 rounded-sm" />
              <div className="w-4 h-[2px] bg-black/30 rounded-full" />
            </div>
          ) : (
            // Minimal - just a thin line
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[100px] h-[3px] bg-black/10 rounded-full" />
          )}
        </div>
      </div>
    </div>
  )
}