"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "./button";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function DatePicker({ value, onChange, disabled, placeholder = "Datum wählen" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"year" | "month" | "day">("year");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [yearRange, setYearRange] = useState({ start: 2015, end: 2034 });
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Parse existing value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedYear(date.getFullYear());
        setSelectedMonth(date.getMonth());
      }
    }
  }, [value]);

  // Update popup position when opening or scrolling
  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPopupPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setView("year"); // Reset to year view when closing
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    // Convert Sunday (0) to 7, and shift to make Monday = 0
    return day === 0 ? 6 : day - 1;
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setView("month");
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setView("day");
  };

  const handleDaySelect = (day: number) => {
    const month = (selectedMonth + 1).toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    const dateStr = `${selectedYear}-${month}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
    setView("year"); // Reset to year view for next time
  };

  const navigateYearRange = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -20 : 20;
    setYearRange({
      start: yearRange.start + offset,
      end: yearRange.end + offset
    });
  };

  const renderYearView = () => {
    const years = [];
    for (let year = yearRange.start; year <= yearRange.end; year++) {
      years.push(year);
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigateYearRange("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">
            {yearRange.start} - {yearRange.end}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigateYearRange("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleYearSelect(year)}
              className={`p-2 rounded text-sm transition-colors ${
                year === selectedYear
                  ? "bg-purple-500 text-white"
                  : "hover:bg-white/10"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("year")}
            className="h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {selectedYear}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => (
            <button
              key={month}
              type="button"
              onClick={() => handleMonthSelect(index)}
              className={`p-2 rounded text-sm transition-colors ${
                index === selectedMonth
                  ? "bg-purple-500 text-white"
                  : "hover:bg-white/10"
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const currentValue = value ? new Date(value) : null;
    const currentDay = currentValue?.getDate();

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("month")}
            className="h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {MONTHS[selectedMonth]} {selectedYear}
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs text-muted-foreground p-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) =>
            typeof day === "number" ? (
              <button
                key={index}
                type="button"
                onClick={() => handleDaySelect(day)}
                className={`p-2 rounded text-sm transition-colors ${
                  currentValue &&
                  day === currentDay &&
                  selectedMonth === currentValue.getMonth() &&
                  selectedYear === currentValue.getFullYear()
                    ? "bg-purple-500 text-white"
                    : "hover:bg-white/10"
                }`}
              >
                {day}
              </button>
            ) : (
              <div key={index} />
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div
          className="fixed p-4 bg-background border border-white/20 rounded-lg shadow-lg w-80"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            zIndex: 99999
          }}
        >
          {view === "year" && renderYearView()}
          {view === "month" && renderMonthView()}
          {view === "day" && renderDayView()}
        </div>
      )}
    </div>
  );
}
