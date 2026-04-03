import clsx from 'clsx';

export default function Table({ headers = [], rows = [], className }) {
  if (!rows.length) {
    return <div className='rounded-xl border border-dashed border-[#cfd8bd] px-5 py-10 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>No records found</div>;
  }

  const getCellValue = (row, header) => {
    const value = header.render ? header.render(row) : row[header.key];
    return value || '--';
  };

  return (
    <div className='space-y-3'>
      <div className='space-y-3 sm:hidden'>
        {rows.map((row) => (
          <div
            key={row.id}
            className={clsx(
              'rounded-xl border border-[#d9e1ca] bg-[#fffef8] p-4 shadow-soft dark:border-[#414a33] dark:bg-[#20251a]',
              row.highlight && 'bg-[#eef4e4] dark:bg-[#2b3421]'
            )}
          >
            <div className='space-y-3'>
              {headers.map((header) => (
                <div key={header.key} className='grid grid-cols-[minmax(0,88px)_1fr] items-start gap-3'>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>{header.label}</p>
                  <div className='min-w-0 break-words text-sm text-slate-700 dark:text-slate-100'>{getCellValue(row, header)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className='hidden overflow-x-auto rounded-xl border border-[#d9e1ca] shadow-soft dark:border-[#414a33] sm:block'>
      <table className={clsx('min-w-full table-auto text-left', className)}>
        <thead className='sticky top-0 bg-[#f4f5eb] dark:bg-[#242a1d]'>
          <tr>
            {headers.map((h) => (
              <th key={h.key} className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={clsx('border-t border-[#e3e9d8] dark:border-[#343b2b] transition duration-200', row.highlight && 'bg-[#eef4e4] dark:bg-[#2b3421]')}>
              {headers.map((h) => (
                <td key={h.key} className='px-4 py-3 text-sm text-slate-700 dark:text-slate-100'>{h.render ? h.render(row) : row[h.key] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
