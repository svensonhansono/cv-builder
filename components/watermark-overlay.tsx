"use client";

export function WatermarkOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="text-[120px] font-bold text-gray-400/10 select-none rotate-[-45deg] whitespace-nowrap">
        Watermark Watermark Watermark
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-900/5 to-transparent" />
    </div>
  );
}
