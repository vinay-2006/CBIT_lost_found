import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long.';
    }

    // Institutional email validation: must end with @cbit.ac.in
    const cbitEmailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*cbit\.ac\.in$/i;
    if (!formData.email.trim()) {
      newErrors.email = 'Institutional email is required.';
    } else if (!cbitEmailRegex.test(formData.email.trim())) {
      newErrors.email = 'Must be an official CBIT institutional email address (ending with @cbit.ac.in).';
    }

    // Roll number validation: 10 to 12 alphanumeric characters (e.g. 23A91A0501 or 160121733001)
    const rollNoRegex = /^[0-9]{2}[A-Za-z0-9]{8,10}$/i;
    if (!formData.rollNo.trim()) {
      newErrors.rollNo = 'Roll number is required.';
    } else if (!rollNoRegex.test(formData.rollNo.trim())) {
      newErrors.rollNo = 'Enter a valid student roll number (e.g. 23A91A0501 or 160121733001).';
    }

    // Password strength: at least 8 chars, at least one letter and one number
    const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    } else if (!passwordStrengthRegex.test(formData.password)) {
      newErrors.password = 'Password must contain at least one letter and at least one number.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        rollNo: formData.rollNo.trim(),
        password: formData.password
      });
      navigate('/my-reports', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-5 mb-5" style={{ maxWidth: '560px' }}>
      <div className="card">
        <div className="card-header bg-primary text-white text-center py-3">
          <h4 className="mb-0 fw-bold">Student Registration</h4>
          <small>Create your CBIT Lost &amp; Found account</small>
        </div>
        <div className="card-body p-4">
          <div className="alert alert-light border mb-4 py-2 small">
            <strong>Domain Validation Notice:</strong> Account registration verifies the institutional email domain format (<code>@cbit.ac.in</code>) to ensure campus affiliation.
          </div>

          {serverError && (
            <div className="alert alert-danger py-2" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="regName" className="form-label fw-semibold">
                Full Name *
              </label>
              <input
                type="text"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                id="regName"
                name="name"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="regEmail" className="form-label fw-semibold">
                CBIT Institutional Email *
              </label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                id="regEmail"
                name="email"
                placeholder="e.g. rahul.sharma@cbit.ac.in"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <div className="form-text">Must be your official college email ending in @cbit.ac.in</div>
              {errors.email && <div className="invalid-feedback">{errors.email}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="regRollNo" className="form-label fw-semibold">
                Roll Number *
              </label>
              <input
                type="text"
                className={`form-control ${errors.rollNo ? 'is-invalid' : ''}`}
                id="regRollNo"
                name="rollNo"
                placeholder="e.g. 23A91A0501"
                value={formData.rollNo}
                onChange={handleChange}
                required
              />
              <div className="form-text">e.g. 23A91A0501 or 160121733001</div>
              {errors.rollNo && <div className="invalid-feedback">{errors.rollNo}</div>}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="regPassword" className="form-label fw-semibold">
                  Password *
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  id="regPassword"
                  name="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>

              <div className="col-md-6 mb-3">
                <label htmlFor="regConfirmPassword" className="form-label fw-semibold">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  id="regConfirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {errors.confirmPassword && (
                  <div className="invalid-feedback">{errors.confirmPassword}</div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-bold mt-2"
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <hr className="my-4" />

          <div className="text-center">
            <p className="mb-1 text-muted">Already have a student account?</p>
            <Link to="/login" className="btn btn-outline-secondary btn-sm">
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
