import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  date: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentRef?: string;
  paymentLink?: string;
  virtualAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export const generateInvoice = async (data: InvoiceData) => {
  // 1. Validation for critical data
  if (!data.customerName) {
    console.warn("Customer name missing for invoice generation. Using 'Valued Customer'.");
    data.customerName = "Valued Customer";
  }

  const doc = new jsPDF();

  // 2. Load Logo (Async)
  try {
      const logoUrl = '/sentra-logo.png'; 
      const img = new Image();
      img.src = logoUrl;
      await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
      });
      // Add logo (x, y, width, height) - Adjusted for better visual balance
      doc.addImage(img, 'PNG', 14, 15, 25, 25);
  } catch (e) {
      console.warn("Logo load failed, using text fallback", e);
  }

  // 3. Header Section
  // Company Name
  doc.setFontSize(24);
  doc.setTextColor(26, 26, 26); // Darker gray for professionalism
  doc.setFont("helvetica", "bold");
  doc.text("SENTRA", 45, 26); 
  
  // Tagline & Contact Info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Premium Perfumes & Scents", 45, 32);
  
  doc.setFontSize(9);
  doc.text("123 Fragrance Ave, Lagos, Nigeria", 14, 48);
  doc.text("support@sentra.com | +234 800 SENTRA", 14, 53);

  // Invoice Title & Meta
  doc.setFontSize(28);
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 196, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice #: ${data.orderId.slice(0, 8).toUpperCase()}`, 196, 33, { align: 'right' });
  doc.text(`Date: ${format(data.date, 'dd MMM yyyy')}`, 196, 38, { align: 'right' });
  if (data.dueDate) {
      doc.text(`Due Date: ${format(data.dueDate, 'dd MMM yyyy')}`, 196, 43, { align: 'right' });
  }

  // Divider Line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(14, 58, 196, 58);

  // 4. Bill To & Payment Info
  const startY = 65;
  
  // Bill To
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 14, startY);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 26);
  doc.text(data.customerName, 14, startY + 7);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(data.customerEmail, 14, startY + 13);
  
  if (data.customerAddress) {
      const splitAddress = doc.splitTextToSize(data.customerAddress, 80);
      doc.text(splitAddress, 14, startY + 19);
  }

  // Payment Instructions Box
  if (data.virtualAccount || data.paymentLink) {
    // Background box
    doc.setFillColor(248, 250, 252); // Very light gray/blue
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(110, startY - 5, 86, 55, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT INSTRUCTIONS", 115, startY);
    
    let yPos = startY + 8;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    if (data.virtualAccount) {
      doc.setFont("helvetica", "normal");
      doc.text(`Bank:`, 115, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(data.virtualAccount.bankName, 145, yPos);
      yPos += 5;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Account No:`, 115, yPos);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(data.virtualAccount.accountNumber, 145, yPos);
      doc.setFontSize(9);
      yPos += 5;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Account Name:`, 115, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(data.virtualAccount.accountName.substring(0, 20), 145, yPos);
      yPos += 6;
    }
    
    if (data.paymentRef) {
        doc.setFont("helvetica", "normal");
        doc.text(`Reference:`, 115, yPos);
        doc.setFont("helvetica", "bold");
        doc.text(data.paymentRef, 145, yPos);
        yPos += 8;
    }

    if (data.paymentLink) {
         doc.setTextColor(37, 99, 235); // Blue link color
         doc.setFont("helvetica", "bold");
         doc.textWithLink("Click here to pay online now", 115, yPos, { url: data.paymentLink });
    }
  }

  // 5. Items Table
  const tableTop = 125;
  const tableColumn = ["Item Description", "Qty", "Unit Price", "Total"];
  const tableRows = data.items.map(item => [
    item.description,
    item.quantity,
    `₦${item.price.toLocaleString()}`,
    `₦${item.total.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: tableTop,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
        fillColor: [30, 30, 30], 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        minCellHeight: 10,
        valign: 'middle'
    },
    styles: { 
        fontSize: 10, 
        cellPadding: 6,
        textColor: [60, 60, 60],
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
        valign: 'middle'
    },
    columnStyles: {
        0: { cellWidth: 'auto' }, // Description
        1: { cellWidth: 20, halign: 'center' }, // Qty
        2: { cellWidth: 35, halign: 'right' }, // Unit Price
        3: { cellWidth: 35, halign: 'right' } // Total
    },
    alternateRowStyles: {
        fillColor: [250, 250, 250]
    }
  });

  // 6. Totals Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const rightAlignX = 196;
  const labelX = 140;

  doc.setFontSize(10);
  
  // Subtotal
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", labelX, finalY);
  doc.setTextColor(26, 26, 26);
  doc.text(`₦${data.subtotal.toLocaleString()}`, rightAlignX, finalY, { align: 'right' });
  
  // VAT
  const vatY = finalY + 7;
  doc.setTextColor(100, 100, 100);
  doc.text(`VAT (${data.vatRate}%):`, labelX, vatY);
  doc.setTextColor(26, 26, 26);
  doc.text(`₦${data.vatAmount.toLocaleString()}`, rightAlignX, vatY, { align: 'right' });

  // Total
  const totalY = vatY + 10;
  doc.setDrawColor(230, 230, 230);
  doc.line(labelX, totalY - 4, rightAlignX, totalY - 4);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 26);
  doc.text("Total:", labelX, totalY + 2);
  doc.text(`₦${data.total.toLocaleString()}`, rightAlignX, totalY + 2, { align: 'right' });

  // 7. Footer
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 26);
  doc.text("Thank you for your business!", 105, pageHeight - 30, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Please make payment within the due date specified above.", 105, pageHeight - 25, { align: 'center' });
  doc.text("Sentra - Fragrance of Elegance", 105, pageHeight - 20, { align: 'center' });

  // 8. Set PDF Metadata
  doc.setProperties({
      title: `Invoice for ${data.customerName}`,
      subject: `Invoice #${data.orderId.slice(0, 8).toUpperCase()}`,
      author: 'Sentra',
      creator: 'Sentra Billing System',
      keywords: 'invoice, bill, sentra, fragrance'
  });

  // 9. Save
  doc.save(`Invoice_${data.customerName.replace(/\s+/g, '_')}_${data.orderId.slice(0, 8)}.pdf`);
};
