import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  let browser;
  
  try {
    // 1. Extract payload, including the dynamic borderConfig
    const { 
      originalPagesBase64 = [], 
      canvasBgColor = '#fdf9f1', 
      logoBase64, 
      insertedPages = {},
      borderConfig = { color: '#b48c36', size: 3 }
    } = await req.json();

    // Standard A4 dimensions mapped for Puppeteer
    const pageWidth = 794; 
    const pageHeight = 1123; 

    // 2. Dynamically Generate Border HTML based on Admin Config
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

    // Reusable Logo injection
    const logoHTML = logoBase64 
      ? `<img src="${logoBase64}" class="brand-logo" />` 
      : '';

    let bodyHtml = '';

    // 3. Loop through pages and interleave (Full-Bleed vs Themed)
    for (let i = 0; i < originalPagesBase64.length; i++) {
      
      // A. Inject custom page breaker (FULL BLEED - No borders, no margins, no logos)
      if (insertedPages[i]) {
        bodyHtml += `
          <div class="page-container" style="background-color: ${canvasBgColor};">
            <img src="${insertedPages[i]}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          </div>
        `;
      }

      // B. Inject the Original Astrology Page (Themed with borders & logo)
      bodyHtml += `
        <div class="page-container" style="background-color: ${canvasBgColor};">
          ${borderHTML}
          ${logoHTML}
          <img 
            src="${originalPagesBase64[i]}" 
            class="original-pdf-page" 
          />
        </div>
      `;
    }

    // C. Handle edge case: Page breaker added after the final page
    if (insertedPages[originalPagesBase64.length]) {
      bodyHtml += `
        <div class="page-container" style="background-color: ${canvasBgColor};">
          <img src="${insertedPages[originalPagesBase64.length]}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
      `;
    }

    // 4. Construct the full HTML document
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
            
            /* --- PDF MAGIC THEMING --- */
            .original-pdf-page {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              /* Drops the white background. (Color tinting is already done by frontend pixels) */
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
            
            /* --- DYNAMIC BORDER POSITIONING --- */
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
              background-color: ${canvasBgColor}; /* Blends out the border lines seamlessly */
            }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    // 5. Launch Puppeteer with Production Flags
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Prevents memory crashes in docker/serverless environments
        '--disable-gpu'
      ],
    });
    
    const page = await browser.newPage();
    
    // Set a higher timeout (90 seconds) for massive 70+ page image rendering
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 90000 });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: 'A4', 
    });

    // FIX: Wrap the Uint8Array in Buffer.from() to satisfy TypeScript's BodyInit requirement
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
    // 6. GUARANTEED CLEANUP: Prevents zombie browser instances from crashing your server
    if (browser) {
      await browser.close().catch(e => console.error('Error closing browser:', e));
    }
  }
}