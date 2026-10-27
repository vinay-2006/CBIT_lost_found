import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getImageUrl } from '../services/api';

// Intelligent branch and batch decoder for CBIT student roll numbers
function decodeCbitStudentDetails(rollNo) {
  if (!rollNo) return { branch: 'Undergraduate Engineering Program', batch: 'Active Student' };
  const clean = rollNo.toString().toUpperCase().trim();

  // Pattern: CBIT 12-digit format e.g. 160124748026
  if (clean.startsWith('1601') && clean.length >= 10) {
    const yearStr = clean.substring(4, 6);
    const branchCode = clean.substring(6, 9);
    const year = parseInt(yearStr, 10);
    const batchYear = !isNaN(year) ? (year >= 50 ? 1900 + year : 2000 + year) : null;
    const batch = batchYear ? `${batchYear} – ${batchYear + 4} Batch` : 'Active Batch';

    const branchMap = {
      '733': 'B.Tech – Computer Science & Engineering (CSE)',
      '748': 'B.Tech – CSE (Artificial Intelligence & Machine Learning)',
      '749': 'B.Tech – CSE (IoT, Cyber Security & Blockchain)',
      '729': 'B.Tech – Artificial Intelligence & Data Science (AI&DS)',
      '737': 'B.Tech – Information Technology (IT)',
      '735': 'B.Tech – Electronics & Communication Engineering (ECE)',
      '734': 'B.Tech – Electrical & Electronics Engineering (EEE)',
      '736': 'B.Tech – Mechanical Engineering (MECH)',
      '732': 'B.Tech – Civil Engineering (CIVIL)',
      '738': 'B.Tech – Biotechnology (BIOTECH)',
      '739': 'B.Tech – Chemical Engineering (CHEM)'
    };

    const branch = branchMap[branchCode] || 'B.Tech Engineering Program';
    return { branch, batch, institutionCode: 'CBIT Code: 1601' };
  }

  // Standard engineering roll pattern (e.g. 23A91A0501)
  const match = clean.match(/^([0-9]{2})[A-Za-z0-9]+([0-9]{2})[0-9]{2}$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const batchYear = !isNaN(year) ? 2000 + year : null;
    const batch = batchYear ? `${batchYear} – ${batchYear + 4} Batch` : 'Active Batch';
    const code = match[2];
    const codeMap = {
      '05': 'B.Tech – Computer Science & Engineering',
      '12': 'B.Tech – Information Technology',
      '04': 'B.Tech – Electronics & Communication Engg',
      '02': 'B.Tech – Electrical & Electronics Engg',
      '03': 'B.Tech – Mechanical Engineering',
      '01': 'B.Tech – Civil Engineering'
    };
    return {
      branch: codeMap[code] || 'B.Tech – Engineering Program',
      batch,
      institutionCode: 'CBIT Campus'
    };
  }

  return {
    branch: 'B.Tech – Undergraduate Engineering',
    batch: 'Current Academic Year',
    institutionCode: 'CBIT Campus'
  };
}

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Student reports & statistics state
  const [studentReports, setStudentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // In-page Change Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  useEffect(() => {
    async function loadStudentData() {
      if (!user) return;
      try {
        const res = await apiRequest('/items/my-reports');
        setStudentReports(res.data || []);
      } catch (err) {
        console.error('Failed to load student reports:', err);
      } finally {
        setLoadingReports(false);
      }
    }
    loadStudentData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordStrengthRegex.test(passwordForm.newPassword)) {
      setPasswordError('New password must contain at least one letter and at least one number.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      setPasswordSuccess(res.message || 'Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  const academicDetails = decodeCbitStudentDetails(user.rollNo);
  const lostCount = studentReports.filter((r) => r.type === 'lost').length;
  const foundCount = studentReports.filter((r) => r.type === 'found').length;
  const resolvedCount = studentReports.filter((r) => r.status === 'resolved').length;
  const activeCount = studentReports.filter((r) => r.status === 'active').length;

  return (
    <div className="container mt-4 mb-5" style={{ maxWidth: '880px' }}>
      {/* Student Identity Card */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
            <h4 className="mb-0 fw-bold">Student Profile &amp; Account Details</h4>
          </div>
          <span className="badge bg-light text-primary text-uppercase px-2 py-1 fw-bold">
            {user.role || 'Student'}
          </span>
        </div>
        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-center mb-4 pb-3 border-bottom gap-3">
            <div
              className="bg-primary text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '74px', height: '74px', fontSize: '1.85rem' }}
            >
              {user.name ? user.name.trim().charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h4 className="mb-1 fw-bold text-dark">{user.name}</h4>
              <p className="text-muted mb-1">
                <strong>Roll Number:</strong> <span className="text-primary fw-semibold">{user.rollNo || 'Not specified'}</span>
              </p>
              <p className="text-muted mb-0 small">
                <strong>Institutional Email:</strong> {user.email}
              </p>
            </div>
            <div className="ms-auto text-end">
              <span className="badge bg-success px-2 py-2 d-inline-flex align-items-center gap-1 shadow-sm">
                <span>✓</span> Verified @cbit.ac.in Student
              </span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <div className="p-3 bg-light border">
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                  Student Full Name
                </small>
                <span className="fs-6 fw-bold text-dark">{user.name}</span>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="p-3 bg-light border">
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                  Roll Number / Hall Ticket
                </small>
                <span className="fs-6 fw-bold text-primary">{user.rollNo || 'N/A'}</span>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="p-3 bg-light border">
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                  Academic Program &amp; Branch
                </small>
                <span className="fs-6 fw-semibold text-dark">{academicDetails.branch}</span>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="p-3 bg-light border">
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                  Academic Batch
                </small>
                <span className="fs-6 fw-semibold text-dark">{academicDetails.batch}</span>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="p-3 bg-light border">
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                  College &amp; Campus
                </small>
                <span className="fs-6 text-dark">Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad</span>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="p-3 bg-light border">
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                  Official Email Address
                </small>
                <span className="fs-6 text-dark">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Activity Statistics Summary */}
          <h5 className="fw-bold mb-3">Your Campus Activity</h5>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card text-center p-3 bg-light border">
                <div className="fs-4 fw-bold text-primary">{studentReports.length}</div>
                <small className="text-muted">Total Reports</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center p-3 bg-light border">
                <div className="fs-4 fw-bold text-danger">{lostCount}</div>
                <small className="text-muted">Lost Items</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center p-3 bg-light border">
                <div className="fs-4 fw-bold text-success">{foundCount}</div>
                <small className="text-muted">Found Items</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center p-3 bg-light border">
                <div className="fs-4 fw-bold text-info">{resolvedCount}</div>
                <small className="text-muted">Resolved Cases</small>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="d-flex flex-wrap gap-2 pt-3 border-top">
            <Link to="/my-reports" className="btn btn-primary fw-semibold">
              📋 Go to My Reports ({studentReports.length})
            </Link>
            <Link to="/report" className="btn btn-outline-primary fw-semibold">
              ➕ Report New Item
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger ms-auto fw-semibold"
              onClick={handleLogout}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Recent Submissions by this student */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
          <h5 className="mb-0 fw-bold">Your Submitted Reports</h5>
          <Link to="/my-reports" className="btn btn-sm btn-outline-primary">
            View All in Management Portal →
          </Link>
        </div>
        <div className="card-body p-0">
          {loadingReports ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span className="ms-2 text-muted small">Loading your reports...</span>
            </div>
          ) : studentReports.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <p className="mb-2">You have not submitted any lost or found reports yet.</p>
              <Link to="/report" className="btn btn-sm btn-primary">
                Report an Item
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th style={{ width: '60px' }}>Image</th>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentReports.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.itemName}
                          className="recent-table-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder.svg';
                          }}
                        />
                      </td>
                      <td className="fw-semibold">{item.itemName}</td>
                      <td>
                        <span className={`badge ${item.type === 'lost' ? 'bg-danger' : 'bg-success'}`}>
                          {item.type === 'lost' ? 'Lost' : 'Found'}
                        </span>
                      </td>
                      <td>{item.category}</td>
                      <td className="text-muted small">{item.location}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === 'resolved' ? 'bg-success' : 'bg-warning text-dark'
                          }`}
                        >
                          {item.status === 'resolved' ? 'Resolved' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="card shadow-sm" id="change-password-section">
        <div className="card-header bg-light py-3">
          <h5 className="mb-0 fw-bold">🔑 Change Account Password</h5>
          <small className="text-muted">Update your login password securely</small>
        </div>
        <div className="card-body p-4">
          {passwordError && <div className="alert alert-danger py-2">{passwordError}</div>}
          {passwordSuccess && <div className="alert alert-success py-2">{passwordSuccess}</div>}

          <form onSubmit={handlePasswordSubmit}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold small">Current Password *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold small">New Password *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min. 8 chars (letters & numbers)"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold small">Confirm New Password *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="mt-3 text-end">
              <button
                type="submit"
                className="btn btn-primary fw-bold"
                disabled={submittingPassword}
              >
                {submittingPassword ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
