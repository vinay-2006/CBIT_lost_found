import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getImageUrl, apiRequest } from '../services/api';

function FoundItemModal({ item, isOpen, onClose, onClaimSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentItem, setCurrentItem] = useState(item);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // Sync internal item when prop changes
  useEffect(() => {
    setCurrentItem(item);
    setClaimError('');
    setClaimSuccess('');
  }, [item]);

  // Handle ESC key press and scroll-lock background
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentItem) {
    return null;
  }

  const isResolved = currentItem.status === 'resolved';

  // Format date for display
  const formattedDate = currentItem.date
    ? new Date(currentItem.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : 'Unknown Date';

  const handleClaim = async () => {
    if (isResolved) return;
    setClaimError('');
    setClaimSuccess('');

    // 1. Authentication check
    if (!user) {
      // Unauthenticated student: redirect to login and preserve return location
      navigate('/login', {
        state: {
          from: `/found-items?claimItem=${currentItem.id}`,
          claimItemId: currentItem.id,
          message: 'Please sign in with your CBIT student account to claim this found item.'
        }
      });
      return;
    }

    // 2. Authenticated claim process
    setClaiming(true);
    try {
      const res = await apiRequest(`/items/${currentItem.id}/claim`, {
        method: 'POST'
      });

      const updated = res.data;
      setCurrentItem(updated);
      setClaimSuccess('✓ Item claimed successfully! This report has been marked as Resolved.');

      if (onClaimSuccess) {
        onClaimSuccess(updated);
      }
    } catch (err) {
      setClaimError(err.message || 'Unable to process claim. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      className="cbit-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="foundItemModalTitle"
    >
      <div
        className="cbit-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="cbit-modal-header bg-primary text-white p-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.25rem' }}>🔍</span>
            <span className="fw-bold fs-5">Found Item Details</span>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            aria-label="Close"
            onClick={onClose}
            id="closeFoundItemModalBtn"
          ></button>
        </div>

        {/* Modal Body */}
        <div className="cbit-modal-body p-4">
          {/* Item Image */}
          <div className="text-center mb-3 p-2 bg-light border" style={{ borderRadius: '6px' }}>
            <img
              src={getImageUrl(currentItem.image)}
              alt={currentItem.itemName}
              className="cbit-modal-img img-fluid shadow-sm"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/placeholder.svg';
              }}
            />
          </div>

          {/* Heading & Status Badges */}
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3 pb-2 border-bottom">
            <div>
              <h3 id="foundItemModalTitle" className="fw-bold mb-1 text-dark">
                {currentItem.itemName}
              </h3>
              <span className="badge bg-primary text-uppercase me-2" style={{ fontSize: '0.72rem' }}>
                Found Report #{currentItem.id}
              </span>
              <span className="badge bg-light text-dark border" style={{ fontSize: '0.72rem' }}>
                🏷️ {currentItem.category}
              </span>
            </div>
            <div>
              <span
                className={`badge px-3 py-2 fw-bold fs-6 ${
                  isResolved ? 'bg-success' : 'bg-warning text-dark'
                }`}
                id="modalStatusBadge"
              >
                {isResolved ? '✓ Resolved' : '● Active Found Item'}
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {claimError && (
            <div className="alert alert-danger py-2 mb-3 d-flex align-items-center gap-2" role="alert">
              <span>⚠️</span>
              <span>{claimError}</span>
            </div>
          )}

          {claimSuccess && (
            <div className="alert alert-success py-2 mb-3 d-flex align-items-center gap-2" role="alert">
              <span>🎉</span>
              <span>{claimSuccess}</span>
            </div>
          )}

          {/* Resolved / Claimed Banner */}
          {isResolved && (
            <div className="alert alert-success border-success p-3 mb-3">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="fs-5">✅</span>
                <strong className="fs-6">Item Recovered &amp; Resolved</strong>
              </div>
              <p className="mb-0 small text-muted">
                This item has been matched with its rightful owner and is no longer available for claiming.
              </p>
              {currentItem.claimedBy && (
                <div className="mt-2 pt-2 border-top small">
                  <strong>Claimed by:</strong> {currentItem.claimedBy.name}
                  {currentItem.claimedBy.rollNo && (
                    <span className="text-primary ms-1">({currentItem.claimedBy.rollNo})</span>
                  )}
                  {currentItem.claimedBy.claimedAt && (
                    <span className="text-muted ms-2">
                      on {new Date(currentItem.claimedBy.claimedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <div className="p-3 bg-light border h-100" style={{ borderRadius: '4px' }}>
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.72rem' }}>
                  📍 Location Found
                </small>
                <span className="fw-semibold text-dark fs-6">{currentItem.location}</span>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="p-3 bg-light border h-100" style={{ borderRadius: '4px' }}>
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.72rem' }}>
                  📅 Date Found
                </small>
                <span className="fw-semibold text-dark fs-6">{formattedDate}</span>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="p-3 bg-light border h-100" style={{ borderRadius: '4px' }}>
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.72rem' }}>
                  👤 Reported By
                </small>
                <span className="fw-semibold text-dark fs-6">{currentItem.reportedBy}</span>
                {currentItem.rollNo && (
                  <small className="text-muted d-block">Roll: {currentItem.rollNo}</small>
                )}
              </div>
            </div>

            <div className="col-sm-6">
              <div className="p-3 bg-light border h-100" style={{ borderRadius: '4px' }}>
                <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.72rem' }}>
                  🏢 Campus Institution
                </small>
                <span className="fw-semibold text-dark fs-6">CBIT Hyderabad</span>
              </div>
            </div>
          </div>

          {/* Item Description */}
          <div className="p-3 bg-light border mb-2" style={{ borderRadius: '4px' }}>
            <h6 className="fw-bold text-muted small text-uppercase mb-2">Item Description</h6>
            <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {currentItem.description || 'No detailed description provided.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="cbit-modal-footer bg-light p-3 border-top d-flex justify-content-between align-items-center">
          <button
            type="button"
            className="btn btn-outline-secondary px-3"
            onClick={onClose}
            id="modalCloseFooterBtn"
          >
            Close
          </button>

          {isResolved ? (
            <button
              type="button"
              className="btn btn-success fw-semibold px-3"
              disabled
              id="alreadyClaimedBtn"
            >
              ✓ Item Already Claimed
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary fw-bold px-4 py-2 shadow-sm d-flex align-items-center gap-2"
              onClick={handleClaim}
              disabled={claiming}
              id="claimThisItemBtn"
            >
              {claiming ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Verifying &amp; Claiming...</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.1rem' }}>🙋‍♂️</span>
                  <span>This Is My Item</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoundItemModal;
