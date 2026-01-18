import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Lazy load pages
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const CreditCards = React.lazy(() => import('./features/credit-cards/CreditCardsPage'));
const CreditCardDetails = React.lazy(() => import('./features/credit-cards/CreditCardDetailsPage'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const AddEntry = React.lazy(() => import('./pages/AddEntry'));
const Bills = React.lazy(() => import('./features/bills/BillsPage'));
const Categories = React.lazy(() => import('./pages/Categories'));
const More = React.lazy(() => import('./pages/More'));
const Tags = React.lazy(() => import('./pages/Tags'));
const Goals = React.lazy(() => import('./pages/Goals'));

import { AnimatePresence } from 'framer-motion';
import { Loader } from './components/ui/Loader';

function App() {
  return (
    <React.Suspense fallback={<Loader fullPage text="Initializing" />}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/transactions/:id" element={<AddEntry />} />
              <Route path="/credit-cards" element={<CreditCards />} />
              <Route path="/credit-cards/:id" element={<CreditCardDetails />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/add" element={<AddEntry />} />
              <Route path="/settings/categories" element={<Categories />} />
              <Route path="/more" element={<More />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/goals" element={<Goals />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </React.Suspense>
  );
}

export default App;
