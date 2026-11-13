import { phoneFromFields } from '../phone';

describe('a separately entered calling code and national number', () => {
  it('accepts formatted US numbers and international national dialing prefixes', () => {
    expect(phoneFromFields('+1', '(202) 555-0142')).toBe('+12025550142');
    expect(phoneFromFields('+44', '020 7946 0958')).toBe('+442079460958');
    expect(phoneFromFields('+39', '02 1234 5678')).toBe('+390212345678');
  });

  it('rejects incomplete, mismatched and malformed fields', () => {
    expect(phoneFromFields('+', '2025550142')).toBeUndefined();
    expect(phoneFromFields('+1', '123')).toBeUndefined();
    expect(phoneFromFields('+12', '025550142')).toBeUndefined();
    expect(phoneFromFields('+33', '+1 202 555 0142')).toBeUndefined();
  });
});
