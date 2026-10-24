import { DbConnection, tables } from '../src/module_bindings/index';
import assert from 'node:assert/strict';
const connect = () => new Promise<DbConnection>((resolve, reject) => { DbConnection.builder().withUri('ws://localhost:3000').withDatabaseName('bridgehome-3386g').onConnect(c => resolve(c)).onConnectError((_c, e) => reject(e)).build(); });
const ready = (c: DbConnection) => new Promise<void>((resolve, reject) => { c.subscriptionBuilder().onApplied(() => resolve()).onError(e => reject(e)).subscribe([tables.visibleFamily, tables.visibleMembership, tables.visibleRequest, tables.visibleInvitation, tables.visibleAudit, tables.visibleReceipt, tables.visibleRecordedTransfer]); });
const wait = async (p: () => boolean) => { for (let i = 0; i < 100; i++) {
    if (p())
        return;
    await new Promise(r => setTimeout(r, 50));
} throw Error('Subscription update timeout'); };
const a = await connect(), b = await connect(), outsider = await connect();
try {
    await Promise.all([ready(a), ready(b), ready(outsider)]);
    assert.equal([...outsider.db.visibleFamily.iter()].length, 0);
    assert.equal([...outsider.db.visibleRequest.iter()].length, 0);
    await assert.rejects(outsider.reducers.reviewRequest({ requestId: 1n, approved: 1n, note: 'Unauthorized test' }));
    await new Promise<void>((resolve, reject) => { outsider.subscriptionBuilder().onError(() => resolve()).onApplied(() => reject(Error('Private table exposed'))).subscribe('SELECT * FROM request'); });
    await a.reducers.saveProfile({ name: 'Security test owner' });
    await b.reducers.saveProfile({ name: 'Security test recipient' });
    await a.reducers.createGroup({ name: 'Automated security test', role: 'sender' });
    await wait(() => [...a.db.visibleFamily.iter()].length === 1);
    const g = [...a.db.visibleFamily.iter()][0];
    await a.reducers.inviteMember({ groupId: g.id, role: 'recipient' });
    await wait(() => [...a.db.visibleInvitation.iter()].length === 1);
    const inv = [...a.db.visibleInvitation.iter()][0];
    await b.reducers.joinGroup({ code: inv.code });
    await wait(() => [...b.db.visibleFamily.iter()].length === 1);
    await assert.rejects(outsider.reducers.joinGroup({ code: inv.code }));
    await b.reducers.createRequest({ groupId: g.id, amount: 10000n, currency: 'USD', category: 'Test', explanation: 'Automated test', priority: 'routine', dueDate: '2026-11-01', draft: false });
    await wait(() => [...a.db.visibleRequest.iter()].length === 1);
    const q = [...a.db.visibleRequest.iter()][0];
    await assert.rejects(b.reducers.reviewRequest({ requestId: q.id, approved: 10000n, note: 'Wrong role' }));
    await assert.rejects(a.reducers.reviewRequest({ requestId: q.id, approved: 10001n, note: 'Over approval' }));
    await a.reducers.reviewRequest({ requestId: q.id, approved: 8000n, note: 'Partial approval' });
    const tr = { requestId: q.id, amount: 8000n, fee: 200n, expected: 450000n, receiveCurrency: 'PHP', rate: '56.25', note: 'Test estimate' };
    await assert.rejects(a.reducers.recordTransfer({ ...tr, amount: 8001n }));
    await a.reducers.recordTransfer(tr);
    await wait(() => [...b.db.visibleRecordedTransfer.iter()].length === 1);
    const t = [...b.db.visibleRecordedTransfer.iter()][0];
    await assert.rejects(a.reducers.confirmReceipt({ transferId: t.id, amount: 449000n, useNote: 'Wrong role' }));
    await b.reducers.confirmReceipt({ transferId: t.id, amount: 449000n, useNote: 'Test shortfall explanation' });
    await assert.rejects(b.reducers.confirmReceipt({ transferId: t.id, amount: 449000n, useNote: 'Duplicate' }));
    await b.reducers.completeRequest({ requestId: q.id });
    await wait(() => [...a.db.visibleRequest.iter()][0].status === 'completed');
    assert.equal([...a.db.visibleReceipt.iter()][0].amount, 449000n);
    const m = [...a.db.visibleMembership.iter()].find(m => m.role === 'recipient')!;
    await a.reducers.manageMember({ memberId: m.id, role: 'remove' });
    await wait(() => [...b.db.visibleRequest.iter()].length === 0 && [...b.db.visibleRecordedTransfer.iter()].length === 0 && [...b.db.visibleAudit.iter()].length === 0);
    await assert.rejects(b.reducers.addComment({ requestId: q.id, text: 'Revoked access' }));
    assert.equal([...outsider.db.visibleRequest.iter()].length, 0);
    console.log('PASS: private-table denial, cross-family isolation, one-use invitations, role checks, over-approval and oversending rejection, exact cross-currency receipt, duplicate rejection, complete lifecycle, live updates, revocation removes cached financial rows.');
}
finally {
    a.disconnect();
    b.disconnect();
    outsider.disconnect();
}
