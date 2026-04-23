export async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'txt') return file.text();
  if (extension === 'pdf') return extractPdf(file);
  if (extension === 'docx') return extractDocx(file);

  throw new Error('Please upload a TXT, PDF, or DOCX file.');
}

async function extractPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }

  return pages.join('\n\n');
}

async function extractDocx(file) {
  const mammoth = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
