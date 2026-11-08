import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  expiryDedupeKey,
  getExpiryStage,
  mergeRecipients,
  buildNocAlert,
  chunk,
  groupLedgerKey,
} from './noc-email-logic.ts';

const ctx = {
  projectCode: 'P-2026-001',
  authority: 'DEWA',
  description: 'Power <NOC> & more',
  referenceNo: 'REF-1',
  expiryDate: '2027-01-01',
};

function daysFromToday(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

test('escapeHtml escapes markup characters', () => {
  assert.equal(
    escapeHtml('<a href="x">&\'</a>'),
    '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
  );
});

test('getExpiryStage returns null for permanent and far-off NOCs', () => {
  assert.equal(getExpiryStage(null), null);
  assert.equal(getExpiryStage(daysFromToday(60)), null);
});

test('getExpiryStage returns warning inside 14 days and lapsed after', () => {
  assert.equal(getExpiryStage(daysFromToday(14)), 'warning');
  assert.equal(getExpiryStage(daysFromToday(0)), 'warning');
  assert.equal(getExpiryStage(daysFromToday(-1)), 'lapsed');
});

test('expiryDedupeKey changes when the expiry date changes', () => {
  const a = expiryDedupeKey('n1', '2027-01-01', 'warning');
  assert.notEqual(a, expiryDedupeKey('n1', '2027-06-01', 'warning'));
  assert.notEqual(a, expiryDedupeKey('n1', '2027-01-01', 'lapsed'));
  assert.equal(a, expiryDedupeKey('n1', '2027-01-01', 'warning'));
});

test('mergeRecipients lowercases, trims, drops blanks and duplicates', () => {
  assert.deepEqual(
    mergeRecipients(
      ['A@x.com', ' a@x.com ', ''],
      [null, undefined, 'b@x.com'],
      ['not-an-email'],
    ),
    ['a@x.com', 'b@x.com'],
  );
});

test('buildNocAlert escapes user text and keeps the subject free of it', () => {
  const alert = buildNocAlert(
    ctx,
    { type: 'rejected', reason: '<script>x</script>', revision: 'R01' },
    'https://app.test',
  );
  assert.ok(!alert.subject.includes('<'));
  assert.ok(alert.subject.includes('P-2026-001'));
  const flat = JSON.stringify(alert.details);
  assert.ok(!flat.includes('<script>'));
  assert.ok(flat.includes('&lt;script&gt;'));
  assert.equal(alert.actionUrl, 'https://app.test/noc-tracker/P-2026-001');
});

test('buildNocAlert approved shows Permanent when no expiry', () => {
  const alert = buildNocAlert(
    { ...ctx, expiryDate: null },
    { type: 'approved' },
    'https://app.test',
  );
  assert.ok(JSON.stringify(alert.details).includes('Permanent'));
});

test('buildNocAlert expiry stages differ in headline', () => {
  const w = buildNocAlert(
    { ...ctx, expiryDate: daysFromToday(5) },
    { type: 'expiry', stage: 'warning' },
    'https://app.test',
  );
  const l = buildNocAlert(
    { ...ctx, expiryDate: daysFromToday(-3) },
    { type: 'expiry', stage: 'lapsed' },
    'https://app.test',
  );
  assert.notEqual(w.headline, l.headline);
  assert.ok(JSON.stringify(l.details).includes('3'));
});

test('getExpiryStage ignores NOCs lapsed more than 30 days ago', () => {
  assert.equal(getExpiryStage(daysFromToday(-30)), 'lapsed');
  assert.equal(getExpiryStage(daysFromToday(-31)), null);
});

test('chunk splits a list into fixed-size pieces', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 2), []);
});

test('groupLedgerKey separates recipient groups of the same email', () => {
  const k = expiryDedupeKey('n1', '2027-01-01', 'warning');
  assert.notEqual(groupLedgerKey(k, 'staff'), groupLedgerKey(k, 'client'));
});
