import { HttpParams } from '@angular/common/http';
import { Params } from '@angular/router';

export function urlPath(url: string) {
  const qIndex = url.indexOf('?');
  if (qIndex < 0) {
    return url;
  }

  return url.substring(0, qIndex);
}

export function urlQuery(url: string): HttpParams {
  const qIndex = url.indexOf('?');
  const params = qIndex >= 0 ? url.substring(qIndex + 1) : '';

  return new HttpParams({ fromString: params });
}

export function makeParams(query: HttpParams): Params {
  return query.keys().reduce((obj, k) => {
    obj[k] = query.get(k) as string;
    return obj;
  }, {} as Params);
}
