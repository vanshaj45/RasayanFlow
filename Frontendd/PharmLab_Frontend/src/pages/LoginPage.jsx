import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, user } = useAuthStore((state) => ({ login: state.login, user: state.user }));
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message || '';

  if (user) {
    return <Navigate to='/' replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userFound = await login(form);
      if (userFound.role === 'super-admin') navigate('/');
      else if (userFound.role === 'lab-admin') navigate('/inventory');
      else navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    }
  };

  return (
    <div className='grid min-h-screen place-items-center bg-[#f6f7ef] px-4 dark:bg-[#1a1d16]'>
      <div className='w-full max-w-md rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-8 shadow-soft dark:border-[#414a33] dark:bg-[#20251a]'>
        <h1 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Welcome back</h1>
        <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Log in to your account</p>
        <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
          <Input label='Email' type='email' value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required />
          <Input label='Password' type='password' value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} required />
          {message && (
            <div className='rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
              {message}
            </div>
          )}
          {error && (
            <div className='flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300'>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <Button type='submit' className='w-full'>Sign in</Button>
        </form>
        <p className='mt-4 text-center text-sm text-[#71805a] dark:text-[#c5d0b5]'>
          Need an account?{' '}
          <Link to='/register' className='font-medium text-[#556b2f] hover:text-[#6f7d45]'>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
