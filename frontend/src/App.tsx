import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers'
import MyCompany from './pages/MyCompany';
import Layout from './components/Layout';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// A dummy component for the new empty pages
const DummyPage = ({ title }: { title: string }) => (
  <div className="animate-fade-in">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
    <div className="h-64 rounded-2xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border border-white/60 dark:border-gray-800/60 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
      Content for {title} will go here
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes wrapped in the Layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="costs" element={<DummyPage title="All Costs" />} />
          <Route path="costs/categories" element={<DummyPage title="Cost Categories" />} />
          <Route path="costs/descriptions" element={<DummyPage title="Cost Descriptions" />} />
          <Route path="entries" element={<DummyPage title="Entries" />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="company" element={<MyCompany />} />
          <Route path="users" element={<DummyPage title="Users Management" />} />
          <Route path="profile" element={<DummyPage title="Edit Profile" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}