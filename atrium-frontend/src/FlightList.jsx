import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FlightList = ({ role, search }) => {
  const [flights, setFlights] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeError, setTimeError] = useState('');

  // States for Pax Breakdown and Payment Details
  const [paxData, setPaxData] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    travel_class: 'Economy',
    reference_number: ''
  });

  const initialFormState = {
    airline: '',
    flight_number: '', 
    origin: '', 
    destination: '', 
    departure_time: '',
    arrival_time: '',
    seat_availability: '',
    price: '', 
  };

  const [formData, setFormData] = useState(initialFormState);
  const token = localStorage.getItem('access_token');
  
  // LOGIC FIX: Role-less Client handling
  const isStaff = role === 'admin' || role === 'operator' || role === 'consultant';
  const canEdit = role === 'admin' || role === 'operator';
  const isLoggedUser = !!token && role === 'client';

  useEffect(() => {
    fetchFlights();
  }, [token]); // Re-fetch if the user logs in/out

  // Inline Validation and Duration helper
  useEffect(() => {
  const dep = formData.departure_time;
  const arr = formData.arrival_time;

  // reset if incomplete
  if (!dep) {
    setTimeError('');
    return;
  }

  const now = new Date();
  const depDate = new Date(dep);

  // 🚨 INVALID DATE CHECK
  if (isNaN(depDate.getTime())) {
    setTimeError('⚠️ Invalid departure date');
    return;
  }

  // 🚨 BLOCK PAST DEPARTURE (IMPORTANT NEW RULE)
  // allow small buffer (30s) to avoid timezone/input lag issues
  const bufferMs = 30 * 1000;

  if (depDate.getTime() < now.getTime() - bufferMs) {
    setTimeError('⚠️ Departure cannot be in the past');
    return;
  }

  // if arrival missing, stop here (but departure still valid)
  if (!arr) {
    setTimeError('');
    return;
  }

  const arrDate = new Date(arr);

  if (isNaN(arrDate.getTime())) {
    setTimeError('⚠️ Invalid arrival date');
    return;
  }

  // 🚨 CHRONOLOGICAL RULE
  if (arrDate <= depDate) {
    setTimeError('⚠️ Arrival must be AFTER departure time');
    return;
  }

  setTimeError('');
}, [formData.departure_time, formData.arrival_time]);

  const fetchFlights = () => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    axios.get('http://127.0.0.1:8000/api/flights/', config)
      .then(res => setFlights(res.data))
      .catch(err => {
        console.error("Error fetching flights:", err);
        if (err.response?.status === 401) {
            axios.get('http://127.0.0.1:8000/api/flights/')
                 .then(res => setFlights(res.data));
        }
      });
  };

  

  const formatForInput = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.substring(0, 16); 
  };

  const calculateGrandTotal = () => {
    if (!selectedItem) return 0;
    const basePrice = parseFloat(selectedItem.price);
    return (paxData.adults + paxData.children) * basePrice;
  };

  // Helper to visually show calculated total duration in the UI
  const getFlightDurationText = () => {
    if (!formData.departure_time || !formData.arrival_time || timeError) return '';
    const diffMs = new Date(formData.arrival_time) - new Date(formData.departure_time);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `✨ Duration: ${hrs}h ${mins}m`;
  };

  // Safe minimum string generator for datetime-local
  const getMinDepartureTime = () => {
    const now = new Date();
    return now.toISOString().substring(0, 16);
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (timeError) {
      alert("Please resolve form entry errors before saving.");
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (selectedItem?.id) {
        await axios.put(`http://127.0.0.1:8000/api/flights/${selectedItem.id}/`, formData, config);
        alert("Flight updated successfully!");
      } else {
        await axios.post('http://127.0.0.1:8000/api/flights/', formData, config);
        alert("New flight added!");
      }
      setShowAddEditModal(false);
      fetchFlights();
    } catch (err) {
      alert("Error: " + JSON.stringify(err.response?.data || "Check your fields"));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this flight?")) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/flights/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchFlights();
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const grandTotal = calculateGrandTotal();
    const bookingData = new FormData();
    
    bookingData.append('flight', selectedItem.id);
    bookingData.append('total_price', grandTotal);
    bookingData.append('status', 'PENDING');
    bookingData.append('item_name', `${selectedItem.origin} to ${selectedItem.destination}`);
    bookingData.append('adult_count', paxData.adults);
    bookingData.append('children_count', paxData.children);
    bookingData.append('infant_count', paxData.infants);
    bookingData.append('travel_class', paxData.travel_class);
    bookingData.append('reference_number', paxData.reference_number);

    if (receipt) bookingData.append('receipt_image', receipt);

    try {
      await axios.post('http://127.0.0.1:8000/api/bookings/', bookingData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      });
      alert(`✈️ Booking for ${selectedItem.origin} sent!`);
      setShowPayment(false);
      setReceipt(null);
    } catch (err) {
      alert("Error submitting booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFlights = flights.filter(f => {
    const term = search?.toLowerCase() || '';
    return f.origin?.toLowerCase().includes(term) || f.destination?.toLowerCase().includes(term);
  });

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>✈️ Flights</h2>
        {canEdit && (
          <button 
            style={s.addBtn} 
            onClick={() => { setSelectedItem(null); setFormData(initialFormState); setTimeError(''); setShowAddEditModal(true); }}
          >
            + Add Flight
          </button>
        )}
      </div>

      <div style={s.list}>
        {filteredFlights.length > 0 ? (
          filteredFlights.map(f => (
            <div key={f.id} style={s.card}>
              <div 
                style={{ flex: 1, cursor: 'pointer' }} 
                onClick={() => { setSelectedItem(f); setShowDetails(true); }}
              >
                <h3 style={s.itemName}>{f.origin} ➔ {f.destination}</h3>
                <p style={s.subText}>
                  {f.airline} ({f.flight_number}) • <span style={s.priceTag}>₱{parseFloat(f.price).toLocaleString()}</span>
                </p>
                <p style={{fontSize: '12px', color: '#94a3b8'}}>Departs: {new Date(f.departure_time).toLocaleString()}</p>
              </div>

              <div style={s.btnGroup}>
                {isLoggedUser && (
                  <button style={s.bookBtn} onClick={() => { setSelectedItem(f); setShowPayment(true); }}>⚡ Book</button>
                )}
                {canEdit && (
                  <>
                    <button style={s.editBtn} onClick={() => { 
                      setSelectedItem(f); 
                      setFormData({ ...f, departure_time: formatForInput(f.departure_time), arrival_time: formatForInput(f.arrival_time) }); 
                      setTimeError('');
                      setShowAddEditModal(true); 
                    }}>✏️ Edit</button>
                    <button style={s.deleteBtn} onClick={() => handleDelete(f.id)}>🗑️</button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={s.emptyMsg}>No flights found.</p>
        )}
      </div>

      {/* 1. UPDATED ADD / EDIT MODAL (WITH COMBO BOXES) */}
{showAddEditModal && (
  <div style={s.overlay}>
    <div style={{ ...s.modal, maxWidth: '500px' }}>
      <h3 style={s.modalTitle}>
        {selectedItem ? '✏️ Edit Flight Details' : '✈️ Add New Flight'}
      </h3>

      <form
        onSubmit={handleAdminSubmit}
        style={{
          ...s.form,
          maxHeight: '75vh',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >

        {/* AIRLINE + FLIGHT NUMBER */}
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Airline:</label>

            <select
              style={s.input}
              value={formData.airline}
              onChange={(e) =>
                setFormData({ ...formData, airline: e.target.value })
              }
              required
            >
              <option value="">Select Airline</option>
              <option>Philippine Airlines</option>
              <option>Cebu Pacific</option>
              <option>AirAsia</option>
              <option>Singapore Airlines</option>
              <option>Emirates</option>
              <option>Japan Airlines</option>
              <option>Korean Air</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.label}>Flight #:</label>
            <input
              style={s.input}
              value={formData.flight_number}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  flight_number: e.target.value,
                })
              }
              required
            />
          </div>
        </div>

        {/* ORIGIN + DESTINATION (COMBO BOX) */}
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Origin:</label>

            <select
              style={s.input}
              value={formData.origin}
              onChange={(e) =>
                setFormData({ ...formData, origin: e.target.value })
              }
              required
            >
              <option value="">Select Origin</option>
              <option>Manila (MNL)</option>
              <option>Cebu (CEB)</option>
              <option>Davao (DVO)</option>
              <option>Clark (CRK)</option>
              <option>Hong Kong (HKG)</option>
              <option>Singapore (SIN)</option>
              <option>Tokyo (NRT)</option>
              <option>Seoul (ICN)</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.label}>Destination:</label>

            <select
              style={s.input}
              value={formData.destination}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  destination: e.target.value,
                })
              }
              required
            >
              <option value="">Select Destination</option>
              <option>Manila (MNL)</option>
              <option>Cebu (CEB)</option>
              <option>Davao (DVO)</option>
              <option>Clark (CRK)</option>
              <option>Hong Kong (HKG)</option>
              <option>Singapore (SIN)</option>
              <option>Tokyo (NRT)</option>
              <option>Seoul (ICN)</option>
              <option>Dubai (DXB)</option>
            </select>
          </div>
        </div>

        {/* TIMES */}
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Departure Time:</label>
            <input
              style={s.input}
              type="datetime-local"
              value={formData.departure_time}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  departure_time: e.target.value,
                })
              }
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.label}>Arrival Time:</label>
            <input
              style={s.input}
              type="datetime-local"
              value={formData.arrival_time}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  arrival_time: e.target.value,
                })
              }
              required
            />
          </div>
        </div>

        {/* TIME ERROR / DURATION */}
        {timeError && <div style={s.timeErrorText}>{timeError}</div>}
        {getFlightDurationText() && (
          <div style={s.durationText}>{getFlightDurationText()}</div>
        )}

        {/* SEATS + PRICE */}
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Seats Availability:</label>
            <input
              style={s.input}
              type="number"
              min="0"
              value={formData.seat_availability}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seat_availability: e.target.value,
                })
              }
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.label}>Price (₱):</label>
            <input
              style={s.input}
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: e.target.value,
                })
              }
              required
            />
          </div>
        </div>

        {/* BUTTONS */}
        <div style={s.modalActions}>
          <button
            type="button"
            onClick={() => setShowAddEditModal(false)}
            style={s.cancelBtn}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!!timeError}
            style={{
              ...s.confirmBtn,
              opacity: timeError ? 0.6 : 1,
              cursor: timeError ? 'not-allowed' : 'pointer',
            }}
          >
            Save Flight
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* 2. DETAILS MODAL */}
      {showDetails && (
        <div style={s.overlay} onClick={() => setShowDetails(false)}>
          <div style={s.detailModal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.airlineCircle}>✈</div>
              <div style={{ flex: 1, marginLeft: '12px' }}>
                <div style={s.detailAirline}>{selectedItem?.airline}</div>
                <div style={s.detailFlightNum}>{selectedItem?.flight_number}</div>
              </div>
              <div style={s.statusBadge}>Confirmed</div>
            </div>
            <div style={s.routeSection}>
              <div style={s.point}>
                <div style={s.cityCode}>{selectedItem?.origin.substring(0, 3).toUpperCase()}</div>
                <div style={s.cityName}>{selectedItem?.origin}</div>
                <div style={s.cityTime}>
                  {new Date(selectedItem?.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={s.pathContainer}>
                <div style={s.dashedLine}></div>
                <div style={s.planeIconCenter}>✈</div>
                <div style={s.dashedLine}></div>
              </div>
              <div style={s.point}>
                <div style={s.cityCode}>{selectedItem?.destination.substring(0, 3).toUpperCase()}</div>
                <div style={s.cityName}>{selectedItem?.destination}</div>
                <div style={s.cityTime}>
                  {new Date(selectedItem?.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div style={s.infoGrid}>
              <div style={s.infoBlock}>
                <label style={s.infoLabel}>Flight Date</label>
                <div style={s.infoValue}>{new Date(selectedItem?.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <div style={s.infoBlock}>
                <label style={s.infoLabel}>Availability</label>
                <div style={s.infoValue}>{selectedItem?.seat_availability} Seats Left</div>
              </div>
              <div style={s.infoBlock}>
                <label style={s.infoLabel}>Ticket Fare</label>
                <div style={s.modalPrice}>₱{parseFloat(selectedItem?.price || 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setShowDetails(false)} style={s.backBtn}>Back</button>
              {isLoggedUser && (
                <button onClick={() => { setShowDetails(false); setShowPayment(true); }} style={s.bookNowBtn}>Book</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. PAYMENT MODAL */}
      {showPayment && (
        <div style={s.overlay}>
          <div style={{...s.modal, maxWidth: '500px'}}>
            <h3 style={s.modalTitle}>Confirm Booking</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>Route: <strong>{selectedItem?.origin} to {selectedItem?.destination}</strong></p>
            <form style={s.form} onSubmit={handleBookingSubmit}>
              <div style={s.paxSection}>
                <label style={{...s.label, color: '#2563eb', marginBottom: '10px', display: 'block'}}>Passenger Manifest (Pax)</label>
                <div style={s.row}>
                    <div style={{flex: 1}}><label style={s.label}>Adults:</label>
                        <input style={s.input} type="number" min="1" value={paxData.adults} onChange={e => setPaxData({...paxData, adults: parseInt(e.target.value) || 0})} required /></div>
                    <div style={{flex: 1}}><label style={s.label}>Children:</label>
                        <input style={s.input} type="number" min="0" value={paxData.children} onChange={e => setPaxData({...paxData, children: parseInt(e.target.value) || 0})} /></div>
                    <div style={{flex: 1}}><label style={s.label}>Infants:</label>
                        <input style={s.input} type="number" min="0" max={paxData.adults} value={paxData.infants} onChange={e => setPaxData({...paxData, infants: parseInt(e.target.value) || 0})} /></div>
                </div>
                <div style={{prevMargin: '10px', marginTop: '10px'}}>
                    <label style={s.label}>Travel Class:</label>
                    <select style={s.input} value={paxData.travel_class} onChange={e => setPaxData({...paxData, travel_class: e.target.value})}>
                        <option>Economy</option>
                        <option>Premium Economy</option>
                        <option>Business</option>
                        <option>First Class</option>
                    </select>
                </div>
              </div>
              <div style={{marginTop: '5px'}}>
                <label style={s.label}>Reference Number (GCash/Bank):</label>
                <input style={s.input} value={paxData.reference_number} onChange={e => setPaxData({...paxData, reference_number: e.target.value})} required />
              </div>
              <div style={{marginTop: '5px'}}>
                <label style={s.label}>Upload Receipt Image:</label>
                <input type="file" accept="image/*" required onChange={(e) => setReceipt(e.target.files[0])} />
              </div>
              <div style={{...s.paxSection, background: '#f0f9ff', marginTop: '10px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontWeight: 'bold'}}>Grand Total:</span>
                  <strong style={{...s.priceTag, fontSize: '18px'}}>₱{calculateGrandTotal().toLocaleString()}</strong>
                </div>
              </div>
              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowPayment(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={s.confirmBtn}>{isSubmitting ? '...' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES OBJECT (Preserved & extended safely) ---
const s = {
  container: { padding: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, color: '#1e293b' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  itemName: { margin: 0, fontSize: '17px', color: '#0f172a' },
  subText: { fontSize: '14px', color: '#64748b', margin: '5px 0' },
  priceTag: { color: '#10b981', fontWeight: 'bold' },
  btnGroup: { display: 'flex', gap: '8px' },
  addBtn: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  bookBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  editBtn: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' },
  deleteBtn: { background: '#fff', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' },
  modal: { background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '450px' },
  modalTitle: { marginTop: 0, color: '#1e293b', fontSize: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '10px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#475569' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', width: '100%', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '10px' },
  confirmBtn: { flex: 2, background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' },
  emptyMsg: { color: '#94a3b8', textAlign: 'center', padding: '20px' },
  paxSection: { background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  detailModal: { background: '#fff', borderRadius: '28px', width: '90%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(30, 58, 138, 0.25)', position: 'relative' },
  modalHeader: { background: '#1e3a8a', padding: '24px', display: 'flex', alignItems: 'center', color: '#fff' },
  airlineCircle: { width: '45px', height: '45px', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' },
  detailAirline: { fontWeight: '800', fontSize: '18px', letterSpacing: '0.5px' },
  detailFlightNum: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', fontWeight: '600' },
  statusBadge: { fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', textTransform: 'uppercase' },
  routeSection: { padding: '40px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' },
  point: { textAlign: 'center' },
  cityCode: { fontSize: '36px', fontWeight: '900', color: '#1e293b', letterSpacing: '-1.5px' },
  cityName: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' },
  cityTime: { fontSize: '15px', fontWeight: '800', color: '#1e3a8a', marginTop: '6px' },
  pathContainer: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 15px' },
  dashedLine: { flex: 1, height: '1px', borderTop: '2px dashed #e2e8f0' },
  planeIconCenter: { margin: '0 10px', fontSize: '18px', color: '#3b82f6' },
  infoGrid: { padding: '0 30px 30px 30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' },
  infoBlock: { borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' },
  infoLabel: { fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' },
  infoValue: { fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' },
  modalPrice: { fontSize: '18px', fontWeight: '900', color: '#10b981', marginTop: '4px' },
  modalFooter: { padding: '20px 30px', background: '#f8fafc', display: 'flex', gap: '15px', alignItems: 'center' },
  backBtn: { flex: 1, padding: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '15px', fontWeight: '700', color: '#64748b', cursor: 'pointer', fontSize: '14px' },
  bookNowBtn: { flex: 2, padding: '14px', background: '#2563eb', border: 'none', borderRadius: '15px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.3)' },
  
  // New UI Elements styles
  timeErrorText: { color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginTop: '-4px' },
  durationText: { color: '#2563eb', fontSize: '12px', fontWeight: '600', marginTop: '-4px' }
};

export default FlightList;