import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordStrengthRegex.test(passwordData.newPassword)) {
      setPasswordError('New password must contain at least one letter and at least one number.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      setPasswordSuccess(res.message || 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const studentInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'S';

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
        <div className="container">
          <NavLink className="navbar-brand fw-bold d-flex align-items-center" to="/">
            <img
              src="/images/cbit-logo.png"
              alt="CBIT Logo"
              className="me-2"
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span>CBIT Lost &amp; Found</span>
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-lg-center">
              <li className="nav-item">
                <NavLink className="nav-link" to="/" end>
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/lost-items">
                  Lost Items
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/found-items">
                  Found Items
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/report">
                  Report Item
                </NavLink>
              </li>

              {user ? (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/my-reports">
                      My Reports
                    </NavLink>
                  </li>

                  {/* Profile Dropdown Menu in the Right Corner */}
                  <li className="nav-item dropdown ms-lg-2 mt-2 mt-lg-0" ref={dropdownRef}>
                    <button
                      type="button"
                      className="btn btn-light d-flex align-items-center gap-2 px-2 py-1 border shadow-sm dropdown-toggle"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      aria-expanded={dropdownOpen}
                      id="profileDropdownBtn"
                      title={`Student Account: ${user.name} (${user.rollNo || 'CBIT'})`}
                    >
                      {/* Profile Logo / Avatar Icon */}
                      <span
                        className="bg-primary text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                        style={{
                          width: '32px',
                          height: '32px',
                          fontSize: '0.95rem',
                          border: '2px solid #ffffff'
                        }}
                      >
                        {studentInitial}
                      </span>
                      <div className="text-start d-none d-sm-block lh-1 pe-1">
                        <span className="d-block fw-bold text-dark small" style={{ fontSize: '0.85rem' }}>
                          {user.name?.split(' ')[0] || 'Student'}
                        </span>
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>
                          {user.rollNo || 'CBIT'}
                        </span>
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div
                        className="dropdown-menu dropdown-menu-end show shadow p-0 mt-2"
                        style={{
                          minWidth: '270px',
                          position: 'absolute',
                          right: 0,
                          left: 'auto',
                          zIndex: 1050,
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        {/* Student Details Header */}
                        <div className="p-3 bg-light border-bottom">
                          <div className="d-flex align-items-center mb-2">
                            <span
                              className="bg-primary text-white fw-bold d-flex align-items-center justify-content-center me-2 shadow-sm"
                              style={{ width: '42px', height: '42px', fontSize: '1.15rem', border: '2px solid #ffffff' }}
                            >
                              {studentInitial}
                            </span>
                            <div className="overflow-hidden">
                              <h6 className="mb-0 fw-bold text-truncate">{user.name}</h6>
                              <span className="badge bg-primary text-uppercase" style={{ fontSize: '0.68rem' }}>
                                Roll: {user.rollNo || 'Student'}
                              </span>
                            </div>
                          </div>
                          <small className="text-muted d-block text-truncate" title={user.email}>
                            {user.email}
                          </small>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <NavLink
                            className="dropdown-item py-2 d-flex align-items-center gap-2"
                            to="/profile"
                            onClick={() => setDropdownOpen(false)}
                            id="profileDropdownMyProfile"
                          >
                            <span style={{ fontSize: '1.1rem' }}>👤</span>
                            <span>
                              <strong>Profile</strong>
                              <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                View student details &amp; activity
                              </small>
                            </span>
                          </NavLink>

                          <NavLink
                            className="dropdown-item py-2 d-flex align-items-center gap-2"
                            to="/my-reports"
                            onClick={() => setDropdownOpen(false)}
                            id="profileDropdownMyReports"
                          >
                            <span style={{ fontSize: '1.1rem' }}>📋</span>
                            <span>
                              <strong>My Reports</strong>
                              <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                Manage submitted lost/found items
                              </small>
                            </span>
                          </NavLink>

                          <button
                            type="button"
                            className="dropdown-item py-2 d-flex align-items-center gap-2 text-start w-100"
                            onClick={() => {
                              setDropdownOpen(false);
                              setPasswordError('');
                              setPasswordSuccess('');
                              setShowPasswordModal(true);
                            }}
                            id="profileDropdownChangePassword"
                          >
                            <span style={{ fontSize: '1.1rem' }}>🔑</span>
                            <span>
                              <strong>Change Password</strong>
                              <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                Update your account password
                              </small>
                            </span>
                          </button>

                          <NavLink
                            className="dropdown-item py-2 d-flex align-items-center gap-2"
                            to="/report"
                            onClick={() => setDropdownOpen(false)}
                            id="profileDropdownReportItem"
                          >
                            <span style={{ fontSize: '1.1rem' }}>➕</span>
                            <span>
                              <strong>Report New Item</strong>
                              <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                Submit a lost or found item
                              </small>
                            </span>
                          </NavLink>

                          <div className="dropdown-divider my-1"></div>

                          <button
                            type="button"
                            className="dropdown-item py-2 text-danger fw-semibold d-flex align-items-center gap-2 text-start w-100"
                            onClick={handleLogout}
                            id="profileDropdownSignOut"
                          >
                            <span style={{ fontSize: '1.1rem' }}>🚪</span>
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
                    <NavLink className="btn btn-outline-light btn-sm me-2" to="/login">
                      Login
                    </NavLink>
                  </li>
                  <li className="nav-item mt-2 mt-lg-0">
                    <NavLink className="btn btn-light btn-sm text-primary fw-semibold" to="/register">
                      Register
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">Change Password</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setShowPasswordModal(false)}
                ></button>
              </div>
              <form onSubmit={handlePasswordChange}>
                <div className="modal-body p-4">
                  {passwordError && <div className="alert alert-danger py-2">{passwordError}</div>}
                  {passwordSuccess && <div className="alert alert-success py-2">{passwordSuccess}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Current Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter current password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Min. 8 characters (letters & numbers)"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      required
                    />
                    <div className="form-text">At least 8 characters with letters &amp; numbers.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Confirm New Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Re-enter new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={submittingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold"
                    disabled={submittingPassword}
                  >
                    {submittingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
