import React, { useState } from 'react';
import { Segment } from '../types';
import { GOTHIC_THEME } from '../constants';
import { Copy, Trash2, ChevronDown, ChevronUp, Edit2, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  segments: Segment[];
  onDeleteSegment: (id: string) => void;
  onUpdateSegmentText: (id: string, newText: string) => void;
  onExport: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  segments, 
  onDeleteSegment, 
  onUpdateSegmentText,
  onExport,
  onClearAll,
  isProcessing
}) => {
  return (
    <div className={`w-96 flex flex-col h-full border-l ${GOTHIC_THEME.border} ${GOTHIC_THEME.bg} shadow-2xl z-20`}>
      {/* Header */}
      <div className="p-6 border-b border-[#2a2a2a] bg-[#141414]">
        <h2 className={`text-2xl font-gothic ${GOTHIC_THEME.gold} mb-2 text-center tracking-widest`}>
          提取记录
        </h2>
        <p className={`text-center ${GOTHIC_THEME.textMuted} text-xs font-serif italic`}>
          已收集 {segments.length} 个片段
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
        <AnimatePresence>
          {segments.map((segment, index) => (
            <SegmentCard 
              key={segment.id} 
              segment={segment} 
              index={index}
              onDelete={onDeleteSegment}
              onUpdate={onUpdateSegmentText}
            />
          ))}
        </AnimatePresence>
        
        {segments.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
            <FileText size={48} className="mb-4 text-[#d4af37]" />
            <p className="font-gothic text-[#e0e0e0]">暂无记录</p>
            <p className="font-serif text-sm mt-2">请在 PDF 上右键点击文字以开始提取。</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-[#2a2a2a] bg-[#141414] space-y-3">
        <button
          onClick={onExport}
          disabled={segments.length === 0 || isProcessing}
          className={`w-full py-3 px-4 rounded font-gothic tracking-widest uppercase text-sm font-bold flex items-center justify-center gap-2 ${
            segments.length === 0 ? 'opacity-50 cursor-not-allowed bg-[#2a2a2a] text-[#555]' : GOTHIC_THEME.buttonPrimary
          }`}
        >
          {isProcessing ? (
            <span className="animate-pulse">处理中...</span>
          ) : (
            <>
              <span>导出所有片段</span>
            </>
          )}
        </button>
        
        {segments.length > 0 && (
          <button
            onClick={onClearAll}
            className={`w-full py-2 px-4 rounded font-gothic text-xs uppercase tracking-widest text-[#8a0303] hover:bg-[#8a0303]/10 transition-colors`}
          >
            清空所有记录
          </button>
        )}
      </div>
    </div>
  );
};

const SegmentCard: React.FC<{
  segment: Segment;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
}> = ({ segment, index, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(segment.text);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(segment.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate(segment.id, editText);
    setIsEditing(false);
  };

  const wordCount = segment.text.trim().split(/\s+/).length;
  const charCount = segment.text.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border ${GOTHIC_THEME.border} ${GOTHIC_THEME.card} overflow-hidden shadow-lg group hover:border-[#d4af37]/30 transition-colors`}
    >
      {/* Card Header */}
      <div 
        className="flex items-center justify-between p-3 bg-[#111] cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#2a2a2a] border border-[#d4af37]/50 flex items-center justify-center text-[10px] font-gothic text-[#d4af37]">
            {index + 1}
          </div>
          <span className="text-xs font-serif text-[#888]">
            第 {segment.startPoint.pageIndex + 1} 页 <span className="text-[#444]">→</span> 第 {segment.endPoint.pageIndex + 1} 页
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(segment.id); }}
            className="p-1.5 text-[#555] hover:text-[#8a0303] transition-colors rounded hover:bg-[#8a0303]/10"
            title="删除片段"
          >
            <Trash2 size={14} />
          </button>
          {isExpanded ? <ChevronUp size={14} className="text-[#555]" /> : <ChevronDown size={14} className="text-[#555]" />}
        </div>
      </div>

      {/* Card Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-[#2a2a2a]">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-32 bg-[#0a0a0a] border border-[#333] rounded p-2 text-sm font-serif text-[#ccc] focus:outline-none focus:border-[#d4af37]/50 resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-2 py-1 text-xs text-[#888] hover:text-[#ccc]"
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleSave}
                      className="px-2 py-1 text-xs bg-[#1a1a1a] border border-[#d4af37]/30 text-[#d4af37] rounded hover:bg-[#d4af37]/10 flex items-center gap-1"
                    >
                      <Check size={12} /> 保存
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-sm font-serif text-[#ccc] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#333]">
                    {segment.text}
                  </p>
                </div>
              )}

              {/* Stats & Actions Row */}
              <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
                <div className="text-[10px] text-[#555] font-mono flex gap-3">
                  {/* <span>{wordCount} 词</span> */}
                  <span>{charCount} 字</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setEditText(segment.text);
                        setIsEditing(true);
                      }}
                      className="p-1.5 text-[#555] hover:text-[#d4af37] transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className={`p-1.5 transition-colors flex items-center gap-1 ${copied ? 'text-green-500' : 'text-[#555] hover:text-[#d4af37]'}`}
                    title="复制"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
