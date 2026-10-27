import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import SearchBar from '../components/SearchBar';
import FoundItemModal from '../components/FoundItemModal';
import { apiRequest } from '../services/api';

function FoundItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchFoundItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/items?type=found&limit=100');
      const itemData = Array.isArray(res) ? res : res.data || [];
      setItems(itemData.filter((item) => item.type === 'found'));
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to load found items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoundItems();
  }, []);

  // Detect claim item requested via URL or navigation state (e.g. returning from login)
  useEffect(() => {
    if (loading || items.length === 0) return;

    const params = new URLSearchParams(location.search);
    const claimIdParam = params.get('claimItem') || params.get('id');
    const claimStateId = location.state?.claimItemId;
    const targetId = claimIdParam || claimStateId;

    if (targetId) {
      const match = items.find((i) => String(i.id) === String(targetId));
      if (match) {
        setSelectedItem(match);
      }
    }
  }, [loading, items, location.search, location.state]);

  const handleStatusChange = (updatedItem) => {
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  };

  const handleClaimSuccess = (updatedItem) => {
    handleStatusChange(updatedItem);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    const params = new URLSearchParams(location.search);
    if (params.has('claimItem') || params.has('id')) {
      params.delete('claimItem');
      params.delete('id');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      navigate(`/found-items${newQuery}`, { replace: true, state: {} });
    }
  };

  // Filter items based on search term, category, and status
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="container mt-5 text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading found items...</span>
        </div>
        <p className="mt-2 text-muted">Loading found items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          {error}
          <button className="btn btn-outline-danger btn-sm ms-3" onClick={fetchFoundItems}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h2 className="fw-bold mb-1">Found Items</h2>
          <p className="text-muted mb-0">
            Items found across campus awaiting recovery. Click any card to inspect details and claim your item.
          </p>
        </div>
        <div className="mt-2 mt-sm-0">
          <div className="btn-group btn-group-sm" role="group" aria-label="Status filter">
            <button
              type="button"
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setStatusFilter('all')}
            >
              All Statuses
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'active' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('active')}
            >
              Active Only
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'resolved' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved Only
            </button>
          </div>
        </div>
      </div>

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        category={category}
        onCategoryChange={setCategory}
      />

      {filteredItems.length === 0 ? (
        <div className="card text-center py-5 shadow-sm">
          <div className="card-body">
            <p className="text-muted mb-0">No found items match your filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="col-sm-6 col-md-4 col-lg-3">
              <ItemCard
                item={item}
                onStatusChange={handleStatusChange}
                onClick={() => setSelectedItem(item)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Found Item Details & Claim Modal */}
      <FoundItemModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={handleCloseModal}
        onClaimSuccess={handleClaimSuccess}
      />
    </div>
  );
}

export default FoundItems;
