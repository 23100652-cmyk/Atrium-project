import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import FlightList from './FlightList';
import HotelList from './HotelList';
import TourList from './TourList';
import AdminValidation from './AdminValidation';
import BookingList from './components/BookingList';
import AdminDashboard from './AdminDashboard';
import OperatorDashboard from './OperatorDashboard';
import UserManagement from './UserManagement';

const API_BASE = 'http://127.0.0.1:8000';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [role, setRole] = useState(localStorage.getItem('user_role')?.toLowerCase() || (token ? 'user' : 'guest'));
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tours, setTours] = useState([]);
  const [allBookings, setAllBookings] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [flashMessage, setFlashMessage] = useState('');

// Add a function to trigger it
const triggerWelcome = (name, userRole) => {
  // Use 'userRole' (the argument) instead of 'role' (the state)
  setFlashMessage(`Welcome back, ${name}! You are logged in as ${userRole}.`);
  setTimeout(() => setFlashMessage(''), 5000);
};

  const isStaff = role === 'admin' || role === 'consultant';

  const fetchData = async () => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    try {
      const [fRes, hRes, tRes] = await Promise.all([
        axios.get(`${API_BASE}/api/flights/`, config),
        axios.get(`${API_BASE}/api/hotels/`, config),
        axios.get(`${API_BASE}/api/tours/`, config)
      ]);
      setFlights(fRes.data || []);
      setHotels(hRes.data || []);
      setTours(tRes.data || []);

      if (token) {
        const bRes = await axios.get(`${API_BASE}/api/bookings/`, config);
        setAllBookings(bRes.data || []);
      }
    } catch (e) { 
      console.error("Data fetch error:", e); 
      if (e.response?.status === 401 && token) handleLogout();
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const res = await axios.get(`${API_BASE}/api/notifications/`, config);
      setNotifications(res.data || []);
      setUnreadCount(res.data?.filter(n => !n.is_read).length || 0);
    } catch (err) { console.error("Notification fetch failed:", err); }
  };

  const markNotificationsAsRead = async () => {
    if (!token || unreadCount === 0) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      await axios.post(`${API_BASE}/api/notifications/mark_as_read/`, {}, config);
      setUnreadCount(0); 
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  useEffect(() => {
    if (location.pathname === '/notifications') {
      markNotificationsAsRead();
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchData();
    if (token) fetchNotifications();
  }, [token, role]);

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setRole('guest');
    navigate('/');
  };

  const totalRevenue = useMemo(() => {
  return allBookings
    .filter(b => ['approved', 'confirmed', 'paid'].includes(b.status?.toLowerCase().trim()))
    .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
  }, [allBookings]);

  const pendingCount = useMemo(() => 
    allBookings.filter(b => b.status?.toLowerCase().trim() === 'pending').length, 
  [allBookings]);

  const renderDetailsModal = () => {
    if (!selectedItem) return null;
    const { item, type } = selectedItem;
    const isFlight = type.toLowerCase().includes('flight');
    const isTour = type.toLowerCase().includes('tour');
    const isHotel = type.toLowerCase().includes('hotel');

    const title = item.hotel_name || item.destination || item.name || item.title || "Package Details";
    const price = item.rate_per_night || item.price || item.ticket_fare || 0;
    
    const stock = isFlight ? item.available_seats : 
                  isHotel ? item.available_rooms : 
                  item.available_slots;
    
    const isAvailable = (stock !== undefined && stock !== null) ? stock > 0 : true;

    const formatDate = (dateStr) => {
        if (!dateStr) return "TBA";
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        });
    };

    const handleBookingClick = () => {
      if (!token) {
        setSelectedItem(null);
        setShowLoginModal(true);
        return;
      }
      setSelectedItem(null);
      if (type.toLowerCase().includes('flight')) navigate('/flights');
      else if (type.toLowerCase().includes('hotel')) navigate('/hotels');
      else if (type.toLowerCase().includes('tour')) navigate('/tours');
      window.scrollTo(0, 0);
    };

    return (
        <div style={ms.overlay} onClick={() => setSelectedItem(null)}>
            <div style={ms.detailContent} onClick={e => e.stopPropagation()}>
                <div style={{...s.modalHero, backgroundImage: `url(${item.image_url || 'https://via.placeholder.com/800x400'})`}}>
                    <div style={s.modalHeroOverlay} />
                    <button style={s.closeBtn} onClick={() => setSelectedItem(null)}>✕</button>
                    <div style={{...s.cardBadge, position: 'relative', backgroundColor: isHotel ? '#8b5cf6' : '#2563eb'}}>
                        {type.toUpperCase()}
                    </div>
                </div>
                <div style={s.modalBody}>
                    <div style={s.modalHeader}>
                        <h2 style={s.modalTitle}>{isFlight ? `${item.origin} ✈️ ${item.destination}` : title}</h2>
                        <div style={s.modalPriceValue}>
                          ₱{parseFloat(price).toLocaleString()}
                          {isHotel && <small style={{fontSize: '14px', color: '#64748b'}}> / night</small>}
                        </div>
                    </div>
                    <p style={s.modalDesc}>{item.description}</p>
                    <div style={s.detailsGrid}>
                        {isHotel && (
                            <>
                                <div style={s.detailItem}><span style={s.detailLabel}>Room Type</span><span style={s.detailValue}>{item.room_type || "Standard"}</span></div>
                                <div style={s.detailItem}><span style={s.detailLabel}>Location</span><span style={s.detailValue}>{item.location}</span></div>
                                <div style={s.detailItem}><span style={s.detailLabel}>Availability</span><span style={s.detailValue}>{item.room_availability}</span></div>
                            </>
                        )}
                        {isFlight && (
                            <>
                                <div style={s.detailItem}><span style={s.detailLabel}>Flight Date</span><span style={s.detailValue}>{formatDate(item.departure_time)}</span></div>
                                <div style={s.detailItem}><span style={s.detailLabel}>Origin</span><span style={s.detailValue}>{item.origin}</span></div>
                                <div style={s.detailItem}><span style={s.detailLabel}>Seats</span><span style={s.detailValue}>{item.seat_availability}</span></div>
                            </>
                        )}
                        {isTour && (
                            <>
                                <div style={s.detailItem}><span style={s.detailLabel}>Duration</span><span style={s.detailValue}>{item.duration_days || "N/A"}</span></div>
                                <div style={s.detailItem}><span style={s.detailLabel}>Slots</span><span style={s.detailValue}>{item.available_slots}</span></div>
                            </>
                        )}
                    </div>
                    <button 
                      style={{ ...s.bookNowBtn, backgroundColor: isAvailable ? (isHotel ? '#8b5cf6' : '#2563eb') : '#94a3b8', cursor: isAvailable ? 'pointer' : 'not-allowed' }} 
                      disabled={!isAvailable}
                      onClick={(e) => { e.stopPropagation(); if (isAvailable) handleBookingClick(); }}
                    >
                      {!isAvailable ? 'Fully Booked' : !token ? 'Login to Book' : `Go to ${type}`}
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const ServiceCard = ({ item, type }) => {
    const title = item.hotel_name || item.destination || item.name || item.title || "Atrium Offer";
    const price = item.rate_per_night || item.price || item.ticket_fare || 0;
    const badgeColor = type === 'hotels' ? '#8b5cf6' : (type === 'flights' ? '#2563eb' : '#f59e0b');
    return (
      <div style={s.card} onClick={() => setSelectedItem({item, type})}>
        <div style={{...s.cardImage, backgroundImage: `url(${item.image_url || 'https://via.placeholder.com/400x250'})`}}>
          <div style={{...s.cardBadge, backgroundColor: badgeColor}}>{type.toUpperCase()}</div>
        </div>
        <div style={s.cardContent}>
          <h4 style={s.cardTitle}>{title}</h4>
          <div style={s.cardFooter}>
            <span style={s.cardPrice}>₱{parseFloat(price).toLocaleString()}</span>
            <span style={s.cardLinkText}>View Details</span>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => (
    <div>
      {token && isStaff && (
        <div style={s.metricsGrid}>
          <div style={s.statCard}>
            <div style={s.iconCircle}>💰</div>
            <div style={s.statInfo}>
              <p style={s.statLabel}>Total Revenue</p>
              <h2 style={s.statValue}>₱{totalRevenue.toLocaleString()}</h2>
            </div>
          </div>
          <div style={{...s.statCard, borderLeft: '6px solid #ef4444'}} onClick={() => navigate('/admin-manage')}>
            <div style={s.iconCircle}>⏳</div>
            <div style={s.statInfo}>
              <p style={s.statLabel}>Pending Verification</p>
              <h2 style={{...s.statValue, color: '#ef4444'}}>{pendingCount}</h2>
            </div>
          </div>
        </div>
      )}

      <div style={s.heroBanner}>
        <h1>Explore the World with Atrium</h1>
        <p>Great journey starts with us</p>
      </div>
      
      <h2 style={s.sectionTitle}>Featured Flights</h2>
      <div style={s.horizontalGrid}>
        {flights.slice(0, 4).map(f => <ServiceCard key={f.id} item={f} type="flights" />)}
      </div>
      
      <h2 style={s.sectionTitle}>Luxury Hotels</h2>
      <div style={s.horizontalGrid}>
        {hotels.slice(0, 4).map(h => <ServiceCard key={h.id} item={h} type="hotels" />)}
      </div>

      <h2 style={s.sectionTitle}>Tour Packages</h2>
      <div style={s.horizontalGrid}>
        {tours.slice(0, 4).map(t => <ServiceCard key={t.id} item={t} type="tours" />)}
      </div>
    </div>
  );

  return (
    <div style={s.layoutWrapper}>
  {showLoginModal && (
  <div style={ms.overlay} onClick={() => setShowLoginModal(false)}>
    <div style={{...ms.content, maxWidth: '400px'}} onClick={e => e.stopPropagation()}>
       <Login 
  setToken={setToken} 
  setRole={setRole} 
  closeModal={() => setShowLoginModal(false)}
  // Pass both name and the new role to the function
  onSuccess={(name, userRole) => triggerWelcome(name, userRole)} 
/>
    </div>
  </div>
)}

      {renderDetailsModal()}

      <aside style={s.sidebar}>
        <div style={s.brand}>
          <h2 style={s.logoText}>ATRIUM</h2>
          {token && (
            <div style={s.roleBadge}>
              {role === 'admin' ? 'ADMINISTRATOR' : role === 'consultant' ? 'TRAVEL CONSULTANT' : role === 'operator' ? 'OPERATOR' : 'CLIENT'}
            </div>
          )}
        </div>
        
        <nav style={s.navGroup}>
          <button onClick={() => navigate('/')} style={location.pathname === '/' ? s.activeSideBtn : s.sideBtn}>🏠 Home</button>
          
          <div style={s.menuLabel}>TRAVEL SERVICES</div>
          <button onClick={() => navigate('/flights')} style={location.pathname === '/flights' ? s.activeSideBtn : s.sideBtn}>
    {role === 'operator' ? '⚙️ Manage Flights' : '✈️ Flights'}
  </button>
  <button onClick={() => navigate('/hotels')} style={location.pathname === '/hotels' ? s.activeSideBtn : s.sideBtn}>
    {role === 'operator' ? '⚙️ Manage Hotels' : '🏨 Hotels'}
  </button>
  <button onClick={() => navigate('/tours')} style={location.pathname === '/tours' ? s.activeSideBtn : s.sideBtn}>
    {role === 'operator' ? '⚙️ Manage Tours Packages' : '🎒 Tour Packages'}
  </button>
          
          {token && (
            <>  
            
              {role === 'client' && (
                <>
                  <div style={s.menuLabel}>MY ACCOUNT</div>
                  <button onClick={() => navigate('/my-bookings')} style={location.pathname === '/my-bookings' ? s.activeSideBtn : s.sideBtn}>📋 My Bookings</button>
                  <button onClick={() => navigate('/notifications')} style={location.pathname === '/notifications' ? s.activeSideBtn : s.sideBtn}>
                    🔔 Notifications {unreadCount > 0 && <span style={s.notifBadge}>{unreadCount}</span>}
                  </button>
                </>
              )}

               {/* 🔥 Notifications for BOTH client + consultant + admin */}
    {(role === 'consultant' || role === 'admin') && (
      <button
        onClick={() => navigate('/notifications')}
        style={location.pathname === '/notifications' ? s.activeSideBtn : s.sideBtn}
      >
        🔔 Notifications
        {unreadCount > 0 && (
          <span style={s.notifBadge}>{unreadCount}</span>
        )}
      </button>
    )}

              {isStaff && (
                <>
                  <div style={s.menuLabel}>STAFF TOOLS</div>
                  <button onClick={() => navigate('/admin-manage')} style={location.pathname === '/admin-manage' ? s.activeSideBtn : s.sideBtn}>💎 Validation Queue ({pendingCount})</button>
                  
                  {role === 'admin' && (
                    <button onClick={() => navigate('/user-management')} style={location.pathname === '/user-management' ? s.activeSideBtn : s.sideBtn}>👥 User Management</button>
                  )}
                </>
              )}
            </>
          )}
        </nav>
        {token && <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>}
      </aside>

      <main style={s.mainPanel}>
        <div style={s.topBar}>
            <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '18px' }}>
                {location.pathname.replace('/', '').toUpperCase() || 'DASHBOARD'}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                <input type="text" placeholder="Search packages..." style={s.topSearch} onChange={(e) => setSearchTerm(e.target.value)} />
                {!token && <button style={s.loginEntryBtn} onClick={() => setShowLoginModal(true)}>Login/Register</button>}
                <div style={s.iconCircle} title={role.toUpperCase()}>👤</div>
            </div>
        </div>
        

        <div style={s.scrollArea}>
        {flashMessage && (
      <div style={s.flashBanner}>
        <span style={{ marginRight: '10px' }}>✅</span>
        {flashMessage}
      </div>
    )}
          <Routes>
            <Route path="/" element={(role === 'admin' || role === 'consultant') ? <AdminDashboard /> : (role === 'operator') ? <OperatorDashboard />: <DashboardView />} />
            <Route path="/flights" element={<FlightList role={role} search={searchTerm} />} />
            <Route path="/hotels" element={<HotelList role={role} search={searchTerm} />} />
            <Route path="/tours" element={<TourList role={role} search={searchTerm} />} />
            <Route path="/my-bookings" element={token ? <BookingList /> : <Navigate to="/" />} />
            <Route path="/admin-manage" element={isStaff ? <AdminValidation /> : <Navigate to="/" />} />
            <Route path="/admin-dashboard" element={(role === 'admin') ? <AdminDashboard /> : <Navigate to="/" />} />
            
            <Route
  path="/user-management"
  element={
    role === 'admin' ? (
      <UserManagement token={token} />
    ) : (
      <Navigate to="/" />
    )
  }
/>

            <Route path="/notifications" element={
              token ? (
                <div style={{ maxWidth: '800px' }}>
                  <h2 style={s.sectionTitle}>Notifications</h2>
                  {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} style={{ ...s.notifCard, borderLeft: n.is_read ? '5px solid #e2e8f0' : '5px solid #2563eb', backgroundColor: n.is_read ? '#ffffff' : '#f0f7ff' }}>
                      <p style={{ fontWeight: n.is_read ? '400' : '700', margin: 0 }}>{n.message}</p>
                      {!n.is_read && <span style={{fontSize: '10px', color: '#2563eb'}}>● New</span>}
                    </div>
                  )) : <p>No new notifications.</p>}
                </div>
              ) : <Navigate to="/" />
            } />
          </Routes>
        </div>
      </main>
    </div>
  );
}

