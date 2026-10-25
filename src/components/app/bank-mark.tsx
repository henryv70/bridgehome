import { useState } from 'react';
import { Landmark, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { institution } from '@/lib/banks';

export function BankMark({ name, className }: { name: string; className?: string }) {
  const inst = institution(name);
  const [failedSrc, setFailedSrc] = useState<string>();
  const logo = inst?.logo;
  const Fallback = inst?.kind === 'wallet' ? Smartphone : Landmark;
  return (
    <span aria-hidden="true" className={cn('inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white p-1 text-[#176b45]', className)}>
      {logo && logo !== failedSrc ? (
        <img src={logo} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" onError={() => setFailedSrc(logo)} />
      ) : <Fallback className="size-5" />}
    </span>
  );
}
