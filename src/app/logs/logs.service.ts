import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, switchMap } from 'rxjs/operators';

import { LogSummary } from 'src/app/logs/models/log-summary';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

@Injectable()
export class LogsService {
  private static API_KEY = '259b121232ec91e17f4d2b48300801be';
  private static API_URL = 'https://classic.warcraftlogs.com/v1';

  private static MAX_EVENT_REQUESTS = 10; // 300 events per request * 10 = 3000 total

  private static TRACKED_ABILITIES = [
    SpellId.DEATH,
    SpellId.FADE,
    SpellId.FEAR_WARD,
    SpellId.MIND_BLAST,
    SpellId.MIND_FLAY,
    SpellId.PAIN,
    SpellId.SHADOW_FIEND,
    SpellId.SHIELD,
    SpellId.VAMPIRIC_EMBRACE,
    SpellId.VAMPIRIC_TOUCH
  ];

  private summaryCache: { [id: string]: LogSummary} = {};
  private eventCache: { [hash: string]: any} = {};

  constructor(private http: HttpClient) {}

  /**
   * Extract WCL report ID from a string,
   * expected to either be the ID (validated against regex...)
   * OR to be a WCL URL that can be parsed to find the ID
   * @param {string} value
   * @returns {string|null} report ID
   */
  extractLogId(value: string|null): string | null {
    let id: string | null = value || '';

    if (id.startsWith('http')) {
      const match = id.match(/warcraftlogs\.com\/reports\/([A-Za-z0-9]{16})/m);
      id = (match && match[1]) || null;
    } else if (!/^[A-Za-z0-9]{16}$/.test(id)) {
      id = null;
    }

    return id;
  }

  /**
   * Fetch summary data for a report
   * @param id Report ID
   * @returns {any}
   */
  getSummary(id: string) {
    if (this.summaryCache.hasOwnProperty(id)) {
      return of(this.summaryCache[id]);
    }

    const url = `${LogsService.API_URL}/report/fights/${id}`;
    return this.http.get<IEncountersResponse>(url, { params: this.makeParams() }).pipe(
      map((response) => {
        const summary = new LogSummary(id, response);
        this.summaryCache[id] = summary;
        return summary;
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(`Error fetching log: ${response.error.error}`);
      }),
    );
  }

  getEvents(log: LogSummary, playerName: string, encounterId: number) {
    const encounter = log.getEncounter(encounterId);
    const params = {
      start: encounter!.start,
      end: encounter!.end,
      filter: `source.name="${playerName}" AND ability.id IN (${LogsService.TRACKED_ABILITIES.join(',')})`
    };

    return combineLatest(
      [
        this.requestEvents<ICastData>(log.id,'casts', this.makeParams(params)),
        this.requestEvents<IDamageData>(log.id,'damage-done', this.makeParams(params))
      ])
      .pipe(
        map(([casts, damage]) => ({ casts, damage })),
      );
  }

  private makeParams(params: any = {}) {
    return Object.assign(params, { api_key: LogsService.API_KEY });
  }

  /**
   * Recursively fetch event data while more exists, up to MAX_EVENT_REQUESTS
   * @param {string} Log ID
   * @param {string} type event type to fetch
   * @param {any} query params
   * @param {IEventData[]} events array to append fetch events to (for recursion)
   * @param {number} depth Max recursion depth
   * @private
   */
  private requestEvents<T extends IEventData>(
    id: string,
    type: string,
    params: any,
    events: T[] = [],
    depth = 1): Observable<T[]>
  {
    const url = `${LogsService.API_URL}/report/events/${type}/${id}`;

    return this.http.get<IEventsResponse>(url, { params }).pipe(
      delay(200),
      switchMap((response) => {
        const newEvents = events.concat(response.events as T[]);

        if (response.nextPageTimestamp && response.nextPageTimestamp < params.end && depth < LogsService.MAX_EVENT_REQUESTS) {
          const newParams = Object.assign({}, params)
          newParams.start = response.nextPageTimestamp;

          return this.requestEvents(id, type, newParams, newEvents, depth + 1);
        } else {
          // todo -- caching
          return of(newEvents);
        }
      })
    );
  }
}

export interface IEncountersResponse {
  friendlies: IPlayerData[];
  fights: IEncounterData[];
  enemies: IEnemyData[];
  enemyPets: IEnemyData[];
}

export interface IEncounterData {
  id: number;
  name: string;
  start_time: number;
  end_time: number;
  boss: number;
  originalBoss: number;
  kill?: boolean;
}

export interface IPlayerData {
  id: number;
  name: string;
  type: string;
  icon: string;
}

export interface IEnemyData {
  id: number;
  name: string;
}

export interface IEventsResponse {
  events: IEventData[];
  count: number;
  nextPageTimestamp?: number;
}

export interface IAbilityData {
  name: string;
  guid: number;
}

export interface IEventData {
  type: 'cast' | 'begincast' | 'damage';
  ability: IAbilityData;
  timestamp: number;
  targetID: number;
  targetInstance: number;
  read: boolean;
}

export interface ICastData extends IEventData {
  type: 'cast' | 'begincast';
}

export interface IDamageData extends IEventData {
  type: 'damage';
  amount: number;
  absorbed?: number;
  tick: boolean;
}
