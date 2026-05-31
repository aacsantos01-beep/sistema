import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import NewSale from './pages/NewSale';
import SaleList from './pages/SaleList';
import BudgetList from './pages/BudgetList';
import SellerList from './pages/SellerList';
import UserList from './pages/UserList';
import Settings from './pages/Settings';
import PayableList from './pages/PayableList';
import Trash from './pages/Trash';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/sales/new" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute adminOnly>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products" 
          element={
            <ProtectedRoute adminOnly>
              <ProductList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sellers" 
          element={
            <ProtectedRoute adminOnly>
              <SellerList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute adminOnly>
              <UserList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute adminOnly>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payables" 
          element={
            <ProtectedRoute adminOnly>
              <PayableList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/trash" 
          element={
            <ProtectedRoute adminOnly>
              <Trash />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/new" 
          element={
            <ProtectedRoute adminOnly>
              <ProductForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/edit/:id" 
          element={
            <ProtectedRoute adminOnly>
              <ProductForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sales" 
          element={
            <ProtectedRoute>
              <SaleList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/budgets" 
          element={
            <ProtectedRoute>
              <BudgetList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sales/new" 
          element={
            <ProtectedRoute>
              <NewSale />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/sales/new" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
