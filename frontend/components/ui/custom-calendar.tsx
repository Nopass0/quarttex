"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomCalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  onApply?: (date: Date) => void;
  onCancel?: () => void;
  className?: string;
}

const months = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CustomCalendar({ value, onChange, onApply, onCancel, className }: CustomCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [hours, setHours] = useState(selectedDate.getHours());
  const [minutes, setMinutes] = useState(selectedDate.getMinutes());

  // Generate years for the select (current year ± 10 years)
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert to Monday = 0
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day, hours, minutes);
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', increment: boolean) => {
    if (type === 'hours') {
      const newHours = increment 
        ? (hours + 1) % 24 
        : (hours - 1 + 24) % 24;
      setHours(newHours);
    } else {
      const newMinutes = increment 
        ? (minutes + 1) % 60 
        : (minutes - 1 + 60) % 60;
      setMinutes(newMinutes);
    }
  };

  const handleApply = () => {
    const finalDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes
    );
    onApply?.(finalDate);
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className={cn("bg-white dark:bg-gray-800 border rounded-lg p-4 w-[400px]", className)}>
      <div className="flex gap-4">
        {/* Calendar Section */}
        <div className="flex-1">
          {/* Month/Year Selector */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Select
                value={currentMonth.toString()}
                onValueChange={(value) => setCurrentMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={currentYear.toString()}
                onValueChange={(value) => setCurrentYear(parseInt(value))}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => day && handleDateClick(day)}
                disabled={!day}
                className={cn(
                  "w-8 h-8 rounded text-sm transition-colors",
                  !day && "invisible",
                  day && "hover:bg-gray-100 dark:hover:bg-gray-700",
                  day &&
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === currentMonth &&
                    selectedDate.getFullYear() === currentYear &&
                    "bg-[#006039] text-white hover:bg-[#006039]/90",
                  day &&
                    new Date().getDate() === day &&
                    new Date().getMonth() === currentMonth &&
                    new Date().getFullYear() === currentYear &&
                    !(
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === currentMonth &&
                      selectedDate.getFullYear() === currentYear
                    ) &&
                    "bg-gray-200 dark:bg-gray-600 font-semibold"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200 dark:bg-gray-600 mx-2"></div>

        {/* Time Picker Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Время
          </div>
          
          {/* Hours */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleTimeChange('hours', true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div className="text-lg font-mono w-8 text-center">
              {hours.toString().padStart(2, '0')}
            </div>
            <button
              onClick={() => handleTimeChange('hours', false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="text-lg font-mono">:</div>

          {/* Minutes */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleTimeChange('minutes', true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div className="text-lg font-mono w-8 text-center">
              {minutes.toString().padStart(2, '0')}
            </div>
            <button
              onClick={() => handleTimeChange('minutes', false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Отмена
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-[#006039] hover:bg-[#006039]/90"
          >
            Применить
          </Button>
        </div>
      </div>
    </div>
  );
}