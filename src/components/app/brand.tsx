import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn('size-7', className)}>
      <rect width="512" height="512" rx="112" className="fill-foreground" />
      <g fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" className="stroke-background">
        <path d="M112 328h288" /><path d="M128 328c34-80 82-120 128-120s94 40 128 120" /><path d="M192 250v78M256 208v120M320 250v78" />
      </g>
      <path d="M226 168l30-26 30 26" fill="none" stroke="var(--brand)" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}><Logo />BridgeHome</span>;
}
