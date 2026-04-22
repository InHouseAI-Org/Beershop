import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export credit holder history to PDF
 * @param {Object} creditHolder - The credit holder object
 * @param {Array} history - Array of transaction history records
 */
export const exportCreditHistoryToPDF = (creditHolder, history) => {
  // Create new PDF document
  const doc = new jsPDF();

  // Set document properties
  doc.setProperties({
    title: `Credit History - ${creditHolder.name}`,
    subject: 'Credit Ledger Report',
    author: 'Beershop Management System',
    keywords: 'credit, ledger, history',
    creator: 'Beershop Admin'
  });

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Credit Ledger Report', 14, 20);

  // Add generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  // Add credit holder details section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Credit Holder Details', 14, 40);

  // Credit holder info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const holderDetails = [
    ['Name:', creditHolder.name],
    ['Phone:', creditHolder.phone || 'N/A'],
    ['Address:', creditHolder.address || 'N/A'],
    ['Current Outstanding:', `₹${parseFloat(creditHolder.amount_payable || 0).toFixed(2)}`]
  ];

  autoTable(doc, {
    startY: 45,
    head: [],
    body: holderDetails,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 130 }
    },
    margin: { left: 14 }
  });

  // Calculate summary statistics
  const totalGiven = history
    .filter(r => (r.transaction_type || 'collected') === 'given')
    .reduce((sum, record) => sum + parseFloat(record.amount_collected), 0);

  const totalCollected = history
    .filter(r => (r.transaction_type || 'collected') === 'collected')
    .reduce((sum, record) => sum + parseFloat(record.amount_collected), 0);

  // Add summary section
  let currentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, currentY);

  currentY += 5;
  const summaryData = [
    ['Total Credit Given:', `₹${totalGiven.toFixed(2)}`],
    ['Total Credit Collected:', `₹${totalCollected.toFixed(2)}`],
    ['Current Outstanding:', `₹${parseFloat(creditHolder.amount_payable || 0).toFixed(2)}`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 50, fontStyle: 'bold', textColor: [0, 0, 0] }
    },
    margin: { left: 14 }
  });

  // Add transaction history section
  currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Transaction History (${history.length} records)`, 14, currentY);

  // Prepare transaction data
  const transactionData = history.map(record => {
    const transactionType = record.transaction_type || 'collected';
    const isGiven = transactionType === 'given';
    const collectedInDisplay = record.collected_in === 'cash_balance' ? 'Cash' :
      record.collected_in === 'bank_balance' ? 'Bank' :
      record.collected_in === 'gala_balance' ? 'Gala' : '-';

    return [
      new Date(record.collected_at).toLocaleString(),
      isGiven ? 'Credit Given' : 'Credit Collected',
      `${isGiven ? '+' : '-'}₹${parseFloat(record.amount_collected).toFixed(2)}`,
      !isGiven ? collectedInDisplay : '-',
      `₹${parseFloat(record.previous_outstanding).toFixed(2)}`,
      `₹${parseFloat(record.new_outstanding).toFixed(2)}`,
      record.collected_by_name || 'Unknown'
    ];
  });

  // Add transaction table
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Date & Time', 'Type', 'Amount', 'Collected In', 'Prev. Balance', 'New Balance', 'User']],
    body: transactionData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 },
    didParseCell: function(data) {
      // Color code transaction types
      if (data.column.index === 2 && data.section === 'body') {
        const cellValue = data.cell.text[0];
        if (cellValue.startsWith('+')) {
          data.cell.styles.textColor = [220, 53, 69]; // Red for credit given
        } else if (cellValue.startsWith('-')) {
          data.cell.styles.textColor = [76, 175, 80]; // Green for credit collected
        }
      }
    }
  });

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `Credit_History_${creditHolder.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
