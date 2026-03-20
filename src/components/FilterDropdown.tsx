import { useState, useRef, useEffect } from 'react';

interface FilterDropdownProps {
  label: string;
  active: boolean;  // true if this filter has non-default values
  children: React.ReactNode;
}

export default function FilterDropdown({ label, active, children }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        className={`filter-dropdown-btn ${active ? 'active' : ''} ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d={open ? 'M2 6L5 3L8 6' : 'M2 4L5 7L8 4'} />
        </svg>
      </button>
      {open && (
        <div className="filter-dropdown-menu">
          {children}
        </div>
      )}
    </div>
  );
}
