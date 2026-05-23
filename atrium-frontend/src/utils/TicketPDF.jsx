import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateTicketPDF = (booking) => {
    const doc = new jsPDF();

    // Setup Colors
    const primaryColor = [15, 23, 42]; // Dark Slate
    const accentColor = [37, 99, 235];  // Blue

    // --- HEADER SECTION ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("ATRIUM TRAVEL & TOURS", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text("Official E-Ticket & Booking Confirmation", 105, 30, { align: 'center' });

    // --- BOOKING DETAILS ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`TICKET ID: ATRIUM-${booking.id}`, 20, 55);
    doc.text(`REFERENCE: ${booking.reference_number || 'VALIDATED'}`, 20, 60);
    doc.text(`DATE ISSUED: ${new Date().toLocaleDateString()}`, 145, 55);

    // --- TABLE GENERATION ---
    // Ginagamit natin dito ang direct function call para iwas Error
    const tableRows = [
        ['Passenger/Guest', booking.client_name || 'Valued Guest'],
        ['Service Booked', booking.item_name || 'Travel Service'],
        ['Travel Class', booking.travel_class || 'Standard'],
        ['Pax Count', `${booking.adult_count} Adult, ${booking.children_count} Child`],
    ];

    // Kung hotel booking, dagdag natin ang stay details
    if (booking.check_in) {
        tableRows.push(['Check-In Date', booking.check_in]);
        tableRows.push(['Check-Out Date', booking.check_out]);
        tableRows.push(['Total Stay', `${booking.nights} Night(s)`]);
    }

    tableRows.push(['Total Amount Paid', `PHP ${parseFloat(booking.total_price).toLocaleString()}`]);

    autoTable(doc, {
        startY: 70,
        head: [['Category', 'Information']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: accentColor },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    // --- FOOTER / REMINDERS ---
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    doc.text("IMPORTANT REMINDERS:", 20, finalY);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("1. Present this digital ticket and a valid Government ID upon check-in.", 20, finalY + 7);
    doc.text("2. For flights, please be at the airport 3 hours before departure.", 20, finalY + 12);
    doc.text("3. This ticket is generated automatically and serves as proof of payment.", 20, finalY + 17);

    // QR Placeholder Box
    doc.setDrawColor(200);
    doc.rect(155, finalY - 5, 35, 35);
    doc.setFontSize(7);
    doc.text("VERIFIED SYSTEM", 160, finalY + 28);

    // SAVE THE FILE
    doc.save(`Atrium_Ticket_${booking.id}.pdf`);
};