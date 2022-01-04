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

### Gameplay Basics

A brief explanation of the shadow gameplay principles which inform this analyzer is available in [Basics](BASICS.md). For more information,
or for questions about shadow priest gameplay, check out #vod-and-log-review in [shadow priest discord](https://discord.gg/classicshadow).

### Glossary

Definitions of stats/terms available via the [Glossary](GLOSSARY.md)

### Credits

Almost the entirety of the underlying information about how to maximize performance as a shadow priest comes from
[priest discord](https://discord.gg/priestclassic) (and now, [shadow priest discord](https://discord.gg/classicshadow)).
Special thanks to Passion for his organizing efforts.

### Todo

[Todo List](TODO.md)

### Changelog

- 2021/12/22
  - Added [Early MF Clips](GLOSSARY.md#early-mf-clips) and [Clipped MF DPS](GLOSSARY.md#clipped-mf-dps) stats
  - Fixed some bugs with associating AoE damage instances to targets and handling "Unknown Actor" in log cast data
  - Added better support for deep linking into the app.


- 2021/12/01
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
