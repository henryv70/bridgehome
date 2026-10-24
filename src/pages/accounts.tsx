import { useState } from 'react';
import { Landmark, Plus, ShieldCheck, Smartphone } from 'lucide-react';
import { useApp } from '@/lib/data';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Drawer, Empty, PageHeader, Section } from '@/components/app/kit';
import { AccountList, AddPayoutFlow, DemoBadge, LinkBankFlow } from '@/components/app/accounts';

export default function Accounts() {
  const { myAccounts, role } = useApp();
  const [sheet, setSheet] = useState<'send' | 'receive' | null>(null);
  const sending = myAccounts.filter(a => a.purpose === 'send');
  const receiving = myAccounts.filter(a => a.purpose === 'receive');
  const close = () => setSheet(null);

  const sendSection = (
    <Section key="send" title={t('Send from')} action={<Button variant="ghost" size="sm" onClick={() => setSheet('send')}><Plus />{t('Link a bank')}</Button>}>
      {sending.length ? <AccountList list={sending} /> : (
        <Empty icon={<Landmark />} title={t('No bank linked')} action={<Button onClick={() => setSheet('send')}><Plus />{t('Link a bank')}</Button>}>
          {t("Link your bank to send money straight into a relative's bank or mobile wallet with BridgeHome Pay.")}
        </Empty>
      )}
    </Section>
  );
  const receiveSection = (
    <Section key="receive" title={t('Receive to')} action={<Button variant="ghost" size="sm" onClick={() => setSheet('receive')}><Plus />{t('Add account')}</Button>}>
      {receiving.length ? <AccountList list={receiving} /> : (
        <Empty icon={<Smartphone />} title={t('No receiving account')} action={<Button onClick={() => setSheet('receive')}><Plus />{t('Add bank or wallet')}</Button>}>
          {t('Add the local bank account or mobile wallet (like Vietcombank, MoMo or GCash) where family money should arrive.')}
        </Empty>
      )}
    </Section>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title={<span className="flex items-center gap-2">{t('Bank accounts')} <DemoBadge /></span>}
        subtitle={t("Send from a linked bank and deposit directly into your family's accounts with BridgeHome Pay.")} />
      {role === 'recipient' ? [receiveSection, sendSection] : [sendSection, receiveSection]}
      <p className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" />
        {t('BridgeHome Pay is a demonstration. No bank is contacted and no money moves. Only the bank name and the last four digits of each account are stored. Sign-in details are never saved or sent.')}
      </p>
      <Drawer open={sheet === 'send'} onOpenChange={o => !o && close()} title={t('Link a bank')} description={t('Connect the account you send money from.')}>
        <LinkBankFlow onDone={close} />
      </Drawer>
      <Drawer open={sheet === 'receive'} onOpenChange={o => !o && close()} title={t('Add a receiving account')} description={t('Where money from family should arrive.')}>
        <AddPayoutFlow onDone={close} />
      </Drawer>
    </div>
  );
}
