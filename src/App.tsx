import React, { useState, useEffect, useRef } from 'react';
import { PDFViewer, PDFViewerHandle } from './components/PDFViewer';
import { Sidebar } from './components/Sidebar';
import { PageNavigator } from './components/PageNavigator';
import { Point, Segment } from './types';
import { GOTHIC_THEME } from './constants';
import { Upload, X, Info } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion } from 'motion/react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version || '3.11.174'}/build/pdf.worker.min.mjs`;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  // Load PDF document proxy when file changes
  useEffect(() => {
    if (file) {
      const loadPdf = async () => {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument(arrayBuffer);
        const doc = await loadingTask.promise;
        setPdfDocument(doc);
        setNumPages(doc.numPages);
      };
      loadPdf();
    } else {
      setPdfDocument(null);
      setNumPages(0);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLastPoint(null);
      setSegments([]);
    }
  };

  const handlePointClick = async (point: Point) => {
    if (!lastPoint) {
      // First click of a pair (or start of chain)
      setLastPoint(point);
    } else {
      // Second click - Extract text
      await extractText(lastPoint, point);
      // The end point becomes the start point for the next segment
      setLastPoint(point);
    }
  };

  const extractText = async (start: Point, end: Point) => {
    if (!pdfDocument) return;
    setIsProcessing(true);

    try {
      let extractedText = '';
      
      // Determine order (user might click backwards)
      let startP = start;
      let endP = end;
      
      if (start.pageIndex > end.pageIndex || (start.pageIndex === end.pageIndex && start.textIndex > end.textIndex)) {
        startP = end;
        endP = start;
      }

      // Loop through pages
      for (let i = startP.pageIndex; i <= endP.pageIndex; i++) {
        const page = await pdfDocument.getPage(i + 1); // PDF.js pages are 1-indexed
        const textContent = await page.getTextContent();
        const strings = textContent.items.map((item: any) => item.str);
        
        let pageText = '';
        
        if (i === startP.pageIndex && i === endP.pageIndex) {
          // Same page
          // Greedy: Include start and end items fully
          pageText = strings.slice(startP.textIndex, endP.textIndex + 1).join(' ');
        } else if (i === startP.pageIndex) {
          // Start page
          pageText = strings.slice(startP.textIndex).join(' ');
        } else if (i === endP.pageIndex) {
          // End page
          pageText = strings.slice(0, endP.textIndex + 1).join(' ');
        } else {
          // Middle page
          pageText = strings.join(' ');
        }
        
        extractedText += (extractedText ? '\n\n' : '') + pageText;
      }

      const newSegment: Segment = {
        id: crypto.randomUUID(),
        startPoint: startP,
        endPoint: endP,
        text: extractedText,
        timestamp: Date.now(),
      };

      setSegments(prev => [...prev, newSegment]);

    } catch (error) {
      console.error("Extraction failed:", error);
      alert("提取失败，请重试。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSegmentText = (id: string, newText: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  const handleExport = async () => {
    if (segments.length === 0) return;
    setIsProcessing(true);

    try {
      const zip = new JSZip();
      
      segments.forEach((segment, index) => {
        const filename = `Page_${segment.startPoint.pageIndex + 1}-${segment.endPoint.pageIndex + 1}_Segment_${index + 1}.txt`;
        zip.file(filename, segment.text);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'extracted_texts.zip');
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndoLastPoint = () => {
    if (lastPoint && segments.length === 0) {
      setLastPoint(null);
    } else if (segments.length > 0) {
      // Remove last segment
      const lastSegment = segments[segments.length - 1];
      setSegments(prev => prev.slice(0, -1));
      // Reset lastPoint to the start of that segment (effectively undoing the second click)
      setLastPoint(lastSegment.startPoint);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.scrollToPage(pageNumber);
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${GOTHIC_THEME.bg} text-white font-sans`}>
      
      {/* Page Navigator (Left Sidebar) */}
      {file && (
        <PageNavigator 
          numPages={numPages} 
          onPageClick={handlePageClick} 
          segments={segments}
          lastPoint={lastPoint}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {!file ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border-r border-[#2a2a2a]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-md w-full text-center space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-5xl font-gothic text-[#d4af37] tracking-widest drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                  CODEX EXTRACTOR
                </h1>
                <p className="text-serif text-[#888] italic text-lg">
                  "揭示卷轴中隐藏的文字。"
                </p>
              </div>

              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-[#8a0303] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full" />
                <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#444] rounded-xl bg-[#1a1a1a]/50 hover:bg-[#1a1a1a] hover:border-[#d4af37] transition-all duration-300 cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30" />
                  <Upload size={48} className="text-[#d4af37] mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-gothic text-lg text-[#ccc] z-10">上传 PDF 文档</span>
                  <span className="text-xs text-[#666] mt-2 font-serif z-10">仅支持 OCR 处理过的文件</span>
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Top Bar for File Info / Reset */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
              <div className="bg-[#1a1a1a]/90 backdrop-blur border border-[#333] px-4 py-2 rounded-full flex items-center gap-3 shadow-xl">
                <span className="font-gothic text-[#d4af37] text-sm truncate max-w-[200px]">{file.name}</span>
                <button 
                  onClick={() => setFile(null)} 
                  className="text-[#888] hover:text-red-500 transition-colors"
                  title="关闭文件"
                >
                  <X size={16} />
                </button>
              </div>
              
              {!lastPoint && (
                <div className="bg-[#1a1a1a]/90 backdrop-blur border border-[#333] px-4 py-2 rounded-full flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <Info size={14} className="text-[#d4af37]" />
                  <span className="font-serif text-[#ccc] text-xs italic">
                    右键点击文字以标记起始点。
                  </span>
                </div>
              )}
              
              {lastPoint && (
                <div className="bg-[#8a0303]/90 backdrop-blur border border-red-500/30 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <span className="font-serif text-white text-xs italic">
                    起始点已设定在第 {lastPoint.pageIndex + 1} 页
                  </span>
                  <button 
                    onClick={() => setLastPoint(null)}
                    className="text-white/70 hover:text-white"
                    title="取消选择"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Undo Button (Floating) */}
            {(segments.length > 0 || lastPoint) && (
               <button
                 onClick={handleUndoLastPoint}
                 className="absolute bottom-8 left-8 z-50 bg-[#1a1a1a] border border-[#d4af37]/30 text-[#d4af37] px-4 py-2 rounded shadow-lg hover:bg-[#2a2a2a] font-gothic text-xs tracking-widest uppercase"
               >
                 撤销上一步
               </button>
            )}

            <PDFViewer 
              ref={pdfViewerRef}
              file={file} 
              onPointClick={handlePointClick} 
              lastPoint={lastPoint}
            />
          </>
        )}
      </div>

      {/* Sidebar */}
      {file && (
        <Sidebar 
          segments={segments} 
          onDeleteSegment={handleDeleteSegment}
          onUpdateSegmentText={handleUpdateSegmentText}
          onExport={handleExport}
          onClearAll={() => {
            if (confirm('确定要清空所有提取记录吗？')) {
              setSegments([]);
              setLastPoint(null);
            }
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
