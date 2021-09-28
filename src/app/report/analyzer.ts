import { CastDetails } from 'src/app/report/cast-details';
import { IEventData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/spell-id.enum';

export class Analyzer {
  static run(castData: IEventData[], damageData: IEventData[]) {
    const casts: CastDetails[] = [];
    let next: IEventData;
    let damageIndex = 0;

    const events: {[spell: number]: any[]} = {
      [SpellId.DEATH]: [],
      [SpellId.PAIN]: [],
      [SpellId.MIND_BLAST]: [],
      [SpellId.MIND_FLAY]: [],
      [SpellId.VAMPIRIC_TOUCH]: []
    };

    for (const event of damageData) {
      if (events.hasOwnProperty(event.ability.guid)) {
        events[event.ability.guid].push(event);
      }
    }

    // eslint-disable-next-line no-console
    console.log(events);

    while (castData.length > 0) {
      next = castData.shift() as IEventData;

      // if we're beginning to cast, remember and move on
      // if we see a new "begincast" on the same spell, just overwrite
      // when we see a cast, then we can create the CastDetails
      // at that point, we shift() from damage
      // but it's not purely linear, so we're going to have to look in a window in damage?
    }
  }
}
