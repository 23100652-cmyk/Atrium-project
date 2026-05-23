import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState({ flights: [], hotels: [], tours: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllInventory = async () => {
      const token = localStorage.getItem('access_token');
      const API_BASE = 'http://127.0.0.1:8000/api';
      const headers = { Authorization: `Bearer ${token}` };

      try {
        setLoading(true);
        const [f, h, t] = await Promise.all([
          axios.get(`${API_BASE}/flights/`, { headers }),
          axios.get(`${API_BASE}/hotels/`, { headers }),
          axios.get(`${API_BASE}/tours/`, { headers }),
        ]);
        setInventory({ flights: f.data, hotels: h.data, tours: t.data });
      } catch (err) {
        console.error("Operator fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllInventory();
  }, []);

  // Compute "Health" metrics
  const stats = useMemo(() => {
    const lowFlights = inventory.flights.filter(f => (f.seat_availability || 0) < 10);
    const lowHotels = inventory.hotels.filter(h => (h.room_availability || 0) < 5);
    const lowTours = inventory.tours.filter(t => (t.available_slots || 0) < 5);

    return {
      flights: inventory.flights.length,
      hotels: inventory.hotels.length,
      tours: inventory.tours.length,
      totalAlerts: lowFlights.length + lowHotels.length + lowTours.length,
      lowStockItems: [...lowFlights, ...lowHotels, ...lowTours].slice(0, 5)
    };
  }, [inventory]);

  if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Updating Control Panel...</div>;

  return (
    <div style={s.container}>
      {/* --- HEADER --- */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Operator Control Center</h1>
          <p style={s.subtitle}>Inventory Management & Availability Monitor</p>
        </div>
        <div style={s.quickActions}>
          <button style={s.primaryBtn} onClick={() => navigate('/flights')}>+ New Flight</button>
          <button style={s.primaryBtn} onClick={() => navigate('/hotels')}>+ New Hotel</button>
          <button style={s.primaryBtn} onClick={() => navigate('/tours')}>+ New Tour Package</button>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={{...s.iconCircle, backgroundColor: '#eff6ff'}}>✈️</div>
          <div>
            <p style={s.statLabel}>Active Flights</p>
            <h2 style={s.statValue}>{stats.flights}</h2>
          </div>
        </div>
        <div style={s.statCard}>
          <div style={{...s.iconCircle, backgroundColor: '#f5f3ff'}}>🏨</div>
          <div>
            <p style={s.statLabel}>Active Hotels</p>
            <h2 style={s.statValue}>{stats.hotels}</h2>
          </div>
        </div>
        <div style={s.statCard}>
          <div style={{...s.iconCircle, backgroundColor: '#fff7ed'}}>🌍</div>
          <div>
            <p style={s.statLabel}>Tour Packages</p>
            <h2 style={s.statValue}>{stats.tours}</h2>
          </div>
        </div>
        <div style={{...s.statCard, borderLeft: '6px solid #ef4444'}}>
          <div style={{...s.iconCircle, backgroundColor: '#fef2f2'}}>⚠️</div>
          <div>
            <p style={s.statLabel}>Critical Stock</p>
            <h2 style={{...s.statValue, color: '#ef4444'}}>{stats.totalAlerts}</h2>
          </div>
        </div>
      </div>

      <div style={s.mainGrid}>
        {/* --- LEFT: ALERT LIST --- */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Priority: Low Availability</h3>
          <div style={s.alertList}>
            {stats.lowStockItems.length > 0 ? stats.lowStockItems.map((item, idx) => (
              <div key={idx} style={s.alertItem}>
                <span>{item.destination || item.hotel_name || item.title}</span>
                <span style={s.stockBadge}>
                  Only {item.seat_availability || item.room_availability || item.available_slots} left
                </span>
              </div>
            )) : <p style={{color: '#94a3b8'}}>All inventory levels are healthy.</p>}
          </div>
        </div>

        {/* --- RIGHT: SHORTCUTS --- */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Inventory Shortcuts</h3>
          <div style={s.shortcutGrid}>
            <button style={s.shortcutBtn} onClick={() => navigate('/flights')}>Manage Flight Seats</button>
            <button style={s.shortcutBtn} onClick={() => navigate('/hotels')}>Update Room Rates</button>
            <button style={s.shortcutBtn} onClick={() => navigate('/tours')}>Edit Tour Itinerary</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const s = {
  container: { padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0 },
  subtitle: { color: '#64748b', margin: '5px 0 0 0' },
  quickActions: { display: 'flex', gap: '10px' },
  primaryBtn: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' },
  statCard: { background: '#fff', padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #eff6ff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  iconCircle: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' },
  statLabel: { margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { margin: '4px 0', fontSize: '24px', fontWeight: '800', color: '#1e293b' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' },
  section: { background: '#fff', padding: '25px', borderRadius: '24px', border: '1px solid #eff6ff' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', borderLeft: '5px solid #2563eb', paddingLeft: '12px' },
  alertList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  alertItem: { display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#fef2f2', borderRadius: '12px', color: '#991b1b', fontWeight: '600', fontSize: '14px' },
  stockBadge: { backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' },
  shortcutGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  shortcutBtn: { textAlign: 'left', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569', transition: '0.2s' }
};

export default OperatorDashboard;