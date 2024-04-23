/**
 * @license Apache-2.0
 * @copyright 2023 Akiomi Kamakura
 */

import { QueryClient, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { LazyFilter, RxReq, RxReqOverable, RxReqPipeable } from 'rx-nostr';
import { createRxBackwardReq } from 'rx-nostr';
import { derived, readable, writable } from 'svelte/store';

import type { ReqResult, ReqStatus, RxReqBase, UseReqOpts } from './types.js';
import type { Observable } from 'rxjs';
// TODO: Add throttling support
// TODO: Add timeout support
export function useReq<A>({
  rxNostr,
  queryKey,
  filters,
  operator,
  req,
  initData
}: UseReqOpts<A>): ReqResult<A> {
  const queryClient: QueryClient = useQueryClient();
  if (Object.keys(rxNostr.getDefaultRelays()).length === 0) {
    queryClient.setQueryData(queryKey, initData);
    return {
      data: readable<A>(initData),
      status: readable('success'),
      error: readable()
    };
  }

  let _req:
    | RxReqBase
    | (RxReq<'backward'> & {
        emit(
          filters: LazyFilter | LazyFilter[],
          options?:
            | {
                relays: string[];
              }
            | undefined
        ): void;
      } & RxReqOverable &
        RxReqPipeable);

  if (req) {
    _req = req;
  } else {
    _req = createRxBackwardReq();
  }

  const status = writable<ReqStatus>('loading');
  const error = writable<Error>();

  const obs: Observable<A> = rxNostr.use(_req).pipe(operator);
  const query = createQuery({
    queryKey: queryKey,
    queryFn: (): Promise<A> => {
      return new Promise((resolve, reject) => {
        let fulfilled = false;

        obs.subscribe({
          next: (v: A) => {
            if (fulfilled) {
              queryClient.setQueryData(queryKey, v);
            } else {
              resolve(v);
              fulfilled = true;
            }
          },
          complete: () => status.set('success'),
          error: (e) => {
            console.error(e);
            status.set('error');
            error.set(e);

            if (!fulfilled) {
              reject(e);
              fulfilled = true;
            }
          }
        });
        _req.emit(filters);
      });
    }
  });

  return {
    data: derived(query, ($query) => $query.data, initData),
    status: derived([query, status], ([$query, $status]) => {
      if ($query.isSuccess) {
        return 'success';
      } else if ($query.isError) {
        return 'error';
      } else {
        return $status;
      }
    }),
    error: derived([query, error], ([$query, $error]) => {
      if ($query.isError) {
        return $query.error;
      } else {
        return $error;
      }
    })
  };
}
