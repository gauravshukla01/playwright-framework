// data/tuumPersonAccountData.ts
// Builds a fresh person/account payload per run — mirrors
// CreatePersonCollection.json (Tuum-dev-Testing), but with unique
// name/idNumber values since CreatePerson requires them to be unique.

import { randomInt, randomString } from '../utils/stringutils';
import { CreatePersonRequest } from '../api/tuum/PersonApiClient';
import { CreateAccountRequest } from '../api/tuum/AccountApiClient';

export function buildCreatePersonRequest(): CreatePersonRequest {
  const suffix = randomString(6);
  return {
    personTypeCode: 'L',
    name: `CAGM Customer ${suffix}`,
    tradingName: `CAGM Customer ${suffix} Trading name`,
    identificationNumbers: [
      {
        idNumber: `${randomInt(1000000000, 9999999999)}`,
        idCountryCode: 'GB',
        primary: true,
      },
    ],
    addresses: [
      {
        addressTypeCode: 'R',
        countryCode: 'GB',
        cityCounty: 'London',
        street1: '86 Watson Street',
        zip: 'E1 7HX',
      },
    ],
  };
}

export function buildCreateAccountRequest(
  personId: string,
  personName: string,
): CreateAccountRequest {
  return {
    accountPersons: [
      {
        accountPersonType: 'OWNER',
        accountRightCode: 'ALL',
        personId,
        personName,
      },
    ],
    accountClassCode: 'TUUM',
    accountName: `CAGM Account ${randomString(6)}`,
    residencyCountryCode: 'GB',
    taxResidencyCountryCode: 'GB',
    tenantCode: 'CA.CAGM',
    productCode: 'PAYMENT_ACCOUNT',
    currencyCode: 'USD',
    customerGroupCode: 'REGULAR',
    priceListTypeCode: 'STANDARD',
    serviceProviderCode: 'TUUM',
  };
}
