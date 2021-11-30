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

  private static MAX_EVENT_REQUESTS = 10;
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
  private eventCache: { [id: string]: IPlayerEvents} = {};

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

  getEvents(log: LogSummary, playerName: string, encounterId: number): Observable<IPlayerEvents> {
    const encounter = log.getEncounter(encounterId);
    const cacheId = `${log.id}:${encounterId}:${playerName}`;

    if (this.eventCache.hasOwnProperty(cacheId)) {
      return of(this.playerEvents(this.eventCache[cacheId]));
    }

    const params = {
      start: encounter!.start,
      end: encounter!.end,
      filter: `(source.name="${playerName}" AND ability.id IN (${LogsService.TRACKED_ABILITIES.join(',')})) OR source.name="Shadowfiend"`
    };

    return combineLatest(
      [
        this.requestEvents<ICastData>(log.id,'casts', this.makeParams(params)),
        this.requestEvents<IDamageData>(log.id,'damage-done', this.makeParams(params))
      ])
      .pipe(
        map(([casts, damage]) => {
          const data = { casts, damage };
          this.eventCache[cacheId] = data;
          return this.playerEvents(data)
        }),
      );
  }

  /**
   * Event consumers are mutating these objects, so return a clean copy every time
   * @param data
   * @private
   */
  private playerEvents(data: IPlayerEvents): IPlayerEvents {
    return {
      casts: [...data.casts],
      damage: data.damage.map((d) => Object.assign({}, d, {
        read: false
      }))
    };
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
      delay(50),
      switchMap((response) => {
        const newEvents = events.concat(response.events as T[]);

        if (response.nextPageTimestamp && response.nextPageTimestamp <= params.end && depth < LogsService.MAX_EVENT_REQUESTS) {
          const newParams = Object.assign({}, params)
          newParams.start = response.nextPageTimestamp;

          return this.requestEvents(id, type, newParams, newEvents, depth + 1);
        } else {
          return of(newEvents);
        }
      })
    );
  }
}

export interface IEncountersResponse {
  title: string;
  owner: string;
  friendlies: IActorData[];
  friendlyPets: IActorData[];
  fights: IEncounterData[];
  enemies: IActorData[];
  enemyPets: IActorData[];
}

export interface IEncounterData {
  id: number;
  name: string;
  start_time: number;
  end_time: number;
  durationSeconds: number;
  boss: number;
  originalBoss: number;
  kill?: boolean;
}

export interface IActorData {
  id: number;
  name: string;
  icon: string;
  type: string;
  petOwner?: number;
  fights: { id: number }[];
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
  sourceID: number;
  targetID: number;
  targetInstance: number;
  read: boolean;
}

export interface ICastData extends IEventData {
  type: 'cast' | 'begincast';
  spellPower: number;
}

export interface IDamageData extends IEventData {
  type: 'damage';
  amount: number;
  hitType: number;
  absorbed?: number;
  resisted?: number;
  tick: boolean;
}

export interface IPlayerEvents {
  casts: ICastData[];
  damage: IDamageData[]
}
