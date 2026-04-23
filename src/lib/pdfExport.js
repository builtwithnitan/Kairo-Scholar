export async function exportGuidePdf(guide) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const write = (text, size = 11, style = 'normal', gap = 12) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width);
    lines.forEach((line) => {
      if (y > 735) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 5;
    });
    y += gap;
  };

  write(guide.title || 'Study Guide', 22, 'bold', 18);
  write('Summary', 15, 'bold', 6);
  guide.summary?.forEach((item) => write(`- ${item.text}`, 11, 'normal', 4));
  write('Study Guide', 15, 'bold', 6);
  guide.studyGuide?.forEach((section) => {
    write(section.heading, 13, 'bold', 2);
    section.bullets?.forEach((bullet) => write(`- ${bullet}`, 10, 'normal', 2));
  });
  write('Flashcards', 15, 'bold', 6);
  guide.flashcards?.forEach((card, index) => write(`${index + 1}. ${card.front}\nAnswer: ${card.back}`, 10, 'normal', 5));
  write('Quiz', 15, 'bold', 6);
  guide.quiz?.forEach((quiz, index) => {
    const choices = quiz.choices?.map((choice, choiceIndex) => `${String.fromCharCode(65 + choiceIndex)}. ${choice}`).join('\n') || '';
    write(`${index + 1}. ${quiz.question}\n${choices}\nAnswer: ${quiz.answer}. ${quiz.explanation}`, 10, 'normal', 5);
  });
  write('Important Terms', 15, 'bold', 6);
  guide.terms?.forEach((term) => write(`${term.term}: ${term.definition}`, 10, 'normal', 3));

  doc.save(`${slugify(guide.title || 'study-guide')}.pdf`);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
