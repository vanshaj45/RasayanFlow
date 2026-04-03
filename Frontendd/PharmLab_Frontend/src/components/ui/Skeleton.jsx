export default function Skeleton({ className = 'h-6', ...props }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} {...props} />;
}
