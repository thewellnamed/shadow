# Wrath Shadow Priest Log Analyzer

To build and run locally, you'll either need [Angular CLI](https://github.com/angular/angular-cli) (built with v14.2.2)
or [Yarn](https://yarnpkg.com/). If you're familiar with ng-cli commands, you can use those.

### Yarn Commands

> `yarn install` - download and install node dependencies
> 
> `yarn serve`   - run locally at http://localhost:4200
> 
> `yarn build`   - build distributable (dist/shadow)

### Live Site

https://thewellnamed.github.io/shadow

### Gameplay Basics

For more information, or for questions about shadow priest gameplay, check out #vod-and-log-review in [shadow priest discord](https://discord.gg/classicshadow).

### Configuration Settings

For information on analyzer settings, see [Configuration Settings](SETTINGS.md)

### Glossary

Definitions of stats/terms available via the [Glossary](GLOSSARY.md).

### Credits

Almost the entirety of the underlying information about how to maximize performance as a shadow priest comes from
[priest discord](https://discord.gg/priestclassic) (and now, [shadow priest discord](https://discord.gg/classicshadow)).
Special thanks to Passion for his organizing efforts, Linelo for him theorycrafting and sim work, and BTGF for being the best.


### Changelog

- January 16th, 2023
  - Initial Phase 2 (Ulduar) support
    - Added new trinkets and T8 4pc buff tracking
    - Added support for tracking important encounter debuffs, e.g. Rune of Power
    - Improved inference of untracked haste buffs, including Starlight on Hodir. Inference is imperfect and a bit of a work in progress.


- November 16th, 2022
  - Added Sim export option for an encounter. Creates a JSON configuration for WowSims which includes most relevant debuff/buff settings for the fight.


- September 17th, 2022
  - Improved buff tracking and added display of active buff icons for each spell in the timeline.
  - Added settings screen for configuration (For details, see [Configuration Settings](SETTINGS.md))


- September 8th, 2022
  - **Wrath Pre-patch Release (Beta)!**
  
    Notable:
    - Basic support for hasted dots and crit
    - Updates spell IDs for wrath, and handles multiple ranks per spell

    Todo:
    - More work is needed to track haste from buffs/auras, TBD for wrath release.


- January 28th, 2022
  - **Phase 3 Release!**
  
    Notable new features:
    - Tracking haste per cast and Avg Haste across the encounter
    - GCD usage percent (a measure of casting activity)
    - Latency tracked for all casts. Note that some post-cast latency on queued spells is in server processing, not
      from network or input latency client-side.
    - Tightened tuning of latency to exclude delays from movement over 1s

    See the [Glossary](GLOSSARY.md) for more information on new stats.


- December 2021
  - Added [Early MF Clips](GLOSSARY.md#early-mf-clips) and [Clipped MF DPS](GLOSSARY.md#clipped-mf-dps) stats
  - Fixed some bugs with associating AoE damage instances to targets and handling "Unknown Actor" in log cast data
  - Added better support for deep linking into the app.
  - Improved mobile styling and handling of various screen sizes
  

- November 2021 
  - Various bug fixes and accuracy improvements
  - Added Starshards and Devouring Plague, visible in the timeline
  - Added support for AoE spells, engineering bombs, and Lady Vashj paraphernalia (nets, thornlings, land mines)
  - Modified DoT Downtime and Time Off Cooldown to only consider casts while actually active. 
    The goal is to measure rotational efficiency, and it's not really possible to handle mechanics related movement well.
    So, we just assume you're moving for good reason if you have a long delay. This improves the meaningfulness of these stats. I think.
    - Next casts more than 3s after a mind-flay are ignored for avg latency calculation
    - Re-dotting more than 10s later is ignored for avg DoT Downtime.
    - MB/SW:D more than 10s late is ignored for avg Time Off Cooldown.
