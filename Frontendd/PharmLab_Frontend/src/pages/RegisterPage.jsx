import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const user = await register(form);
      const message =
        user.role === 'super-admin'
          ? 'Super admin account created. Please sign in.'
          : 'Account created. Once approved, you can sign in.';
      setSuccess(message);
      setTimeout(() => {
        navigate('/login', { state: { message } });
      }, 900);
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    }
  };

  return (
    <div className='grid min-h-screen place-items-center bg-[#f6f7ef] px-4 dark:bg-[#1a1d16]'>
      <div className='w-full max-w-md rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-8 shadow-soft dark:border-[#414a33] dark:bg-[#20251a]'>
        <h1 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Create account</h1>
        <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Students can sign up here. The reserved super-admin email will be created as super admin.</p>
        <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
          <Input label='Name' value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          <Input label='Email' type='email' value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required />
          <Input label='Password' type='password' value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} required minLength={6} />
          {error && (
            <div className='flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300'>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className='rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
              {success}
            </div>
          )}
          <Button type='submit' className='w-full' disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>
        <p className='mt-4 text-center text-sm text-[#71805a] dark:text-[#c5d0b5]'>
          Already have an account?{' '}
          <Link to='/login' className='font-medium text-[#556b2f] hover:text-[#6f7d45]'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
