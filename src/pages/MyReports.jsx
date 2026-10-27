import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Operation state tracking
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Edit modal / inline editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({ description: '', location: '', contact: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchMyReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/items/my-reports');
      setReports(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  // Handle status toggle (Active <-> Resolved)
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'resolved' ? 'active' : 'resolved';
    setUpdatingId(item.id);
    setActionMessage(null);

    try {
      const res = await apiRequest(`/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      // Update state immediately with confirmed data from server
      setReports((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: res.data.status } : r))
      );

      setActionMessage({
        type: 'success',
        text: `Report "${item.itemName}" marked as ${newStatus === 'resolved' ? 'Resolved' : 'Active'}.`
      });
    } catch (err) {
      setActionMessage({
        type: 'danger',
        text: err.message || `Failed to update status for "${item.itemName}".`
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Open edit modal
  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditFormData({
      description: item.description,
      location: item.location,
      contact: item.contact
    });
    setEditError('');
  };

  // Save edited fields
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editFormData.description.trim() || !editFormData.location.trim() || !editFormData.contact.trim()) {
      setEditError('All fields are required.');
      return;
    }

    setSavingEdit(true);
    setEditError('');
    try {
      const res = await apiRequest(`/items/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: editFormData.description.trim(),
          location: editFormData.location.trim(),
          contact: editFormData.contact.trim()
        })
      });

      setReports((prev) =>
        prev.map((r) => (r.id === editingItem.id ? { ...r, ...res.data } : r))
      );

      setActionMessage({
        type: 'success',
        text: `Report "${editingItem.itemName}" updated successfully.`
      });
      setEditingItem(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update report.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete report
  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete the report for "${item.itemName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(item.id);
    setActionMessage(null);
    try {
      await apiRequest(`/items/${item.id}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((r) => r.id !== item.id));
      setActionMessage({
        type: 'success',
        text: `Report "${item.itemName}" was deleted successfully.`
      });
    } catch (err) {
      setActionMessage({
        type: 'danger',
        text: err.message || `Failed to delete report "${item.itemName}".`
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter items
  const filteredReports = reports.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesType && matchesStatus;
  });

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="mb-1 fw-bold">My Campus Reports</h2>
          <p className="text-muted mb-0">
            Manage your submitted lost and found reports, update item statuses, or edit details.
          </p>
        </div>
        <div className="mt-2 mt-sm-0">
          <Link to="/report" className="btn btn-primary">
            + Report Another Item
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type} alert-dismissible fade show`} role="alert">
          {actionMessage.text}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setActionMessage(null)}
          ></button>
        </div>
      )}

      {/* Filter controls */}
      <div className="row g-2 mb-4 align-items-center">
        <div className="col-auto">
          <div className="btn-group" role="group" aria-label="Type filter">
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilterType('all')}
            >
              All Types ({reports.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'lost' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setFilterType('lost')}
            >
              Lost Items ({reports.filter((r) => r.type === 'lost').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterType === 'found' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setFilterType('found')}
            >
              Found Items ({reports.filter((r) => r.type === 'found').length})
            </button>
          </div>
        </div>

        <div className="col-auto ms-auto">
          <select
            className="form-select form-select-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading reports...</span>
          </div>
          <p className="mt-2 text-muted">Loading your reports from database...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
          <button className="btn btn-outline-danger btn-sm ms-3" onClick={fetchMyReports}>
            Retry
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="card text-center py-5">
          <div className="card-body">
            <h5 className="card-title fw-bold">No Reports Found</h5>
            <p className="text-muted">
              {reports.length === 0
                ? "You haven't submitted any lost or found reports yet."
                : 'No reports match the selected filters.'}
            </p>
            <Link to="/report" className="btn btn-primary mt-2">
              Submit a Report Now
            </Link>
          </div>
        </div>
      ) : (
        <div className="table-responsive card">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '70px' }}>Image</th>
                <th>Item &amp; Details</th>
                <th>Type</th>
                <th>Category</th>
                <th>Date</th>
                <th>Current Status</th>
                <th className="text-end" style={{ minWidth: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((item) => (
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
                  <td>
                    <div className="fw-bold">{item.itemName}</div>
                    <small className="text-muted d-block text-truncate" style={{ maxWidth: '280px' }}>
                      {item.description}
                    </small>
                    <small className="text-muted">
                      <strong>Location:</strong> {item.location}
                    </small>
                  </td>
                  <td>
                    <span className={`badge ${item.type === 'lost' ? 'bg-danger' : 'bg-success'}`}>
                      {item.type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === 'resolved' ? 'bg-success' : 'bg-warning text-dark'
                      }`}
                    >
                      {item.status === 'resolved' ? 'Resolved' : 'Active'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn ${
                          item.status === 'resolved' ? 'btn-outline-warning' : 'btn-outline-success'
                        }`}
                        onClick={() => handleToggleStatus(item)}
                        disabled={updatingId === item.id}
                        title={item.status === 'resolved' ? 'Reopen as Active' : 'Mark as Resolved'}
                      >
                        {updatingId === item.id
                          ? 'Updating...'
                          : item.status === 'resolved'
                          ? 'Reopen'
                          : 'Mark Resolved'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => handleStartEdit(item)}
                        disabled={updatingId === item.id || deletingId === item.id}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Edit Report: {editingItem.itemName}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setEditingItem(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body">
                  {editError && <div className="alert alert-danger py-2">{editError}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={editFormData.description}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, description: e.target.value })
                      }
                      required
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Campus Location *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.location}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, location: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Contact Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editFormData.contact}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, contact: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingItem(null)}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyReports;
