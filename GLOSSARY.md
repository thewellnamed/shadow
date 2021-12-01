# Definitions

### Active DPS

Total Damage / Active Time (see below)

### Active Time

"Active" time is the cumulative time in which tracked casts are doing damage, including cast time. For DoTs and MF, the active time is the delta
between start of cast and the last damage tick. For Mind Blast and SW:D, active time is the cumulative cast time. Haste is taken into account for
Mind Blast via cast time. Unfortunately this isn't available for instant-cast spells (GCD is not tracked directly), so for SW:D active time is just
`(number of casts) * 1.5`.

### Avg DoT Downtime

If the player casts the same DoT (SW:P, VT) on a target multiple times per encounter, the downtime for each cast is the delta between the start
of the current cast and the last tick of the previous cast:

```
current.dotDowntime = current.castEnd - previous.lastDamageTimestamp
```

The Avg per-cast downtime is the mean of the downtime for all included casts.
Casts with downtime greater than 10s are ignored for the average as outliers likely to represent time moving for mechanics, phase transitions, etc. 

### Avg Off Cooldown

For spells with cooldowns (MB, SW:D), the time off cooldown for a given cast is the delta between the end of the previous cast and the start of
the current cast, minus the cooldown of the spell:

```
cast.timeOffCooldown = current.castStart - previous.castEnd - spell.cooldown
```

The Avg Time Off Cooldown is the mean of the downtime for all included casts. Casts with downtime greater than 10s are ignored for the
average as outliers likely to represent time moving for mechanics, phase transitions, etc.

### Avg MF Latency

Because Mind Flay is a channeled spell, it's possible to interrupt the cast between damage ticks, and begin a cast of a new spell. This is 
particularly useful for Shadow Priest rotation because it is often desirable to clip the channel after the second tick.

The "post-channel latency" on a Mind Flay cast is the delta between the last damage tick of the channel (or the start of the channel, if
no damage) and the start of the next cast:

```
endOfCurrent = current.lastDamageTimestamp OR current.castEnd
current.nextCastLatency = next.castStart - endOfCurrent
```

The Avg latency is the mean of the latency for each included cast. Casts with latency greater than 3s are ignored.

### Avg Spellpower

Cast data from WCL includes the spellpower of the caster at the time of the cast, which is displayed for each cast. Instead of a simple mean,
the Avg Spellpower calculation is weighted by the amount of damage done by the cast, in order to represent the idea that it's more beneficial
to have greater spellpower (e.g. from trinkets) for casts that do more damage, like DoTs.

```
stats.avgSpellpower = sum(cast.spellPower * cast.totalDamage) / sum(cast.totalDamage)
```

### Clipped Dots / Ticks

If a DoT is active on a given target, and it is re-cast on that target again before the final tick of the previous DoT, then the current
cast has clipped the previous:

```
current.clippedPreviousCast = current.castStart < previous.expectedLastDamageTimestamp AND previous.ticks < expected
```

For clipped DoT casts, the number of "missing" ticks is the difference between the number of ticks of the previous cast and the expected, 
i.e. if VT has ticked 4 times, and is re-cast before the fifth tick, then the new cast clipped 1 tick.

```
current.clippedTicks = spell.expectedInstances - prev.ticks;
```

### DPS/Power

DPS = [Active DPS](#active-dps)
Power = [Avg Spellpower](#avg-spellpower)

```
stats.powerMetric = DPS / Power
```

### Truncated

If a DoT or Mind Flay is cut off early because the mob died, then the cast is marked as truncated. DoTs truncated with less than
half of the expected ticks are flagged, as are Mind Flay casts with no ticks.
