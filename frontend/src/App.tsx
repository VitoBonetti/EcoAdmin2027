import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import MyCompany from './pages/MyCompany';
import Categories from './pages/costs/Categories';
import Descriptions from './pages/costs/Descriptions';
import Costs from './pages/costs/Costs';
import Entries from './pages/entries/Entries';
import Taxes from './pages/Taxes'
import Layout from './components/Layout';
// NEW: Import the Profile page we are about to create
import Profile from './pages/Profile';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let [resource, config] = args;

      config = config || {};
      config.credentials = 'include';

      const response = await originalFetch(resource, config);
      if (response.status === 401) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return response;
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes wrapped in the Layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="costs" element={<Costs />} />
          <Route path="costs/categories" element={<Categories />} />
          <Route path="costs/descriptions" element={<Descriptions />} />
          <Route path="entries" element={<Entries />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="company" element={<MyCompany />} />
          <Route path="taxes" element={<Taxes />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}