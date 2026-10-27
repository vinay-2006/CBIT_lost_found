import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import { apiRequest, getImageUrl } from '../services/api';

function Dashboard() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/stats');
      setStatsData(res.data);
    } catch (err) {
      console.error('Fetch stats error:', err);
      setError('Unable to load dashboard analytics from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !statsData) {
    return (
      <div className="container mt-5 text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="mt-2 text-muted">Loading live campus analytics...</p>
      </div>
    );
  }

  if (error && !statsData) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          {error}
          <button className="btn btn-outline-danger btn-sm ms-3" onClick={fetchStats}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    summary = { total: 0, lost: 0, found: 0, resolved: 0, active: 0 },
    categoryBreakdown = [],
    monthlyDistribution = [],
    recentItems = []
  } = statsData || {};

  const maxCategoryCount = Math.max(...categoryBreakdown.map((c) => c.count), 1);
  const maxMonthCount = Math.max(...monthlyDistribution.map((m) => m.count), 1);

  return (
    <div className="container mt-4 mb-4">
      {/* College Heading */}
      <div className="text-center mb-4">
        <h1 className="fw-bold">College Lost &amp; Found Portal</h1>
        <p className="text-muted mb-1">
          A centralized platform for students and staff to report and recover lost belongings across campus.
        </p>
        <p className="text-muted small">
          CBIT &mdash; Chaitanya Bharathi Institute of Technology
        </p>
      </div>

      {/* Live Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard label="Lost Reports" value={summary.lost} color="danger" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Found Reports" value={summary.found} color="success" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Resolved Cases" value={summary.resolved} color="info" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Total Reports" value={summary.total} color="primary" />
        </div>
      </div>

      {/* Analytics Breakdown */}
      <div className="row mb-4">
        {/* Reports by Category */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold">Reports by Category</h5>
              <div className="mt-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="d-flex align-items-center mb-2">
                    <span className="analytics-label">{cat.name}</span>
                    <div className="analytics-bar-container flex-grow-1 mx-2">
                      <div
                        className="analytics-bar"
                        style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                      ></div>
                    </div>
                    <span className="analytics-count">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reports by Month */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold">Reports by Month</h5>
              <div className="mt-3">
                {monthlyDistribution.length === 0 ? (
                  <p className="text-muted small">No monthly data available yet.</p>
                ) : (
                  monthlyDistribution.map((month) => (
                    <div key={month.label || month.key} className="d-flex align-items-center mb-2">
                      <span className="analytics-label">{month.label}</span>
                      <div className="analytics-bar-container flex-grow-1 mx-2">
                        <div
                          className="analytics-bar bg-info"
                          style={{ width: `${(month.count / maxMonthCount) * 100}%` }}
                        ></div>
                      </div>
                      <span className="analytics-count">{month.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold">Recent Campus Reports</h5>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchStats}
          disabled={loading}
          title="Refresh analytics from server"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Data'}
        </button>
      </div>

      <div className="table-responsive card">
        <table className="table table-bordered table-striped align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: '60px' }}>Image</th>
              <th>Item</th>
              <th>Type</th>
              <th>Category</th>
              <th>Location</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  No reports available yet.
                </td>
              </tr>
            ) : (
              recentItems.map((item) => (
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
                  <td>{item.location}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
