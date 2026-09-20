import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collapseWhitespace,
  emailDomain,
  isBusinessEmail,
  normalizeEmail,
  normalizePhone,
} from '../src/domain/normalize.js';

/**
 * These functions decide whether two leads are the same person, so the cases
 * below are the real-world ones duplicate detection has to survive.
 */

describe('normalizeEmail', () => {
  it('lower-cases and trims', () => {
    assert.equal(normalizeEmail('  Ali@Example.COM '), 'ali@example.com');
  });

  it('ignores dots and +tags in Gmail addresses, which route to one inbox', () => {
    assert.equal(normalizeEmail('a.li.khan+crm@gmail.com'), 'alikhan@gmail.com');
    assert.equal(normalizeEmail('alikhan@googlemail.com'), 'alikhan@gmail.com');
  });

  it('leaves other providers alone, where a dot is significant', () => {
    assert.equal(normalizeEmail('a.li@company.com'), 'a.li@company.com');
  });

  it('returns an empty string for anything unusable', () => {
    for (const input of ['', '   ', 'not-an-email', '@example.com', 'ali@', null, undefined, 42]) {
      assert.equal(normalizeEmail(input), '', `expected '' for ${String(input)}`);
    }
  });
});

describe('normalizePhone', () => {
  it('matches the same number written four different ways', () => {
    const expected = '001234567';
    assert.equal(normalizePhone('+92 300 1234567'), expected);
    assert.equal(normalizePhone('0300-1234567'), expected);
    assert.equal(normalizePhone('(0300) 123 4567'), expected);
    assert.equal(normalizePhone('92 300 1234567'), expected);
  });

  it('keeps genuinely different numbers apart', () => {
    assert.notEqual(normalizePhone('+92 300 1234567'), normalizePhone('+92 300 7654321'));
  });

  it('rejects anything too short to identify a person', () => {
    assert.equal(normalizePhone('12345'), '');
    assert.equal(normalizePhone('n/a'), '');
    assert.equal(normalizePhone(undefined), '');
  });
});

describe('isBusinessEmail', () => {
  it('treats known consumer providers as non-business', () => {
    assert.equal(isBusinessEmail('someone@gmail.com'), false);
    assert.equal(isBusinessEmail('someone@hotmail.com'), false);
    assert.equal(isBusinessEmail('someone@icloud.com'), false);
  });

  it('treats everything else as a business domain', () => {
    assert.equal(isBusinessEmail('buyer@northbridge.co'), true);
    assert.equal(emailDomain('buyer@northbridge.co'), 'northbridge.co');
  });

  it('is false for an unusable address rather than throwing', () => {
    assert.equal(isBusinessEmail('nonsense'), false);
  });
});

describe('collapseWhitespace', () => {
  it('normalises runs of whitespace and newlines', () => {
    assert.equal(collapseWhitespace('  Ali   Khan\n'), 'Ali Khan');
    assert.equal(collapseWhitespace(undefined), '');
  });
});
