import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const TourList = ({ role, search }) => {
  const [tours, setTours] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- BOOKING STATES ---
  const [pax, setPax] = useState({ adult: 1, children: 0, infant: 0 });
  const [travelClass, setTravelClass] = useState('Economy');
  const [refNumber, setRefNumber] = useState('');

  const initialFormState = {
    title: '', description: '', itinerary: '', duration_days: '',
    price: '', max_slots: '', available_slots: '', image_url: null,
    inclusion: '', exclusion: '', start_date: '', end_date: '',
  };

  const TOUR_TEMPLATES = {
  "Boracay Escape": {
    price: 12000,
    duration_days: 3,
    max_slots: 20,
    start_date: "",
    end_date: "",
    description: "Relax in Boracay's white sand beaches and nightlife.",
    itinerary: "Day 1: Arrival\nDay 2: Island hopping\nDay 3: Departure",
    inclusion: "Hotel, Breakfast, Island hopping",
    exclusion: "Airfare, Personal expenses",
    image_url: null
  },

  "Palawan Adventure": {
    price: 18000,
    duration_days: 4,
    max_slots: 15,
    start_date: "",
    end_date: "",
    description: "Explore lagoons, caves, and crystal waters of Palawan.",
    itinerary: "Day 1: Arrival\nDay 2: Underground River\nDay 3: Island hopping\nDay 4: Departure",
    inclusion: "Hotel, Tours, Transfers",
    exclusion: "Flights, Meals not stated",
    image_url: null
  },

  "Baguio Chill Tour": {
    price: 8000,
    duration_days: 2,
    max_slots: 30,
    start_date: "",
    end_date: "",
    description: "Cold breeze, pine trees, and relaxing mountain vibes.",
    itinerary: "Day 1: City tour\nDay 2: Strawberry farm + Departure",
    inclusion: "Hotel, City tour",
    exclusion: "Meals, Personal expenses",
    image_url: null
  }
};



  const [formData, setFormData] = useState(initialFormState);

  const isAdmin = role === 'admin';
  const isStaff = role === 'operator';

  useEffect(() => { 
    fetchTours(); 
  }, []);

  // SAFE HEADER LOGIC: Prevents sending "Bearer null" which causes 401
  const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token || token === "null" || token === "undefined") return {};
    return { Authorization: `Bearer ${token}` };
  };

  const fetchTours = () => {
    const headers = getHeaders();
    const config = Object.keys(headers).length > 0 ? { headers } : {};

    axios.get('http://127.0.0.1:8000/api/tours/', config)
      .then(res => setTours(res.data))
      .catch(err => {
        console.error("Fetch error:", err);
        if (err.response?.status === 401) {
            // If 401 happens here, the token is likely expired
            localStorage.removeItem('access_token');
        }
      });
  };

  const handleTourTitleChange = (value) => {
  const template = TOUR_TEMPLATES[value];

  setFormData(prev => ({
    ...prev,
    title: value,
    ...(template || {})
  }));
};

  // --- MODAL CONTROL ---
  const closeBooking = () => {
    setShowPayment(false);
    setPax({ adult: 1, children: 0, infant: 0 });
    setRefNumber('');
    setReceipt(null);
    setTravelClass('Economy');
    setSelectedItem(null);
  };

  const closeAdminModal = () => {
    setShowAddEditModal(false);
    setFormData(initialFormState);
    setSelectedItem(null);
  };

  // --- SUBMISSION LOGIC ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const adminData = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) {
        // If editing and image_url is a string (URL), don't re-upload it unless changed
        if (key === 'image_url' && typeof formData[key] === 'string') return;
        adminData.append(key, formData[key]);
      }
    });

    try {
      const url = selectedItem 
        ? `http://127.0.0.1:8000/api/tours/${selectedItem.id}/` 
        : 'http://127.0.0.1:8000/api/tours/';
      
      const method = selectedItem ? 'put' : 'post';

      await axios({
        method: method,
        url: url,
        data: adminData,
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
      });

      closeAdminModal();
      fetchTours();
    } catch (err) { 
      alert("Error saving package. Ensure you are logged in as an Operator."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tour?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/tours/${id}/`, { headers: getHeaders() });
      fetchTours();
    } catch (err) { alert("Delete failed."); }
  };

  // --- CALCULATIONS ---
  const totalPax = parseInt(pax.adult) + parseInt(pax.children) + parseInt(pax.infant);
  
  const totalPrice = useMemo(() => {
    if (!selectedItem) return 0;
    const base = selectedItem.price * (parseInt(pax.adult) + parseInt(pax.children));
    const multipliers = { 'Economy': 1, 'Premium': 1.2, 'Business': 1.5 };
    return base * (multipliers[travelClass] || 1);
  }, [selectedItem, pax, travelClass]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!receipt) return alert("Please upload a payment receipt!");
    
    setIsSubmitting(true);
    const bookingFormData = new FormData();
    bookingFormData.append('tour', selectedItem.id);
    bookingFormData.append('adult_count', pax.adult);
    bookingFormData.append('children_count', pax.children);
    bookingFormData.append('infant_count', pax.infant);
    bookingFormData.append('total_pax', totalPax);
    bookingFormData.append('travel_class', travelClass);
    bookingFormData.append('reference_number', refNumber);
    bookingFormData.append('total_price', totalPrice);
    bookingFormData.append('status', 'PENDING');
    bookingFormData.append('receipt_image', receipt);

    try {
      await axios.post('http://127.0.0.1:8000/api/bookings/', bookingFormData, {
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      alert(`🎉 Reservation sent for ${selectedItem.title}!`);
      closeBooking();
    } catch (err) { 
        alert("Booking error. Make sure you are logged in."); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const filteredTours = useMemo(() => {
    const term = search?.toLowerCase() || '';
    return tours.filter(t => 
        t.title?.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term)
    );
  }, [tours, search]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>🎒 Tours</h2>
        {(isAdmin || isStaff) && (
          <button style={s.addBtn} onClick={() => { setSelectedItem(null); setFormData(initialFormState); setShowAddEditModal(true); }}>
            + Create Package
          </button>
        )}
      </div>

      <div style={s.list}>
        {filteredTours.map(t => (
          <div key={t.id} style={s.card}>
            <div style={{flex: 1, cursor: 'pointer'}} onClick={() => { setSelectedItem(t); setShowDetails(true); }}>
              <h3 style={s.itemName}>{t.title}</h3>
              <p style={s.subText}>📅 {t.duration_days} Days • <span style={s.priceTag}>₱{Number(t.price).toLocaleString()}</span></p>
            </div>
            <div style={s.btnGroup}>
              {role === 'client' && <button style={s.bookBtn} onClick={() => { setSelectedItem(t); setShowPayment(true); }}>✨ Reserve</button>}
              {(isAdmin || isStaff) && <button style={s.editBtn} onClick={() => { setSelectedItem(t); setFormData(t); setShowAddEditModal(true); }}>✏️ Edit</button>}
              {(isAdmin || isStaff) && <button style={s.deleteBtn} onClick={() => handleDelete(t.id)}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>

      {/* 1. DETAILS MODAL */}
      {showDetails && (
        <div style={s.overlay} onClick={() => setShowDetails(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{selectedItem?.title}</h2>
            <div style={s.detailsGrid}>
                <div style={s.infoBox}><span style={s.infoLabel}>DURATION</span><span style={s.infoValue}>{selectedItem?.duration_days} Days</span></div>
                <div style={s.infoBox}><span style={s.infoLabel}>PRICE</span><span style={s.infoValue}>₱{selectedItem?.price.toLocaleString()}</span></div>
                <div style={s.infoBox}><span style={s.infoLabel}>DATES</span><span style={s.infoValue}>{selectedItem?.start_date} / {selectedItem?.end_date}</span></div>
                <div style={s.infoBox}><span style={s.infoLabel}>AVAILABILITY</span><span style={s.infoValue}>{selectedItem?.available_slots} Slots</span></div>
            </div>
            <hr style={s.hr}/>
            <p style={s.sectionHeader}>Description</p>
            <p style={s.descriptionText}>{selectedItem?.description}</p>
            <p style={s.sectionHeader}>Itinerary</p>
            <p style={s.descriptionText}>{selectedItem?.itinerary}</p>
            <div style={s.listSection}>
                <div><strong>Inclusions:</strong> <p style={{...s.subText, fontSize: '13px'}}>{selectedItem?.inclusion}</p></div>
                <div><strong>Exclusions:</strong> <p style={{...s.subText, fontSize: '13px'}}>{selectedItem?.exclusion}</p></div>
            </div>
            <div style={s.modalActions}>
                <button onClick={() => setShowDetails(false)} style={s.cancelBtn}>Close</button>
                {role === 'client' && <button style={s.confirmBtn} onClick={() => { setShowDetails(false); setShowPayment(true); }}>Book This Tour</button>}
            </div>
          </div>
        </div>
      )}

      {/* 2. PAYMENT & BOOKING MODAL */}
      {showPayment && (
        <div style={s.overlay} onClick={closeBooking}>
          <div style={{...s.modal, maxWidth: '480px'}} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Confirm Booking</h3>
            <div style={s.bookingSummary}>
              <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#1e293b'}}>{selectedItem?.title}</p>
              <div style={s.summaryRow}>
                <span>Base Price:</span>
                <span>₱{selectedItem?.price.toLocaleString()} / person</span>
              </div>
            </div>

            <form style={s.form} onSubmit={handleBookingSubmit}>
              <div style={s.paxGrid}>
                <div style={s.paxBox}><label style={s.infoLabel}>ADULTS</label><input type="number" min="1" style={s.paxInput} value={pax.adult} onChange={e => setPax({...pax, adult: e.target.value})} /></div>
                <div style={s.paxBox}><label style={s.infoLabel}>CHILDREN</label><input type="number" min="0" style={s.paxInput} value={pax.children} onChange={e => setPax({...pax, children: e.target.value})} /></div>
                <div style={s.paxBox}><label style={s.infoLabel}>INFANTS</label><input type="number" min="0" style={s.paxInput} value={pax.infant} onChange={e => setPax({...pax, infant: e.target.value})} /></div>
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label style={s.infoLabel}>TRAVEL CLASS</label>
                  <select style={s.input} value={travelClass} onChange={e => setTravelClass(e.target.value)}>
                    <option value="Economy">Economy</option>
                    <option value="Premium">Premium (+20%)</option>
                    <option value="Business">Business (+50%)</option>
                  </select>
                </div>
                <div style={{flex: 1}}>
                  <label style={s.infoLabel}>REF #</label>
                  <input placeholder="Enter Ref No." style={s.input} value={refNumber} onChange={e => setRefNumber(e.target.value)} required />
                </div>
              </div>

              <div style={s.totalArea}>
                <div style={s.summaryRow}><span>Total Passengers:</span><span style={{fontWeight: '600'}}>{totalPax} Pax</span></div>
                <div style={s.summaryRow}><span style={{fontSize: '16px', fontWeight: 'bold'}}>Grand Total:</span><span style={{fontSize: '20px', fontWeight: '800', color: '#f97316'}}>₱{totalPrice.toLocaleString()}</span></div>
              </div>

              <div style={s.uploadSection}>
                <label style={s.infoLabel}>PROOF OF PAYMENT (RECEIPT)</label>
                <input type="file" accept="image/*" required onChange={(e) => setReceipt(e.target.files[0])} style={{fontSize: '12px', marginTop: '5px'}} />
              </div>

              <div style={s.modalActions}>
                <button type="button" onClick={closeBooking} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={{...s.confirmBtn, opacity: isSubmitting ? 0.6 : 1}} disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Confirm Reservation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD / EDIT MODAL (IMPROVED UI ONLY) */}
{showAddEditModal && (
  <div style={s.overlay} onClick={closeAdminModal}>
    <div
      style={{ ...s.modal, maxWidth: '650px' }}
      onClick={e => e.stopPropagation()}
    >
      <h3 style={s.modalTitle}>
        {selectedItem ? '✏️ Edit Tour Package' : '➕ Create New Tour Package'}
      </h3>

      <form onSubmit={handleAdminSubmit} style={s.form}>

        {/* BASIC INFO */}
        <div>
  <label style={s.infoLabel}>TOUR TITLE</label>

  <select
    style={s.input}
    value={formData.title}
    onChange={e => handleTourTitleChange(e.target.value)}
    required
  >
    <option value="">Select Tour Package</option>

    {Object.keys(TOUR_TEMPLATES).map(title => (
      <option key={title} value={title}>
        {title}
      </option>
    ))}
  </select>
</div>

        {/* PRICE + DURATION */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>PRICE (₱)</label>
            <input
              type="number"
              placeholder="0"
              style={s.input}
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>DURATION (DAYS)</label>
            <input
              type="number"
              placeholder="0"
              style={s.input}
              value={formData.duration_days}
              onChange={e => setFormData({ ...formData, duration_days: e.target.value })}
              required
            />
          </div>
        </div>

        {/* SLOTS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>MAX SLOTS</label>
            <input
              type="number"
              placeholder="0"
              style={s.input}
              value={formData.max_slots}
              onChange={e =>
                setFormData({
                  ...formData,
                  max_slots: e.target.value,
                  available_slots: e.target.value
                })
              }
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>AVAILABLE SLOTS</label>
            <input
              type="number"
              placeholder="0"
              style={s.input}
              value={formData.available_slots}
              onChange={e =>
                setFormData({ ...formData, available_slots: e.target.value })
              }
            />
          </div>
        </div>

        {/* DATES */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>START DATE</label>
            <input
              type="date"
              style={s.input}
              value={formData.start_date}
              onChange={e =>
                setFormData({ ...formData, start_date: e.target.value })
              }
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>END DATE</label>
            <input
              type="date"
              style={s.input}
              value={formData.end_date}
              min={formData.start_date || undefined}
              onChange={e =>
                setFormData({ ...formData, end_date: e.target.value })
              }
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label style={s.infoLabel}>DESCRIPTION</label>
          <textarea
            placeholder="Describe the tour..."
            style={{ ...s.input, height: '70px' }}
            value={formData.description}
            onChange={e =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        {/* ITINERARY */}
        <div>
          <label style={s.infoLabel}>ITINERARY</label>
          <textarea
            placeholder="Day 1: ... Day 2: ..."
            style={{ ...s.input, height: '70px' }}
            value={formData.itinerary}
            onChange={e =>
              setFormData({ ...formData, itinerary: e.target.value })
            }
          />
        </div>

        {/* INCLUSIONS / EXCLUSIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>INCLUSIONS</label>
            <textarea
              style={{ ...s.input, height: '60px' }}
              value={formData.inclusion}
              onChange={e =>
                setFormData({ ...formData, inclusion: e.target.value })
              }
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.infoLabel}>EXCLUSIONS</label>
            <textarea
              style={{ ...s.input, height: '60px' }}
              value={formData.exclusion}
              onChange={e =>
                setFormData({ ...formData, exclusion: e.target.value })
              }
            />
          </div>
        </div>

        {/* IMAGE */}
        <div>
          <label style={s.infoLabel}>TOUR IMAGE</label>
          <input
            type="file"
            accept="image/*"
            style={{ marginTop: '5px' }}
            onChange={e =>
              setFormData({ ...formData, image_url: e.target.files[0] })
            }
          />
        </div>

        {/* ACTIONS */}
        <div style={s.modalActions}>
          <button
            type="button"
            onClick={closeAdminModal}
            style={s.cancelBtn}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...s.confirmBtn,
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting
              ? 'Saving...'
              : selectedItem
              ? 'Update Package'
              : 'Create Package'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
};

// Styles remain the same (included in original code)
const s = {
  container: { padding: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, color: '#1e293b' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', transition: 'all 0.2s' },
  itemName: { margin: 0, fontSize: '17px', fontWeight: '600' },
  subText: { fontSize: '14px', color: '#64748b', margin: '5px 0' },
  priceTag: { color: '#f97316', fontWeight: 'bold' },
  btnGroup: { display: 'flex', gap: '8px' },
  addBtn: { background: '#f97316', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  bookBtn: { background: '#f97316', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  editBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' },
  deleteBtn: { background: '#fff', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modal: { background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { marginTop: 0, fontSize: '20px', fontWeight: '800' },
  hr: { border: '0', borderTop: '1px solid #e2e8f0', margin: '15px 0' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' },
  infoBox: { background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  infoLabel: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', display: 'block' },
  infoValue: { fontSize: '14px', fontWeight: '700', color: '#334155' },
  sectionHeader: { fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '5px', marginTop: '15px' },
  descriptionText: { color: '#475569', fontSize: '13px', lineHeight: '1.5', margin: 0 },
  listSection: { background: '#f8fafc', padding: '12px', borderRadius: '10px', marginTop: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  confirmBtn: { flex: 2, background: '#f97316', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { flex: 1, background: '#f1f5f9', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' },
  bookingSummary: { background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '5px' },
  paxGrid: { display: 'flex', gap: '10px', marginBottom: '10px' },
  paxBox: { flex: 1, background: '#fff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', textAlign: 'center' },
  paxInput: { width: '100%', border: 'none', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', outline: 'none' },
  totalArea: { marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #e2e8f0' },
  uploadSection: { background: '#fff7ed', padding: '12px', borderRadius: '10px', border: '1px dashed #fdba74', marginTop: '15px' }
};

export default TourList;