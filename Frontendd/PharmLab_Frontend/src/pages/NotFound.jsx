import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className='grid min-h-screen place-items-center bg-[#f6f7ef] dark:bg-[#1a1d16] px-4'>
      <div className='text-center'>
        <h1 className='text-5xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>404</h1>
        <p className='mt-2 text-[#71805a] dark:text-[#c5d0b5]'>Page not found</p>
        <Link to='/'><Button className='mt-4'>Go home</Button></Link>
      </div>
    </div>
  );
}
