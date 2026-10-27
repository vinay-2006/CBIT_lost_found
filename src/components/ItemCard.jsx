import { useState, useEffect } from 'react';
import { getImageUrl, apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ItemCard({ item, onStatusChange, onClick }) {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(item.status || 'active');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep internal status synced with parent item prop
  useEffect(() => {
    setCurrentStatus(item.status || 'active');
  }, [item.status]);

  // Check if current user is owner or admin
  const isOwner = user && (String(user.id) === String(item.userId) || user.role === 'admin');

  // Format date for display
  const formattedDate = new Date(item.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handleToggleStatus = async (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const nextStatus = currentStatus === 'resolved' ? 'active' : 'resolved';
    setUpdating(true);
    setErrorMsg('');

    try {
      const res = await apiRequest(`/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });

      setCurrentStatus(res.data.status);
      if (onStatusChange) {
        onStatusChange({ ...item, status: res.data.status });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Status update failed.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(item);
    }
  };

  return (
    <div
      className={`card h-100 ${onClick ? 'item-card-clickable' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View details for ${item.itemName}` : undefined}
    >
      <img
        src={getImageUrl(item.image)}
        className="card-img-top item-card-img"
        alt={item.itemName}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/images/placeholder.svg';
        }}
      />
      <div className="card-body">
        <h5 className="card-title text-truncate" title={item.itemName}>
          {item.itemName}
        </h5>
        <p className="card-text mb-1">
          <strong>Category:</strong> {item.category}
        </p>
        <p className="card-text mb-1 text-truncate" title={item.location}>
          <strong>Location:</strong> {item.location}
        </p>
        <p className="card-text mb-1">
          <strong>Date:</strong> {formattedDate}
        </p>
        {item.rollNo && (
          <p className="card-text mb-1">
            <strong>Roll No:</strong> {item.rollNo}
          </p>
        )}
        <p className="card-text mb-0 text-truncate" title={item.reportedBy}>
          <strong>Reported by:</strong> {item.reportedBy}
        </p>

        {errorMsg && <div className="text-danger small mt-2">{errorMsg}</div>}
      </div>
      <div className="card-footer d-flex justify-content-between align-items-center">
        <span
          className={`badge ${
            currentStatus === 'resolved' ? 'bg-success' : 'bg-warning text-dark'
          }`}
        >
          {currentStatus === 'resolved' ? 'Resolved' : 'Active'}
        </span>

        {isOwner && (
          <button
            type="button"
            className={`btn btn-sm ${
              currentStatus === 'resolved' ? 'btn-outline-warning' : 'btn-outline-success'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(e);
            }}
            disabled={updating}
            title={currentStatus === 'resolved' ? 'Reopen report' : 'Mark as resolved'}
          >
            {updating ? 'Updating...' : currentStatus === 'resolved' ? 'Reopen' : 'Resolve'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ItemCard;
