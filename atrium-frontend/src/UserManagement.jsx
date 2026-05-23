import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

export default function UserManagement({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);

  // ================= NEW STATES =================
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const getHeaders = () => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/users/`, {
        headers: getHeaders()
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ================= ESC CLOSE =================
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setSelectedUser(null);
        setEditUser(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ================= VIEW =================
  const handleView = (user) => setSelectedUser(user);

  // ================= EDIT =================
  const handleEditOpen = (user) => setEditUser({ ...user });

  const handleSave = async () => {
    if (!editUser) return;

    setSaving(true);
    try {
      const payload = {
        username: editUser.username,
        email: editUser.email,
        role: editUser.role,
        is_active: editUser.is_active
      };

      const res = await axios.patch(
        `${API_BASE}/api/users/${editUser.id}/`,
        payload,
        { headers: getHeaders() }
      );

      setUsers(prev =>
        prev.map(u => (u.id === editUser.id ? res.data : u))
      );

      setEditUser(null);

    // ✅ Show success alert
    alert("User updated successfully!");
  } catch (err) {
    alert('Failed to update user');
  } finally {
    setSaving(false);
  }
  };

  // ================= DELETE =================
  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API_BASE}/api/users/${id}/`, {
        headers: getHeaders()
      });

      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  

  const filteredUsers = users.filter(u => {
  const role = (u.role || "").toLowerCase().trim();

  const matchSearch =
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase());

  const matchRole =
    roleFilter ? role === roleFilter.toLowerCase().trim() : true;

  return matchSearch && matchRole;
});

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div style={s.container}>
      <h2 style={s.title}>👥 User Management</h2>

      {/* ================= SEARCH + FILTER ================= */}
      <div style={s.topBar}>
        <input
          placeholder="Search username or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={s.input}
        />

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          style={s.input}
        >
          <option value="">All Roles</option>
          <option value="client">Client</option>
          <option value="operator">Operator</option>
          <option value="consultant">Consultant</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(1);
          }}
          style={s.input}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr style={s.trHead}>
                <th style={s.th}>ID</th>
                <th style={s.th}>Username</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map(user => (
                <tr key={user.id} style={s.tr}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>

                  <td style={s.email}>{user.email}</td>

                  <td>
                    <span style={s.roleBadge(user.role)}>
                      {user.role}
                    </span>
                  </td>

                  <td>
                    <span style={s.statusBadge(user.is_active)}>
                      {user.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>

                  <td>
                    <div style={s.actions}>
                      <button style={s.viewBtn} onClick={() => handleView(user)}>
                        View
                      </button>
                      <button style={s.editBtn} onClick={() => handleEditOpen(user)}>
                        Edit
                      </button>
                      <button style={s.deleteBtn} onClick={() => deleteUser(user.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      <div style={s.pagination}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>

        <span>
          Page {page} / {totalPages || 1}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {selectedUser && (
  <div style={s.overlay} onClick={() => setSelectedUser(null)}>
    <div style={s.modal} onClick={(e) => e.stopPropagation()}>

      <div style={s.modalHeader}>
        <h2 style={s.modalTitle}>User Profile</h2>
        <button style={s.modalClose} onClick={() => setSelectedUser(null)}>×</button>
      </div>

      <div style={s.profileCard}>
        <div style={s.avatarCircle}>
          {selectedUser.username?.charAt(0).toUpperCase()}
        </div>

        <div style={s.profileInfo}>
          <div style={s.infoRow}>
            <span style={s.label}>Username</span>
            <span style={s.value}>{selectedUser.username}</span>
          </div>

          <div style={s.infoRow}>
            <span style={s.label}>Email</span>
            <span style={s.value}>{selectedUser.email}</span>
          </div>

          <div style={s.infoRow}>
            <span style={s.label}>Role</span>
            <span style={s.value}>
              <span style={s.roleBadge(selectedUser.role)}>
                {selectedUser.role}
              </span>
            </span>
          </div>

          <div style={s.infoRow}>
            <span style={s.label}>Status</span>
            <span style={s.value}>
              <span style={s.statusBadge(selectedUser.is_active)}>
                {selectedUser.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div style={s.modalFooter}>
        <button style={s.closeBtn} onClick={() => setSelectedUser(null)}>
          Close
        </button>
        <button
          style={s.editBtn}
          onClick={() => {
            setEditUser(selectedUser);
            setSelectedUser(null);
          }}
        >
          Edit User
        </button>
      </div>

    </div>
  </div>
)}

      {/* ================= EDIT MODAL ================= */}
      {editUser && (
  <div style={s.overlay} onClick={() => setEditUser(null)}>
    <div style={s.modal} onClick={(e) => e.stopPropagation()}>

      <div style={s.modalHeader}>
        <h2 style={s.modalTitle}>Edit User</h2>
        <button style={s.modalClose} onClick={() => setEditUser(null)}>×</button>
      </div>

      <div style={s.form}>
        <div style={s.formGroup}>
          <label>Username</label>
          <input
            style={s.input}
            value={editUser.username || ""}
            onChange={(e) =>
              setEditUser({ ...editUser, username: e.target.value })
            }
          />
        </div>

        <div style={s.formGroup}>
          <label>Email</label>
          <input
            style={s.input}
            value={editUser.email || ""}
            onChange={(e) =>
              setEditUser({ ...editUser, email: e.target.value })
            }
          />
        </div>

        <div style={s.row}>
          <div style={s.formGroup}>
            <label>Role</label>
            <select
              style={s.input}
              value={editUser.role}
              onChange={(e) =>
                setEditUser({ ...editUser, role: e.target.value })
              }
            >

              <option value="operator">Operator</option>
              <option value="consultant">Consultant</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={s.formGroup}>
            <label>Status</label>
            <select
              style={s.input}
              value={String(editUser.is_active)}
              onChange={(e) =>
                setEditUser({
                  ...editUser,
                  is_active: e.target.value === "true",
                })
              }
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div style={s.modalFooter}>
        <button style={s.closeBtn} onClick={() => setEditUser(null)}>
          Cancel
        </button>

        <button style={s.saveBtn} onClick={handleSave}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

    </div>
  </div>
)}
    </div>
  );
}

const s = {
  container: {
    padding: 20,
    fontFamily: "Inter, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },

  title: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 10,
  },

  topBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 15,
  },

  input: {
    padding: 10,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    minWidth: 160,
  },

  tableWrapper: {
  overflowX: "auto",
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  maxHeight: "60vh",
  position: "relative",  // <--- add this
  zIndex: 0,             // <--- ensure default stacking
},

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 900,
  },

  trHead: {
  position: "sticky",
  top: 0,
  background: "#f1f5f9",
  zIndex: 1,       // lower zIndex so modal appears above it
},

  th: {
    padding: 10,
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
  },

  tr: {
    borderBottom: "1px solid #eee",
  },

  email: {
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  roleBadge: (role) => ({
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background:
      role === "admin"
        ? "#fee2e2"
        : role === "operator"
        ? "#dbeafe"
        : "#f1f5f9",
    color:
      role === "admin"
        ? "#dc2626"
        : role === "operator"
        ? "#2563eb"
        : "#334155",
  }),

  statusBadge: (active) => ({
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: active ? "#dcfce7" : "#fee2e2",
    color: active ? "#166534" : "#991b1b",
  }),

  actions: {
    display: "flex",
    gap: 6,
    flexWrap: "nowrap",
  },

  viewBtn: {
    background: "#e0f2fe",
    border: "none",
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  editBtn: {
    background: "#fef3c7",
    border: "none",
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  deleteBtn: {
    background: "#fee2e2",
    border: "none",
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
    color: "#dc2626",
  },
  

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,  zIndex: 1000,
  },

  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 15,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },

  saveBtn: {
    background: "#22c55e",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },

  closeBtn: {
    background: "#e2e8f0",
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },

  pagination: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  modalHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 15,
},

modalTitle: {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
},

modalClose: {
  border: "none",
  background: "transparent",
  fontSize: 24,
  cursor: "pointer",
  color: "#64748b",
},

profileCard: {
  display: "flex",
  gap: 20,
  alignItems: "center",
  padding: 15,
  borderRadius: 12,
  background: "#f8fafc",
},

avatarCircle: {
  width: 60,
  height: 60,
  borderRadius: "50%",
  background: "#2563eb",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 700,
},

profileInfo: {
  flex: 1,
},

infoRow: {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  borderBottom: "1px solid #e2e8f0",
},

label: {
  color: "#64748b",
  fontSize: 13,
},

value: {
  fontWeight: 600,
},

form: {
  display: "flex",
  flexDirection: "column",
  gap: 12,
},

formGroup: {
  display: "flex",
  flexDirection: "column",
  gap: 5,
},

row: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
},

modalFooter: {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 15,
  paddingTop: 10,
  borderTop: "1px solid #e2e8f0",
},
};