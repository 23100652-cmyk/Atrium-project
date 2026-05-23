import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HotelList = ({ role, search }) => {
  const [hotels, setHotels] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- BOOKING STATES ---
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [guestCount, setGuestCount] = useState(1);

  const initialFormState = {
    name: '',
    location: '',
    description: '',
    room_type: '',
    room_availability: '',
    rate_per_night: '',
    image_url: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // LOGIC: Define permissions
  const token = localStorage.getItem('access_token');
  const isStaff = role === 'admin' || role === 'operator' || role === 'consultant';
  const canManage = role === 'admin' || role === 'operator';
  const isLoggedUser = !!token && role === 'client';

  useEffect(() => {
    fetchHotels();
  }, [token]);

  const fetchHotels = async () => {
    try {
      // Only attach headers if token exists to avoid 401 on public views
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get('http://127.0.0.1:8000/api/hotels/', config);
      setHotels(res.data);
    } catch (err) {
      console.error("Error fetching hotels:", err);
      // Fallback for failed auth but public access
      if (err.response?.status === 401) {
        const res = await axios.get('http://127.0.0.1:8000/api/hotels/');
        setHotels(res.data);
      }
    }
  };

  // --- CALCULATION LOGIC ---
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  const nights = calculateNights();
  const totalPrice = selectedItem ? parseFloat(selectedItem.rate_per_night) * (nights || 1) : 0;

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (selectedItem?.id) {
        await axios.put(`http://127.0.0.1:8000/api/hotels/${selectedItem.id}/`, formData, config);
        alert("Hotel updated successfully!");
      } else {
        await axios.post('http://127.0.0.1:8000/api/hotels/', formData, config);
        alert("New hotel added!");
      }
      setShowAddEditModal(false);
      fetchHotels();
    } catch (err) {
      alert("Action failed: Check permissions or fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this hotel?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/hotels/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchHotels();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (nights <= 0) return alert("Please select valid Check-in and Check-out dates.");
    if (!receipt) return alert("Please upload a payment receipt!");
    setIsSubmitting(true);

    const bookingData = new FormData();
    bookingData.append('hotel', selectedItem.id);
    bookingData.append('check_in', checkIn);   
    bookingData.append('check_out', checkOut); 
    bookingData.append('nights', nights);
    bookingData.append('total_price', totalPrice);
    bookingData.append('status', 'PENDING');
    bookingData.append('item_name', selectedItem.name);
    bookingData.append('reference_number', refNumber);
    bookingData.append('guest_count', guestCount);
    bookingData.append('receipt_image', receipt);

    try {
      await axios.post('http://127.0.0.1:8000/api/bookings/', bookingData, {
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data' 
        }
      });
      alert(`🏨 Booking request for "${selectedItem.name}" sent!`);
      setShowPayment(false);
      // Reset fields
      setReceipt(null);
      setRefNumber('');
      setCheckIn('');
      setCheckOut('');
    } catch (err) {
      alert("Booking failed. Check backend endpoint for 'hotel' bookings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHotels = hotels.filter(h => {
    const term = search?.toLowerCase() || '';
    return h.name?.toLowerCase().includes(term) || h.location?.toLowerCase().includes(term);
  });

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>🏨 Hotels</h2>
        {canManage && (
          <button style={s.addBtn} onClick={() => { setSelectedItem(null); setFormData(initialFormState); setShowAddEditModal(true); }}>
            + Add Hotel
          </button>
        )}
      </div>

      <div style={s.list}>
        {filteredHotels.length > 0 ? (
          filteredHotels.map(h => (
            <div key={h.id} style={s.card}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setSelectedItem(h); setShowDetails(true); }}>
                <h3 style={s.itemName}>{h.name}</h3>
                <p style={s.subText}>📍 {h.location} • <span style={s.priceTag}>₱{parseFloat(h.rate_per_night).toLocaleString()}/night</span></p>
              </div>
              <div style={s.btnGroup}>
                {isLoggedUser && (
                  <button style={s.bookBtn} onClick={() => { setSelectedItem(h); setShowPayment(true); }}>⚡ Book</button>
                )}
                {canManage && (
                  <>
                    <button style={s.editBtn} onClick={() => { setSelectedItem(h); setFormData(h); setShowAddEditModal(true); }}>✏️ Edit</button>
                    <button style={s.deleteBtn} onClick={() => handleDelete(h.id)}>🗑️</button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={s.emptyMsg}>No hotels matching your search.</p>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. DETAILS MODAL */}
      {showDetails && (
        <div style={s.overlay} onClick={() => setShowDetails(false)}>
          <div style={{...s.modal, maxWidth: '500px'}} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <h2 style={{...s.modalTitle, marginBottom: '5px'}}>{selectedItem?.name}</h2>
                <p style={{color: '#64748b', fontSize: '14px', margin: 0}}>📍 {selectedItem?.location}</p>
              </div>
              <div style={{textAlign: 'right'}}>
                <span style={{...s.priceTag, fontSize: '20px'}}>₱{parseFloat(selectedItem?.rate_per_night || 0).toLocaleString()}</span>
                <p style={{fontSize: '12px', color: '#64748b', margin: 0}}>per night</p>
              </div>
            </div>
            <hr style={s.hr} />
            <div style={s.detailsGrid}>
              <div style={s.infoBox}>
                <span style={s.infoLabel}>ROOM TYPE</span>
                <span style={s.infoValue}>{selectedItem?.room_type || 'Standard'}</span>
              </div>
              <div style={s.infoBox}>
                <span style={s.infoLabel}>AVAILABILITY</span>
                <span style={{...s.infoValue, color: selectedItem?.room_availability > 0 ? '#10b981' : '#ef4444'}}>
                  {selectedItem?.room_availability} Rooms Left
                </span>
              </div>
            </div>
            <div style={{marginTop: '20px'}}>
              <h4 style={s.sectionHeader}>About this Hotel</h4>
              <p style={s.descriptionText}>{selectedItem?.description || "Experience comfort and luxury in the heart of the city."}</p>
            </div>
            {selectedItem?.image_url && (
              <img src={selectedItem.image_url} alt="Hotel" style={{width: '100%', height: '180px', borderRadius: '12px', objectFit: 'cover', marginTop: '15px'}} />
            )}
            <div style={{...s.modalActions, marginTop: '25px'}}>
              <button onClick={() => setShowDetails(false)} style={s.cancelBtn}>Close</button>
              {isLoggedUser && <button style={s.confirmBtn} onClick={() => { setShowDetails(false); setShowPayment(true); }}>Book Now</button>}
            </div>
          </div>
        </div>
      )}

      {/* 2. PAYMENT MODAL */}
      {showPayment && (
        <div style={s.overlay} onClick={() => setShowPayment(false)}>
          <div style={{...s.modal, maxWidth: '480px'}} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={s.modalTitle}>Confirm Booking</h3>
              <span style={s.badge}>Hotel ID: #{selectedItem?.id}</span>
            </div>

            <div style={s.bookingSummary}>
              <p style={{margin: '0 0 5px 0', fontWeight: 'bold', color: '#1e293b'}}>{selectedItem?.name}</p>
              <div style={s.summaryRow}>
                <span>Rate per Night:</span>
                <span style={{fontWeight: '600'}}>₱{parseFloat(selectedItem?.rate_per_night || 0).toLocaleString()}</span>
              </div>
            </div>

            <form style={s.form} onSubmit={handleBookingSubmit}>
              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label style={s.infoLabel}>CHECK-IN</label>
                  <input
  type="date"
  style={s.input}
  value={checkIn}
  min={new Date().toISOString().split("T")[0]}   // 🔴 disables past dates
  onChange={e => setCheckIn(e.target.value)}
  required
/>
                </div>
                <div style={{flex: 1}}>
                  <label style={s.infoLabel}>CHECK-OUT</label>
                  <input
  type="date"
  style={s.input}
  value={checkOut}
  min={checkIn || new Date().toISOString().split("T")[0]} // 🔴 depends on check-in
  onChange={e => setCheckOut(e.target.value)}
  required
/>
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label style={s.infoLabel}>GUESTS</label>
                  <input type="number" min="1" style={s.input} value={guestCount} onChange={e => setGuestCount(e.target.value)} />
                </div>
                <div style={{flex: 1.5}}>
                  <label style={s.infoLabel}>GCASH/REF #</label>
                  <input placeholder="Ref No." style={s.input} value={refNumber} onChange={e => setRefNumber(e.target.value)} required />
                </div>
              </div>

              <div style={s.totalArea}>
                <div style={s.summaryRow}>
                  <span>Duration:</span>
                  <span style={{fontWeight: '700', color: nights > 0 ? '#1e293b' : '#ef4444'}}>
                    {nights} {nights === 1 ? 'Night' : 'Nights'}
                  </span>
                </div>
                <div style={{...s.summaryRow, marginTop: '5px'}}>
                  <span style={{fontSize: '16px', fontWeight: 'bold'}}>Grand Total:</span>
                  <span style={{fontSize: '22px', fontWeight: '800', color: '#2563eb'}}>₱{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div style={s.uploadSection}>
                <label style={s.infoLabel}>PROOF OF PAYMENT (RECEIPT)</label>
                <input type="file" accept="image/*" required onChange={(e) => setReceipt(e.target.files[0])} style={{fontSize: '12px', marginTop: '5px'}} />
              </div>

              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowPayment(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.confirmBtn} disabled={isSubmitting || (nights <= 0)}>
                  {isSubmitting ? 'Processing...' : 'Confirm & Pay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD / EDIT MODAL */}
{showAddEditModal && (
  <div style={s.overlay} onClick={() => setShowAddEditModal(false)}>
    <div
      style={{ ...s.modal, maxWidth: '520px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div style={{ marginBottom: '15px' }}>
        <h3 style={s.modalTitle}>
          {selectedItem ? '✏️ Edit Hotel' : '➕ Add Hotel'}
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          Fill in the hotel details below
        </p>
      </div>

      <form onSubmit={handleAdminSubmit} style={s.form}>

        {/* BASIC INFO */}
        <div style={modalSection}>
          <h4 style={modalSectionTitle}>Basic Information</h4>

          <label style={modalLabel}>Hotel Name *</label>
          <input
            placeholder="Enter hotel name"
            style={s.input}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />

          <label style={modalLabel}>Location *</label>
          <input
            placeholder="Enter location"
            style={s.input}
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            required
          />

          <label style={modalLabel}>Description</label>
          <textarea
            placeholder="Hotel description"
            style={{ ...s.input, height: 80, resize: 'none' }}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        {/* ROOM INFO */}
        <div style={modalSection}>
          <h4 style={modalSectionTitle}>Room Details</h4>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={modalLabel}>Room Type</label>
              <input
                placeholder="e.g. Deluxe"
                style={s.input}
                value={formData.room_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    room_type: e.target.value,
                  })
                }
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={modalLabel}>Available Rooms *</label>
              <input
                type="number"
                min="0"
                style={s.input}
                value={formData.room_availability}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    room_availability: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          <label style={modalLabel}>Rate per Night (₱) *</label>
          <input
            type="number"
            min="0"
            style={s.input}
            value={formData.rate_per_night}
            onChange={(e) =>
              setFormData({
                ...formData,
                rate_per_night: e.target.value,
              })
            }
            required
          />
        </div>

        {/* MEDIA */}
        <div style={modalSection}>
          <label style={modalLabel}>Image URL</label>
          <input
            placeholder="https://image-url.jpg"
            style={s.input}
            value={formData.image_url}
            onChange={(e) =>
              setFormData({
                ...formData,
                image_url: e.target.value,
              })
            }
          />

          {formData.image_url && (
            <img
              src={formData.image_url}
              alt="preview"
              style={imagePreview}
            />
          )}
        </div>

        {/* ACTIONS */}
        <div style={s.modalActions}>
          <button
            type="button"
            onClick={() => setShowAddEditModal(false)}
            style={s.cancelBtn}
          >
            Cancel
          </button>

          <button type="submit" style={s.confirmBtn}>
            {isSubmitting
              ? 'Saving...'
              : selectedItem
              ? 'Update'
              : 'Create'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
};

const modalSection = {
  background: '#f8fafc',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  marginBottom: 10,
};

const modalSectionTitle = {
  fontSize: 11,
  fontWeight: '800',
  color: '#334155',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const modalLabel = {
  fontSize: 11,
  fontWeight: '700',
  color: '#64748b',
  display: 'block',
  marginTop: 8,
  marginBottom: 4,
};

const imagePreview = {
  width: '100%',
  height: 150,
  objectFit: 'cover',
  borderRadius: 10,
  marginTop: 10,
  border: '1px solid #e2e8f0',
};

const s = {
  container: { padding: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, color: '#1e293b' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' },
  itemName: { margin: 0, fontSize: '17px', fontWeight: '600' },
  subText: { fontSize: '14px', color: '#64748b', margin: '5px 0' },
  priceTag: { color: '#2563eb', fontWeight: 'bold' },
  btnGroup: { display: 'flex', gap: '8px' },
  addBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  bookBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  editBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#475569' },
  deleteBtn: { background: '#fff', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modal: { background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { marginTop: 0, color: '#1e293b', fontSize: '20px', fontWeight: '800' },
  hr: { border: '0', borderTop: '1px solid #e2e8f0', margin: '15px 0' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '15px' },
  infoBox: { background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
  infoLabel: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '4px', letterSpacing: '0.05em' },
  infoValue: { fontSize: '15px', fontWeight: '600', color: '#1e293b' },
  sectionHeader: { fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '8px' },
  descriptionText: { color: '#475569', fontSize: '14px', lineHeight: '1.6', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', outline: 'none' },
  modalActions: { display: 'flex', gap: '10px' },
  confirmBtn: { flex: 2, background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { flex: 1, background: '#f1f5f9', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', color: '#475569' },
  bookingSummary: { background: '#f0f7ff', padding: '15px', borderRadius: '12px', border: '1px solid #dbeafe', marginBottom: '15px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' },
  totalArea: { marginTop: '10px', paddingTop: '15px', borderTop: '2px dashed #e2e8f0' },
  uploadSection: { background: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px dashed #3b82f6' },
  badge: { fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#64748b', fontWeight: 'bold' },
  emptyMsg: { textAlign: 'center', color: '#64748b', padding: '20px' }
};

export default HotelList;