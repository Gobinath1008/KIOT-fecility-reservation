'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    department: '',
    courseType: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const ugDepartments = [
    "B.E Mechanical Engineering",
    "B.E Electronics and Communication Engineering",
    "B.E Electrical and Electronics Engineering",
    "B.E Computer Science and Engineering",
    "B.E Civil Engineering",
    "B.Tech Information Technology",
    "B.Tech Computer Science and Business Systems",
    "B.Tech Artificial Intelligence and Data Science",
    "B.E Electronics and Computer Engineering"
  ];

  const pgDepartments = [
    "M.E Industrial Safety Engineering",
    "M.E VLSI Design",
    "M.E Automotive Electronics",
    "M.E Embedded System Technologies",
    "M.E Computer Science and Engineering",
    "Master of Business Administration (MBA)",
    "MCA – Master of Computer Applications",
    "MBA in Innovation, Entrepreneurship & Venture Development (MBA-IEV)",
    "M.E Software Engineering"
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await response.json();
        setProfile(data);
        
        // Detect if active department matches any PG list options to initialize courseType dropdown
        const isPg = pgDepartments.includes(data.department);
        const isUg = ugDepartments.includes(data.department);
        const detectedCourseType = isPg ? 'PG' : (isUg ? 'UG' : '');

        setForm({
          name: data.name || '',
          phone: data.phone || '',
          department: data.department || '',
          courseType: detectedCourseType,
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
        });
      } catch (error) {
        toast.error(error.message || 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (name === 'courseType') {
        updated.department = ''; // Reset department choice when courseType switches
      }
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setProfile(data);
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error.message || 'Unable to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#4b5563', fontWeight: 700 }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', padding: '28px 16px 48px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            padding: '26px 28px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#5b4fe8', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Account Settings</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '10px 0 6px' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>Manage your profile</h1>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  border: '1px solid #c7d2fe',
                  borderRadius: 14,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#4f46e5',
                  background: '#f8f6ff',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: 15, maxWidth: 640 }}>
              Update your name, contact details, and address information. These changes are saved to your account immediately.
            </p>
          </div>
          <div
            style={{
              minWidth: 150,
              borderRadius: 18,
              padding: '14px 16px',
              background: 'linear-gradient(180deg, #5b4fe8, #4338ca)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              boxShadow: '0 10px 20px rgba(91,79,232,0.28)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.85 }}>Role</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{profile?.role?.replace('-', ' ').toUpperCase()}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{profile?.email}</div>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            padding: '26px 28px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Profile details</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Change the details shown on your account.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Active account
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                Full name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                  style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                Phone number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none' }}
                />
              </label>

              {!['super-admin', 'admin', 'hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(profile?.role) && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                    Course Type
                    <select
                      name="courseType"
                      value={form.courseType}
                      onChange={handleChange}
                      required
                      style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff' }}
                    >
                      <option value="">Select Course Type</option>
                      <option value="UG">UG (Undergraduate)</option>
                      <option value="PG">PG (Postgraduate)</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                    Department
                    <select
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      required
                      disabled={!form.courseType}
                      style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff' }}
                    >
                      <option value="">Select Department</option>
                      {(form.courseType === 'UG' ? ugDepartments : form.courseType === 'PG' ? pgDepartments : []).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
              Address
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                placeholder="Street address"
                style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                City
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="City"
                  style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                State
                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="State"
                  style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                ZIP code
                <input
                  name="zipCode"
                  value={form.zipCode}
                  onChange={handleChange}
                  placeholder="ZIP code"
                  style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 13px', fontSize: 14, color: '#0f172a', outline: 'none' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>
                Email and account role are protected. Only editable profile fields are shown here.
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#fff',
                  background: saving ? '#9ca3af' : 'linear-gradient(135deg, #5b4fe8, #4338ca)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 24px rgba(91,79,232,0.26)',
                }}
              >
                {saving ? 'Saving changes...' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
