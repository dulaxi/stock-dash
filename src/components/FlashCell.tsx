import { useRef, useEffect, useState } from 'react';

function useFlash(value: number | undefined) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (prevValue.current != null && value != null && value !== prevValue.current) {
      setFlash(value > prevValue.current ? 'up' : 'down');
      const timeout = setTimeout(() => setFlash(null), 600);
      prevValue.current = value;
      return () => clearTimeout(timeout);
    }
    prevValue.current = value;
  }, [value]);

  return flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : '';
}

interface FlashCellProps {
  value: number | undefined;
  children: React.ReactNode;
  className?: string;
}

export function FlashCell({ value, children, className = '' }: FlashCellProps) {
  const flashClass = useFlash(value);
  return <td className={`${className} ${flashClass}`}>{children}</td>;
}

interface FlashDivProps {
  value: number | undefined;
  children: React.ReactNode;
  className?: string;
}

export function FlashDiv({ value, children, className = '' }: FlashDivProps) {
  const flashClass = useFlash(value);
  return <div className={`${className} ${flashClass}`}>{children}</div>;
}
