import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useAppStore from './store/appStore';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Toast from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import LabAdminDashboard from './pages/LabAdminDashboard';
import StoreDashboard from './pages/StoreDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentBorrowingsPage from './pages/StudentBorrowingsPage';
import StudentLabDetail from './pages/StudentLabDetail';
import StudentStorePage from './pages/StudentStorePage';
import NotFound from './pages/NotFound';
import socket from './services/socket';
import './index.css';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [darkMode, setDarkMode] = useState(localStorage.getItem('pharmlab-dark') === 'true');

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const ensureAuth = useAuthStore((state) => state.ensureAuth);
  const logout = useAuthStore((state) => state.logout);

  const toast = useAppStore((state) => state.toast);
  const removeToast = useAppStore((state) => state.removeToast);
  const setToast = useAppStore((state) => state.setToast);
  const setHighlight = useAppStore((state) => state.setHighlight);

  useEffect(() => {
    ensureAuth();
  }, [ensureAuth]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('pharmlab-dark', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('inventory.updated', (payload) => {
      setToast({ type: 'success', message: `${payload.name || 'Item'} updated` });
      setHighlight(payload.id || payload.name);
    });

    socket.on('store:new_request', (payload) => {
      // Notify all users and refresh store allotments for store admin
      if (user?.role === 'store-admin') {
        setToast({ 
          type: 'info', 
          message: `New store request: ${payload.itemName} from ${payload.studentName}` 
        });
        const appStore = useAppStore.getState();
        appStore.fetchStoreAllotments();
      }
    });

    socket.on('store:request_approved', (payload) => {
      setToast({ 
        type: 'success', 
        message: `Store request approved: ${payload.itemName} for ${payload.studentName}` 
      });
      // Refresh store allotments if on store admin dashboard
      if (user?.role === 'store-admin') {
        const appStore = useAppStore.getState();
        appStore.fetchStoreAllotments();
      }
    });

    socket.on('store:request_rejected', (payload) => {
      setToast({ 
        type: 'warning', 
        message: `Store request rejected: ${payload.itemName} for ${payload.studentName}` 
      });
      // Refresh store allotments if on store admin dashboard
      if (user?.role === 'store-admin') {
        const appStore = useAppStore.getState();
        appStore.fetchStoreAllotments();
      }
    });

    return () => {
      socket.off('inventory.updated');
      socket.off('store:new_request');
      socket.off('store:request_approved');
      socket.off('store:request_rejected');
    };
  }, [setHighlight, setToast, user]);

  if (!initialized) {
    return (
      <div className='grid min-h-screen place-items-center bg-[#fdfdf7] text-sm text-[#71805a] dark:bg-[#1a1d16] dark:text-[#c5d0b5]'>
        Loading...
      </div>
    );
  }

  const role = user?.role || 'student';

  return (
    <Router>
      <Routes>
        <Route path='/login' element={user ? <Navigate to='/' replace /> : <LoginPage />} />
        <Route path='/register' element={user ? <Navigate to='/' replace /> : <RegisterPage />} />
        <Route
          path='*'
          element={!user ? (
            <Navigate to='/login' replace />
          ) : (
            <div className='min-h-screen bg-[#fdfdf7] text-[#3c4e23] dark:bg-[#1a1d16] dark:text-[#eef4e8]'>
              <Sidebar collapsed={sidebarCollapsed} />
              {!sidebarCollapsed ? <div className='fixed inset-0 z-10 bg-[#23281d]/20 md:hidden' onClick={() => setSidebarCollapsed(true)} /> : null}
              <div className={sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-72'}>
                <Navbar onToggleSidebar={() => setSidebarCollapsed((value) => !value)} isDark={darkMode} toggleTheme={() => setDarkMode((value) => !value)} />
                <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
                  <Routes>
                    <Route index element={role === 'super-admin' ? <SuperAdminDashboard /> : role === 'lab-admin' ? <LabAdminDashboard /> : role === 'store-admin' ? <StoreDashboard /> : <StudentDashboard />} />
                    <Route path='labs' element={role === 'super-admin' ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='inventory' element={role === 'lab-admin' ? <LabAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='analytics' element={role === 'lab-admin' ? <LabAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='transactions' element={role === 'lab-admin' ? <LabAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='store-dashboard' element={role === 'store-admin' ? <StoreDashboard /> : <Navigate to='/' replace />} />
                    <Route path='store' element={role === 'student' ? <StudentStorePage /> : <Navigate to='/' replace />} />
                    <Route path='my-borrowings' element={role === 'student' ? <StudentBorrowingsPage /> : <Navigate to='/' replace />} />
                    <Route path='approval' element={role === 'super-admin' ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='activity' element={role === 'super-admin' ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='labs/:id' element={role === 'student' ? <StudentLabDetail /> : <Navigate to='/' replace />} />
                    <Route path='*' element={<NotFound />} />
                  </Routes>
                  <div className='mt-8'>
                    <button className='text-xs text-[#71805a] hover:text-[#556b2f] dark:text-[#c5d0b5]' onClick={logout}>Logout</button>
                  </div>
                </main>
              </div>
              {toast && <Toast {...toast} onClose={removeToast} />}
            </div>
          )}
        />
      </Routes>
    </Router>
  );
}

export default App;
