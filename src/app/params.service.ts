import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Params } from '@angular/router';
import { HttpParams } from '@angular/common/http';

import { NavigationType } from 'src/app/navigation-type.enum';
import { Tab } from 'src/app/report/components/tabs';

@Injectable()
export class ParamsService {
  constructor(private location: Location) {}

  all() {
    return this.makeParams(this.currentQuery) as ShadowParams;
  }

  has(param: ParamType) {
    return this.currentQuery.has(param);
  }

  get(param: ParamType) {
    return this.currentQuery.get(param) as string;
  }

  set(param: ParamType, value: string|number) {
    const path = this.currentPath,
      query = this.currentQuery,
      updated = query.set(param, value);

    this.location.replaceState(path, updated.toString());
  }

  clear(param: ParamType) {
    const path = this.currentPath,
      query = this.currentQuery,
      updated = query.delete(param);

    this.location.replaceState(path, updated.toString());
  }

  forNavigation(_type: NavigationType) {
    const params = this.all();

    // reset MF ticks if we're navigating to a new player/encounter and not actively viewing MF tab
    if (params.tab !== Tab.Flay.toString()) {
      delete params.ticks;
    }

    return params;
  }

  private get currentPath() {
    const url = this.location.path(),
      qIndex = url.indexOf('?');

    if (qIndex < 0) {
      return url;
    }

    return url.substring(0, qIndex);
  }

  private get currentQuery(): HttpParams {
    const url = this.location.path();
    const qIndex = url.indexOf('?');
    const params = qIndex >= 0 ? url.substring(qIndex + 1) : '';

    return new HttpParams({ fromString: params });
  }

  private makeParams(query: HttpParams): Params {
    return query.keys().reduce((obj, k) => {
      obj[k] = query.get(k) as string;
      return obj;
    }, {} as Params);
  }
}

export enum ParamType {
  TAB = 'tab',
  TARGET = 'target',
  SPELL_ID = 'spellId',
  TICKS = 'ticks'
}

export type ShadowParams = {[key in ParamType]?: string};
