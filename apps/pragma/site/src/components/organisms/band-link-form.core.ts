import { isHttpsAddress } from '@domain/band-link.core';
import type { ParseKeys } from 'i18next';

export interface BandLinkFormValues {
  readonly label: string;
  readonly url: string;
}

export type BandLinkFormRefusal = 'label-missing' | 'url-not-https';

export const BAND_LINK_FORM_REFUSAL_KEY = {
  'label-missing': 'bandLinks.labelMissing',
  'url-not-https': 'bandLinks.urlNotHttps',
} as const satisfies Readonly<Record<BandLinkFormRefusal, ParseKeys>>;

export const EMPTY_BAND_LINK_FORM: BandLinkFormValues = { label: '', url: '' };

export function trimBandLinkFields(values: BandLinkFormValues): BandLinkFormValues {
  return { label: values.label.trim(), url: values.url.trim() };
}

// @FollowsBlueprint core-decision
export function selectBandLinkFormRefusal(values: BandLinkFormValues): BandLinkFormRefusal | null {
  const trimmed = trimBandLinkFields(values);
  if (trimmed.label.length === 0) return 'label-missing';
  if (!isHttpsAddress(trimmed.url)) return 'url-not-https';
  return null;
}

export function readAddressHost(address: string): string {
  if (!URL.canParse(address)) return address;
  return new URL(address).hostname;
}
