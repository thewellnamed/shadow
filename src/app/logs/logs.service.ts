import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, switchMap } from 'rxjs/operators';

import { Actor } from 'src/app/logs/models/actor';
import { BuffData } from 'src/app/logs/models/buff-data';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { PSEUDO_SPELL_BASE } from 'src/app/logs/models/spell-id.enum';
import { SpellData } from 'src/app/logs/models/spell-data';

import * as wcl from 'src/app/logs/interfaces';

@Injectable()
export class LogsService {
  private static API_KEY = '259b121232ec91e17f4d2b48300801be';
  private static API_URL = 'https://classic.warcraftlogs.com/v1';
  private static MAX_EVENT_REQUESTS = 10;

  public static TRACKED_ABILITIES = Object.keys(SpellData)
    .map((k) => parseInt(k))
    .filter((spellId) => spellId < PSEUDO_SPELL_BASE);

  public static TRACKED_BUFFS = Object.keys(BuffData).map((k) => parseInt(k));

  private summaryCache: { [id: string]: LogSummary} = {};
  private eventCache: { [id: string]: IEncounterEvents} = {};
  private playerCache: { [id: string]: any} = {};

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

    const url = this.apiUrl(`report/fights/${id}`);
    return this.http.get<wcl.IEncountersResponse>(url, { params: this.makeParams() }).pipe(
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

  /**
   * Fetch summary table information for a player in an encounter
   * Mostly for getting haste info
   * @param log
   * @param player
   * @param encounterId
   */
  getPlayerInfo(log: LogSummary, player: Actor, encounterId: number): Observable<wcl.ICombatantInfo> {
    const cacheId = `${log.id}:${encounterId}:${player.id}`;
    if (this.playerCache.hasOwnProperty(cacheId)) {
      return of(this.playerCache[cacheId]);
    }

    const encounter = log.getEncounter(encounterId) as EncounterSummary;
    const params = this.makeParams(encounter, { sourceid: player.id });

    const url = this.apiUrl(`report/tables/summary/${log.id}`);
    return this.http.get<wcl.IActorSummaryResponse>(url, { params }).pipe(
      map((response) => {
        this.playerCache[cacheId] = response.combatantInfo;
        return response.combatantInfo;
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(`Error fetching player info: ${response.error.error}`);
      })
    );
  }

  /**
   * Get combat events for a given player in a given encounter
   * @param log
   * @param playerName
   * @param encounterId
   */
  getEvents(log: LogSummary, playerName: string, encounterId: number): Observable<IEncounterEvents> {
    const encounter = log.getEncounter(encounterId) as EncounterSummary;
    const cacheId = `${log.id}:${encounterId}:${playerName}`;

    if (this.eventCache.hasOwnProperty(cacheId)) {
      return of(this.playerEvents(this.eventCache[cacheId]));
    }

    const filter = `(source.name="${playerName}" AND ability.id IN (${LogsService.TRACKED_ABILITIES.join(',')})) OR source.name="Shadowfiend"`
    const castParams = this.makeParams(encounter, { filter });

    return combineLatest(
      [
        this.requestEvents<wcl.ICastData>(log.id,'casts', castParams),
        this.requestEvents<wcl.IDamageData>(log.id,'damage-done', castParams),
        this.requestEvents<wcl.IDeathData>(log.id, 'deaths', this.makeParams(encounter, {
          hostility: 1
        })),
        this.requestEvents<wcl.IBuffData>(log.id, 'buffs', this.makeParams(encounter, {
          filter: `target.name="${playerName}" AND ability.id IN (${LogsService.TRACKED_BUFFS.join(',')})`
        })),
      ])
      .pipe(
        map(([casts, damage, deaths, buffs]) => {
          const deathLookup = deaths.reduce((lookup, death) => {
            const key = `${death.targetID}:${death.targetInstance}`;
            lookup[key] = death.timestamp;
            return lookup;
          }, {} as IDeathLookup);

          const data: IEncounterEvents = { buffs, casts, damage, deaths: deathLookup };
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
  private playerEvents(data: IEncounterEvents): IEncounterEvents {
    return {
      casts: [...data.casts],
      damage: data.damage.map((d) => Object.assign({}, d, {
        read: false
      })),
      deaths: data.deaths,
      buffs: data.buffs,
    };
  }

  private apiUrl(path: string) {
    return `${LogsService.API_URL}/${path}`;
  }

  private makeParams(encounter?: EncounterSummary, extra: any = {}) {
    const params: {[key: string]: string|number|boolean} = { api_key: LogsService.API_KEY };

    if (encounter) {
      params['start'] = encounter.start;
      params['end'] = encounter.end;
    }

    return Object.assign(params, extra);
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
  private requestEvents<T extends wcl.IEventData>(
    id: string,
    type: string,
    params: any,
    events: T[] = [],
    depth = 1): Observable<T[]>
  {
    const url = `${LogsService.API_URL}/report/events/${type}/${id}`;

    return this.http.get<wcl.IEventsResponse>(url, { params }).pipe(
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

// key = <targetID>.<targetInstance>
export interface IDeathLookup {
  [key: string]: number;
}

export interface IEncounterEvents {
  buffs: wcl.IBuffData[];
  casts: wcl.ICastData[];
  damage: wcl.IDamageData[];
  deaths: IDeathLookup;
}
