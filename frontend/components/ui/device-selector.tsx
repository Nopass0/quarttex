"use client";

import { useState } from "react";
import { Check, ChevronDown, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Device {
  id: string;
  name: string;
  trader: {
    email: string;
    name?: string;
  };
  isOnline: boolean;
  bankDetails: Array<{
    id: string;
    bankType: string;
    cardNumber: string;
    methodType: string;
  }>;
}

interface DeviceSelectorProps {
  devices: Device[];
  selectedDeviceId: string;
  onDeviceSelect: (deviceId: string) => void;
  placeholder?: string;
  className?: string;
}

export function DeviceSelector({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  placeholder = "Выберите устройство",
  className,
}: DeviceSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between dark:bg-gray-700 dark:border-gray-600 dark:text-white",
            className
          )}
        >
          {selectedDevice ? (
            <div className="flex items-center gap-2 text-left flex-1 overflow-hidden">
              <Smartphone className="h-4 w-4 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="truncate">{selectedDevice.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedDevice.trader?.email || "N/A"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    selectedDevice.isOnline ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <Badge variant="secondary" className="text-xs">
                  {selectedDevice.bankDetails?.length || 0}
                </Badge>
              </div>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              {placeholder}
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <ScrollArea className="h-[350px]">
          <div className="p-1">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => {
                  onDeviceSelect(device.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                  selectedDeviceId === device.id &&
                    "bg-gray-100 dark:bg-gray-800"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    device.isOnline ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <Smartphone className="h-4 w-4 shrink-0 text-gray-500" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{device.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {device.trader?.email || "N/A"}
                    {device.trader?.name && ` (${device.trader.name})`}
                  </div>
                  {device.bankDetails && device.bankDetails.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {device.bankDetails.slice(0, 2).map((bd, idx) => (
                        <span key={bd.id}>
                          {idx > 0 && ", "}
                          {bd.bankType} *{bd.cardNumber.slice(-4)}
                        </span>
                      ))}
                      {device.bankDetails.length > 2 && ", ..."}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {device.bankDetails?.length || 0} рекв.
                  </Badge>
                  {selectedDeviceId === device.id && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}