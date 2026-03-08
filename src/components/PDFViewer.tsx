import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Point } from '../types';
import { GOTHIC_THEME } from '../constants';
import { Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import * as ReactWindow from 'react-window';
import * as AutoSizerPkg from 'react-virtualized-auto-sizer';

// Robust import resolution for react-window
let VariableSizeList: any = null;
try {
  // Try named export first
  if ((ReactWindow as any).VariableSizeList) {
    VariableSizeList = (ReactWindow as any).VariableSizeList;
  } 
  // Try default export property
  else if ((ReactWindow as any).default?.VariableSizeList) {
    VariableSizeList = (ReactWindow as any).default.VariableSizeList;
  }
  // Try default export itself if it looks like a component
  else if ((ReactWindow as any).default) {
    VariableSizeList = (ReactWindow as any).default;
  }
} catch (e) {
  console.error("Failed to resolve VariableSizeList", e);
}

// Robust import resolution for react-virtualized-auto-sizer
let AutoSizer: any = null;
try {
  if ((AutoSizerPkg as any).default) {
    AutoSizer = (AutoSizerPkg as any).default;
  } else if ((AutoSizerPkg as any).AutoSizer) {
    AutoSizer = (AutoSizerPkg as any).AutoSizer;
  } else {
    AutoSizer = AutoSizerPkg;
  }
} catch (e) {
  console.error("Failed to resolve AutoSizer", e);
}

interface PDFViewerProps {
  file: File;
  onPointClick: (point: Point) => void;
  lastPoint: Point | null;
}

export interface PDFViewerHandle {
  scrollToPage: (pageNumber: number) => void;
}

// Row component for react-window
const PageRow = ({ index, style, data }: any) => {
  const { scale, rotation, onPageContextMenu, lastPoint, pageWidth, pageHeight } = data;
  const pageNumber = index + 1;

  return (
    <div style={{ ...style, display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
      <div 
        className="relative group shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(138,3,3,0.2)]"
        onContextMenu={(e) => onPageContextMenu(e, index)}
        style={{ width: pageWidth, height: pageHeight }}
      >
        <Page
          pageNumber={pageNumber}
          scale={scale}
          rotate={rotation}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          className="border border-[#2a2a2a]"
          loading={
            <div className="flex items-center justify-center bg-[#1a1a1a] text-[#555] font-gothic text-xs" style={{ width: pageWidth, height: pageHeight }}>
              Loading...
            </div>
          }
        />
        
        {/* Page Number Overlay */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[#555] font-gothic text-sm">
          第 {pageNumber} 页
        </div>

        {/* Visual Marker for Last Point */}
        {lastPoint && lastPoint.pageIndex === index && (
          <div 
            className="absolute w-4 h-4 bg-[#8a0303] rounded-full border-2 border-[#d4af37] shadow-[0_0_10px_#8a0303] animate-pulse pointer-events-none z-20"
            style={{ 
              display: 'none' // Still hiding as per previous logic
            }} 
          />
        )}
      </div>
    </div>
  );
};

export const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ file, onPointClick, lastPoint }, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const listRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      if (listRef.current && listRef.current.scrollToItem) {
        listRef.current.scrollToItem(pageNumber - 1, 'start');
      } else {
        // Fallback scrolling
        const element = document.getElementById(`page-${pageNumber}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }));

  const onDocumentLoadSuccess = async (pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfDoc(pdf);
    
    // Fetch first page dimensions to estimate size
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1, rotation: 0 });
      setPageDimensions({ width: viewport.width, height: viewport.height });
    } catch (error) {
      console.error("Failed to load first page dimensions", error);
      // Fallback dimensions (A4ish)
      setPageDimensions({ width: 595, height: 842 });
    }
  };

  // Reset list cache when scale/rotation changes
  useEffect(() => {
    if (listRef.current && listRef.current.resetAfterIndex) {
      listRef.current.resetAfterIndex(0);
    }
  }, [scale, rotation, pageDimensions]);

  const handlePageContextMenu = useCallback((e: React.MouseEvent, pageIndex: number) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.parentElement?.classList.contains('react-pdf__Page__textContent')) {
      const parent = target.parentElement;
      const children = Array.from(parent.children);
      const textIndex = children.indexOf(target);
      
      const point: Point = {
        pageIndex,
        textIndex,
        textContent: target.textContent || '',
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };
      onPointClick(point);
    }
  }, [onPointClick]);

  // Calculate item size
  const getItemSize = useCallback(() => {
    if (!pageDimensions) return 800; // Fallback
    // Height = (Page Height * Scale) + Padding (40px top/bottom) + Page Number Space (30px)
    return (pageDimensions.height * scale) + 70; 
  }, [pageDimensions, scale]);

  const renderContent = () => {
    if (numPages <= 0) return null;

    // Check if we can use virtualization
    if (pageDimensions && VariableSizeList && AutoSizer) {
      return (
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <VariableSizeList
              ref={listRef}
              height={height}
              width={width}
              itemCount={numPages}
              itemSize={getItemSize}
              itemData={{
                scale,
                rotation,
                onPageContextMenu: handlePageContextMenu,
                lastPoint,
                pageWidth: pageDimensions.width * scale,
                pageHeight: pageDimensions.height * scale
              }}
              overscanCount={2}
            >
              {PageRow}
            </VariableSizeList>
          )}
        </AutoSizer>
      );
    }

    // Fallback to standard rendering
    return (
      <div className="h-full overflow-auto p-8 flex flex-col items-center gap-8">
        {Array.from(new Array(numPages), (el, index) => (
          <div 
            key={`page_${index + 1}`}
            id={`page-${index + 1}`}
            className="relative group shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(138,3,3,0.2)]"
            onContextMenu={(e) => handlePageContextMenu(e, index)}
          >
            <Page
              pageNumber={index + 1}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="border border-[#2a2a2a]"
              loading={
                <div className="flex items-center justify-center bg-[#1a1a1a] text-[#555] font-gothic text-xs" style={{ width: pageDimensions?.width || 595, height: pageDimensions?.height || 842 }}>
                  Loading...
                </div>
              }
            />
             {/* Page Number Overlay */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[#555] font-gothic text-sm">
              第 {index + 1} 页
            </div>
            {/* Visual Marker for Last Point */}
            {lastPoint && lastPoint.pageIndex === index && (
              <div 
                className="absolute w-4 h-4 bg-[#8a0303] rounded-full border-2 border-[#d4af37] shadow-[0_0_10px_#8a0303] animate-pulse pointer-events-none z-20"
                style={{ 
                  display: 'none' 
                }} 
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${GOTHIC_THEME.bg} relative`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-center gap-4 p-4 border-b ${GOTHIC_THEME.border} sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur-sm`}>
        <button 
          onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          className={`p-2 rounded-full ${GOTHIC_THEME.button}`}
          title="缩小"
        >
          <ZoomOut size={20} />
        </button>
        <span className={`${GOTHIC_THEME.gold} font-mono min-w-[60px] text-center`}>
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale(s => Math.min(3.0, s + 0.1))}
          className={`p-2 rounded-full ${GOTHIC_THEME.button}`}
          title="放大"
        >
          <ZoomIn size={20} />
        </button>
        <div className="w-px h-6 bg-[#2a2a2a] mx-2" />
        <button 
          onClick={() => setRotation(r => (r + 90) % 360)}
          className={`p-2 rounded-full ${GOTHIC_THEME.button}`}
          title="旋转"
        >
          <RotateCw size={20} />
        </button>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-hidden relative" onContextMenu={(e) => e.preventDefault()}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className={`animate-spin ${GOTHIC_THEME.gold}`} size={48} />
              <p className={`${GOTHIC_THEME.textMuted} font-gothic`}>正在召唤文档...</p>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500 font-gothic p-8 border border-red-900/50 bg-red-900/10 rounded-lg">
                无法加载古卷。请检查文件是否损坏。
              </div>
            </div>
          }
          className="h-full"
        >
          {renderContent()}
        </Document>
      </div>
    </div>
  );
});

