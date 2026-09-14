import test from 'node:test';
import assert from 'node:assert/strict';
import { viewsForRole } from '../src/ui/register.tsx';
import { capabilities } from '../server/startup.ts';
import { nothingOffered } from '../src/instance-contracts.ts';

const offered = {
  demo: capabilities('demo').workspace,
  production: capabilities('production').workspace,
};

test('the Quality lead opens the register, the Samples with an invalid signature, Methods and the audit trail, and no queue to act from', () => {
  for (const offers of Object.values(offered))
    assert.deepEqual(viewsForRole('quality lead', offers), [
      'Samples',
      'Invalid signatures',
      'Methods',
      'Audit trail',
    ]);
});

test('an Admin opens no view that only the Quality lead opens, in demo or production', () => {
  for (const [mode, offers] of Object.entries(offered)) {
    const admin = viewsForRole('admin', offers);
    const onlyQualityLead = viewsForRole('quality lead', offers).filter(
      (view) =>
        !['coordinator', 'analyst', 'manager'].some((role) =>
          viewsForRole(role, offers).includes(view),
        ),
    );
    assert.deepEqual(onlyQualityLead, ['Invalid signatures'], mode);
    for (const view of onlyQualityLead)
      assert.ok(!admin.includes(view), `${mode}: ${view}`);
  }
});

test('the Admin opens the Accounts screen in the demo only, and not before the instance says what it offers', () => {
  assert.ok(viewsForRole('admin', offered.demo).includes('Accounts'));
  assert.ok(!viewsForRole('admin', offered.production).includes('Accounts'));
  assert.ok(!viewsForRole('admin', nothingOffered).includes('Accounts'));
});
