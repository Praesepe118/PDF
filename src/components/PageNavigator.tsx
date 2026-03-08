import React from 'react';
import { GOTHIC_THEME } from '../constants';
import { Segment, Point } from '../types';

interface PageNavigatorProps {
  numPages: number;
  onPageClick: (pageNumber: number) => void;
  segments: Segment[];
  lastPoint: Point | null;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({ numPages, onPageClick, segments, lastPoint }) => {
  // Helper to check if a page has any markers
  const getPageStatus = (pageIndex: number) => {
    const hasStart = segments.some(s => s.startPoint.pageIndex === pageIndex);
    const hasEnd = segments.some(s => s.endPoint.pageIndex === pageIndex);
    const isCurrent = lastPoint?.pageIndex === pageIndex;
    
    return { hasStart, hasEnd, isCurrent };
  };

  return (
    <div className={`w-16 flex flex-col h-full border-r ${GOTHIC_THEME.border} ${GOTHIC_THEME.bg} z-20`}>
      <div className="p-2 border-b border-[#2a2a2a] bg-[#141414] text-center">
        <span className="text-[10px] font-gothic text-[#888] tracking-widest">目录</span>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-none py-2 flex flex-col items-center gap-1">
        {Array.from({ length: numPages }, (_, i) => {
          const status = getPageStatus(i);
          const isActive = status.hasStart || status.hasEnd || status.isCurrent;
          
          return (
            <button
              key={i}
              onClick={() => onPageClick(i + 1)}
              className={`
                w-10 h-10 rounded flex items-center justify-center text-xs font-serif transition-all duration-300 relative
                ${isActive 
                  ? 'bg-[#2a2a2a] text-[#d4af37] border border-[#d4af37]/30' 
                  : 'text-[#555] hover:text-[#ccc] hover:bg-[#1a1a1a]'
                }
              `}
            >
              {i + 1}
              
              {/* Indicators */}
              <div className="absolute top-1 right-1 flex gap-0.5">
                {status.hasStart && <div className="w-1 h-1 rounded-full bg-[#d4af37]" />}
                {status.hasEnd && <div className="w-1 h-1 rounded-full bg-[#8a0303]" />}
              </div>
              {status.isCurrent && (
                <div className="absolute inset-0 border border-red-500/50 rounded animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
