"use client";
import React, { useState, useEffect } from 'react';

interface TextElement {
  id: string;
  pageIndex: number;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number; 
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
}

export default function CanvasEditor({ layoutData }: { layoutData: any }) {
  const [elements, setElements] = useState<TextElement[]>([]);
  // 'ALL' represents the global selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Default to the vintage cream color
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#fdf9f1');
  const [isExporting, setIsExporting] = useState(false);
  
  // State for the uploaded brand logo
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // State to hold uploaded page breakers. Key is the index where they should be inserted.
  const [insertedPages, setInsertedPages] = useState<Record<number, string>>({});

  // NEW FIX: Pagination State to prevent DOM overload lag
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Default injection positions (Index 3 = becomes 4th page, Index 8 = becomes 9th page)
  const defaultBreakerPositions = [
    { index: 3, label: 'Page 4' },
    { index: 8, label: 'Page 9' }
  ];

  // Handle logo upload and convert to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Page Breaker Uploads
  const handleInsertPageUpload = (e: React.ChangeEvent<HTMLInputElement>, insertIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInsertedPages(prev => ({ ...prev, [insertIndex]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Send the current styled elements, background color, and logo to the backend
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements,
          canvasBgColor,
          logoBase64, // Included in export
          insertedPages, // Include the inserted pages in the export
          pageWidth: layoutData.pages[0]?.pageInfo?.width || 595,
          pageHeight: layoutData.pages[0]?.pageInfo?.height || 842,
          totalPages: layoutData.pages.length
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Customized_Report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export PDF. Check console.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (layoutData && layoutData.pages) {
      const allElements: TextElement[] = [];

      layoutData.pages.forEach((page: any, pageIndex: number) => {
        page.content.forEach((item: any, itemIndex: number) => {
          
          const text = item.str.trim();
          
          // NEW FIX: The Garbage Filter
          // Ignore empty text, elements with 0 height, and the corrupted unicode replacement character or squares
          const isGarbage = text === '' || item.height <= 0 || text.includes('\uFFFD') || text === '□';

          if (!isGarbage) {
            const isBold = item.fontName?.toLowerCase().includes('bold');
            const isItalic = item.fontName?.toLowerCase().includes('italic');

            allElements.push({
              ...item,
              id: `p${pageIndex}-t${itemIndex}`,
              pageIndex: pageIndex,
              color: '#4a3018', // Default to Dark Brown
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              // Shrink font slightly to prevent overlap of adjacent words
              fontSize: Math.round(item.height * 0.95) || 12, 
            });
          }
        });
      });
      
      setElements(allElements);
      // Reset pagination when a new PDF loads
      setCurrentPageIndex(0);
    }
  }, [layoutData]);

  const updateSelectedElement = (updates: Partial<TextElement>) => {
    if (selectedId === 'ALL') {
      setElements((prev) => prev.map((el) => ({ ...el, ...updates })));
    } else {
      setElements((prev) => 
        prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el))
      );
    }
  };

  const singleSelectedElement = elements.find(el => el.id === selectedId);
  const activeStyles = selectedId === 'ALL' 
    ? { color: '', fontWeight: '', fontStyle: '' } 
    : singleSelectedElement;

  // Prepare the rendering array to interleave original pages with inserted page breakers
  const renderPages: any[] = [];
  if (layoutData && layoutData.pages) {
    layoutData.pages.forEach((page: any, pageIndex: number) => {
      // If the admin uploaded a breaker for this index, insert it right BEFORE this original page renders
      if (insertedPages[pageIndex]) {
        renderPages.push({ type: 'inserted', imageBase64: insertedPages[pageIndex], key: `inserted-${pageIndex}` });
      }
      renderPages.push({ type: 'original', page, pageIndex, key: `page-${pageIndex}` });
    });
    // Edge case: if a breaker was added after the very last page
    if (insertedPages[layoutData.pages.length]) {
      renderPages.push({ type: 'inserted', imageBase64: insertedPages[layoutData.pages.length], key: `inserted-${layoutData.pages.length}` });
    }
  }

  // Determine the active page to display based on pagination
  const activePageToRender = renderPages[currentPageIndex];

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* PROFESSIONAL TOOLBAR */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex flex-wrap gap-6 items-center sticky top-0 z-50">
        
        {/* NEW: Pagination Controls */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-200 bg-slate-100 p-1.5 rounded-lg">
          <button 
            onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
            disabled={currentPageIndex === 0 || renderPages.length === 0}
            className="px-3 py-1 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            &larr; Prev
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[70px] text-center">
            {renderPages.length > 0 ? `${currentPageIndex + 1} / ${renderPages.length}` : '0 / 0'}
          </span>
          <button 
            onClick={() => setCurrentPageIndex(p => Math.min(renderPages.length - 1, p + 1))}
            disabled={currentPageIndex === renderPages.length - 1 || renderPages.length === 0}
            className="px-3 py-1 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            Next &rarr;
          </button>
        </div>

        {/* Global Document Settings */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Document</span>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-md border border-slate-300 overflow-hidden relative cursor-pointer shadow-sm hover:scale-105 transition-transform"
              title="Canvas Background"
            >
              <input 
                type="color" 
                value={canvasBgColor} 
                onChange={(e) => setCanvasBgColor(e.target.value)}
                className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Brand Logo Upload */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Branding</span>
          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 text-sm font-medium rounded-md transition-colors">
            {logoBase64 ? 'Change Logo' : 'Upload Logo'}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload} 
              className="hidden" 
            />
          </label>
          {logoBase64 && (
            <button 
              onClick={() => setLogoBase64(null)}
              className="text-xs text-red-500 hover:underline font-medium"
            >
              Remove
            </button>
          )}
        </div>

        {/* PAGE BREAKERS ADMIN TOOLS */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Insert Pages</span>
          <div className="flex gap-2">
            {defaultBreakerPositions.map((pos) => (
              <div key={pos.index} className="flex flex-col items-center gap-1">
                <label className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${insertedPages[pos.index] ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {insertedPages[pos.index] ? `Replace ${pos.label}` : `+ Add ${pos.label}`}
                  <input type="file" accept="image/*" onChange={(e) => handleInsertPageUpload(e, pos.index)} className="hidden" />
                </label>
                {insertedPages[pos.index] && (
                  <button onClick={() => setInsertedPages(prev => { const n = {...prev}; delete n[pos.index]; return n; })} className="text-[10px] text-red-500 hover:underline">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center gap-2 pr-6 border-r border-slate-200">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Selection</span>
          <button
            onClick={() => setSelectedId(selectedId === 'ALL' ? null : 'ALL')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedId === 'ALL' 
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {selectedId === 'ALL' ? 'Deselect All' : 'Select All Text'}
          </button>
        </div>

        {/* Text Formatting Tools */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Typography</span>
          
          {selectedId ? (
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              
              {/* Color Picker */}
              <div 
                className="w-7 h-7 rounded bg-white border border-slate-300 overflow-hidden relative cursor-pointer hover:shadow-sm"
                title="Text Color"
              >
                <input 
                  type="color" 
                  value={activeStyles?.color || '#000000'} 
                  onChange={(e) => updateSelectedElement({ color: e.target.value })}
                  className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                />
              </div>

              <div className="w-px h-5 bg-slate-300 mx-1"></div>
              
              {/* Bold Toggle */}
              <button 
                onClick={() => {
                  const isCurrentlyBold = selectedId === 'ALL' ? false : activeStyles?.fontWeight === 'bold';
                  updateSelectedElement({ fontWeight: isCurrentlyBold ? 'normal' : 'bold' });
                }}
                className={`w-8 h-8 flex items-center justify-center rounded font-serif font-bold transition-colors ${
                  activeStyles?.fontWeight === 'bold' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                B
              </button>
              
              {/* Italic Toggle */}
              <button 
                onClick={() => {
                  const isCurrentlyItalic = selectedId === 'ALL' ? false : activeStyles?.fontStyle === 'italic';
                  updateSelectedElement({ fontStyle: isCurrentlyItalic ? 'normal' : 'italic' });
                }}
                className={`w-8 h-8 flex items-center justify-center rounded font-serif italic transition-colors ${
                  activeStyles?.fontStyle === 'italic' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                I
              </button>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Select text or 'Select All' to edit.</span>
          )}
        </div>
        
        {/* Export Button */}
        <div className="ml-auto pl-6 border-l border-slate-200">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-all ${
              isExporting 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            {isExporting ? 'Generating PDF...' : 'Export as PDF'}
          </button>
        </div>
      </div>

      {/* THE CANVAS CONTAINER */}
      <div 
        className="flex flex-col items-center gap-10 p-10 overflow-auto h-[750px]"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
        onClick={() => setSelectedId(null)}
      >
        
        {/* Render ONLY the active page based on Pagination */}
        {activePageToRender && (() => {
          const item = activePageToRender;
          const pageWidth = layoutData?.pages[0]?.pageInfo?.width || 595;
          const pageHeight = layoutData?.pages[0]?.pageInfo?.height || 842;

          // --- RENDER INSERTED PAGE BREAKER ---
          if (item.type === 'inserted') {
            return (
              <div 
                key={item.key}
                className="relative shadow-2xl flex-shrink-0 ring-1 ring-slate-900/5 overflow-hidden flex items-center justify-center" 
                style={{ width: `${pageWidth}px`, height: `${pageHeight}px`, backgroundColor: canvasBgColor }}
              >
                {/* Premium Golden Borders on the inserted page to maintain branding consistency */}
                <div className="absolute border border-[#b48c36] pointer-events-none z-0" style={{ top: '8px', bottom: '8px', left: '8px', right: '8px' }}></div>
                <div className="absolute border-[3px] border-[#b48c36] pointer-events-none z-0" style={{ top: '16px', bottom: '16px', left: '16px', right: '16px' }}>
                  <div className="absolute -top-4 -left-4 w-8 h-8 border-b-[3px] border-r-[3px] border-[#b48c36] rounded-br-full" style={{ backgroundColor: canvasBgColor }}></div>
                  <div className="absolute -top-4 -right-4 w-8 h-8 border-b-[3px] border-l-[3px] border-[#b48c36] rounded-bl-full" style={{ backgroundColor: canvasBgColor }}></div>
                  <div className="absolute -bottom-4 -left-4 w-8 h-8 border-t-[3px] border-r-[3px] border-[#b48c36] rounded-tr-full" style={{ backgroundColor: canvasBgColor }}></div>
                  <div className="absolute -bottom-4 -right-4 w-8 h-8 border-t-[3px] border-l-[3px] border-[#b48c36] rounded-tl-full" style={{ backgroundColor: canvasBgColor }}></div>
                </div>

                {/* Uploaded Full Page Image */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ margin: '30px' }}>
                  <img src={item.imageBase64} alt="Custom Page Insert" className="max-w-full max-h-full object-contain drop-shadow-md" />
                </div>
                
                {/* Visual Label for Admin */}
                <div className="absolute top-6 right-6 bg-emerald-500/90 backdrop-blur text-white text-xs px-3 py-1 rounded-full shadow-sm z-50">Custom Insert</div>
              </div>
            );
          }

          // --- RENDER ORIGINAL PAGE ---
          const { pageIndex } = item;

          return (
            <div 
              key={item.key}
              className="relative shadow-2xl flex-shrink-0 transition-colors duration-300 ease-in-out ring-1 ring-slate-900/5 overflow-hidden" 
              style={{ 
                width: `${pageWidth}px`, 
                height: `${pageHeight}px`, 
                backgroundColor: canvasBgColor 
              }}
            >
              
              {/* --- PREMIUM GOLDEN BORDERS --- */}
              <div 
                className="absolute border border-[#b48c36] pointer-events-none z-0"
                style={{ top: '8px', bottom: '8px', left: '8px', right: '8px' }}
              ></div>
              <div 
                className="absolute border-[3px] border-[#b48c36] pointer-events-none z-0"
                style={{ top: '16px', bottom: '16px', left: '16px', right: '16px' }}
              >
                <div className="absolute -top-4 -left-4 w-8 h-8 border-b-[3px] border-r-[3px] border-[#b48c36] rounded-br-full" style={{ backgroundColor: canvasBgColor }}></div>
                <div className="absolute -top-4 -right-4 w-8 h-8 border-b-[3px] border-l-[3px] border-[#b48c36] rounded-bl-full" style={{ backgroundColor: canvasBgColor }}></div>
                <div className="absolute -bottom-4 -left-4 w-8 h-8 border-t-[3px] border-r-[3px] border-[#b48c36] rounded-tr-full" style={{ backgroundColor: canvasBgColor }}></div>
                <div className="absolute -bottom-4 -right-4 w-8 h-8 border-t-[3px] border-l-[3px] border-[#b48c36] rounded-tl-full" style={{ backgroundColor: canvasBgColor }}></div>
              </div>

              {/* BRAND LOGO */}
              {logoBase64 && (
                <img 
                  src={logoBase64} 
                  alt="Brand Logo" 
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: '40px', 
                    width: '120px', 
                    zIndex: 15,
                    objectFit: 'contain'
                  }}
                />
              )}

              {/* --- SCALED CONTENT WRAPPER --- */}
              <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(0.92)', transformOrigin: 'center center' }}>
                <div className="relative w-full h-full pointer-events-auto">
                  {elements.filter(el => el.pageIndex === pageIndex).map((el) => {
                    const isSelected = selectedId === 'ALL' || selectedId === el.id;

                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(el.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${el.x}px`,
                          top: `${el.y - (el.fontSize * 0.2)}px`, 
                          fontSize: `${el.fontSize}px`, 
                          color: el.color,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.01em', 
                          outline: isSelected ? '2px solid #6366f1' : 'none',
                          outlineOffset: '2px',
                          cursor: 'pointer',
                          zIndex: isSelected ? 20 : 10,
                          lineHeight: 1, 
                          transformOrigin: 'top left',
                          fontFamily: 'sans-serif' // Fallback font mapping
                        }}
                        className={`transition-all rounded-sm ${isSelected ? 'bg-indigo-500/10' : 'hover:outline hover:outline-1 hover:outline-slate-400 hover:outline-offset-2'}`}
                      >
                        {el.str}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })()}
      </div>
      
    </div>
  );
}