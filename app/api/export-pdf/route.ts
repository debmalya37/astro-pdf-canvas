import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    // Receive the fully processed image data from the client
    const { originalPagesBase64, canvasBgColor, logoBase64, insertedPages } = await req.json();

    // Standard A4 dimensions mapped for Puppeteer
    const pageWidth = 794; 
    const pageHeight = 1123; 

    // Reusable premium golden borders
    const borderHTML = `
      <div class="border-outer"></div>
      <div class="border-inner">
        <div class="corner c-tl"></div>
        <div class="corner c-tr"></div>
        <div class="corner c-bl"></div>
        <div class="corner c-br"></div>
      </div>
    `;

    // Reusable Logo injection
    const logoHTML = logoBase64 ? `<img src="${logoBase64}" class="brand-logo" />` : '';

    let bodyHtml = '';

    // Loop through the original pages and interleave the inserted pages
    for (let i = 0; i < originalPagesBase64.length; i++) {
      
      // A. Inject custom page breaker if it exists for this index
      if (insertedPages[i]) {
        bodyHtml += `
          <div class="page-container">
            ${borderHTML}
            <div class="inserted-image-wrapper">
              <img src="${insertedPages[i]}" />
            </div>
          </div>
        `;
      }

      // B. Inject the Original Astrology Page
      bodyHtml += `
        <div class="page-container">
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
        <div class="page-container">
          ${borderHTML}
          <div class="inserted-image-wrapper">
            <img src="${insertedPages[originalPagesBase64.length]}" />
          </div>
        </div>
      `;
    }

    // Construct the full HTML document for Puppeteer to read
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
              mix-blend-mode: multiply; /* Drops the white background */
              /* Turns black text and charts into elegant Dark Brown */
              filter: invert(18%) sepia(35%) saturate(1478%) hue-rotate(348deg) brightness(94%) contrast(89%);
            }

            .inserted-image-wrapper {
              position: absolute;
              inset: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10;
            }
            .inserted-image-wrapper img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }

            .brand-logo {
              position: absolute;
              top: 40px;
              left: 40px;
              width: 130px;
              z-index: 30;
              object-fit: contain;
            }
            
            /* --- PREMIUM GOLDEN BORDERS --- */
            .border-outer {
              position: absolute;
              top: 10px; bottom: 10px; left: 10px; right: 10px;
              border: 1px solid #b48c36;
              z-index: 20;
            }
            .border-inner {
              position: absolute;
              top: 20px; bottom: 20px; left: 20px; right: 20px;
              border: 3px solid #b48c36;
              z-index: 20;
            }
            .corner {
              position: absolute;
              width: 38px; height: 38px;
              background-color: ${canvasBgColor}; /* Blends out the border lines seamlessly */
            }
            .c-tl { top: -19px; left: -19px; border-bottom: 3px solid #b48c36; border-right: 3px solid #b48c36; border-bottom-right-radius: 100%; }
            .c-tr { top: -19px; right: -19px; border-bottom: 3px solid #b48c36; border-left: 3px solid #b48c36; border-bottom-left-radius: 100%; }
            .c-bl { bottom: -19px; left: -19px; border-top: 3px solid #b48c36; border-right: 3px solid #b48c36; border-top-right-radius: 100%; }
            .c-br { bottom: -19px; right: -19px; border-top: 3px solid #b48c36; border-left: 3px solid #b48c36; border-top-left-radius: 100%; }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    // Launch Puppeteer in headless mode
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set a higher timeout for large 70+ page documents
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: 'A4', 
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Customized_Report.pdf"',
      },
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' }, 
      { status: 500 }
    );
  }
}