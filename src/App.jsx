import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LostItems from './pages/LostItems';
import FoundItems from './pages/FoundItems';
import ReportItem from './pages/ReportItem';
import Login from './pages/Login';
import Register from './pages/Register';
import MyReports from './pages/MyReports';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lost-items" element={<LostItems />} />
            <Route path="/found-items" element={<FoundItems />} />
            <Route path="/report" element={<ReportItem />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
