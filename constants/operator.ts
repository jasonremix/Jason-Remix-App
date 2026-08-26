/**
 * Operator details for the legal pages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  FILL THIS IN BEFORE RELEASING THE APP.
 *
 *  Under § 5 DDG a commercially operated German app must name its operator with
 *  a full, reachable address. An incomplete Impressum is a genuine legal risk.
 *
 *  While any required field below is empty, every legal screen shows a warning
 *  banner and renders the missing values as visible `[placeholders]`. Fill the
 *  fields in and the warning disappears on its own — there is nothing else to
 *  remember to switch off.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const operator = {
  /** Full name or registered company name, e.g. "Jason Mustermann" or "Jason Remix GmbH". */
  legalName: '',
  /** Street and house number. A PO box is not sufficient. */
  street: '',
  postalCode: '14770',
  city: 'Brandenburg an der Havel',
  country: 'Deutschland',

  /** Authorised representative — required for a company, omit for a sole trader. */
  representative: '',
  /** A reachable telephone number. */
  phone: '',
  /** VAT identification number under § 27a UStG, if one exists. */
  vatId: '',

  /** Responsible for content under § 18 (2) MStV. Often the same person. */
  contentResponsibleName: '',
  contentResponsibleAddress: '',
} as const;

/** The fields without which the Impressum is legally incomplete. */
const REQUIRED_FIELDS = ['legalName', 'street', 'postalCode', 'city', 'phone'] as const;

export const missingOperatorFields = REQUIRED_FIELDS.filter(
  (field) => operator[field].trim().length === 0,
);

export const operatorDetailsComplete = missingOperatorFields.length === 0;

/**
 * Renders a value, or a visible `[label]` marker when it has not been filled in —
 * so an unfinished Impressum is obvious on screen rather than silently blank.
 */
export function orPlaceholder(value: string, label: string): string {
  return value.trim().length > 0 ? value : `[${label}]`;
}

/** The operator's postal address as it appears in the Impressum. */
export function postalAddress(): string {
  return [
    orPlaceholder(operator.legalName, 'Vollständiger Name bzw. Firmierung'),
    orPlaceholder(operator.street, 'Straße und Hausnummer'),
    `${operator.postalCode} ${operator.city}`,
    operator.country,
  ].join('\n');
}
