import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/bookings/report/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) { console.error("Report Error:", err); }
      finally { setLoading(false); }
    };
    fetchReport();
  }, []);

  if (loading) return <div style={{padding: '30px'}}>Generating accurate data...</div>;

  return (
    <div style={r.container}>
      <div style={r.header}>
        <h2>📊 Financial & Operational Report</h2>
        <button onClick={() => window.print()} style={r.printBtn}>🖨️ Print Report</button>
      </div>

      <div style={r.statsGrid}>
        <div style={r.statCard}><h3>${data?.revenue.toLocaleString()}</h3><p>Total Revenue</p></div>
        <div style={r.statCard}><h3>{data?.confirmed_count}</h3><p>Confirmed Bookings</p></div>
        <div style={r.statCard}><h3>{data?.pending_count}</h3><p>Pending Approvals</p></div>
      </div>

      <table style={r.table}>
        <thead>
          <tr style={{background: '#f8fafc'}}><th style={r.th}>ID</th><th style={r.th}>Client</th><th style={r.th}>Service</th><th style={r.th}>Status</th></tr>
        </thead>
        <tbody>
          {data?.all_data.map(b => (
            <tr key={b.id}>
              <td style={r.td}>#{b.id}</td>
              <td style={r.td}>{b.client_name || b.client}</td>
              <td style={r.td}>{b.category}</td>
              <td style={r.td}><b>{b.status}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const r = {
  container: { background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' },
  printBtn: { background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
  statsGrid: { display: 'flex', gap: '20px', marginBottom: '30px' },
  statCard: { flex: 1, padding: '20px', border: '1px solid #eee', borderRadius: '10px', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee' },
  td: { padding: '12px', borderBottom: '1px solid #f9f9f9' }
};

export default AdminReports;