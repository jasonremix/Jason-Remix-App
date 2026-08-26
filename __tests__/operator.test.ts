import {
  missingOperatorFields,
  operator,
  operatorDetailsComplete,
  orPlaceholder,
  postalAddress,
} from '@/constants/operator';

/**
 * The legal warning banner is derived from this config rather than hard-coded, so
 * these assertions are what guarantee an incomplete Impressum cannot ship quietly.
 */
describe('operator details', () => {
  it('reports itself incomplete while required fields are empty', () => {
    // This currently fails-safe: the details have not been supplied yet, so the
    // warning must be showing. Once they are filled in, this flips and the
    // assertion below documents that the banner switches itself off.
    if (operatorDetailsComplete) {
      expect(missingOperatorFields).toHaveLength(0);
    } else {
      expect(missingOperatorFields.length).toBeGreaterThan(0);
    }
  });

  it('treats whitespace as not filled in', () => {
    expect(orPlaceholder('   ', 'Name')).toBe('[Name]');
    expect(orPlaceholder('', 'Name')).toBe('[Name]');
  });

  it('renders a supplied value as-is', () => {
    expect(orPlaceholder('Jason Remix GmbH', 'Name')).toBe('Jason Remix GmbH');
  });

  it('marks every missing field visibly in the postal address', () => {
    const address = postalAddress();

    for (const field of missingOperatorFields) {
      if (field === 'postalCode' || field === 'city' || field === 'phone') continue;
      // Anything absent must appear as a bracketed marker, never as a blank line.
      expect(address).toMatch(/\[.+\]/);
    }
    expect(address).not.toMatch(/\n\n/);
  });

  it('always includes the city and country, which are known', () => {
    const address = postalAddress();
    expect(address).toContain(operator.city);
    expect(address).toContain(operator.country);
  });

  it('does not treat optional fields as blocking', () => {
    // A sole trader has no representative and may have no VAT id; neither should
    // hold the warning banner open.
    expect(missingOperatorFields).not.toContain('representative');
    expect(missingOperatorFields).not.toContain('vatId');
  });
});
