import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Params } from '@angular/router';
import { HttpParams } from '@angular/common/http';

import { NavigationType } from 'src/app/navigation-type.enum';

@Injectable()
export class ParamsService {
  constructor(private location: Location) {}

  all() {
    return this.makeParams(this.currentQuery);
  }

  has(param: ParamType) {
    return this.currentQuery.has(param);
  }

  get(param: ParamType) {
    return this.currentQuery.get(param);
  }

  set(param: ParamType, value: string|number) {
    const path = this.currentPath,
      query = this.currentQuery,
      updated = query.set(param, value);

    this.location.replaceState(path, updated.toString());
  }

  forNavigation(type: NavigationType) {
    const params = this.all();

    if (type === NavigationType.ENCOUNTER) {
      delete params[ParamType.TARGET];
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
