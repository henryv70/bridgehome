import { cn } from '@/lib/utils';

// Decorative family-home keepsake, drawn as vectors for crisp rendering in the WebView.
export function SupportIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 180" fill="none" aria-hidden="true" className={cn('w-40', className)}>
      <ellipse cx="101" cy="164" rx="56" ry="7" fill="var(--brand)" opacity=".08" />
      <circle cx="100" cy="89" r="73" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      <ellipse cx="103" cy="134" rx="48" ry="9" fill="var(--chart-3)" opacity=".4" />
      <path d="M67 89 102 60l34 29v46H67Z" fill="var(--chart-2)" />
      <path d="m62 90 40-35 41 35" stroke="var(--brand)" strokeWidth="10" strokeLinejoin="round" />
      <path d="M97 106h16v29H97z" fill="var(--brand)" /><path d="M77 98h12v14H77zM119 98h10v14h-10z" fill="var(--background)" />
      <path d="M82 98v14m-5-7h12m35-7v14m-5-7h10" stroke="var(--foreground)" strokeWidth="2" />
      <path d="M144 121v-29" stroke="var(--chart-3)" strokeWidth="3" />
      <ellipse cx="138" cy="98" rx="6" ry="11" transform="rotate(-35 138 98)" fill="var(--chart-3)" />
      <ellipse cx="151" cy="91" rx="6" ry="11" transform="rotate(35 151 91)" fill="var(--chart-3)" />
      <path d="M134 117h21l-3 19h-15z" fill="var(--chart-2)" />
      <rect x="48" y="116" width="27" height="19" rx="3" fill="var(--chart-2)" transform="rotate(-12 48 116)" />
      <path d="m54 121 10 5 7-8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M109 40c-7-10-21 1-1 13 20-12 6-23 1-13Z" fill="var(--brand)" />
    </svg>
  );
}
