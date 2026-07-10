'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../admin.module.css';

const EMPTY_FORM = {
  roomNumber: '',
  floor: 1,
  occupancy: 2,
  location: '',
  city: '',
  state: '',
  status: 'available',
  isActive: true,
  hostelType: 'boys',
  ac: true
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms?all=true');
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRooms();
  }, []);
  const handleToggleForm = () => {
    if (showForm) {
      setShowForm(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    } else {
      setShowForm(true);
    }
  };

  const handleStartEdit = (room) => {
    setEditing(room);
    setFormData({
      roomNumber: room.roomNumber || '',
      floor: room.floor || 1,
      occupancy: room.occupancy || 2,
      location: room.location || '',
      city: room.city || '',
      state: room.state || '',
      status: room.status || 'available',
      isActive: room.isActive !== false,
      hostelType: room.hostelType || 'boys',
      ac: room.ac !== false
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = async (room) => {
    if (!confirm(`Deactivate Room ${room.roomNumber}? It won't appear in user listings.`)) return;
    try {
      const res = await fetch(`/api/rooms/${room._id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRooms();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to deactivate room');
      }
    } catch (error) {
      alert('Error deactivating room');
    }
  };

  const handleActivate = async (room) => {
    if (!confirm(`Activate Room ${room.roomNumber}? It will appear in user listings.`)) return;
    try {
      const res = await fetch(`/api/rooms/${room._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      if (res.ok) {
        fetchRooms();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to activate room');
      }
    } catch (error) {
      alert('Error activating room');
    }
  };

  const handleDelete = async (room) => {
    if (!confirm(`Are you sure you want to permanently delete Room ${room.roomNumber}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/rooms/${room._id}?permanent=true`, { method: 'DELETE' });
      if (res.ok) {
        fetchRooms();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to delete room');
      }
    } catch (error) {
      alert('Error deleting room');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/rooms/${editing._id}` : '/api/rooms';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchRooms();
        setFormData(EMPTY_FORM);
        setEditing(null);
        setShowForm(false);
      } else {
        const error = await res.json();
        alert(error.message || `Failed to ${editing ? 'update' : 'add'} room`);
      }
    } catch (error) {
      alert(`Error ${editing ? 'updating' : 'adding'} room`);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>🏨 Room Management</h1>
            <p className="page-subtitle">{rooms.length} rooms registered in system</p>
          </div>
          <button onClick={handleToggleForm} className="btn-primary">
            {showForm ? '✕ Close' : '➕ Add Room'}
          </button>
        </div>

        {showForm && (
          <motion.div
            className="form-container"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '32px' }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              {editing ? `✏️ Edit Room: ${editing.roomNumber}` : '➕ Add New Room'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

                <div className="form-group">
                  <label className="form-label">AC / Non-AC Facility</label>
                  <select
                    className="form-input"
                    value={formData.ac ? "true" : "false"}
                    onChange={(e) => setFormData({...formData, ac: e.target.value === "true"})}
                    required
                  >
                    <option value="true">AC Room</option>
                    <option value="false">Non-AC Room</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 203"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Floor"
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Occupancy (guests)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Occupancy"
                    value={formData.occupancy}
                    onChange={(e) => setFormData({...formData, occupancy: parseInt(e.target.value) || 1})}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Block C, Floor 1"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isActive" className="form-label" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '15px' }}>
                    Visible to Users (Active)
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={handleToggleForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editing ? '✅ Update Room' : '➕ Create Room'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏨</div>
            <div className="empty-title">No rooms found</div>
            <div className="empty-sub">Add your first room to get started</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', justifyContent: 'center' }}>
            {rooms.map((room) => (
              <motion.div
                key={room._id}
                className="card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ height: '100%' }}
              >
                <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', textAlign: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      Room {room.roomNumber}
                      {room.isActive === false && (
                        <span className="badge badge-rejected" style={{ fontSize: '10px' }}>
                          Hidden
                        </span>
                      )}
                    </h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      Floor {room.floor}
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0', fontSize: '13px', color: '#4b5563' }}>
                      <div>🏢 Hostel: <strong>Boys Hostel</strong></div>
                      <div>❄️ AC Type: <strong>{room.ac ? 'AC' : 'Non-AC'}</strong></div>
                      <div>👥 Occupancy: {room.occupancy} guests</div>
                      <div>📍 {room.location}</div>
                      <div style={{ color: '#999', fontSize: '12px' }}>{room.city}, {room.state}</div>
                    </div>
                    
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge badge-${room.status}`}>{room.status}</span>
                    </div>

                    {room.amenities && room.amenities.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                        {room.amenities.map(amenity => (
                          <span key={amenity} style={{ display: 'inline-block', fontSize: '11px', backgroundColor: '#f0f2fc', color: '#4f46e5', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px' }}>
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                    <button className="btn-secondary btn-sm" onClick={() => handleStartEdit(room)}>
                      ✏️ Edit
                    </button>
                    {room.isActive !== false ? (
                      <button className="btn-danger btn-sm" onClick={() => handleDeactivate(room)}>
                        🗑️ Deactivate
                      </button>
                    ) : (
                      <button className="btn-primary btn-sm" onClick={() => handleActivate(room)}>
                        ✅ Activate
                      </button>
                    )}
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(room)} style={{ opacity: 0.7 }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

