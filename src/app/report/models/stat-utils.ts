const NO_VALUE = '---';

export function duration(lengthMs: number, format = 'mm:ss.dd') {
  const offset = lengthMs/1000;

  let minutes = Math.floor(offset / 60),
    secondsFloat = offset - (minutes * 60),
    seconds = Math.floor(secondsFloat),
    decimal = Math.round((secondsFloat - seconds) * 100);

  if (decimal === 100) {
    decimal = 0;
    seconds++;
  }

  const values: any = {
    M: minutes,
    mm: (minutes + '').padStart(2, '0'),
    S: seconds,
    ss: (seconds + '').padStart(2, '0'),
    dd: (decimal + '').padStart(2, '0').padEnd(2, '0')
  };

  let out = format;
  for (const key in values) {
    out = out.replace(key, values[key]);
  }

  return out;
}

export function format(value: number|undefined, decimals = 1, suffix = '') {
  if (value === undefined) {
    return NO_VALUE;
  }

  const factor = 10 ** decimals;
  const result = Math.round(value * factor) / factor;
  return result + (result === 0 ? '' : suffix);
}

export function latency(value: number|undefined) {
  if (value === undefined) {
    return NO_VALUE;
  }

  return format(value * 1000, 0, 'ms');
}
