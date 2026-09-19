import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HamsterGame, freshState, restoreState, saveSnapshot, isSleepTime, ZONES } from '../dist/engine.js';
const night = new Date(2026, 8, 14, 23, 0);
const tick = (g, n, date = night) => { for (let i = 0; i < n * 10; i++) g.update(.1, date); };

test('sleep schedule supports daytime, overnight, and equal endpoints', () => {
  assert.equal(isSleepTime(night, '22:00', '06:00'), true);
  assert.equal(isSleepTime(night, '06:00', '18:00'), false);
  assert.equal(isSleepTime(night, '06:00', '06:00'), false);
  assert.equal(isSleepTime(new Date(2026, 8, 14, 6), '06:00', '18:00'), true);
});
test('drag wakes a sleeping hamster; ten idle seconds return it to sleep', () => {
  const g = new HamsterGame(); g.act('sleep'); assert.equal(g.s.mode, 'sleeping');
  g.pickUp(); assert.equal(g.s.mode, 'carried'); g.drop(.5, .75);
  tick(g, 9); assert.notEqual(g.s.mode, 'sleeping'); tick(g, 1.2); assert.equal(g.s.mode, 'sleeping');
});
test('sleepy hamster dragged onto wheel runs, then sleeps inside wheel', () => {
  const g = new HamsterGame(); g.act('sleep'); g.pickUp(); g.drop(ZONES.wheel.x, ZONES.wheel.y);
  assert.equal(g.s.mode, 'running'); tick(g, 10.2);
  assert.equal(g.s.mode, 'sleeping'); assert.ok(g.s.discoveries.includes('wheel-nap'));
});
test('feeding restores both hunger and energy; tired hamster cannot start running', () => {
  const s = freshState(); s.energy = 8; s.hunger = 20; const g = new HamsterGame(s);
  assert.equal(g.act('wheel'), false); g.act('feed'); assert.equal(g.s.energy, 24); assert.equal(g.s.hunger, 42);
  tick(g, 4); assert.equal(g.act('wheel'), true);
});
test('an exhausted wheel runner keeps sleeping to recover instead of waking immediately', () => {
  const s = freshState(); s.energy = 15; s.x = ZONES.wheel.x; s.y = ZONES.wheel.y; const g = new HamsterGame(s);
  g.act('wheel'); tick(g, 7); assert.equal(g.s.mode, 'sleeping');
  const energy = g.s.energy; tick(g, 3); assert.equal(g.s.mode, 'sleeping'); assert.ok(g.s.energy > energy);
});
test('wheel action approaches first, accelerates, decelerates, then walks out', () => {
  const g = new HamsterGame(freshState(), () => .5);
  assert.equal(g.act('wheel'), true); assert.equal(g.s.mode, 'walking'); assert.equal(g.s.motion.pendingWheel, true);
  tick(g, 3); assert.equal(g.s.mode, 'running'); assert.ok(g.s.motion.wheelSpeed > 0 && g.s.motion.wheelSpeed <= 5);
  tick(g, 1); assert.equal(g.s.motion.wheelSpeed, 5);
  g.s.actionUntil = g.s.time + .2; tick(g, .3);
  assert.equal(g.s.motion.wheelStopping, true); assert.ok(g.s.motion.wheelSpeed < 5 && g.s.motion.wheelSpeed > 0);
  tick(g, .8); assert.equal(g.s.mode, 'walking'); assert.ok(g.s.target.x < ZONES.wheel.x);
  tick(g, 4); assert.equal(g.s.mode, 'idle'); assert.ok(g.s.x < ZONES.wheel.x);
});
test('walking eases facing direction and pickup/drop eases lift height', () => {
  const s = freshState(); s.mode = 'walking'; s.target = { x: .3, y: .75 }; const g = new HamsterGame(s);
  g.update(.1, night); assert.equal(g.s.facing, -1); assert.ok(g.s.motion.renderFacing < 1 && g.s.motion.renderFacing > -1); assert.ok(g.s.motion.stride > 0);
  g.pickUp(); assert.equal(g.s.motion.lift, 0); g.update(.1, night); assert.ok(g.s.motion.lift > 0 && g.s.motion.lift < 1);
  g.update(.2, night); assert.equal(g.s.motion.lift, 1); g.drop(.5, .75); g.update(.1, night); assert.ok(g.s.motion.lift > 0 && g.s.motion.lift < 1);
  g.update(.2, night); assert.equal(g.s.motion.lift, 0);
});
test('pose changes blend briefly and runtime motion is never persisted', () => {
  const g = new HamsterGame(); g.act('feed');
  assert.equal(g.s.pose, 'eating'); assert.equal(g.s.motion.fromPose, 'idle'); assert.equal(g.s.motion.poseBlend, 0);
  g.update(.1, night); assert.ok(g.s.motion.poseBlend > 0 && g.s.motion.poseBlend < 1);
  tick(g, .2); assert.equal(g.s.motion.poseBlend, 1); assert.equal(g.s.motion.fromPose, null);
  assert.equal(Object.hasOwn(saveSnapshot(g.s), 'motion'), false);
});
test('sleep fades in and waking fades the sleep blend back out', () => {
  const g = new HamsterGame(); g.act('sleep');
  assert.equal(g.s.pose, 'sleeping'); assert.equal(g.s.motion.fromPose, 'idle');
  g.update(.1, night); assert.ok(g.s.motion.sleepBlend > 0 && g.s.motion.sleepBlend < 1);
  const sleepingBlend = g.s.motion.sleepBlend; g.act('sleep'); assert.equal(g.s.mode, 'idle'); assert.equal(g.s.pose, 'idle');
  g.update(.05, night); assert.ok(g.s.motion.sleepBlend > 0 && g.s.motion.sleepBlend < sleepingBlend);
  g.update(.2, night); assert.equal(g.s.motion.sleepBlend, 0);
});
test('hiding pauses to bury the seed and searching pauses to sniff the remembered spot', () => {
  const g = new HamsterGame(freshState(), () => .5); g.act('stash'); tick(g, 1.5);
  assert.equal(g.s.mode, 'hiding'); assert.equal(g.s.pose, 'eating'); assert.equal(g.s.target, null); assert.ok(g.s.motion.hidingPauseUntil > g.s.time);
  tick(g, 1.5); assert.equal(g.s.mode, 'idle');
  g.moveStash(.88, .85); tick(g, 4.1);
  assert.equal(g.s.mode, 'searching'); assert.equal(g.s.target, null); assert.ok(g.s.motion.searchPauseUntil > g.s.time);
  tick(g, 1); assert.ok(g.s.target); assert.equal(g.s.mode, 'searching');
});
test('moving a stash preserves remembered position; failed search cries; returning seed is found', () => {
  const g = new HamsterGame(freshState(), () => .5); g.act('stash'); tick(g, 5);
  const original = { ...g.s.memory }; g.moveStash(.88, .85);
  assert.deepEqual(g.s.memory, original); tick(g, 35);
  assert.equal(g.s.mode, 'crying'); g.moveStash(g.s.x, g.s.y); tick(g, 1);
  assert.equal(g.s.stash, null); assert.ok(g.s.discoveries.includes('found'));
});
test('save restores progress without stale simulation timers and sanitizes corrupt data', () => {
  const g = new HamsterGame(); g.act('feed'); g.act('stash');
  const s = restoreState(saveSnapshot(g.s)); assert.equal(s.totalFeeds, 1); assert.ok(s.stash); assert.equal(s.time, 0);
  assert.equal(s.mode, 'idle'); assert.deepEqual(s.memory, g.s.memory);
  assert.equal(restoreState({ ...saveSnapshot(g.s), x: ZONES.house.x, y: ZONES.house.y }).y, ZONES.house.y);
  const bad = restoreState({ version: 1, energy: NaN, hunger: -200, x: Infinity, name: '<x>\u0000', seeds: [{ id: 'a', x: NaN, y: 1 }] });
  assert.equal(bad.energy, 82); assert.equal(bad.hunger, 0); assert.equal(bad.x, .49); assert.equal(bad.name, 'x'); assert.deepEqual(bad.seeds, []);
});
test('stats stay bounded during long play and held hamster stays awake', () => {
  const g = new HamsterGame(); g.pickUp(); tick(g, 30); assert.equal(g.s.mode, 'carried'); g.drop(.5, .75);
  tick(g, 1800); for (const k of ['energy', 'mood', 'hunger']) assert.ok(g.s[k] >= 0 && g.s[k] <= 100);
});
