import type { ReactNode } from 'react';
import type { Timestamp } from 'spacetimedb';
import { cn } from '@/lib/utils';
import { ago } from '@/lib/time';
import { Initials, Photo } from './kit';

export const EMOJIS = ['❤️', '🙏', '🎉'];

export type ReactionSummary = { emoji: string; count: number; mine: boolean };

export function summarize(rows: readonly { emoji: string; mine: boolean }[]): ReactionSummary[] {
  return EMOJIS.map(emoji => ({ emoji, count: rows.filter(r => r.emoji === emoji).length, mine: rows.some(r => r.emoji === emoji && r.mine) }));
}

export function PostCard({ photo, photoType, photoUrl, caption, author, context, createdAt, reactions, onReact, badge, menu }: {
  photo: Uint8Array; photoType: string; photoUrl?: string; caption: string; author: string; context?: ReactNode; createdAt: Timestamp;
  reactions: ReactionSummary[]; onReact?: (emoji: string) => void; badge?: ReactNode; menu?: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center gap-3 px-4 py-3">
        <Initials name={author} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{author}</p>
          <p className="truncate text-xs text-muted-foreground">{context ? <>{context} · </> : null}{ago(createdAt)}</p>
        </div>
        {badge}
        {menu}
      </header>
      <Photo bytes={photo} type={photoType} url={photoUrl} alt={caption} className="aspect-square w-full bg-muted" />
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-1.5">
          {reactions.map(r => (
            <button key={r.emoji} type="button" disabled={!onReact} onClick={() => onReact?.(r.emoji)} aria-pressed={r.mine}
              className={cn('tabular inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm transition enabled:hover:bg-muted', r.mine && 'border-foreground/30 bg-muted')}>
              <span>{r.emoji}</span>{r.count > 0 && <span className="text-xs text-muted-foreground">{r.count}</span>}
            </button>
          ))}
        </div>
        <p className="text-sm leading-relaxed"><span className="font-medium">{author}</span> {caption}</p>
      </div>
    </article>
  );
}
