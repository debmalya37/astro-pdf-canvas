"use client";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import CanvasEditor from './CanvasEditor';
export default function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedLayout, setParsedLayout] = useState<any>(null); // We'll type this properly later

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setIsProcessing(true);

      // Prepare the file for the API
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        if (result.success) {
          console.log("PDF Layout Data:", result.pdfData);
          setParsedLayout(result.pdfData);
        } else {
          alert("Error parsing PDF: " + result.error);
        }
      } catch (error) {
        console.error("Upload failed", error);
        alert("Something went wrong during upload.");
      } finally {
        setIsProcessing(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  return (
    <div className="w-full max-w-4xl mx-auto mt-10">
      {!file ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed p-10 text-center cursor-pointer rounded-lg transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">
            {isDragActive ? "Drop the PDF here..." : "Drag & drop a PDF here, or click to select"}
          </p>
        </div>
      ) : (
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Editing: {file.name}</h3>
            <button 
              onClick={() => { setFile(null); setParsedLayout(null); }}
              className="text-red-500 text-sm hover:underline"
            >
              Start Over
            </button>
          </div>

          {isProcessing ? (
            <div className="text-center p-10 bg-gray-50 rounded animate-pulse">
              <p className="text-gray-500">Extracting PDF layout coordinates...</p>
            </div>
          ) : (
            <div className="bg-gray-100 p-4 rounded h-96 overflow-auto border border-gray-300">
               {/* THE CANVAS WILL GO HERE */}
               {parsedLayout ? (
                <div>

                 <p className="text-green-600 font-bold text-center mt-20">
                    PDF Parsed Successfully! Found {parsedLayout.pages.length} pages.
                    Check your browser console to see the raw coordinate data.

                    
                 </p>

                 {/* THE CANVAS WILL GO HERE */}
{parsedLayout ? (
  <CanvasEditor layoutData={parsedLayout} />
) : (
  <p className="text-red-500 text-center mt-20">Failed to load layout.</p>
)}
                </div>
               ) : (
                 <p className="text-red-500 text-center mt-20">Failed to load layout.</p>
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}