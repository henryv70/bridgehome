import { useId } from 'react';
import { cn } from '@/lib/utils';

// Decorative family-home keepsake, drawn as vectors for crisp rendering in the WebView.
export function SupportIllustration({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 180" fill="none" aria-hidden="true" className={cn('w-40', className)}>
      <defs>
        <linearGradient id={id} x1="35" y1="20" x2="170" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".9" /><stop offset=".5" stopColor="#b4eee4" stopOpacity=".3" /><stop offset="1" stopColor="#a0d9e2" stopOpacity=".8" />
        </linearGradient>
      </defs>
      <ellipse cx="101" cy="164" rx="56" ry="7" fill="#007f91" opacity=".08" />
      <circle cx="100" cy="89" r="73" fill={`url(#${id})`} stroke="#9ed6d3" strokeWidth="2" />
      <circle cx="100" cy="89" r="67" stroke="white" strokeOpacity=".8" strokeWidth="2" />
      <path d="M46 70a58 58 0 0 1 41-38" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="103" cy="134" rx="48" ry="9" fill="#65c8b5" opacity=".4" />
      <path d="M67 89 102 60l34 29v46H67Z" fill="#ffbda2" />
      <path d="m62 90 40-35 41 35" stroke="#f26b59" strokeWidth="10" strokeLinejoin="round" />
      <path d="M97 106h16v29H97z" fill="#007f91" /><path d="M77 98h12v14H77zM119 98h10v14h-10z" fill="#fff6d4" />
      <path d="M82 98v14m-5-7h12m35-7v14m-5-7h10" stroke="#e4aa85" strokeWidth="2" />
      <path d="M144 121v-29" stroke="#32866e" strokeWidth="3" />
      <ellipse cx="138" cy="98" rx="6" ry="11" transform="rotate(-35 138 98)" fill="#4ab58b" />
      <ellipse cx="151" cy="91" rx="6" ry="11" transform="rotate(35 151 91)" fill="#85c855" />
      <path d="M134 117h21l-3 19h-15z" fill="#00a7b6" />
      <rect x="48" y="116" width="27" height="19" rx="3" fill="#f5cc55" transform="rotate(-12 48 116)" />
      <path d="m54 121 10 5 7-8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M109 40c-7-10-21 1-1 13 20-12 6-23 1-13Z" fill="#f26b79" />
      <path d="m157 52 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#00a7b6" />
    </svg>
  );
}
