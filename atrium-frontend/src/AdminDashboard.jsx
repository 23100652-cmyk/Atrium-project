import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]); // New state for users
  const [counts, setCounts] = useState({ flights: 0, hotels: 0, tours: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    const API_BASE = 'http://127.0.0.1:8000/api';

    try {
      setLoading(true);
      const [bookRes, flightRes, hotelRes, tourRes, userRes] = await Promise.all([
        axios.get(`${API_BASE}/bookings/`, { headers }),
        axios.get(`${API_BASE}/flights/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/hotels/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/tours/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/users/`, { headers }).catch(() => ({ data: [] })) // Fetching users
      ]);

      setBookings(bookRes.data);
      setUsers(userRes.data);
      setCounts({
        flights: flightRes.data.length,
        hotels: hotelRes.data.length,
        tours: tourRes.data.length
      });
    } catch (err) {
      console.error("Admin fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
      return { backgroundColor: '#dcfce7', color: '#166534' }; // green
    case 'PENDING':
      return { backgroundColor: '#fef3c7', color: '#92400e' }; // orange
    case 'REJECTED':
      return { backgroundColor: '#fee2e2', color: '#991b1b' }; // red
    default:
      return { backgroundColor: '#e2e8f0', color: '#334155' }; // gray
  }
};

  const stats = useMemo(() => {
    const approvedBookings = bookings.filter(b => b.status === 'APPROVED');
    const totalRev = approvedBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
    const pending = bookings.filter(b => b.status === 'PENDING').length;

    // Categorizing users by role
    const clients = users.filter(u => u.role?.toUpperCase() === 'CLIENT').length;
  const consultants = users.filter(u => u.role?.toUpperCase() === 'CONSULTANT').length;
  const operators = users.filter(u => u.role?.toUpperCase() === 'OPERATOR').length;

    return {
      revenue: totalRev,
      pendingCount: pending,
      totalListings: counts.flights + counts.hotels + counts.tours,
      userMetrics: { clients, consultants, operators, total: users.length }
    };
  }, [bookings, counts, users]);

  if (loading) return <div style={{ padding: '40px' }}>Loading Admin Metrics...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '25px', color: '#1e293b', fontWeight: '800' }}>🛡️ Admin Dashboard</h2>

      {/* --- TOP STAT CARDS --- */}
      <div style={s.statsGrid}>
        <div style={{ ...s.card, borderLeft: '6px solid #10b981' }}>
          <p style={s.cardLabel}>Total Revenue</p>
          <h3 style={s.cardValue}>₱{stats.revenue.toLocaleString()}</h3>
          <span style={s.cardSub}>From approved bookings</span>
        </div>
        <div style={{ ...s.card, borderLeft: '6px solid #f59e0b' }}>
          <p style={s.cardLabel}>Validation Queue</p>
          <h3 style={s.cardValue}>{stats.pendingCount}</h3>
          <span style={s.cardSub}>Action required in Queue</span>
        </div>
        <div style={{ ...s.card, borderLeft: '6px solid #2563eb' }}>
          <p style={s.cardLabel}>Active Listings</p>
          <h3 style={s.cardValue}>{stats.totalListings}</h3>
          <span style={s.cardSub}>F:{counts.flights} | H:{counts.hotels} | T:{counts.tours}</span>
        </div>
      </div>

      <div style={s.mainGrid}>
        {/* --- LEFT COLUMN: RECENT BOOKINGS --- */}
        <div style={s.tableContainer}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>Recent Bookings</h3>
            <button style={s.viewAllBtn} onClick={() => navigate('/admin-manage')}>View Full History</button>
          </div>
          <table style={s.table}>
            <thead>
              <tr style={s.headerRow}>
                <th style={s.th}>User</th>
                <th style={s.th}>Item</th>
                <th style={s.th}>Price</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 8).map(b => (
                <tr key={b.id} style={s.row}>
                  <td style={s.td}>
                    <div style={{ fontWeight: '600' }}>{b.client_name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date().toLocaleDateString()}</div>
                  </td>
                  <td style={s.td}>{b.item_name || "Travel Service"}</td>
                  <td style={s.td}>₱{parseFloat(b.total_price).toLocaleString()}</td>
                  <td style={s.td}>
  <span style={{
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    ...getStatusStyle(b.status)
  }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- RIGHT COLUMN: ANALYTICS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {localStorage.getItem('user_role')?.toUpperCase() === 'ADMIN' && (
  <div style={s.analyticsContainer}>
    <h3 style={s.sectionTitle}>User Overview</h3>
    <div style={s.userGrid}>
      <div style={s.userItem}>
        <div style={s.userLabel}>Clients</div>
        <div style={s.userValue}>{stats.userMetrics.clients}</div>
      </div>
      <div style={s.userItem}>
        <div style={s.userLabel}>Consultants</div>
        <div style={s.userValue}>{stats.userMetrics.consultants}</div>
      </div>
      <div style={s.userItem}>
        <div style={s.userLabel}>Operators</div>
        <div style={s.userValue}>{stats.userMetrics.operators}</div>
      </div>
    </div>
  </div>
)}

          {/* INVENTORY BREAKDOWN */}
          <div style={s.analyticsContainer}>
            <h3 style={s.sectionTitle}>Inventory Breakdown</h3>
            <div style={s.chartWrapper}>
              <div style={s.chartItem}>
                <div style={s.chartInfo}><span>Flights</span><span>{counts.flights}</span></div>
                <div style={s.barBg}><div style={{...s.barFill, width: `${(counts.flights/stats.totalListings || 1)*100}%`, backgroundColor: '#2563eb'}} /></div>
              </div>
              <div style={s.chartItem}>
                <div style={s.chartInfo}><span>Hotels</span><span>{counts.hotels}</span></div>
                <div style={s.barBg}><div style={{...s.barFill, width: `${(counts.hotels/stats.totalListings || 1)*100}%`, backgroundColor: '#8b5cf6'}} /></div>
              </div>
              <div style={s.chartItem}>
                <div style={s.chartInfo}><span>Tours</span><span>{counts.tours}</span></div>
                <div style={s.barBg}><div style={{...s.barFill, width: `${(counts.tours/stats.totalListings || 1)*100}%`, backgroundColor: '#f59e0b'}} /></div>
              </div>
            </div>

            <div style={s.revenueMiniCard}>
               <p style={{fontSize: '12px', color: '#64748b', margin: 0}}>Platform Efficiency</p>
               <h4 style={{margin: '5px 0', color: '#1e293b'}}>94.2%</h4>
               <div style={{height: '4px', background: '#e2e8f0', borderRadius: '2px'}}>
                  <div style={{width: '94%', height: '100%', background: '#10b981', borderRadius: '2px'}} />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const s = {
  // ... existing styles ...
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
  card: { background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardLabel: { margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.025em' },
  cardValue: { margin: '8px 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#0f172a' },
  cardSub: { fontSize: '12px', color: '#94a3b8' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '25px' },
  tableContainer: { background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
  sectionHeader: { padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '15px', fontSize: '13px', color: '#64748b', background: '#f8fafc' },
  td: { padding: '15px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  row: { transition: 'all 0.2s' },
  viewAllBtn: { background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px' },
  analyticsContainer: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  chartWrapper: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  chartItem: { width: '100%' },
  chartInfo: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#475569' },
  barBg: { height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px' },
  revenueMiniCard: { marginTop: '30px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' },
  
  // NEW USER STYLES
  userGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '15px' },
  userItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' },
  userLabel: { fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  userValue: { fontSize: '18px', fontWeight: '800', color: '#1e293b' }
};

export default AdminDashboard;