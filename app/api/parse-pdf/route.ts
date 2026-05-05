import { NextRequest, NextResponse } from 'next/server';
import { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' }, 
        { status: 400 }
      );
    }

    // Convert the uploaded file into a Node.js Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const pdfExtract = new PDFExtract();
    const options: PDFExtractOptions = {}; 
    
    // Extract the text and coordinates from the buffer
    const extractData = await new Promise((resolve, reject) => {
      pdfExtract.extractBuffer(buffer, options, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return NextResponse.json({ success: true, pdfData: extractData });

  } catch (error) {
    console.error("PDF Parsing Error:", error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse PDF' }, 
      { status: 500 }
    );
  }
}