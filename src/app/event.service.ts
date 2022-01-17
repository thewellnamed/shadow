import { Injectable } from '@angular/core';
import { merge, Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EventService {
  private channels: IEventChannels;

  constructor() {
    this.channels = {};
  }

  /**
   * Initialize a new Event channel
   * Allows the type of Subject to be specified
   * @param {string} Event name
   * @param {typeof Subject} Subject Type for channel, e.g. BehaviorSubject or RepeatSubject
   */
  public createChannel<T = any>(name: string, channelType: ChannelType) {
    if (this.channels.hasOwnProperty(name)) {
      throw new Error(`Duplicate channel ${name}`);
    }

    this.channels[name] = new channelType();
  }

  /**
   * Broadcast an event
   * @param {string} name of event
   * @param {T = any} data Event data
   */
  public broadcast<T = any>(name: string, data?: T) {
    if (this.channels.hasOwnProperty(name)) {
      this.channels[name].next({ name, data });
    }
  }

  /**
   * Subscribe to one or more events
   * @param {string|string[]} eventNames of events to subscribe
   * @param {EventHandler<T>} event handler method expecting data of type T
   * @param {Subject<T>} unsub unubscribe when this observable tells us to
   */
  public subscribe<T = any>(eventNames: string|string[], handler: EventHandler<T>) {
    return this.getObservable(eventNames).subscribe(handler);
  }

  /**
   * Merge requested event into a single channel
   */
  private getObservable<T = any>(eventNames: string|string[]): Observable<IEvent<any>> {
    const events = Array.isArray(eventNames) ? eventNames : [eventNames],
      channelsToMonitor: Array<Subject<IEvent>> = [];

    for (const eventName of events) {
      if (!this.channels.hasOwnProperty(eventName)) {
        this.channels[eventName] = new Subject<IEvent>();
      }

      channelsToMonitor.push(this.channels[eventName]);
    }

    return merge(...channelsToMonitor);
  }
}

type Constructor<T = any> = new (...args: any[]) => T;
export type ChannelType<T = any> = Constructor<Subject<IEvent<T>>>;
export type EventHandler<T = any> = (event: IEvent<T>) => void;

export interface IEvent<T = any> {
  name: string;
  data: T;
}

interface IEventChannels {
  [s: string]: Subject<IEvent>;
}
