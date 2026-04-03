import clsx from 'clsx';

const styles = {
  base: 'inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold leading-none whitespace-nowrap text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7d45] focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none',
  variants: {
    primary: 'border-transparent bg-[#556b2f] text-[#f0f4e8] hover:bg-[#6f7d45]',
    outline: 'border-[#cfd8bd] bg-white text-[#3c4e23] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] dark:hover:bg-[#2a3121]',
    danger: 'bg-red-500 text-white border-transparent hover:bg-red-400'
  }
};

export default function Button({ children, variant = 'primary', className, ...props }) {
  return (
    <button className={clsx(styles.base, styles.variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
