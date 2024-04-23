/**
 * @license Apache-2.0
 * @copyright 2023 Akiomi Kamakura
 */

import type { ConnectionState, ConnectionStatePacket } from 'rx-nostr';
import type { Observable } from 'rxjs';
import { from, startWith } from 'rxjs';

import { scanLatestEach } from './operators.js';
import type { UseConnectionsOpts } from './types.js';

export function useConnections({
  rxNostr,
  relays
}: UseConnectionsOpts): Observable<ConnectionStatePacket[]> {
  if (relays.length === 0) {
    return from([[]]);
  }

  const init = relays.map((relay) => {
    const from = typeof relay === 'string' ? relay : relay.url;
    const state = rxNostr.getDefaultRelay(from)
      ? rxNostr.getRelayStatus(from)?.connection ?? ('not-started' as ConnectionState)
      : ('not-started' as ConnectionState);

    return { from, state };
  });
  return rxNostr.createConnectionStateObservable().pipe(
    startWith(...init),
    scanLatestEach(({ from }) => from)
  );
}
