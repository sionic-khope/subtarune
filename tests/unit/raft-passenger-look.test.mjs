import test from 'node:test';
import assert from 'node:assert/strict';
import { Raft } from '../../src/world/world.js';

test('passenger look changes after eight riding seconds without changing travel direction', () => {
  const raft = Object.assign(Object.create(Raft.prototype), {
    def: { passengerLookAfter: 8, passengerLookFacing: 'up' },
    rideTime: 7.99, dirFacing: 'right',
  });
  assert.equal(raft.passengerFacing, 'right');
  raft.rideTime = 8;
  assert.equal(raft.passengerFacing, 'up');
  assert.equal(raft.dirFacing, 'right');
});

test('rafts without a passenger look cue retain their travel-facing passengers', () => {
  const raft = Object.assign(Object.create(Raft.prototype), {
    def: {}, rideTime: 40, dirFacing: 'left',
  });
  assert.equal(raft.passengerFacing, 'left');
});
