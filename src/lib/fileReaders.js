export async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'txt') return file.text();
  if (extension === 'pdf') return extractPdf(file);
  if (extension === 'docx') return extractDocx(file);
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'heic', 'heif'].includes(extension)) return extractImageText(file);

  throw new Error('Please upload a TXT, PDF, DOCX, PNG, JPG, JPEG, or WEBP file.');
}

async function extractPdf(file) {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
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
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error('This PDF could not be read on this device. Try a simpler PDF, or copy and paste the text directly.');
  }
}

async function extractDocx(file) {
  const mammoth = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractImageText(file) {
  try {
    const [{ createWorker }, imageUrl] = await Promise.all([
      import('tesseract.js'),
      prepareImageForOcr(file)
    ]);
    const worker = await createWorker('eng');
    const result = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    const text = result.data?.text?.trim() || '';
    if (!text) {
      throw new Error('No readable text was found in that image.');
    }

    return text;
  } catch (error) {
    console.error('Image OCR failed:', error);
    throw new Error('This image could not be read on this device. Try a brighter, sharper photo or screenshot.');
  }
}

async function prepareImageForOcr(file) {
  const source = await loadImageSource(file);
  const scale = Math.min(2.2, Math.max(1, 1600 / Math.max(source.width, source.height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    releaseImageSource(source);
    return URL.createObjectURL(file);
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.filter = 'contrast(1.18) brightness(1.06) grayscale(1)';
  context.drawImage(source.element, 0, 0, canvas.width, canvas.height);
  releaseImageSource(source);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    const next = value > 168 ? 255 : value < 110 ? 0 : value;
    data[i] = next;
    data[i + 1] = next;
    data[i + 2] = next;
  }

  context.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Image preprocessing failed.'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      element: bitmap,
      close: () => bitmap.close()
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = objectUrl;
  });

  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    element: image,
    close: () => URL.revokeObjectURL(objectUrl)
  };
}

function releaseImageSource(source) {
  if (source?.close) source.close();
}
