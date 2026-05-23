import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminValidation = () => {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const token = localStorage.getItem('access_token');
  
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const fetchAllBookings = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/bookings/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Admin Fetch Error:", err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllBookings(); }, []);

  const getTotalPaxCount = (b) => {
    return (parseInt(b.adult_count) || 0) + (parseInt(b.children_count) || 0) + (parseInt(b.infant_count) || 0);
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setIsRejecting(false);
    setReason("");
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const rejectionReason = newStatus === 'REJECTED' ? reason : "";
    if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      await axios.patch(`http://127.0.0.1:8000/api/bookings/${id}/validate/`, 
        { status: newStatus, rejection_reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Booking ${newStatus} successfully!`);
      closeModal();
      fetchAllBookings(); 
    } catch (err) {
      console.error("Update failed:", err.response?.data);
      alert("Error updating status.");
    }
  };

  const filteredBookings = bookings.filter(b => 
    filterStatus === 'ALL' ? true : b.status === filterStatus
  );

  if (loading) return <div style={{padding: '50px', textAlign: 'center', fontFamily: 'Inter, sans-serif'}}>Loading Secure Portal...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: '"Inter", sans-serif', backgroundColor: '#f4f7fe', minHeight: '100vh' }}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
          <div>
            <h1 style={{ color: '#0f172a', margin: 0, fontWeight: '900', letterSpacing: '-1px' }}>🛡️ Validation Center</h1>
            <p style={{color: '#64748b', margin: '5px 0 0 0', fontSize: '15px'}}>Review and manage pending traveler documentations.</p>
          </div>
          <div style={{ display: 'flex', background: '#fff', padding: '5px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.3s',
                  backgroundColor: filterStatus === status ? '#0f172a' : 'transparent',
                  color: filterStatus === status ? '#fff' : '#94a3b8',
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        
        <div style={s.tableContainer}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Traveler Info</th>
                <th style={s.th}>Service Details</th>
                <th style={s.th}>Pax</th>
                <th style={s.th}>Total Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? filteredBookings.map(b => (
                <tr key={b.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={{fontWeight: '700', color: '#1e293b'}}>{b.client_name || "Guest"}</div>
                    <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '3px'}}>REF: {b.reference_number || `#${b.id}`}</div>
                  </td>
                  <td style={s.td}>
                    <div style={{fontWeight: '600', color: '#334155'}}>{b.item_name}</div>
                  </td>
                  <td style={s.td}><span style={{background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '700'}}>{getTotalPaxCount(b)}</span></td>
                  <td style={{...s.td, fontWeight: '800', color: '#0f172a'}}>₱{parseFloat(b.total_price).toLocaleString()}</td>
                  <td style={s.td}>
                    <span style={{ 
                      padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900',
                      backgroundColor: b.status === 'PENDING' ? '#fef3c7' : b.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                      color: b.status === 'PENDING' ? '#92400e' : b.status === 'APPROVED' ? '#15803d' : '#b91c1c'
                    }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button onClick={() => setSelectedBooking(b)} style={s.viewBtn}>Review Record</button>
                  </td>
                </tr>
              )) : <tr><td colSpan="6" style={{textAlign: 'center', padding: '50px', color: '#94a3b8'}}>No records found in this category.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- AESTHETIC MASTER DETAIL MODAL --- */}
      {selectedBooking && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{...s.statusRibbon, 
              backgroundColor: selectedBooking.status === 'PENDING' ? '#fef3c7' : selectedBooking.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
              color: selectedBooking.status === 'PENDING' ? '#92400e' : selectedBooking.status === 'APPROVED' ? '#15803d' : '#b91c1c'
            }}>
              {selectedBooking.status} BOOKING RECORD
            </div>

            <div style={s.modalHeader}>
              <div>
                <h2 style={{margin: 0, color: '#0f172a', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px'}}>{selectedBooking.item_name}</h2>
                <p style={{margin: '5px 0 0 0', color: '#94a3b8', fontSize: '13px', fontWeight: '600'}}>TRANSACTION ID: <span style={{color: '#0f172a'}}>#ATR-{selectedBooking.id}</span></p>
              </div>
              <button style={s.closeBtn} onClick={closeModal}>&times;</button>
            </div>

            <div style={s.modalBody}>
              <div style={s.adminGrid}>
                <div style={s.infoCol}>
                  <div style={s.detailCard}>
                    <label style={s.label}>👤 Customer Identity</label>
                    <div style={s.dataValue}>{selectedBooking.client_name}</div>
                    <div style={s.subText}>Primary Booking Contact</div>
                  </div>

                  <div style={s.detailCard}>
                    <label style={s.label}>📅 Reservation Details</label>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                      <div>
                        <div style={s.dataValue}>{selectedBooking.reference_number || 'PENDING'}</div>
                        <div style={s.subText}>Reference No.</div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={s.dataValue}>{selectedBooking.travel_class || 'Standard'}</div>
                        <div style={s.subText}>Service Tier</div>
                      </div>
                    </div>
                    {selectedBooking.check_in && (
                      <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px'}}>
                         <div style={{fontSize: '14px', fontWeight: '700'}}>{selectedBooking.check_in} — {selectedBooking.check_out}</div>
                         <div style={s.subText}>Stay Duration ({selectedBooking.nights} Nights)</div>
                      </div>
                    )}
                  </div>

                  <div style={s.detailCard}>
                    <label style={s.label}>👥 Travelers</label>
                    <div style={{display: 'flex', gap: '25px'}}>
                      <div><span style={{fontSize: '18px'}}>👨</span> <strong style={{fontSize: '16px'}}>{selectedBooking.adult_count || 0}</strong> <span style={s.subText}>Adults</span></div>
                      <div><span style={{fontSize: '18px'}}>🧒</span> <strong style={{fontSize: '16px'}}>{selectedBooking.children_count || 0}</strong> <span style={s.subText}>Kids</span></div>
                    </div>
                  </div>
                </div>

                <div style={s.receiptCol}>
                  <label style={s.label}>📸 Receipt Verification</label>
                  <div style={s.imageWrapper} onClick={() => window.open(selectedBooking.receipt_image, '_blank')}>
                    {selectedBooking.receipt_image ? (
                      <img src={selectedBooking.receipt_image} alt="Receipt" style={s.receiptImg} />
                    ) : <div style={{padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px'}}>No Attachment Found</div>}
                  </div>
                  
                  <div style={s.priceTag}>
                    <div style={{fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px'}}>Amount to Verify</div>
                    <div style={{fontSize: '32px', fontWeight: '900', marginTop: '5px'}}>₱{parseFloat(selectedBooking.total_price).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              {/* ACTION FOOTER */}
<div style={s.modalActions}>
  {selectedBooking.status === 'PENDING' ? (
    <div style={s.buttonContainer}>
      {!isRejecting ? (
        <>
          <button
            style={s.approveBtn}
            onClick={() =>
              handleStatusUpdate(selectedBooking.id, 'APPROVED')
            }
          >
            Approve & Confirm
          </button>

          <button
            style={s.rejectBtn}
            onClick={() => setIsRejecting(true)}
          >
            Reject
          </button>
        </>
      ) : (
        <div style={{ width: '100%' }}>
          <label style={s.rejectLabel}>
            REJECTION NOTICE REQUIRED
          </label>

          <textarea
            style={s.textarea}
            placeholder="Type rejection reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div style={s.buttonRow}>
                        <button
                          style={s.confirmRejectBtn}
                          onClick={() =>
                            handleStatusUpdate(selectedBooking.id, 'REJECTED')
                          }
                        >
                          Confirm Rejection
                        </button>

            <button
              style={s.cancelBtn}
              onClick={() => setIsRejecting(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div style={s.finalizedText}>
      RECORD FINALIZED AS {selectedBooking.status}
    </div>
  )}
</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  // --- TABLE STYLES ---
  tableContainer: { background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thead: { background: '#f1f5f9' },
  th: { padding: '20px 24px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' },
  tr: { borderBottom: '1px solid #f8fafc', transition: '0.3s' },
  td: { padding: '20px 24px', fontSize: '14px', color: '#1e293b' },
  
  // Blue-themed Primary Button
  viewBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: '0.3s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' },

  // --- MODAL OVERLAY ---
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(12px)' },
  
  // --- MAIN MODAL ---
  modal: { background: '#fff', width: '95%', maxWidth: '880px', borderRadius: '32px', position: 'relative', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 50px 100px -20px rgba(15, 23, 42, 0.3)', border: '1px solid #e2e8f0' },
  
  // Status Header
  statusRibbon: { padding: '12px', fontSize: '10px', fontWeight: '900', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase' },
  
  modalHeader: { padding: '35px 45px 25px 45px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(to bottom, #f8faff, #fff)' },
  closeBtn: { background: '#eff6ff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '24px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  modalBody: { padding: '0 45px 45px 45px' },
  adminGrid: { display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '20px' },
  infoCol: { flex: 1.2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' },
  receiptCol: { flex: 0.8, minWidth: '280px' },

  // --- CARDS (Blue Accent) ---
  detailCard: { padding: '24px', borderRadius: '24px', background: '#fff', border: '1px solid #eef2ff', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.03)' },
  label: { fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '800', letterSpacing: '1px', marginBottom: '15px', display: 'block' },
  dataValue: { fontSize: '18px', fontWeight: '800', color: '#1e3a8a' }, // Deep Blue text
  subText: { fontSize: '12px', color: '#64748b', marginTop: '2px' },

  // --- RECEIPT & PRICE ---
  imageWrapper: { background: '#f0f7ff', borderRadius: '24px', padding: '15px', border: '2px dashed #bfdbfe', cursor: 'pointer' },
  receiptImg: { width: '100%', borderRadius: '18px', maxHeight: '420px', objectFit: 'contain' },
  
  // Pure Blue Price Tag
  priceTag: { marginTop: '20px', background: '#1e40af', color: '#fff', padding: '25px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(30, 64, 175, 0.25)' },

  // --- ACTION FOOTER ---
  modalActions: {
  marginTop: '35px',
  padding: '25px',
  background: '#f8faff',
  borderRadius: '28px',
  border: '1px solid #e0e7ff',
},

buttonRow: {
  display: 'flex',
  gap: '15px',
  width: '100%',
},
  approveBtn: {
  flex: 1,
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: '18px',
  borderRadius: '14px',
  fontWeight: '800',
  fontSize: '14px',
  cursor: 'pointer',
  boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
},

rejectBtn: {
  flex: 1,
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  padding: '18px',
  borderRadius: '14px',
  fontWeight: '800',
  fontSize: '14px',
  cursor: 'pointer',
},

rejectLabel: {
  fontSize: '11px',
  fontWeight: '900',
  color: '#ef4444',
  letterSpacing: '1px',
  display: 'block',
  marginBottom: '10px',
},

confirmRejectBtn: {
    flex: 1,
    padding: 14,
    background: "#b91c1c",   // 🔴 STRONG RED (requested)
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  },

cancelBtn: {
  flex: 1,
  background: '#e2e8f0',
  color: '#334155',
  border: 'none',
  padding: '18px',
  borderRadius: '14px',
  fontWeight: '800',
  fontSize: '14px',
  cursor: 'pointer',
},

buttonContainer: {
  display: 'flex',
  gap: '15px',
  width: '100%',
  marginTop: '10px',
},
  textarea: {
  width: '100%',
  minHeight: '120px',
  padding: '15px',
  borderRadius: '16px',
  border: '2px solid #dbeafe',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '10px',
},

finalizedText: {
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '1px',
},

};

export default AdminValidation;