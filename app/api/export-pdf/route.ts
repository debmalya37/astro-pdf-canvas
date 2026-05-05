import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    // 1. Added insertedPages (defaulting to empty object just in case)
    const { elements, canvasBgColor, logoBase64, insertedPages = {}, pageWidth, pageHeight, totalPages } = await req.json();

    // Group elements by page
    const pagesArray = Array.from({ length: totalPages }, (_, i) => 
      elements.filter((el: any) => el.pageIndex === i)
    );

    // 2. Reusable border HTML so we can apply it to both text pages and inserted image pages
    const borderHTML = `
      <div class="border-outer"></div>
      <div class="border-inner">
        <div class="corner c-tl"></div>
        <div class="corner c-tr"></div>
        <div class="corner c-bl"></div>
        <div class="corner c-br"></div>
      </div>
    `;

    // 3. Build the dynamic body content interleaving original pages and inserted page breakers
    let bodyHtml = '';

    for (let i = 0; i < totalPages; i++) {
      // A. Check if the admin inserted a page right BEFORE this index
      if (insertedPages[i]) {
        bodyHtml += `
          <div class="page-container">
            ${borderHTML}
            <div style="position: absolute; inset: 30px; z-index: 10; display: flex; align-items: center; justify-content: center;">
              <img src="${insertedPages[i]}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" />
            </div>
          </div>
        `;
      }

      // B. Render the original text page
      const pageElements = pagesArray[i];
      bodyHtml += `
        <div class="page-container">
          ${borderHTML}

          ${logoBase64 ? `
            <img src="${logoBase64}" style="position: absolute; top: 40px; left: 40px; width: 120px; z-index: 15; object-fit: contain;" />
          ` : ''}

          <div class="content-wrapper">
            ${pageElements.map((el: any) => `
              <div class="text-element" style="
                left: ${el.x}px; 
                top: ${el.y - (el.fontSize * 0.2)}px; 
                font-size: ${el.fontSize}px; 
                color: ${el.color}; 
                font-weight: ${el.fontWeight}; 
                font-style: ${el.fontStyle};
              ">
                ${el.str}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // C. Handle the edge case where an admin inserts a page after the very last page
    if (insertedPages[totalPages]) {
      bodyHtml += `
        <div class="page-container">
          ${borderHTML}
          <div style="position: absolute; inset: 30px; z-index: 10; display: flex; align-items: center; justify-content: center;">
            <img src="${insertedPages[totalPages]}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" />
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Outfit:wght@100..900&display=swap" rel="stylesheet">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background-color: ${canvasBgColor}; 
              font-family: 'Outfit', sans-serif; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            @page {
              size: ${pageWidth}px ${pageHeight}px;
              margin: 0;
            }
            .page-container {
              position: relative;
              width: ${pageWidth}px;
              height: ${pageHeight}px;
              page-break-after: always;
              overflow: hidden;
            }
            .text-element {
              position: absolute;
              white-space: nowrap;
              line-height: 1;
              transform-origin: top left;
              letter-spacing: -0.01em; 
              z-index: 10;
            }
            
            /* PREMIUM GOLDEN BORDERS */
            .border-outer {
              position: absolute;
              top: 8px; bottom: 8px; left: 8px; right: 8px;
              border: 1px solid #b48c36;
              z-index: 1;
            }
            .border-inner {
              position: absolute;
              top: 16px; bottom: 16px; left: 16px; right: 16px;
              border: 3px solid #b48c36;
              z-index: 1;
            }
            .corner {
              position: absolute;
              width: 32px; height: 32px;
              background-color: ${canvasBgColor};
            }
            .c-tl { top: -16px; left: -16px; border-bottom: 3px solid #b48c36; border-right: 3px solid #b48c36; border-bottom-right-radius: 100%; }
            .c-tr { top: -16px; right: -16px; border-bottom: 3px solid #b48c36; border-left: 3px solid #b48c36; border-bottom-left-radius: 100%; }
            .c-bl { bottom: -16px; left: -16px; border-top: 3px solid #b48c36; border-right: 3px solid #b48c36; border-top-right-radius: 100%; }
            .c-br { bottom: -16px; right: -16px; border-top: 3px solid #b48c36; border-left: 3px solid #b48c36; border-top-left-radius: 100%; }
            
            /* CONTENT SCALER */
            .content-wrapper {
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              width: 100%; height: 100%;
              transform: scale(0.92);
              transform-origin: center center;
            }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true, 
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