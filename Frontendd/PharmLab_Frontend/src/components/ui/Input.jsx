import clsx from 'clsx';

export default function Input({ label, className, id, type='text', ...props }) {
  return (
    <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
      <span className='block mb-1 text-xs font-medium tracking-wide'>{label}</span>
      <input
        id={id}
        type={type}
        className={clsx('w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] transition placeholder:text-[#95a381] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] dark:placeholder:text-[#8d9a77]', className)}
        {...props}
      />
    </label>
  );
}
