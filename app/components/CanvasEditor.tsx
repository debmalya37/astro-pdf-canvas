"use client";
import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Force HTTPS, use Unpkg, and target the .mjs module for PDF.js v5+
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// --- INDEXED DB STORAGE ENGINE (Bypasses 5MB localStorage limit) ---
const DB_NAME = 'AstroPDF_Enterprise';
const STORE_NAME = 'presets';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('IndexedDB not supported');
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadFromDB = async (key: string): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Helper function to convert Hex to RGB array for pixel manipulation
const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

// A tiny transparent pixel as a safe fallback default image
const DEFAULT_PLACEHOLDER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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

// PRESET INTERFACE
interface Preset {
  id: string;
  name: string;
  frontCovers: string[];
  backCover: { image: string; url: string };
  insertPositions: number[];
  insertedPages: Record<number, string>;
  themeColors: { black: string; red: string; green: string };
  canvasBgColor: string;
  borderConfig: { color: string; size: number };
  logoBase64: string | null;
}

export default function CanvasEditor({ file }: { file: File }) {
  // --- CORE STATES ---
  const [themedPagesBase64, setThemedPagesBase64] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  
  // --- THEMING & ADMIN STATES ---
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#fdf9f1'); // Cream
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Zoom & Border Customization
  const [zoom, setZoom] = useState<number>(1);
  const [borderConfig, setBorderConfig] = useState({ color: '#b48c36', size: 3 });

  // Advanced Text Color Mapping
  const defaultColors = { black: '#4a3018', red: '#b48c36', green: '#2d3748' };
  const [themeColors, setThemeColors] = useState(defaultColors);
  const [needsReprocessing, setNeedsReprocessing] = useState(false);

  // --- DYNAMIC PAGE BREAKER STATES ---
  const [insertPositions, setInsertPositions] = useState<number[]>([3, 8]); 
  const [insertedPages, setInsertedPages] = useState<Record<number, string>>({});
  const [newPageInput, setNewPageInput] = useState<string>('');

  // --- FRONT & BACK COVER STATES ---
  const [frontCovers, setFrontCovers] = useState<string[]>([DEFAULT_PLACEHOLDER, DEFAULT_PLACEHOLDER, DEFAULT_PLACEHOLDER]);
  const [backCover, setBackCover] = useState<{ image: string; url: string }>({ 
    image: DEFAULT_PLACEHOLDER, 
    url: 'https://www.surbhigupta.com' 
  });

  // --- PRESET SYSTEM STATES ---
  const [presets, setPresets] = useState<Preset[]>([]);

  // Legacy Text Elements States (Kept intact)
  const [elements, setElements] = useState<TextElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- LOAD PRESETS ON MOUNT (From IndexedDB) ---
  useEffect(() => {
    loadFromDB('astro_pdf_presets')
      .then((savedPresets) => {
        if (savedPresets && Array.isArray(savedPresets)) {
          setPresets(savedPresets);
        }
      })
      .catch((err) => console.log("No existing presets found or DB error.", err));
  }, []);

  // --- 1. PIXEL MANIPULATION RASTERIZATION ENGINE ---
  const processPDF = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setNeedsReprocessing(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const pagesArray: string[] = [];

      const targetBlack = hexToRgb(themeColors.black);
      const targetRed = hexToRgb(themeColors.red);
      const targetGreen = hexToRgb(themeColors.green);

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); 
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // FIX: Added 'canvas: canvas' parameter to satisfy strict PDF.js v5+ TypeScript requirements
        await page.render({ canvasContext: context, canvas: canvas, viewport }).promise;

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let j = 0; j < data.length; j += 4) {
          const r = data[j]; const g = data[j+1]; const b = data[j+2];
          
          if (r > 240 && g > 240 && b > 240) continue; 

          let tr, tg, tb;
          let isTarget = false;

          if (r > g + 40 && r > b + 40) { 
            tr = targetRed[0]; tg = targetRed[1]; tb = targetRed[2]; isTarget = true;
          } else if (g > r + 30 && g > b + 30) { 
            tr = targetGreen[0]; tg = targetGreen[1]; tb = targetGreen[2]; isTarget = true;
          } else if (Math.abs(r-g) < 30 && Math.abs(g-b) < 30 && r < 200) { 
            tr = targetBlack[0]; tg = targetBlack[1]; tb = targetBlack[2]; isTarget = true;
          }

          if (isTarget) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const factor = lum / 255; 
            data[j] = Math.min(255, tr + (255 - tr) * factor);
            data[j+1] = Math.min(255, tg + (255 - tg) * factor);
            data[j+2] = Math.min(255, tb + (255 - tb) * factor);
          }
        }
        
        context.putImageData(imageData, 0, 0);
        pagesArray.push(canvas.toDataURL('image/jpeg', 0.85));
        setProcessingProgress(Math.round((i / totalPages) * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setThemedPagesBase64(pagesArray);
    } catch (error) {
      console.error("Error processing PDF:", error);
      alert("Failed to read the PDF file. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    processPDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // --- PRESET SYSTEM HANDLERS (Now using IndexedDB) ---
  const handleSavePreset = async () => {
    const name = prompt("Enter a name for this preset (e.g., 'Premium Gold Theme'):");
    if (!name) return;

    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      frontCovers,
      backCover,
      insertPositions,
      insertedPages,
      themeColors,
      canvasBgColor,
      borderConfig,
      logoBase64
    };

    try {
      const updatedPresets = [...presets, newPreset];
      await saveToDB('astro_pdf_presets', updatedPresets);
      setPresets(updatedPresets);
      alert('Preset saved successfully! High-resolution images are safely stored in your browser database.');
    } catch (e) {
      console.error("IndexedDB Storage error:", e);
      alert("Failed to save preset to the local database.");
    }
  };

  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    if (!presetId) return;

    const p = presets.find(p => p.id === presetId);
    if (p) {
      setFrontCovers(p.frontCovers);
      setBackCover(p.backCover);
      setInsertPositions(p.insertPositions);
      setInsertedPages(p.insertedPages);
      setThemeColors(p.themeColors);
      setCanvasBgColor(p.canvasBgColor);
      setBorderConfig(p.borderConfig);
      setLogoBase64(p.logoBase64);
      
      // Force user to apply the new text colors to the current PDF
      setNeedsReprocessing(true); 
    }
  };

  const handleClearPresets = async () => {
    if (confirm("Are you sure you want to delete all saved presets?")) {
      try {
        await saveToDB('astro_pdf_presets', []);
        setPresets([]);
      } catch(e) {
        console.error("Failed to clear DB", e);
      }
    }
  };

  const updateSelectedElement = (updates: Partial<TextElement>) => {
    if (selectedId === 'ALL') {
      setElements((prev) => prev.map((el) => ({ ...el, ...updates })));
    } else {
      setElements((prev) => 
        prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el))
      );
    }
  };

  // --- 2. UPLOAD & ADMIN HANDLERS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(uploadedFile);
    }
  };

  const handleInsertPageUpload = (e: React.ChangeEvent<HTMLInputElement>, insertIndex: number) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInsertedPages(prev => ({ ...prev, [insertIndex]: reader.result as string }));
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  const handleFrontCoverUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newCovers = [...frontCovers];
        newCovers[index] = reader.result as string;
        setFrontCovers(newCovers);
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  const handleBackCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackCover(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  const handleAddPosition = () => {
    const pageNum = parseInt(newPageInput);
    if (!isNaN(pageNum) && pageNum > 0) {
      const newIndex = pageNum - 1; 
      if (!insertPositions.includes(newIndex)) {
        setInsertPositions([...insertPositions, newIndex].sort((a, b) => a - b));
      }
      setNewPageInput('');
    }
  };

  const handleRemovePosition = (indexToRemove: number) => {
    setInsertPositions(insertPositions.filter(idx => idx !== indexToRemove));
    setInsertedPages(prev => {
      const newPages = { ...prev };
      delete newPages[indexToRemove];
      return newPages;
    });
  };

  // --- 3. EXPORT HANDLER ---
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontCovers,          
          backCover,            
          originalPagesBase64: themedPagesBase64, 
          canvasBgColor,
          logoBase64,
          insertedPages,
          borderConfig 
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Branded_Report_${file.name.replace('.pdf', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- 4. PREPARE RENDER ARRAY (Interleaving) ---
  const renderPages: any[] = [];
  
  frontCovers.forEach((base64, index) => {
    if (base64) {
      renderPages.push({ type: 'front-cover', imageBase64: base64, key: `front-${index}`, label: `Front Cover ${index + 1}` });
    }
  });

  themedPagesBase64.forEach((base64String, index) => {
    if (insertedPages[index]) {
      renderPages.push({ type: 'inserted', imageBase64: insertedPages[index], key: `inserted-${index}`, label: `Marketing Page` });
    }
    renderPages.push({ type: 'original', imageBase64: base64String, pageIndex: index, key: `page-${index}`, label: `Report Page ${index + 1}` });
  });

  if (insertedPages[themedPagesBase64.length]) {
    renderPages.push({ type: 'inserted', imageBase64: insertedPages[themedPagesBase64.length], key: `inserted-end`, label: `Marketing Page` });
  }

  if (backCover.image) {
    renderPages.push({ type: 'back-cover', imageBase64: backCover.image, url: backCover.url, key: `back-cover`, label: `Back Cover (Link)` });
  }

  const activePageToRender = renderPages[currentPageIndex];

  // Loading Screen
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-semibold text-slate-700">Rasterizing & Applying Theme...</h3>
        <p className="text-slate-500 mb-4">Processing millions of pixels to preserve perfect charts.</p>
        <div className="w-64 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${processingProgress}%` }}></div>
        </div>
        <p className="text-sm font-bold text-indigo-600 mt-2">{processingProgress}%</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* PROFESSIONAL ADMIN TOOLBAR */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex flex-col gap-3 sticky top-0 z-50 overflow-y-auto max-h-[40vh]">
        
        {/* ROW 0: PRESETS SYSTEM */}
        <div className="flex items-center gap-4 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
          <span className="text-xs font-bold tracking-wider text-indigo-800 uppercase flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Presets:
          </span>
          <select 
            onChange={handleLoadPreset} 
            className="text-xs p-1.5 border border-indigo-200 rounded w-56 font-bold text-indigo-900 outline-none bg-white cursor-pointer shadow-sm"
          >
            <option value="">-- Load an existing preset --</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={handleSavePreset} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors">
            + Save Current Settings as Preset
          </button>
          {presets.length > 0 && (
            <button onClick={handleClearPresets} className="ml-auto px-3 py-1.5 text-red-500 hover:bg-red-50 text-xs font-bold rounded transition-colors">
              Clear All Presets
            </button>
          )}
        </div>

        {/* ROW 1: Essential Controls */}
        <div className="flex flex-wrap items-center gap-4 justify-between w-full">
          
          {/* Pagination & Zoom */}
          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg shadow-inner">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="w-7 h-7 bg-white rounded shadow-sm text-slate-600 font-bold hover:bg-slate-50">-</button>
            <span className="text-xs font-semibold w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-7 h-7 bg-white rounded shadow-sm text-slate-600 font-bold hover:bg-slate-50">+</button>
            <div className="w-px h-5 bg-slate-300 mx-1"></div>
            <button onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))} disabled={currentPageIndex === 0} className="px-2 py-1 bg-white rounded shadow-sm text-xs font-bold disabled:opacity-50 hover:bg-slate-50">&larr;</button>
            <span className="text-xs font-bold text-slate-700 min-w-[50px] text-center">{currentPageIndex + 1} / {renderPages.length}</span>
            <button onClick={() => setCurrentPageIndex(p => Math.min(renderPages.length - 1, p + 1))} disabled={currentPageIndex === renderPages.length - 1} className="px-2 py-1 bg-white rounded shadow-sm text-xs font-bold disabled:opacity-50 hover:bg-slate-50">&rarr;</button>
          </div>

          {/* Aesthetics: Bg & Borders */}
          <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Bg</span>
              <input type="color" value={canvasBgColor} onChange={(e) => setCanvasBgColor(e.target.value)} className="w-7 h-7 cursor-pointer rounded overflow-hidden shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Border</span>
              <input type="color" value={borderConfig.color} onChange={(e) => setBorderConfig({...borderConfig, color: e.target.value})} className="w-7 h-7 cursor-pointer rounded overflow-hidden shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Logo</span>
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors border border-slate-200">
                {logoBase64 ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {logoBase64 && <button onClick={() => setLogoBase64(null)} className="text-[10px] text-red-500 font-bold uppercase hover:underline">X</button>}
            </div>
          </div>

          {/* Export Button */}
          <div className="ml-auto">
            <button 
              onClick={handleExport}
              disabled={isExporting || needsReprocessing}
              className={`px-6 py-2 text-sm font-bold rounded-md shadow-md transition-all ${
                isExporting || needsReprocessing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
              }`}
            >
              {isExporting ? 'Generating...' : 'Export as PDF'}
            </button>
          </div>
        </div>

        {/* ROW 2: Advanced Color Controls & Interleaving */}
        <div className="flex flex-wrap items-end gap-6 border-t border-slate-100 pt-3">
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Map Text Colors:</span>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-inner">
              <div className="flex items-center gap-1" title="Main Text">
                <span className="text-[10px] text-slate-500 font-bold">Main</span>
                <input type="color" value={themeColors.black} onChange={(e) => { setThemeColors({...themeColors, black: e.target.value}); setNeedsReprocessing(true); }} className="w-5 h-5 cursor-pointer rounded" />
              </div>
              <div className="flex items-center gap-1" title="Red Text">
                <span className="text-[10px] text-red-500 font-bold">Red</span>
                <input type="color" value={themeColors.red} onChange={(e) => { setThemeColors({...themeColors, red: e.target.value}); setNeedsReprocessing(true); }} className="w-5 h-5 cursor-pointer rounded" />
              </div>
              <div className="flex items-center gap-1" title="Green Text">
                <span className="text-[10px] text-emerald-500 font-bold">Green</span>
                <input type="color" value={themeColors.green} onChange={(e) => { setThemeColors({...themeColors, green: e.target.value}); setNeedsReprocessing(true); }} className="w-5 h-5 cursor-pointer rounded" />
              </div>
            </div>
            {needsReprocessing && <button onClick={processPDF} className="text-[10px] bg-indigo-600 text-white font-bold px-3 py-1.5 rounded shadow-sm hover:bg-indigo-700 animate-pulse">Apply Preset Colors</button>}
            {needsReprocessing && <button onClick={() => { setThemeColors(defaultColors); setNeedsReprocessing(true); }} className="text-[10px] text-slate-500 hover:text-slate-700 underline">Reset</button>}
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4 flex-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Insert Marketing Pages:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
                <span className="text-[10px] text-slate-400 pl-2 font-bold">PAGE</span>
                <input type="number" min="1" value={newPageInput} onChange={(e) => setNewPageInput(e.target.value)} className="w-12 text-xs p-1 outline-none text-center font-bold text-slate-700" placeholder="#"/>
                <button onClick={handleAddPosition} className="bg-slate-100 hover:bg-indigo-50 text-indigo-600 px-2 py-1 text-xs font-bold border-l border-slate-200 transition-colors">+</button>
              </div>
              {insertPositions.map((idx) => (
                <div key={idx} className={`flex items-center rounded-md border shadow-sm ${insertedPages[idx] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <label className="cursor-pointer px-2 py-1 text-[10px] font-bold uppercase text-slate-700 transition-colors hover:bg-slate-50">
                    {insertedPages[idx] ? `Page ${idx + 1} (Uploaded)` : `+ Page ${idx + 1}`}
                    <input type="file" accept="image/*" onChange={(e) => handleInsertPageUpload(e, idx)} className="hidden" />
                  </label>
                  <button onClick={() => handleRemovePosition(idx)} className="px-2 py-1 border-l border-slate-200 hover:bg-red-50 text-red-400 font-bold text-[10px] transition-colors">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: Covers & Append Settings */}
        <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 pt-3">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Book Covers & Append:</span>
          
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((idx) => (
              <label key={idx} className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-[10px] font-bold uppercase rounded border border-slate-200 transition-colors">
                {frontCovers[idx] !== DEFAULT_PLACEHOLDER ? `✓ Front ${idx + 1}` : `Upload Front ${idx + 1}`}
                <input type="file" accept="image/*" onChange={(e) => handleFrontCoverUpload(e, idx)} className="hidden" />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-[10px] font-bold uppercase rounded border border-slate-200 transition-colors">
              {backCover.image !== DEFAULT_PLACEHOLDER ? `✓ Back Cover` : `Upload Back Cover`}
              <input type="file" accept="image/*" onChange={handleBackCoverUpload} className="hidden" />
            </label>
            <input 
              type="text" 
              value={backCover.url} 
              onChange={(e) => setBackCover({ ...backCover, url: e.target.value })} 
              className="text-xs p-1.5 border border-slate-200 rounded w-48 font-medium text-slate-600 outline-none focus:border-indigo-400"
              placeholder="https://your-website.com"
              title="Hyperlink for Back Cover"
            />
          </div>
        </div>

      </div>

      {/* WORKSPACE AREA (Thumbnail Sidebar + Main Canvas) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Thumbnail Sidebar */}
        <div className="w-48 bg-slate-100 border-r border-slate-200 overflow-y-auto p-4 flex flex-col gap-4">
          {renderPages.map((item, idx) => (
            <div 
              key={item.key} 
              onClick={() => setCurrentPageIndex(idx)}
              className={`relative cursor-pointer rounded border-2 transition-all ${currentPageIndex === idx ? 'border-indigo-600 shadow-md transform scale-105' : 'border-transparent hover:border-slate-300'}`}
            >
              <div className="bg-white rounded overflow-hidden aspect-[1/1.4] shadow-sm pointer-events-none relative flex items-center justify-center" style={{ backgroundColor: canvasBgColor }}>
                {item.type === 'original' ? (
                  <img src={item.imageBase64} alt={`Thumb ${idx}`} className="w-full h-full object-cover" style={{ mixBlendMode: 'multiply' }} />
                ) : item.imageBase64 === DEFAULT_PLACEHOLDER ? (
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center px-2">Awaiting<br/>Upload</span>
                ) : (
                  <img src={item.imageBase64} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                )}
                
                {/* Labels for Thumbnails */}
                {item.type === 'front-cover' && <div className="absolute top-1 right-1 bg-indigo-500 text-white text-[7px] font-bold px-1 rounded shadow-sm">FRONT</div>}
                {item.type === 'inserted' && <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[7px] font-bold px-1 rounded shadow-sm">NEW</div>}
                {item.type === 'back-cover' && <div className="absolute top-1 right-1 bg-violet-500 text-white text-[7px] font-bold px-1 rounded shadow-sm">BACK+LINK</div>}
              </div>
              <p className="text-center text-[9px] text-slate-600 font-bold mt-1 uppercase tracking-wide truncate">{item.label}</p>
            </div>
          ))}
        </div>

        {/* THE MAIN CANVAS CONTAINER */}
        <div 
          className="flex-1 flex flex-col items-center p-10 overflow-auto"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {activePageToRender && (() => {
            const item = activePageToRender;
            const pageWidth = 595 * zoom;
            const pageHeight = 842 * zoom;

            const outerBorder = `1px solid ${borderConfig.color}`;
            const innerBorder = `${borderConfig.size}px solid ${borderConfig.color}`;
            const cornerSize = 32 * zoom;
            const cornerOffset = -borderConfig.size - 1;

            return (
              <div 
                key={item.key}
                className="relative shadow-2xl flex-shrink-0 ring-1 ring-slate-900/5 overflow-hidden flex items-center justify-center transition-all duration-200" 
                style={{ width: `${pageWidth}px`, height: `${pageHeight}px`, backgroundColor: canvasBgColor }}
              >
                
                {(item.type === 'inserted' || item.type === 'front-cover' || item.type === 'back-cover') ? (
                  
                  // --- FULL BLEED PAGES (Front/Back/Inserted) ---
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    {item.imageBase64 === DEFAULT_PLACEHOLDER ? (
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest border-2 border-dashed border-slate-300 p-10 rounded-xl">
                         Upload Image in Toolbar
                       </p>
                    ) : item.type === 'back-cover' ? (
                       // Visual Preview of the Clickable Back Cover
                       <a href={item.url} target="_blank" rel="noreferrer" className="w-full h-full relative cursor-pointer block group">
                         <img src={item.imageBase64} alt="Back Cover" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                           <span className="opacity-0 group-hover:opacity-100 bg-white text-indigo-600 px-4 py-2 rounded-full font-bold text-sm shadow-xl transition-opacity">🔗 Clickable Area Preview</span>
                         </div>
                       </a>
                    ) : (
                       <img src={item.imageBase64} alt="Custom Insert" className="w-full h-full object-cover" />
                    )}

                    {/* Labels for Preview Canvas */}
                    {item.type === 'front-cover' && <div className="absolute top-6 right-6 bg-indigo-500/90 backdrop-blur text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">Front Cover</div>}
                    {item.type === 'back-cover' && <div className="absolute top-6 right-6 bg-violet-500/90 backdrop-blur text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">Back Cover (Link Attached)</div>}
                    {item.type === 'inserted' && <div className="absolute top-6 right-6 bg-emerald-500/90 backdrop-blur text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">Marketing Insert</div>}
                  </div>
                  
                ) : (
                  
                  // --- ORIGINAL THEMED PDF PAGE ---
                  <>
                    {/* DYNAMIC GOLDEN BORDERS */}
                    <div className="absolute pointer-events-none z-20" style={{ top: 8*zoom, bottom: 8*zoom, left: 8*zoom, right: 8*zoom, border: outerBorder }}></div>
                    <div className="absolute pointer-events-none z-20" style={{ top: 16*zoom, bottom: 16*zoom, left: 16*zoom, right: 16*zoom, border: innerBorder }}>
                      <div className="absolute rounded-br-full" style={{ top: cornerOffset, left: cornerOffset, width: cornerSize, height: cornerSize, borderBottom: innerBorder, borderRight: innerBorder, backgroundColor: canvasBgColor }}></div>
                      <div className="absolute rounded-bl-full" style={{ top: cornerOffset, right: cornerOffset, width: cornerSize, height: cornerSize, borderBottom: innerBorder, borderLeft: innerBorder, backgroundColor: canvasBgColor }}></div>
                      <div className="absolute rounded-tr-full" style={{ bottom: cornerOffset, left: cornerOffset, width: cornerSize, height: cornerSize, borderTop: innerBorder, borderRight: innerBorder, backgroundColor: canvasBgColor }}></div>
                      <div className="absolute rounded-tl-full" style={{ bottom: cornerOffset, right: cornerOffset, width: cornerSize, height: cornerSize, borderTop: innerBorder, borderLeft: innerBorder, backgroundColor: canvasBgColor }}></div>
                    </div>

                    {/* BRAND LOGO */}
                    {logoBase64 && (
                      <img src={logoBase64} alt="Brand Logo" className="absolute z-30 object-contain" style={{ top: 40*zoom, left: 40*zoom, width: 120*zoom }} />
                    )}

                    {/* CUSTOM THEMED PDF IMAGE */}
                    <img 
                      src={item.imageBase64} 
                      alt={`Original Page`} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        mixBlendMode: 'multiply'
                      }} 
                    />
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      
    </div>
  );
}