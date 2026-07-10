'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '', courseType: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const departmentsList =
    form.courseType === "UG"
      ? ugDepartments
      : form.courseType === "PG"
        ? pgDepartments
        : [];

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = () => {
    const errs = {};

    if (!form.name.trim()) errs.name = 'Full name is required';
    else if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters';
    else if (!/^[a-zA-Z\s.'-]+$/.test(form.name)) errs.name = 'Only letters/spaces allowed';

    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[a-zA-Z0-9._%+-]+@kiot\.ac\.in$/.test(form.email)) errs.email = 'Only @kiot.ac.in emails allowed';

    if (!form.courseType) errs.courseType = 'Course Type is required';
    if (!form.department) errs.department = 'Department is required';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Min 6 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Need uppercase letter';
    else if (!/[a-z]/.test(form.password)) errs.password = 'Need lowercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Need at least one number';

    if (!form.confirmPassword) errs.confirmPassword = 'Confirm password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          courseType: form.courseType,
          department: form.department,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calcStrength = (pwd) => {
    let score = 0;
    if (pwd.length > 5) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = calcStrength(form.password);

  return (
    <div className={styles.page}>
      <div className={styles.authCard}>
        <div className={styles.leftPanel} />
        <div className={styles.rightPanel}>
        <motion.div
          className={styles.formCard}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>

          <div className={styles.formHeader}>
            <div className={styles.formBrand}>
              <img src="/logo.png" alt="KIOT Logo" className={styles.formBrandImg} />
              <div className={styles.formBrandTitle}>Knowledge Institute of Technology</div>
              <div className={styles.formBrandBadge}>(Autonomous)</div>
              <div className={styles.formBrandMeta}>Credit Equivalence and Credit Transfer</div>
            </div>
            <h1 className={styles.formTitle}>Create Account</h1>
            <p className={styles.formSubtitle}>Sign up to manage bookings on KIOT.</p>
          </div>

          {/* Error alert */}
          {error && (
            <motion.div
              className={`${styles.alertBox} ${styles.alertError}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            
            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Gobinath S"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                className={`${styles.fieldInput} ${errors.name ? styles.hasError : ''}`}
              />
              {errors.name && <p className={styles.fieldError}>⚠ {errors.name}</p>}
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Email Address</label>
              <input
                type="email"
                placeholder="example@kiot.ac.in"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                className={`${styles.fieldInput} ${errors.email ? styles.hasError : ''}`}
              />
              {errors.email && <p className={styles.fieldError}>⚠ {errors.email}</p>}
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>Course Type</label>
                <select
                  value={form.courseType}
                  onChange={e => {
                    setField('courseType', e.target.value);
                    setField('department', '');
                  }}
                  className={`${styles.selectInput} ${errors.courseType ? styles.hasError : ''}`}
                >
                  <option value="">Select</option>
                  <option value="UG">UG</option>
                  <option value="PG">PG</option>
                </select>
                {errors.courseType && <p className={styles.fieldError}>⚠ {errors.courseType}</p>}
              </div>

              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>Department</label>
                <select
                  value={form.department}
                  onChange={e => setField('department', e.target.value)}
                  disabled={!form.courseType}
                  className={`${styles.selectInput} ${errors.department ? styles.hasError : ''}`}
                  style={{ opacity: !form.courseType ? 0.6 : 1 }}
                >
                  <option value="">Select Dept</option>
                  {departmentsList.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && <p className={styles.fieldError}>⚠ {errors.department}</p>}
              </div>
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 chars (A-Z, a-z, 0-9)"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  className={`${styles.fieldInput} ${errors.password ? styles.hasError : ''}`}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div className={styles.strengthBar}>
                    <div className={`${styles.strengthSeg} ${strengthScore >= 1 ? (strengthScore === 1 ? styles.weak : (strengthScore === 2 ? styles.fair : (strengthScore === 3 ? styles.good : styles.strong))) : ''}`} />
                    <div className={`${styles.strengthSeg} ${strengthScore >= 2 ? (strengthScore === 2 ? styles.fair : (strengthScore === 3 ? styles.good : styles.strong)) : ''}`} />
                    <div className={`${styles.strengthSeg} ${strengthScore >= 3 ? (strengthScore === 3 ? styles.good : styles.strong) : ''}`} />
                    <div className={`${styles.strengthSeg} ${strengthScore >= 4 ? styles.strong : ''}`} />
                  </div>
                </div>
              )}
              {errors.password && <p className={styles.fieldError}>⚠ {errors.password}</p>}
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.fieldLabel}>Confirm Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={e => setField('confirmPassword', e.target.value)}
                  className={`${styles.fieldInput} ${errors.confirmPassword ? styles.hasError : ''}`}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                >
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className={styles.fieldError}>⚠ {errors.confirmPassword}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <span className={styles.spinnerInBtn} />
                  Creating account…
                </>
              ) : '✅ Create Account'}
            </motion.button>
          </form>

          <div className={styles.hintBox}>
            Requires official <span>@kiot.ac.in</span> email for registration.
          </div>

          <div className={styles.formFooter}>
            Already have an account?{' '}
            <Link href="/login" className={styles.authLink}>Sign in</Link>
          </div>
        </motion.div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            KIOT Resource Booking System © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
