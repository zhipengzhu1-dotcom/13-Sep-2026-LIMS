import test from 'node:test';
import assert from 'node:assert/strict';
import { viewsForRole } from '../src/ui/register.tsx';

test('the Quality lead opens the register, the Samples with an invalid signature, Methods and the audit trail, and no queue to act from', () => {
  for (const mode of ['demo', 'production'] as const)
    assert.deepEqual(viewsForRole('quality lead', mode), [
      'Samples',
      'Invalid signatures',
      'Methods',
      'Audit trail',
    ]);
});

test('an Admin opens no view that only the Quality lead opens, in demo or production', () => {
  for (const mode of ['demo', 'production'] as const) {
    const admin = viewsForRole('admin', mode);
    const onlyQualityLead = viewsForRole('quality lead', mode).filter(
      (view) =>
        !['coordinator', 'analyst', 'manager'].some((role) =>
          viewsForRole(role, mode).includes(view),
        ),
    );
    assert.deepEqual(onlyQualityLead, ['Invalid signatures'], mode);
    for (const view of onlyQualityLead)
      assert.ok(!admin.includes(view), `${mode}: ${view}`);
  }
});
