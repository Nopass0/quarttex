"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  className?: string
  formatLabel?: (value: number) => string
  showInput?: boolean
}

export function RangeSlider({
  min,
  max,
  step = 1000,
  value,
  onValueChange,
  className,
  formatLabel = (val) => val.toLocaleString('ru-RU'),
  showInput = true,
}: RangeSliderProps) {
  const handleInputChange = (index: 0 | 1, inputValue: string) => {
    const numValue = parseInt(inputValue.replace(/\D/g, '')) || 0
    const newValue: [number, number] = [...value]
    newValue[index] = Math.max(min, Math.min(max, numValue))
    
    // Ensure min is less than max
    if (index === 0 && newValue[0] > newValue[1]) {
      newValue[0] = newValue[1]
    } else if (index === 1 && newValue[1] < newValue[0]) {
      newValue[1] = newValue[0]
    }
    
    onValueChange(newValue)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        value={value}
        onValueChange={onValueChange}
        max={max}
        min={min}
        step={step}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-100">
          <SliderPrimitive.Range className="absolute h-full bg-[#006039]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#006039] bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#006039] bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{formatLabel(min)}</span>
        <span>{formatLabel(max)}</span>
      </div>

      {showInput && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Минимум</label>
            <Input
              type="text"
              value={value[0].toLocaleString('ru-RU')}
              onChange={(e) => handleInputChange(0, e.target.value)}
              className="text-center"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Максимум</label>
            <Input
              type="text"
              value={value[1].toLocaleString('ru-RU')}
              onChange={(e) => handleInputChange(1, e.target.value)}
              className="text-center"
            />
          </div>
        </div>
      )}
    </div>
  )
}