import fs from 'fs';
import { jsPDF } from 'jspdf';

const mdPath = 'E:\\ThroneCaptures\\docs\\ROUND3-FINAL-SUBMISSION-REPORT.md';
const outPath = 'E:\\ThroneCaptures\\docs\\ROUND3-FINAL-SUBMISSION-REPORT.pdf';

const md = fs.readFileSync(mdPath, 'utf8');
const lines = md.split('\n');

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 40;
const lineHeight = 7;
const maxY = pageHeight - margin;

let y = margin;
let pageNum = 1;

doc.setFont('helvetica');
doc.setFontSize(11);
doc.setTextColor(0, 0, 0);

for (const line of lines) {
  if (y > maxY) {
    doc.addPage();
    y = margin;
    pageNum++;
  }

  if (line.trim() === '') {
    y += lineHeight * 0.5;
    continue;
  }

  if (line.startsWith('# ')) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(line.slice(2), margin, y);
    y += lineHeight * 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
  } else if (line.startsWith('## ')) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(line.slice(3), margin, y);
    y += lineHeight * 1.5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
  } else if (line.startsWith('### ')) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(line.slice(4), margin, y);
    y += lineHeight * 1.25;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
  } else {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    for (const chunk of wrapped) {
      if (y > maxY) {
        doc.addPage();
        y = margin;
        pageNum++;
      }
      doc.text(chunk, margin, y);
      y += lineHeight;
    }
  }
}

doc.save(outPath);
console.log(`PDF generated: ${outPath} (${pageNum} pages)`);
