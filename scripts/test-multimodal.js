const http = require('http');

// Simple 1x1 transparent PNG as test image
const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Minimal valid PDF with text "Assistance AI Architecture & Systems Blueprint"
const samplePdfBase64 = 'data:application/pdf;base64,' + Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 73 >>
stream
BT
/F1 14 Tf
50 700 Td
(Assistance AI Architecture & Systems Blueprint) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000368 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
445
%%EOF`).toString('base64');

async function testApi(payload, testName) {
  console.log(`\n========================================`);
  console.log(`🧪 Running Test: ${testName}`);
  console.log(`========================================`);

  const body = JSON.stringify(payload);
  const response = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  const status = response.status;
  const data = await response.json();

  console.log(`HTTP Status: ${status}`);
  console.log(`Success: ${data.success}`);
  if (data.assistantMessage) {
    console.log(`Assistant Reply:\n${data.assistantMessage.content}`);
    if (data.assistantMessage.toolSteps) {
      console.log(`Tool Steps:`, JSON.stringify(data.assistantMessage.toolSteps, null, 2));
    }
  } else {
    console.log(`Response Data:`, data);
  }

  if (status === 200 && data.success && data.assistantMessage?.content) {
    console.log(`✅ ${testName} PASSED!`);
    return true;
  } else {
    console.error(`❌ ${testName} FAILED!`);
    return false;
  }
}

async function runAll() {
  // Test 1: Image Analysis
  const imgResult = await testApi({
    message: 'What is this image and what can you tell me about it?',
    attachments: [
      {
        id: 'att_test_img_1',
        name: 'sample_chart.png',
        type: 'image/png',
        size: 120,
        content: samplePngBase64,
        url: samplePngBase64,
      }
    ]
  }, 'Image Analysis Test');

  // Test 2: PDF Document Analysis
  const pdfResult = await testApi({
    message: 'Please summarize the contents of this PDF file and extract any titles or key terms.',
    attachments: [
      {
        id: 'att_test_pdf_1',
        name: 'architecture_blueprint.pdf',
        type: 'application/pdf',
        size: 512,
        content: samplePdfBase64,
        url: samplePdfBase64,
      }
    ]
  }, 'PDF Analysis Test');

  console.log(`\n========================================`);
  console.log(`📊 Summary: Image Test: ${imgResult ? 'PASS' : 'FAIL'}, PDF Test: ${pdfResult ? 'PASS' : 'FAIL'}`);
  console.log(`========================================`);
}

runAll().catch(console.error);
