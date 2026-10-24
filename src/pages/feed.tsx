import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Camera, Globe, ImagePlus, Lock, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorText, useAction, useApp } from '@/lib/data';
import { t } from '@/lib/i18n';
import { compressPhoto } from '@/lib/photo';
import { byNewest } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AreaField, Drawer, Empty, PageHeader, SelectField, formValue } from '@/components/app/kit';
import { PostCard, summarize } from '@/components/app/post-card';
import { SupportBar } from '@/components/app/giving';
import { sum } from '@/lib/money';
import { toast } from 'sonner';

export default function Feed() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const open = params.get('new') === '1';
  const setOpen = (o: boolean) => setParams(o ? { new: '1' } : {});
  const { run } = useAction();
  const posts = [...app.posts].sort(byNewest);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('Moments')} subtitle={t('Photos of what support made possible.')} actions={<Button size="lg" onClick={() => setOpen(true)}><ImagePlus />{t('Share')}</Button>} />
      {posts.length ? (
        <div className="space-y-6">
          {posts.map(p => {
            const request = app.requests.find(r => r.id === p.requestId);
            const canManage = app.isMe(p.author) || app.isOwner;
            return (
              <PostCard key={String(p.id)} photo={p.photo} photoType={p.photoType} photoUrl={p.photoUrl} postId={p.id} caption={p.caption} author={app.nameOf(p.author)} createdAt={p.createdAt}
                context={request && <Link to={`/requests/${request.id}`} className="hover:underline">{t(request.category)}</Link>}
                support={request && (request.isPublic || app.contributions.some(c => c.requestId === request.id)) && (() => {
                  const ps = app.contributions.filter(c => c.requestId === request.id);
                  return <SupportBar pledged={sum(ps, c => c.amount)} goal={request.amount} currency={request.currency} supporters={ps.length} />;
                })()}
                reactions={summarize(app.reactions.filter(r => r.postId === p.id).map(r => ({ emoji: r.emoji, mine: app.isMe(r.identity) })))}
                onReact={emoji => run(() => app.reducers?.toggleReaction({ postId: p.id, emoji }))}
                badge={<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={p.visibility === 'public' ? t('Public') : t('Family only')}>
                  {p.visibility === 'public' ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                </span>}
                menu={canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={t('Post options')}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => run(() => app.reducers?.setPostVisibility({ postId: p.id, visibility: p.visibility === 'public' ? 'family' : 'public' }), p.visibility === 'public' ? 'Now family only' : 'Now public')}>
                        {p.visibility === 'public' ? <><Lock className="size-4" />{t('Make family only')}</> : <><Globe className="size-4" />{t('Make public')}</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => run(() => app.reducers?.deletePost({ postId: p.id }), 'Post removed')}><Trash2 className="size-4" />{t('Remove')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )} />
            );
          })}
        </div>
      ) : (
        <Empty icon={<Camera />} title={t('No moments yet')} action={<Button onClick={() => setOpen(true)}><ImagePlus />{t('Share the first one')}</Button>}>
          {t('A receipt, new school shoes, a fixed roof. Photos help everyone see the difference support makes.')}
        </Empty>
      )}
      <Drawer open={open} onOpenChange={setOpen} title={t('Share a moment')} description={t('Show your family how support helped.')}>
        <Composer onDone={() => setOpen(false)} />
      </Drawer>
    </div>
  );
}

function Composer({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ bytes: Uint8Array; type: string; url: string }>();
  const [processing, setProcessing] = useState(false);
  const [visibility, setVisibility] = useState('family');
  const requests = [...app.requests].filter(r => r.status !== 'draft').sort(byNewest).slice(0, 20);

  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (!photo) return toast.error(t('Choose a photo first.'));
      const f = new FormData(e.currentTarget);
      if (await run(() => app.reducers?.createPost({
        groupId: app.group!.id, requestId: BigInt(formValue(f, 'requestId') || '0'), caption: formValue(f, 'caption'), visibility, photo: photo.bytes, photoType: photo.type,
      }), 'Shared')) onDone();
    }}>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProcessing(true);
        try { setPhoto(await compressPhoto(file)); } catch (err) { toast.error(errorText(err)); } finally { setProcessing(false); }
      }} />
      <button type="button" onClick={() => input.current?.click()}
        className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/40 text-sm text-muted-foreground transition hover:bg-muted">
        {photo ? <img src={photo.url} alt={t('Selected')} className="size-full object-cover" />
          : <span className="flex flex-col items-center gap-2"><Camera className="size-6" />{processing ? t('Preparing photo…') : t('Take or choose a photo')}</span>}
      </button>
      <AreaField name="caption" label={t('Caption')} placeholder={t("What's happening here?")} required maxLength={500} />
      <SelectField name="requestId" label={t('Related request (optional)')} options={[['0', t('None')], ...requests.map(r => [String(r.id), `${t(r.category)} · ${app.nameOf(r.author)}`] as [string, string])]} />
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium">{t('Who can see it')}</p>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          {([['family', 'Family only', Lock], ['public', 'Public', Globe]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" onClick={() => setVisibility(v)}
              className={cn('flex items-center justify-center gap-2 rounded-xl border p-3 text-sm', visibility === v && 'border-foreground ring-1 ring-foreground')}>
              <Icon className="size-4" />{t(label)}
            </button>
          ))}
        </div>
        {visibility === 'public' && <p className="text-xs text-muted-foreground">{app.group?.isPublic ? t('Anyone with your public page link can see it.') : t("Your family's public page is off. It will appear once the owner turns it on.")} {t('Avoid account numbers, IDs, or addresses in photos.')}</p>}
      </div>
      <Button size="lg" className="h-11 w-full" disabled={busy || processing || !photo}>{t('Share')}</Button>
    </form>
  );
}
