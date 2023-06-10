/**
 * @license Apache-2.0
 * @copyright 2023 Akiomi Kamakura
 */

import type { EventPacket, RxNostr } from 'rx-nostr';
import { Nostr, uniq, verify } from 'rx-nostr';
import { pipe } from 'rxjs';

import { scanArray } from './operators.js';
import type { ReqResult, RxReqBase } from './types.js';
import { useReq } from './useReq.js';

export function useUniqueEventList(
  client: RxNostr,
  filters: Nostr.Filter[],
  req?: RxReqBase | undefined
): ReqResult<EventPacket[]> {
  const operator = pipe(uniq(), verify(), scanArray());
  return useReq({ client, filters, operator, req });
}