"use client";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import dynamic from 'next/dynamic';

// FIX: Dynamically import CanvasEditor and explicitly disable Server-Side Rendering (SSR)
// This prevents Node.js from crashing when looking for browser APIs like DOMMatrix.
const CanvasEditor = dynamic(() => import('./CanvasEditor'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[500px]">
      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold tracking-wide animate-pulse">Initializing Cosmic Engine...</p>
    </div>
  )
});

export default function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto mt-8 px-4 font-sans">
      {!file ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          {/* Header Area */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-3">
              Cosmic <span className="text-indigo-600">PDF Engine</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Upload the raw astrology report to apply global branding, charts, and marketing pages.
            </p>
          </div>

          {/* High-Tech Dropzone */}
          <div 
            {...getRootProps()} 
            className={`relative group w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-dashed p-20 text-center cursor-pointer transition-all duration-500 ease-out transform ${
              isDragActive 
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-[0_0_40px_rgba(99,102,241,0.2)]' 
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80 hover:shadow-2xl hover:-translate-y-1'
            }`}
          >
            {/* Subtle background glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <input {...getInputProps()} />
            
            <div className="relative flex flex-col items-center gap-6 z-10">
              {/* Floating Icon Container */}
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-500 ${isDragActive ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-105'}`}>
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              
              {/* Typography */}
              <div>
                <p className="text-2xl font-bold text-slate-800 mb-2">
                  {isDragActive ? "Drop the PDF to initialize..." : "Drag & drop the PDF here"}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                  <span>or</span>
                  <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full cursor-pointer group-hover:bg-indigo-100 transition-colors">
                    browse your computer
                  </span>
                </div>
              </div>

              {/* Specs pill */}
              <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Auto-Rasterization</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> Color Mapping</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* SLEEK COMMAND BAR */}
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center bg-white/90 backdrop-blur-xl px-8 py-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-4 z-40">
            
            <div className="flex items-center gap-5">
              {/* File Icon */}
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              {/* File Details */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-800 truncate max-w-[300px] md:max-w-md">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>PDF Document</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-0 flex items-center gap-4">
              <button 
                onClick={() => setFile(null)}
                className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 px-5 py-2.5 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                Close & Start Over
              </button>
            </div>
            
          </div>

          {/* The Safe Client-Only Render */}
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-200">
            <CanvasEditor file={file} />
          </div>
          
        </div>
      )}
    </div>
  );
}