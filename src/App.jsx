import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PageMessage from './components/PageMessage';
import ProtectedRoute from './components/ProtectedRoute';
import { useTranslation } from './context/LanguageContext';
import Home from './pages/Home';
import RestaurantDetail from './pages/RestaurantDetail';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Profile from './pages/Profile';

// The restaurant portal is only for owners, and with drag and drop it's a
// large part of the code, so customers never download it. See main.jsx for
// what happens when it fails to load after a new deployment.
const Partner = lazy(() => import('./pages/Partner'));

function App() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <div className="flex-1">
        <Suspense fallback={<PageMessage>{t('common.loading')}</PageMessage>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/partner/:tab?" element={<Partner />} />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
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
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

export default App;
