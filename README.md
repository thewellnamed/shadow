# TBCC Shadow Priest Log Analyzer

To build and run locally, you'll either need [Angular CLI](https://github.com/angular/angular-cli) (built with v12.2.7)
or [Yarn](https://yarnpkg.com/). If you're familiar with ng-cli commands, you can use those.

### Yarn Commands

> `yarn install` - download and install node dependencies
> 
> `yarn serve`   - run locally at http://localhost:4200
> 
> `yarn build`   - build distributable (dist/shadow)

### Live Site

https://thewellnamed.github.io/shadow

### Glossary

Definitions of stats/terms available via the [Glossary](GLOSSARY.md)

### Todo

[Todo List](TODO.md)

### Changelog
- 2021/11/30
  - Added Starshards and Devouring Plague, visible in the timeline
  - Added support for AoE spells
  - Added some engineering bombs and Lady Vashj paraphernalia (nets, thornlings, land mines)

- 2021/11/29
  - Fixed various bugs related to associating damage events to casts, causing inaccurate stats
  - Modified DoT Downtime and Time Off Cooldown to only consider casts while actually active. 
    The goal is to measure rotational efficiency, and it's not really possible to handle mechanics related movement well.
    So, we just assume you're moving for good reason if you have a long delay. This improves the meaningfulness of these stats. I think.
    - Next casts more than 3s after a mind-flay are ignored for avg latency calculation
    - Re-dotting more than 10s later is ignored for avg DoT Downtime.
    - MB/SW:D more than 10s late is ignored for avg Time Off Cooldown.


- 2021/11/25
  - Fixed bug in post-channel latency calculation


- 2021/11/23
  - Improved rendering performance by switching to ChangeDetectionStrategy.OnPush
  - Added overall summary stats
  - Added Spellpower/Active DPS


- 2021/11/22
  - Fixed display of friendly target names in cast list
  - Added display of damage absorbed/resisted
  - Sort target list alphabetically
