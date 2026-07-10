'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../admin.module.css';

const EMPTY_FORM = {
  name: '',
  vehicleType: 'car',
  registrationNumber: '',
  driverMobile: '',
  capacity: 5,
  location: '',
  city: '',
  state: '',
  status: 'available',
  isActive: true
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles?all=true');
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchVehicles();
    }, 0);
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

  const handleStartEdit = (vehicle) => {
    setEditing(vehicle);
    setFormData({
      name: vehicle.name || '',
      vehicleType: vehicle.vehicleType || 'car',
      registrationNumber: vehicle.registrationNumber || '',
      driverMobile: vehicle.driverMobile || '',
      capacity: vehicle.capacity || 5,
      location: vehicle.location || '',
      city: vehicle.city || '',
      state: vehicle.state || '',
      status: vehicle.status || 'available',
      isActive: vehicle.isActive !== false
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = async (vehicle) => {
    if (!confirm(`Deactivate "${vehicle.name}" (${vehicle.registrationNumber})? It won't appear in user listings.`)) return;
    try {
      const res = await fetch(`/api/vehicles/${vehicle._id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVehicles();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to deactivate vehicle');
      }
    } catch (error) {
      alert('Error deactivating vehicle');
    }
  };

  const handleActivate = async (vehicle) => {
    if (!confirm(`Activate "${vehicle.name}" (${vehicle.registrationNumber})? It will appear in user listings.`)) return;
    try {
      const res = await fetch(`/api/vehicles/${vehicle._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      if (res.ok) {
        fetchVehicles();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to activate vehicle');
      }
    } catch (error) {
      alert('Error activating vehicle');
    }
  };

  const handleDelete = async (vehicle) => {
    if (!confirm(`Are you sure you want to permanently delete vehicle "${vehicle.name}" (${vehicle.registrationNumber})? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/vehicles/${vehicle._id}?permanent=true`, { method: 'DELETE' });
      if (res.ok) {
        fetchVehicles();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      alert('Error deleting vehicle');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/vehicles/${editing._id}` : '/api/vehicles';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchVehicles();
        setFormData(EMPTY_FORM);
        setEditing(null);
        setShowForm(false);
      } else {
        const error = await res.json();
        alert(error.message || `Failed to ${editing ? 'update' : 'add'} vehicle`);
      }
    } catch (error) {
      alert(`Error ${editing ? 'updating' : 'adding'} vehicle`);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>🚗 Vehicle Management</h1>
            <p className="page-subtitle">{vehicles.length} vehicles registered in fleet</p>
          </div>
          <button onClick={handleToggleForm} className="btn-primary">
            {showForm ? '✕ Close' : '➕ Add Vehicle'}
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
              {editing ? `✏️ Edit Vehicle: ${editing.name}` : '➕ Add New Vehicle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Inova"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select
                    className="form-input"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                  >
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="bus">Bus</option>
                    <option value="bike">Bike</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. TN-56 575"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Mobile Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={formData.driverMobile}
                    onChange={(e) => setFormData({...formData, driverMobile: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (seats)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Capacity"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 1})}
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
                    <option value="booked">Booked</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Garage A"
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
                  {editing ? '✅ Update Vehicle' : '➕ Create Vehicle'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <div className="empty-title">No vehicles found</div>
            <div className="empty-sub">Add your first vehicle to get started</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', justifyContent: 'center' }}>
            {vehicles.map((vehicle) => (
              <motion.div
                key={vehicle._id}
                className="card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ height: '100%' }}
              >
                <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', textAlign: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {vehicle.name}
                      {vehicle.isActive === false && (
                        <span className="badge badge-rejected" style={{ fontSize: '10px' }}>
                          Hidden
                        </span>
                      )}
                    </h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      {vehicle.vehicleType.toUpperCase()}
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0', fontSize: '13px', color: '#4b5563' }}>
                      <div>📝 Reg: {vehicle.registrationNumber}</div>
                      <div>👥 Capacity: {vehicle.capacity} seats</div>
                      {vehicle.driverMobile && <div>📞 Driver: {vehicle.driverMobile}</div>}
                      <div>📍 {vehicle.location}</div>
                      <div style={{ color: '#999', fontSize: '12px' }}>{vehicle.city}, {vehicle.state}</div>
                    </div>
                    
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge badge-${vehicle.status}`}>{vehicle.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                    <button className="btn-secondary btn-sm" onClick={() => handleStartEdit(vehicle)}>
                      ✏️ Edit
                    </button>
                    {vehicle.isActive !== false ? (
                      <button className="btn-danger btn-sm" onClick={() => handleDeactivate(vehicle)}>
                        🗑️ Deactivate
                      </button>
                    ) : (
                      <button className="btn-primary btn-sm" onClick={() => handleActivate(vehicle)}>
                        ✅ Activate
                      </button>
                    )}
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(vehicle)} style={{ opacity: 0.7 }}>
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

