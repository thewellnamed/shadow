# Definitions

### Active DPS

Total Damage / Active Time (see below)

### Active Time

"Active" time is the cumulative time in which tracked casts are doing damage, including cast time. For DoTs and MF, the active time is the delta
between start of cast and the last damage tick. For direct damage spells with a cast time (e.g. Mind Blast), the cast time is used. For instant casts,
GCD is used.

### Avg DoT Downtime

If the player casts the same DoT (SW:P, VT) on a target multiple times per encounter, the downtime for each cast is the delta between the start
of the current cast and the last tick of the previous cast:

```
current.dotDowntime = current.castEnd - previous.lastDamageTimestamp
```

The Avg per-cast downtime is the mean of the downtime for all included casts. Casts with downtime greater than 10s are ignored for the average 
as outliers likely to represent time moving for mechanics, phase transitions, etc.

### Avg Haste

The analyzer attempts to track how much haste is active on each spell cast. A "base" haste rating is derived from combatant info
events at the beginning of an encounter, and includes haste rating from gear. Buff events are tracked to follow when other buffs
increase haste during the encounter, e.g. Heroism, or MSD procs. Average haste is weighted by the number of (hasted) GCDs consumed
by each cast, to that e.g. 2 GCDs spent casting a hasted mind flay contribute slightly more to the average than 1 GCD casting SW:P.

```
stats.avgHaste = sum(cast.haste * cast.gcds) / sum(cast.gcds)
```

### Avg Off Cooldown

For spells with cooldowns (MB, SW:D), the time off cooldown for a given cast is the delta between the end of the previous cast and the start of
the current cast, minus the cooldown of the spell:

```
cast.timeOffCooldown = current.castStart - previous.castEnd - spell.cooldown
```

The Avg Time Off Cooldown is the mean of the downtime for all included casts. Casts with downtime greater than 10s are ignored for the
average as outliers likely to represent time moving for mechanics, phase transitions, etc.

### Avg Latency (non channeled casts)

For non-channeled casts, latency measures the delay from the _end_ of the GCD for the current cast and the start of the next cast.
For Mind Flay latency, see below. Note that latency is measured going forward, so the latency for a cast is not how slow you were
to start that cast, but how much delay was at the end of the cast. Casts with latency greater than 1s are ignored, since they most
likely represent movement, not "latency" per se.

Typically, you should be trying to use spell queueing for non-channeled casts, even during the GCD, so post-cast latency ought
to be small. This value does however include server latency in processing events, so 10-30ms of delay may be observed after a GCD
even when queueing properly. 

### Avg MF Latency

The post-channel latency on a Mind Flay cast is the delta between the last damage tick of the channel (or the end of the GCD, if
no ticks) and the start of the next cast:

```
endOfCurrent = current.lastDamageTimestamp OR current.endOfGcd
current.nextCastLatency = next.castStart - endOfCurrent
```

The Avg latency is the mean of the latency for each included cast. Casts with latency greater than 1s are ignored, since they likely
represent movement rather than casting latency. Casts which were [clipped early](#early-mf-clips) are also excluded, since they are reported
separately. Thus the "avg latency" for mind flay casts represents something like how efficiently you cast after a mind flay under "normal" circumstances without
mistakes. For stats on how frequently you mis-clip mind flay, see [Early MF Clips](#early-mf-clips) instead.

See [Basics](BASICS.md) for more on the mechanics of mind flay clipping.

### Avg Spellpower

Cast data from WCL includes the spellpower of the caster at the time of the cast, which is displayed for each cast. Instead of a simple mean,
the Avg Spellpower calculation is weighted by the amount of damage done by the cast, in order to represent the idea that it's more beneficial
to have greater spellpower (e.g. from trinkets) for casts that do more damage, like DoTs.

```
stats.avgSpellpower = sum(cast.spellPower * cast.totalDamage) / sum(cast.totalDamage)
```

### Clipped Dots

If a DoT is active on a given target, and it is re-cast on that target again before the final tick of the previous DoT, then the current
cast has clipped the previous:

```
current.clippedPreviousCast = current.castStart < previous.expectedLastDamageTimestamp AND previous.ticks < expected
```

See [Basics](BASICS.md) for more about why clipping DoTs is undesirable.

### Damage/GCD

This stat replaces "Avg Cast", but is closely related. The GCD of a cast takes into account the player's haste from rating and 
percent buffs at the time of the cast. Note that for VT, SW:P, MB, and Death, this is really just the total damage of the spell, 
since each of these consumes a single GCD. This is why Damage/GCD matches Avg Cast for those spells. 

However, Damage/GCD provides a more universal way to compare the relative DPS contributions across all spells, including mind flay.


### Early MF Clips

In cases where a Mind Flay channel is clearly interrupted for a new spell very close to the next expected tick, the cast is flagged as 
"clipped early". Currently the threshold for flagging is if the clip occurs more than 2/3 of the way to the next expected tick of the channel, 
taking haste into account. The number displayed is the number of casts that were clipped early by this measure.

Haste is accounted for by using the time between ticks (or between the cast and first tick), therefore at least one MF ticks must
occur for the cast to be flagged. Also note that only channels interrupted *for a new spell cast* are flagged, since the new start of the new cast
is needed for recognizing the clip. Channel interruptions from movement are not flagged.

### Clipped MF DPS

Estimates DPS lost from [Early MF Clips](#early-mf-clips). This value is estimated by assuming that the clipped tick would have hit for the same
amount as the previous tick. DPS is calculated by adding this "missing" damage to the overall damage for the encounter, with a slight discount,
depending on how closely you clipped before the next tick. The closer the clip, the "freer" that damage would have been. In other words, 
the discount factor tries to estimate for the fact that clipping early means starting the next cast sooner, so there is *some* small opportunity 
cost to waiting for the next tick.

The discount factor is the ratio between the time that has passed since the last tick (or cast start), and the time the next tick would have landed.
So if you clip 0.95s after the last tick, which would have landed at 1.0s, the discount is `0.95/1.0` = `0.95`.

```
stats.lostMfDps = (channelStats.totalClippedDamage * discountFactor) / encounter.durationSeconds
```

### GCD Usage

By tracking player haste and buffs, the analyzer can determine the theoretically maximum number of GCDs you could use over the
course of the encounter, and see what percentage of GCDs were actually consumed by various casts. Note that the GCD usage of an 
individual cast is just the cast time (channel time to last tick, for mind flay) divided by the GCD determined by haste 
(or 1, for instant cast spells). 

This feature is somewhat experimental and anecdotally so no color-coded metrics are provided. Anecdotally, it seems difficult to 
exceed 95% usage even on very tank-and-spank encounters. This seems likely to be due to unavoidable latency, some of which occurs
in the server processing itself.

### Truncated

If a DoT or Mind Flay is cut off early because the mob died, then the cast is marked as truncated. DoTs truncated with less than
half of the expected ticks are flagged, as are Mind Flay casts with no ticks because the target died.
