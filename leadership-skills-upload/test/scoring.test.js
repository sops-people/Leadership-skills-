import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGapReport, MIN_RATERS } from '../src/assessment/scoring.js';
import { SKILLS } from '../src/assessment/taxonomy.js';
import { RATING_SCALE } from '../src/assessment/scale.js';

const skill = (id, bar, importance) => ({ id, name: id, category: 'c_level', bars: { vp: bar }, importance: { vp: importance } });
const user = { id: 'u1', targetRole: 'vp' };
const rater = (ratings) => ({ completedAt: '2026-10-24T00:00:00Z', ratings });

test('taxonomy has 19 skills (11 C-level, 8 soft) with bars and importance for every role', () => {
  assert.equal(SKILLS.length, 19);
  assert.equal(SKILLS.filter((s) => s.category === 'c_level').length, 11);
  assert.equal(SKILLS.filter((s) => s.category === 'soft').length, 8);
  assert.equal(new Set(SKILLS.map((s) => s.id)).size, 19);
  for (const s of SKILLS) {
    assert.ok(s.description && s.statement && s.behaviours.length >= 3, s.id);
    for (const role of ['director', 'vp', 'c_level']) {
      assert.ok(s.bars[role] >= 1 && s.bars[role] <= 5, `${s.id} bar ${role}`);
      assert.ok([1, 2, 3].includes(s.importance[role]), `${s.id} importance ${role}`);
    }
  }
  assert.deepEqual(RATING_SCALE.map((r) => r.value), [1, 2, 3, 4, 5]);
});

test('role gap = bar − self, and priority = importance × gap when there is no 360 yet', () => {
  const report = buildGapReport({ user, skills: [skill('a', 4, 3), skill('b', 4, 1)], selfRatings: { a: 2, b: 2 } });
  const a = report.items.find((i) => i.skillId === 'a');
  assert.equal(a.roleGap, 2);
  assert.equal(a.blindSpot, null);
  assert.equal(a.priority, 6);
  assert.deepEqual(report.items.map((i) => i.skillId), ['a', 'b'], 'ranked by priority');
});

test('360 averages stay hidden until enough people have rated', () => {
  const skills = [skill('a', 4, 2)];
  const two = buildGapReport({ user, skills, selfRatings: { a: 4 }, raterResponses: [rater({ a: 2 }), rater({ a: 2 }), { completedAt: null, ratings: {} }] });
  assert.equal(two.othersVisible, false);
  assert.equal(two.raters.needed, MIN_RATERS - 2);
  assert.equal(two.items[0].othersAvg, null);
  assert.equal(two.items[0].blindSpot, null);

  const three = buildGapReport({ user, skills, selfRatings: { a: 4 }, raterResponses: [rater({ a: 2 }), rater({ a: 2 }), rater({ a: 3 })] });
  assert.equal(three.othersVisible, true);
  assert.equal(three.items[0].othersAvg, 2.3);
});

test('blind spot = self − others, and an overrated skill moves up the ranking', () => {
  const skills = [skill('overrated', 4, 2), skill('below-bar', 4, 2)];
  const report = buildGapReport({
    user,
    skills,
    selfRatings: { overrated: 4, 'below-bar': 3 },
    raterResponses: [rater({ overrated: 2, 'below-bar': 3 }), rater({ overrated: 2, 'below-bar': 3 }), rater({ overrated: 2, 'below-bar': 3 })],
  });
  const [first, second] = report.items;
  assert.equal(first.skillId, 'overrated');
  assert.equal(first.roleGap, 0);
  assert.equal(first.blindSpot, 2);
  assert.equal(first.priority, 4);
  assert.equal(second.roleGap, 1);
  assert.equal(second.blindSpot, 0);
  assert.equal(second.priority, 2);
});

test('hidden strengths and above-bar ratings do not add priority', () => {
  const report = buildGapReport({
    user,
    skills: [skill('a', 3, 3)],
    selfRatings: { a: 4 },
    raterResponses: [rater({ a: 5 }), rater({ a: 5 }), rater({ a: 5 })],
  });
  assert.equal(report.items[0].roleGap, -1);
  assert.equal(report.items[0].blindSpot, -1);
  assert.equal(report.items[0].priority, 0);
});

test('"not observed" answers are left out, so a skill needs 3 real ratings to show', () => {
  const report = buildGapReport({
    user,
    skills: [skill('a', 4, 2)],
    selfRatings: { a: 3 },
    raterResponses: [rater({ a: 3 }), rater({ a: 3 }), rater({ a: 'n/a' })],
  });
  assert.equal(report.othersVisible, true);
  assert.equal(report.items[0].otherRatings, 2);
  assert.equal(report.items[0].othersAvg, null);
});
