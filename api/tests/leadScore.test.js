import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLeadScore } from '../src/domain/leadScore.js';

const strongLead = {
  name: 'Imran Qureshi',
  email: 'imran.q@meridianhealth.pk',
  phone: '+92 321 9988776',
  service: 'web-development',
  budget: '50k-plus',
  message:
    'We are a private clinic group opening six new locations this year. We need a patient booking portal integrated with our practice management system. Budget is approved and we would like to start next month — please send a proposal with a timeline and some relevant case studies so we can compare agencies properly.',
};

const weakLead = {
  name: 'Chris',
  email: 'chris@yahoo.com',
  phone: '',
  service: 'other',
  budget: 'under-1k',
  message: '',
};

describe('calculateLeadScore', () => {
  it('keeps every score inside 0–100', () => {
    for (const lead of [strongLead, weakLead, {}]) {
      const { score } = calculateLeadScore(lead);
      assert.ok(score >= 0 && score <= 100, `score out of range: ${score}`);
      assert.equal(Number.isInteger(score), true);
    }
  });

  it('ranks a well-qualified enquiry far above a vague one', () => {
    assert.ok(calculateLeadScore(strongLead).score > calculateLeadScore(weakLead).score + 40);
  });

  it('bands the two ends of the range as hot and cold', () => {
    assert.equal(calculateLeadScore(strongLead).band, 'hot');
    assert.equal(calculateLeadScore(weakLead).band, 'cold');
  });

  it('never exceeds the weight declared for each factor', () => {
    const { factors } = calculateLeadScore(strongLead);
    factors.forEach((factor) => {
      assert.ok(factor.points <= factor.max, `${factor.key} scored ${factor.points}/${factor.max}`);
    });
    assert.equal(
      factors.reduce((sum, factor) => sum + factor.max, 0),
      100,
      'the declared weights must add up to 100',
    );
  });

  it('scores a stated budget above an unstated one, and both above a tiny one', () => {
    const withBudget = (budget) => calculateLeadScore({ ...weakLead, budget }).score;
    assert.ok(withBudget('15k-50k') > withBudget('not-sure'));
    assert.ok(withBudget('not-sure') > withBudget('under-1k'));
  });

  it('rewards a reachable contact', () => {
    const base = { ...weakLead, budget: '5k-15k' };
    const withPhone = calculateLeadScore({ ...base, phone: '+44 7700 900183' }).score;
    assert.ok(withPhone > calculateLeadScore(base).score);

    const business = calculateLeadScore({ ...base, email: 'buyer@northbridge.co' }).score;
    assert.ok(business > calculateLeadScore(base).score);
  });

  it('rewards a detailed message over a one-liner', () => {
    const short = calculateLeadScore({ ...weakLead, message: 'how much?' }).score;
    const detailed = calculateLeadScore({
      ...weakLead,
      message:
        'We are rebuilding our store and need a quote. Our deadline is the end of March and our team has already agreed the budget internally, so we are ready to move quickly once we pick an agency.',
    }).score;
    assert.ok(detailed > short);
  });

  it('is deterministic — the same lead always scores the same', () => {
    assert.equal(calculateLeadScore(strongLead).score, calculateLeadScore(strongLead).score);
  });

  it('scores an empty object without throwing', () => {
    const { score, band, factors } = calculateLeadScore({});
    assert.equal(band, 'cold');
    assert.ok(score < 30);
    assert.equal(factors.length, 5);
  });

  it('explains every factor, so the dashboard can show why', () => {
    const { factors } = calculateLeadScore(strongLead);
    factors.forEach((factor) => {
      assert.ok(factor.reason.length > 0, `${factor.key} has no reason`);
      assert.ok(factor.label.length > 0, `${factor.key} has no label`);
    });
  });
});
