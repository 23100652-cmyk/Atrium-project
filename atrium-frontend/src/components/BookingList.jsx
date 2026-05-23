import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { generateTicketPDF } from '../utils/TicketPDF'; 

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // --- ROLE LOGIC ---
  const getRole = () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const directRole = localStorage.getItem('user_role') || localStorage.getItem('role');
    return (storedUser.role || directRole || 'client').toLowerCase();
  };

  const role = getRole();
  const isAdmin = role === 'admin' || role === 'operator';

  useEffect(() => {
    fetchBookings();
  }, [role, isAdmin]);

  const fetchBookings = () => {
    const token = localStorage.getItem('access_token');
    axios.get('http://127.0.0.1:8000/api/bookings/', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setBookings(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error("Fetch error:", err);
      setLoading(false);
    });
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const token = localStorage.getItem('access_token');
    let reason = "";

    // Kung i-re-reject, mag-prompt para sa reason
    if (newStatus === 'REJECTED') {
      reason = prompt("Dahilan ng Rejection (Hal: Malabo ang resibo, Fully booked):");
      if (reason === null) return; // User clicked Cancel
      if (reason.trim() === "") return alert("Kailangan ng dahilan!");
    }

    try {
      await axios.patch(`http://127.0.0.1:8000/api/bookings/${id}/validate/`, 
        { 
          status: newStatus,
          rejection_reason: reason 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Booking ${newStatus} successfully!`);
      setSelectedBooking(null);
      fetchBookings(); 
    } catch (err) {
      console.error("Update failed:", err.response?.data);
      alert("Error updating status.");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'APPROVED': return { color: '#10b981', background: '#ecfdf5' };
      case 'PENDING': return { color: '#f59e0b', background: '#fffbeb' };
      case 'REJECTED': return { color: '#ef4444', background: '#fef2f2' };
      default: return { color: '#64748b', background: '#f8fafc' };
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '50px'}}>Loading records...</div>;

  return (
    <div style={s.container}>
      <h2 style={s.title}>{isAdmin ? "🛡️ Booking Management" : "📅 My Bookings"}</h2>
      
      <div style={s.list}>
        {bookings.length === 0 ? (
          <div style={s.emptyState}>No bookings found.</div>
        ) : (
          bookings.map(b => (
            <div 
              key={b.id} 
              style={s.card} 
              onClick={() => setSelectedBooking(b)}
            >
              <div style={s.mainInfo}>
                <h3 style={s.itemName}>
                  {b.item_name || "Travel Service"}
                </h3>
                <p style={s.subText}>
                  {isAdmin ? `Customer: ${b.client_name}` : `Ref #${b.id}`} • {new Date(b.booking_date).toLocaleDateString()}
                </p>
                <div style={s.miniPax}>
                    👥 Pax: {b.total_pax} • {b.travel_class}
                </div>
              </div>

              <div style={s.statusSection}>
                <div style={s.price}>₱{parseFloat(b.total_price).toLocaleString()}</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end'}}>
                   {!isAdmin && b.status === 'APPROVED' && (
                      <button 
                        style={s.miniDownloadBtn}
                        onClick={(e) => {
                           e.stopPropagation();
                           generateTicketPDF(b);
                        }}
                      >
                        📄 Ticket
                      </button>
                   )}
                   <span style={{...s.statusBadge, ...getStatusStyle(b.status)}}>
                    {b.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL FOR DETAILS & ACTIONS --- */}
      {selectedBooking && (
        <div style={s.overlay} onClick={() => setSelectedBooking(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={{margin: 0}}>🔍 Review Booking Details</h3>
              <button style={s.closeBtn} onClick={() => setSelectedBooking(null)}>&times;</button>
            </div>

            <div style={s.adminGrid}>
                <div style={s.infoCol}>
                  <div style={s.section}>
                    <label style={s.label}>Client Information</label>
                    <p style={s.val}>{selectedBooking.client_name}</p>
                  </div>

                  <div style={s.section}>
                    <label style={s.label}>Travel Details</label>
                    <div style={s.paxGrid}>
                      <div>Service: <strong>{selectedBooking.item_name}</strong></div>
                      {selectedBooking.check_in && (
                        <div style={{marginTop: '5px'}}>
                            📅 {selectedBooking.check_in} to {selectedBooking.check_out} ({selectedBooking.nights} nights)
                        </div>
                      )}
                      <div style={{marginTop: '5px'}}>
                          👨 Adults: {selectedBooking.adult_count} | 🧒 Child: {selectedBooking.children_count}
                      </div>
                    </div>
                  </div>

                  {/* REJECTION REASON DISPLAY */}
                  {selectedBooking.status === 'REJECTED' && selectedBooking.rejection_reason && (
                    <div style={s.rejectionSection}>
                      <label style={{...s.label, color: '#ef4444'}}>❌ Rejection Reason</label>
                      <div style={s.rejectionBox}>
                        {selectedBooking.rejection_reason}
                      </div>
                    </div>
                  )}

                  <div style={s.section}>
                    <label style={s.label}>Payment Info</label>
                    <p style={s.refCode}>REF: {selectedBooking.reference_number || 'PENDING'}</p>
                    <p style={s.priceBig}>
                        ₱{parseFloat(selectedBooking.total_price).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div style={s.receiptCol}>
                  <label style={s.label}>Proof of Payment</label>
                  {selectedBooking.receipt_image ? (
                    <img 
                      src={selectedBooking.receipt_image} 
                      alt="Receipt" 
                      style={s.receiptImg} 
                      onClick={() => window.open(selectedBooking.receipt_image, '_blank')}
                    />
                  ) : (
                    <div style={s.noImg}>⚠️ No Receipt Uploaded</div>
                  )}
                </div>
            </div>

            {/* ACTION FOOTER */}
            <div style={s.modalActions}>
                {isAdmin && selectedBooking.status === 'PENDING' ? (
                  <>
                    <button style={s.approveBtn} onClick={() => handleStatusUpdate(selectedBooking.id, 'APPROVED')}>
                      ✅ Confirm & Deduct Inventory
                    </button>
                    <button style={s.rejectBtn} onClick={() => handleStatusUpdate(selectedBooking.id, 'REJECTED')}>
                      ❌ Reject Booking
                    </button>
                  </>
                ) : !isAdmin && selectedBooking.status === 'APPROVED' ? (
                  <button style={s.ticketBtn} onClick={() => generateTicketPDF(selectedBooking)}>
                    📥 Download Official E-Ticket
                  </button>
                ) : (
                   <p style={{color: '#64748b', fontSize: '13px', textAlign: 'center', width: '100%'}}>
                     Status: {selectedBooking.status} - No further actions required.
                   </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: { padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', fontFamily: '"Inter", sans-serif' },
  title: { color: '#1e3a8a', marginBottom: '30px', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },

  // --- TICKET STYLE CARD ---
  card: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '24px', background: '#fff', borderRadius: '20px', 
    border: '1px solid #eef2ff', cursor: 'pointer', transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.04)',
    position: 'relative', overflow: 'hidden'
  },
  // Hover effect added via logic or global CSS is better, but styling-wise:
  itemName: { margin: '0 0 6px 0', fontSize: '19px', color: '#1e3a8a', fontWeight: '800' },
  subText: { fontSize: '14px', color: '#64748b', fontWeight: '500' },
  miniPax: { 
    fontSize: '12px', color: '#2563eb', marginTop: '8px', 
    background: '#eff6ff', display: 'inline-block', padding: '4px 12px', borderRadius: '8px', fontWeight: '700' 
  },

  statusSection: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' },
  price: { fontSize: '20px', fontWeight: '900', color: '#1e3a8a' },
  statusBadge: { padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' },
  
  miniDownloadBtn: {
    padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', 
    borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)', transition: '0.2s'
  },

  // --- PREMIUM MODAL ---
  overlay: { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', 
    alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)'
  },
  modal: { 
    background: '#fff', width: '95%', maxWidth: '800px', borderRadius: '32px', 
    position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.2)'
  },
  modalHeader: { 
    padding: '30px 40px', display: 'flex', justifyContent: 'space-between', 
    alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #f8faff, #fff)' 
  },
  closeBtn: { background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', color: '#64748b' },
  
  adminGrid: { display: 'flex', gap: '30px', padding: '30px 40px', flexWrap: 'wrap' },
  infoCol: { flex: 1.2, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' },
  receiptCol: { flex: 0.8, minWidth: '250px' },

  section: { 
    padding: '20px', borderRadius: '20px', background: '#fff', 
    border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' 
  },
  label: { fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' },
  val: { fontSize: '18px', fontWeight: '800', color: '#1e3a8a', margin: 0 },
  
  paxGrid: { 
    fontSize: '14px', color: '#475569', lineHeight: '1.6', 
    padding: '12px', background: '#f8faff', borderRadius: '12px', border: '1px solid #eef2ff' 
  },
  
  refCode: { 
    fontSize: '13px', fontWeight: '800', color: '#2563eb', 
    background: '#eff6ff', padding: '6px 12px', borderRadius: '8px', 
    display: 'inline-block', fontFamily: 'monospace' 
  },
  priceBig: { fontSize: '32px', fontWeight: '900', color: '#1e3a8a', marginTop: '10px', letterSpacing: '-1px' },
  
  receiptImg: { 
    width: '100%', borderRadius: '20px', cursor: 'pointer', 
    border: '2px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', transition: '0.3s' 
  },
  noImg: { 
    padding: '60px 20px', background: '#f8fafc', borderRadius: '20px', 
    color: '#94a3b8', fontSize: '13px', textAlign: 'center', border: '2px dashed #e2e8f0' 
  },

  // --- FOOTER ACTIONS ---
  modalActions: { 
    display: 'flex', gap: '15px', padding: '30px 40px', 
    background: '#f8faff', borderTop: '1px solid #eef2ff', borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' 
  },
  ticketBtn: { 
    flex: 1, background: '#2563eb', color: '#fff', border: 'none', 
    padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', 
    cursor: 'pointer', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)' 
  },
  
  // Rejection styling
  rejectionSection: {
    padding: '20px', background: '#fff1f2', borderRadius: '20px', border: '1px solid #ffe4e6'
  },
  rejectionBox: { fontSize: '14px', color: '#be123c', fontWeight: '700', marginTop: '5px', lineHeight: '1.5' },
  
  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#94a3b8', fontSize: '16px', fontWeight: '500' }
};

export default BookingList;