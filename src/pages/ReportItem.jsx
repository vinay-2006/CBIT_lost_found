import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ReportItem() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('lost');
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    description: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    reportedBy: user?.name || '',
    rollNo: user?.rollNo || '',
    contact: '',
    email: user?.email || ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync authenticated user info when user changes or loads
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        reportedBy: user.name || prev.reportedBy,
        email: user.email || prev.email,
        rollNo: user.rollNo || prev.rollNo
      }));
    }
  }, [user]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image file selection using FileReader
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setImagePreview(null);
    }
  };

  // Form validation using JavaScript and Regular Expressions
  const validate = () => {
    const newErrors = {};

    if (!user) {
      newErrors.submit = 'You must be signed in with your CBIT student account to submit a report.';
      setErrors(newErrors);
      return false;
    }

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required.';
    }
    if (!formData.category) {
      newErrors.category = 'Please select a category.';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required.';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required.';
    }
    if (!formData.reportedBy.trim()) {
      newErrors.reportedBy = 'Your name is required.';
    }

    // Roll number required only for lost items
    if (reportType === 'lost' && !formData.rollNo.trim()) {
      newErrors.rollNo = 'Roll number is required for lost item reports.';
    }

    // Phone validation using regex - Indian mobile number (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required.';
    } else if (!phoneRegex.test(formData.contact.trim())) {
      newErrors.contact = 'Enter a valid 10-digit Indian mobile number.';
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = imagePreview || '';

      // If an image file was selected, upload it to backend storage
      if (selectedFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('image', selectedFile);
          const uploadRes = await apiRequest('/upload', {
            method: 'POST',
            body: uploadFormData
          });
          if (uploadRes?.data?.url) {
            finalImageUrl = uploadRes.data.url;
          }
        } catch (uploadErr) {
          console.warn('Image upload endpoint unavailable, using preview URL:', uploadErr);
        }
      }

      // Payload matching backend API
      const newItem = {
        type: reportType,
        itemName: formData.itemName.trim(),
        category: formData.category,
        description: formData.description.trim(),
        location: formData.location.trim(),
        date: formData.date,
        reportedBy: formData.reportedBy.trim(),
        rollNo: reportType === 'lost' ? formData.rollNo.trim() : '',
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        image: finalImageUrl,
        status: 'active'
      };

      // Persist directly via authenticated backend API
      await apiRequest('/items', {
        method: 'POST',
        body: JSON.stringify(newItem)
      });

      setSuccessMsg('Report submitted successfully! You can view and manage it under "My Reports".');

      // Reset form
      setFormData({
        itemName: '',
        category: '',
        description: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        reportedBy: user?.name || '',
        rollNo: user?.rollNo || '',
        contact: '',
        email: user?.email || ''
      });
      setSelectedFile(null);
      setImagePreview(null);
      setErrors({});

      const fileInput = document.getElementById('imageInput');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Submission error:', err);
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to submit report. Please try again.'
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-4 mb-5" style={{ maxWidth: '780px' }}>
      <div className="text-center mb-4">
        <h2 className="fw-bold">Report an Item</h2>
        <p className="text-muted">
          Submit details about an item you lost or found on the CBIT campus.
        </p>
      </div>

      {/* Guest warning banner if not authenticated */}
      {!user && (
        <div className="alert alert-warning border mb-4" role="alert">
          <h5 className="alert-heading fw-bold mb-1">Student Authentication Required</h5>
          <p className="mb-2">
            You must be logged in with your CBIT student account to submit reports, track status changes, and verify ownership.
          </p>
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-warning btn-sm fw-bold">
              Sign In to Report
            </Link>
            <Link to="/register" className="btn btn-outline-dark btn-sm">
              Register Student Account
            </Link>
          </div>
        </div>
      )}

      {/* Authenticated user indicator */}
      {user && (
        <div className="alert alert-light border d-flex justify-content-between align-items-center mb-4 py-2">
          <div>
            <span className="badge bg-primary me-2">Authenticated</span>
            Reporting as <strong>{user.name}</strong> ({user.rollNo || user.email})
          </div>
          <Link to="/my-reports" className="btn btn-outline-primary btn-sm">
            View My Reports
          </Link>
        </div>
      )}

      {/* Report type toggle */}
      <div className="btn-group mb-4 w-100" role="group" aria-label="Report type">
        <button
          type="button"
          className={`btn py-2 fw-bold report-type-btn ${
            reportType === 'lost' ? 'btn-danger text-white' : 'btn-outline-danger'
          }`}
          onClick={() => {
            setReportType('lost');
            setErrors({});
            setSuccessMsg('');
          }}
        >
          I Lost an Item
        </button>
        <button
          type="button"
          className={`btn py-2 fw-bold report-type-btn ${
            reportType === 'found' ? 'btn-success text-white' : 'btn-outline-success'
          }`}
          onClick={() => {
            setReportType('found');
            setErrors({});
            setSuccessMsg('');
          }}
        >
          I Found an Item
        </button>
      </div>

      {/* Success alert */}
      {successMsg && (
        <div className="alert alert-success d-flex justify-content-between align-items-center" role="alert">
          <div>{successMsg}</div>
          <Link to="/my-reports" className="btn btn-success btn-sm ms-2">
            Go to My Reports
          </Link>
        </div>
      )}

      {/* Error alert */}
      {errors.submit && (
        <div className="alert alert-danger" role="alert">
          {errors.submit}
        </div>
      )}

      {/* Report form */}
      <div className="card">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="itemName" className="form-label fw-semibold">
                  Item Name *
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.itemName ? 'is-invalid' : ''}`}
                  id="itemName"
                  name="itemName"
                  placeholder="e.g. Casio Scientific Calculator"
                  value={formData.itemName}
                  onChange={handleChange}
                  disabled={!user}
                />
                {errors.itemName && <div className="invalid-feedback">{errors.itemName}</div>}
              </div>

              <div className="col-md-6 mb-3">
                <label htmlFor="category" className="form-label fw-semibold">
                  Category *
                </label>
                <select
                  className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={!user}
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Documents">Documents</option>
                  <option value="Books">Books</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Others">Others</option>
                </select>
                {errors.category && <div className="invalid-feedback">{errors.category}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label fw-semibold">
                Detailed Description *
              </label>
              <textarea
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                id="description"
                name="description"
                rows="3"
                placeholder="Include color, model, distinguishing stickers, markings, or conditions..."
                value={formData.description}
                onChange={handleChange}
                disabled={!user}
              ></textarea>
              {errors.description && <div className="invalid-feedback">{errors.description}</div>}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="location" className="form-label fw-semibold">
                  Campus Location *
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.location ? 'is-invalid' : ''}`}
                  id="location"
                  name="location"
                  placeholder="e.g. Library 2nd Floor or CAD Lab 1"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={!user}
                />
                {errors.location && <div className="invalid-feedback">{errors.location}</div>}
              </div>

              <div className="col-md-6 mb-3">
                <label htmlFor="date" className="form-label fw-semibold">
                  {reportType === 'lost' ? 'Date Lost' : 'Date Found'} *
                </label>
                <input
                  type="date"
                  className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={!user}
                />
                {errors.date && <div className="invalid-feedback">{errors.date}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="reportedBy" className="form-label fw-semibold">
                  Reporter Name *
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.reportedBy ? 'is-invalid' : ''}`}
                  id="reportedBy"
                  name="reportedBy"
                  value={formData.reportedBy}
                  onChange={handleChange}
                  disabled={!user}
                  readOnly={!!user?.name}
                />
                {errors.reportedBy && <div className="invalid-feedback">{errors.reportedBy}</div>}
              </div>

              {/* Roll Number - shown for Lost reports */}
              {reportType === 'lost' && (
                <div className="col-md-6 mb-3">
                  <label htmlFor="rollNo" className="form-label fw-semibold">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.rollNo ? 'is-invalid' : ''}`}
                    id="rollNo"
                    name="rollNo"
                    value={formData.rollNo}
                    onChange={handleChange}
                    placeholder="e.g. 23A91A0501"
                    disabled={!user}
                    readOnly={!!user?.rollNo}
                  />
                  {errors.rollNo && <div className="invalid-feedback">{errors.rollNo}</div>}
                </div>
              )}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="contact" className="form-label fw-semibold">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  className={`form-control ${errors.contact ? 'is-invalid' : ''}`}
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  disabled={!user}
                />
                <div className="form-text">Must be a 10-digit Indian mobile number.</div>
                {errors.contact && <div className="invalid-feedback">{errors.contact}</div>}
              </div>

              <div className="col-md-6 mb-3">
                <label htmlFor="email" className="form-label fw-semibold">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!user}
                  readOnly={!!user?.email}
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
            </div>

            {/* Image upload */}
            <div className="mb-3">
              <label htmlFor="imageInput" className="form-label fw-semibold">
                Item Photo (Optional)
              </label>
              <input
                type="file"
                className="form-control"
                id="imageInput"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleImageChange}
                disabled={!user}
              />
              <div className="form-text">Accepted formats: JPG, PNG, WebP (Max 5MB)</div>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="mb-3">
                <p className="mb-1 fw-semibold">Image Preview:</p>
                <img src={imagePreview} alt="Preview" className="img-thumbnail image-preview" />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-bold mt-2"
              disabled={submitting || !user}
            >
              {submitting ? 'Submitting Report...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReportItem;
