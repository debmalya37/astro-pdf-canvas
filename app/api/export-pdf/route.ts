import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// 1. FIX: Override Next.js default serverless timeouts. 
// Allows this route to run for up to 5 minutes (300 seconds) for massive PDFs.
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  let browser;
  
  try {
    const { 
      originalPagesBase64 = [], 
      canvasBgColor = '#fdf9f1', 
      logoBase64, 
      insertedPages = {},
      borderConfig = { color: '#b48c36', size: 3 }
    } = await req.json();

    const pageWidth = 794; 
    const pageHeight = 1123; 

    const bSize = borderConfig.size;
    const bColor = borderConfig.color;
    const cornerSize = 32;
    
    const borderHTML = `
      <div class="border-outer" style="border: 1px solid ${bColor};"></div>
      <div class="border-inner" style="border: ${bSize}px solid ${bColor};">
        <div class="corner c-tl" style="top: -${bSize + 1}px; left: -${bSize + 1}px; width: ${cornerSize}px; height: ${cornerSize}px; border-bottom: ${bSize}px solid ${bColor}; border-right: ${bSize}px solid ${bColor};"></div>
        <div class="corner c-tr" style="top: -${bSize + 1}px; right: -${bSize + 1}px; width: ${cornerSize}px; height: ${cornerSize}px; border-bottom: ${bSize}px solid ${bColor}; border-left: ${bSize}px solid ${bColor};"></div>
        <div class="corner c-bl" style="bottom: -${bSize + 1}px; left: -${bSize + 1}px; width: ${cornerSize}px; height: ${cornerSize}px; border-top: ${bSize}px solid ${bColor}; border-right: ${bSize}px solid ${bColor};"></div>
        <div class="corner c-br" style="bottom: -${bSize + 1}px; right: -${bSize + 1}px; width: ${cornerSize}px; height: ${cornerSize}px; border-top: ${bSize}px solid ${bColor}; border-left: ${bSize}px solid ${bColor};"></div>
      </div>
    `;

    const logoHTML = logoBase64 
      ? `<img src="${logoBase64}" class="brand-logo" decoding="async" />` 
      : '';

    let bodyHtml = '';

    // Loop through pages and interleave
    for (let i = 0; i < originalPagesBase64.length; i++) {
      
      // A. Inject custom page breaker (FULL BLEED)
      // 2. FIX: Added decoding="async" to prevent main-thread freezing on huge images
      if (insertedPages[i]) {
        bodyHtml += `
          <div class="page-container" style="background-color: ${canvasBgColor};">
            <img src="${insertedPages[i]}" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          </div>
        `;
      }

      // B. Inject the Original Astrology Page
      bodyHtml += `
        <div class="page-container" style="background-color: ${canvasBgColor};">
          ${borderHTML}
          ${logoHTML}
          <img 
            src="${originalPagesBase64[i]}" 
            class="original-pdf-page" 
            decoding="async" 
          />
        </div>
      `;
    }

    // C. Handle edge case: Page breaker added after the final page
    if (insertedPages[originalPagesBase64.length]) {
      bodyHtml += `
        <div class="page-container" style="background-color: ${canvasBgColor};">
          <img src="${insertedPages[originalPagesBase64.length]}" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background-color: ${canvasBgColor}; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            @page {
              size: A4;
              margin: 0;
            }
            .page-container {
              position: relative;
              width: ${pageWidth}px;
              height: ${pageHeight}px;
              page-break-after: always;
              overflow: hidden;
              background-color: ${canvasBgColor};
            }
            
            .original-pdf-page {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              mix-blend-mode: multiply; 
            }

            .brand-logo {
              position: absolute;
              top: 40px;
              left: 40px;
              width: 130px;
              z-index: 30;
              object-fit: contain;
            }
            
            .border-outer {
              position: absolute;
              top: 8px; bottom: 8px; left: 8px; right: 8px;
              z-index: 20;
              pointer-events: none;
            }
            .border-inner {
              position: absolute;
              top: 16px; bottom: 16px; left: 16px; right: 16px;
              z-index: 20;
              pointer-events: none;
            }
            .corner {
              position: absolute;
              background-color: ${canvasBgColor}; 
            }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Critical for preventing OOM crashes in Docker/Vercel
        '--disable-gpu',
        '--js-flags="--max-old-space-size=4096"' // Temporarily increase Node memory allocation
      ],
    });
    
    const page = await browser.newPage();
    
    // 3 & 4. FIX: Use 'load' instead of 'networkidle0' (since base64 requires no network) 
    // and disable Puppeteer's internal timeout (timeout: 0).
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 0 });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: 'A4', 
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Customized_Report.pdf"',
      },
    });

  } catch (error) {
    console.error('Production Export Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF due to a server error.' }, 
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('Error closing browser:', e));
    }
  }
}