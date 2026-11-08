import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actorLabel, canUserUploadSpecialist } from './project-status.ts';
import {
  DB_STAGE_TO_LIFECYCLE,
  LIFECYCLE_TO_DB_STAGE,
  getNextLifecycleStage,
} from './project-lifecycle.ts';

test('specialist upload is denied to CEO and to unknown or empty roles', () => {
  assert.equal(canUserUploadSpecialist('engineer'), true);
  assert.equal(canUserUploadSpecialist('admin'), true);
  assert.equal(canUserUploadSpecialist('ceo'), false);
  assert.equal(canUserUploadSpecialist(''), false);
  assert.equal(canUserUploadSpecialist(undefined), false);
  assert.equal(canUserUploadSpecialist('intruder'), false);
});

test('actor label matches the format the UI used to build', () => {
  assert.equal(actorLabel('admin'), 'System Administrator');
  assert.equal(actorLabel('resident_engineer'), 'resident engineer');
});

test('lifecycle labels round-trip through the database stage', () => {
  for (const stage of Object.keys(LIFECYCLE_TO_DB_STAGE) as Array<
    keyof typeof LIFECYCLE_TO_DB_STAGE
  >) {
    assert.equal(DB_STAGE_TO_LIFECYCLE[LIFECYCLE_TO_DB_STAGE[stage]], stage);
  }
  assert.equal(DB_STAGE_TO_LIFECYCLE.planning, 'Pre-Construction');
});

test('stage advances one step and stops at Completed', () => {
  assert.equal(getNextLifecycleStage('Pre-Construction'), 'Construction');
  assert.equal(getNextLifecycleStage('Construction'), 'Handover');
  assert.equal(getNextLifecycleStage('Handover'), 'Completed');
  assert.equal(getNextLifecycleStage('Completed'), 'Completed');
});