const ms = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000 },
  content: { background: '#fff', borderRadius: '24px', overflow: 'hidden' },
  detailContent: { background: '#fff', width: '95%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '32px', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }
};

const s = {
  layoutWrapper: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#ffffff', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '260px', borderRight: '1px solid #eff6ff', display: 'flex', flexDirection: 'column', padding: '25px' },
  brand: { marginBottom: '35px' },
  logoText: { margin: 0, fontSize: '28px', fontWeight: '900', color: '#2563eb' },
  roleBadge: { fontSize: '10px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', display: 'inline-block', marginTop: '5px' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  menuLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '700', margin: '20px 0 10px 12px', letterSpacing: '0.5px' },
  sideBtn: { textAlign: 'left', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', color: '#64748b', borderRadius: '12px', fontSize: '14px', transition: '0.2s' },
  activeSideBtn: { textAlign: 'left', background: '#2563eb', border: 'none', padding: '12px 16px', color: '#ffffff', borderRadius: '12px', fontWeight: '600' },
  mainPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8fafc' },
  topBar: { height: '70px', display: 'flex', alignItems: 'center', padding: '0 30px', backgroundColor: '#ffffff', borderBottom: '1px solid #eff6ff' },
  topSearch: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '300px', fontSize: '14px' },
  scrollArea: { padding: '40px', overflowY: 'auto', flex: 1 },
  heroBanner: { background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '50px', borderRadius: '24px', color: '#ffffff', marginBottom: '40px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' },
  statCard: { background: '#ffffff', padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #eff6ff', cursor: 'pointer' },
  statInfo: { flex: 1 },
  statLabel: { margin: 0, fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { margin: '4px 0', fontSize: '24px', fontWeight: '800', color: '#1e293b' },
  loginEntryBtn: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' },
  iconCircle: { width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#eff6ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' },
  sectionTitle: { fontSize: '22px', color: '#1e293b', marginBottom: '20px', fontWeight: '800', borderLeft: '6px solid #2563eb', paddingLeft: '15px' },
  horizontalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' },
  card: { background: '#ffffff', borderRadius: '22px', overflow: 'hidden', border: '1px solid #eff6ff', transition: 'transform 0.2s', cursor: 'pointer' },
  cardImage: { height: '190px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
  cardBadge: { position: 'absolute', top: '15px', left: '15px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '10px', padding: '5px 12px', borderRadius: '6px', fontWeight: '700' },
  cardContent: { padding: '20px' },
  cardTitle: { margin: '0 0 5px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  cardFooter: { marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: '20px', fontWeight: '800', color: '#2563eb' },
  cardLinkText: { fontSize: '12px', color: '#2563eb', fontWeight: '700' },
  notifBadge: { backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', marginLeft: '5px' },
  notifCard: { background: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '12px', border: '1px solid #eff6ff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  logoutBtn: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', marginTop: 'auto' },
  modalHero: { height: '350px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '30px' },
  modalHeroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' },
  closeBtn: { position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', backdropFilter: 'blur(10px)', zIndex: 10, transition: '0.3s' },
  modalBody: { padding: '40px', position: 'relative' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  modalTitle: { fontSize: '36px', fontWeight: '900', color: '#1e293b', margin: 0, flex: 1 },
  modalPriceValue: { fontSize: '32px', fontWeight: '900', color: '#2563eb', display: 'block' },
  modalDesc: { color: '#475569', lineHeight: '1.8', fontSize: '16px', marginBottom: '35px', maxWidth: '90%' },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '40px' },
  detailItem: { backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '18px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailValue: { fontSize: '15px', color: '#1e293b', fontWeight: '700' },
  bookNowBtn: { flex: 2, padding: '20px', borderRadius: '20px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)', transition: 'transform 0.2s' },
  flashBanner: {
  backgroundColor: '#dcfce7', // Light green
  color: '#166534',           // Dark green text
  padding: '16px 24px',
  borderRadius: '12px',
  marginBottom: '20px',
  fontWeight: '600',
  border: '1px solid #bbf7d0',
  display: 'flex',
  alignItems: 'center',
  animation: 'slideIn 0.3s ease-out',
}
};

export default App;