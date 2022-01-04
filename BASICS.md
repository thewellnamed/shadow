# Shadow Priest Basics

Note: essentially all of the guidance here is shamelessly stolen from the [priest discord](https://discord.gg/priestclassic)! Discord
is the recommended place to ask questions about basic gameplay, but read the FAQ first!

### DoTs, Downtime, and Clipping

The analyses presented in this tool are based on the conclusion that in an ideal encounter the shadow priest will maintain DoTs on targets with
as close to 100% uptime as possible, without ever re-casting a DoT until after the last tick of the previous cast ("without clipping"). 
In some other WoW expansions it is correct to refresh DoTs rather than letting them fall off before reapplying, but that is not true in TBC.

The two goals -- 100% uptime, without clipping -- are related but have different explanations:

100% uptime means that the DoT ticks every 3s for the duration of the fight. After the last tick of a cast, if the next cast is delayed by 2s,
then there will be a 2s downtime, e.g. instead of:

```
<tick> -3s- <last tick>/<new cast> -3s- <tick>
```

you will have:

```
<tick> -3s- <last tick> -2s- <new cast> -3s- <tick>
```

Note that what matters for uptime is that the new cast begins _immediately following a tick of the previous cast_. You can actually maintain
perfect uptime while re-casting early, if and only if you re-cast immediately after some tick. It is generally easier in practice to avoid
downtime after a tick by reapplying after the last tick, but the larger reason to avoid clipping your casts is that doing so _loses GCDs_.

Suppose over the course of a fight you can get 60 VT ticks. If you clip the last tick of each cast, you will need to cast VT 15 times 
(60 ticks / 4 ticks per cast == 15). But if you don't clip, you will only need 12 casts (60 / 5). Those 3 extra GCDs can be used to do more damage,
e.g. with Mind Flay filler. Whether or not clipping will cost a GCD depends on fight length in relation to DoT duration, and so varies from
fight to fight, but this is the general reason why it's best to try to avoid clipping. DoTs are more efficient, both in terms of mana and GCDs,
when they can tick fully.

### Mind Flay Clipping and Latency

Efficient use of mind flay is probably the most distinctive element of shadow priest play, and it is informed by two considerations. The first is
the way we prioritize spell usage, and the second is the unique characteristics of channeled spells.

Mind Flay is typically the least effective shadow spell, measured in terms of damage per GCD. Note that we measure "per GCD" instead of "per second" 
in order to properly account for DoTs, which spread their damage out over time but with the great benefit of allowing us to cast other spells while 
they are ticking. A SW:P that contributes ~6k damage from a single GCD is more efficient DPS than a Mind Blast hit for 3k in one GCD, even 
though the instantaneous DPS of the Mind Blast is higher. This explains the general priority system: DoTs > MB/Death > Mind Flay. With a caveat
that Vampiric Touch mana return utility is a special case (and the main reason to prioritize VT ahead of all else).

Even though Mind Flay has the lowest priority, we still cast it a lot, because DoTs are already ticking and our other spells have cooldowns. But,
to maximize DPS we want to clip mind flay casts in order to switch to our other abilities whenever they are available.

"Clipping" Mind Flay means interrupting the channel after a tick in order to start a new cast. 

Consider this common case. If you cast MB->Death there is now a 4s window before MB is off cooldown, assuming 5/5 talent and no haste (similar cases 
occur with haste, so what follows will still apply). If you channel a full Mind Flay, at the end you'll have 1s left before MB is available. If you 
start channeling another MF and interrupt after 1 tick, you'll have to wait 0.5s for the GCD, delaying your MB. Instead, you do this:

> MB -> Death -> MF2 -> MF2 -> MB

If you clip each flay cast immediately after the 2nd tick, the two casts will last exactly 4s, and MB becomes available immediately after. This
maximizes DPS for the sequence, and illustrates the general idea of clipping MF in order to "fit" the rotation. 

This is also where _latency_ becomes important. In the idealized example, the cooldowns line up because each cast happens immediately after the 
previous. For MB and Death, the  spell queueing system helps us achieve that. You can be spamming death while casting MB and the death cast will 
be queued on the server and cast with no latency. 

That is not possible with MF, given that we want to interrupt it. If we wait to see the second tick before pressing the MF button again, there will
be latency between the tick and the start of the next cast: _input latency_ including our reaction time, and _network latency_ to the server. The higher
the latency, the less efficient the sequence and thus the less DPS. The [MF latency](GLOSSARY.md#avg-mf-latency) stat in the analyzer measures this, 
and our goal is to minimize it by adjusting our play to cast MF "early", accounting for latency. There are castbar addons which can help with this, 
see the discord!

Note that the opposite problem of latency after an MF cast or clip is clipping MF too early, and thus losing a tick. It hurts a little to
introduce 200ms delay after a MF clip. It hurts a lot more to interrupt the channel 200ms _before_ the tick. [Early MF Clips](GLOSSARY.md#early-mf-clips)
tracks this.

So, to sum up:
- We want to clip at MF2 if any other part of the rotation becomes available
- We want to start the next cast after a channel as quickly as possible, whether clipping or not. Minimize [MF latency](GLOSSARY.md#avg-mf-latency)
- But, we also want to avoid clipping early. A little latency is better than an early clip.

### Mind Blast and Shadow Word: Death

These are much simpler than MF and DoTs! As with any spell with a cooldown, you maximize their value by maximizing usage, which means casting as soon as possible
after the cooldown ends! The analyzer shows on average how long you take to cast after the cooldown ends. Note that because of the way cooldowns,
DoT durations, and MF cast times relate to each other it's probably not possible to reduce time off cooldown to zero. But the goal is to minimize it.
