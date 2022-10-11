# Configuration Settings

After pulling up a report for a specific encounter, there is now a gear icon at the top right of the spell list, next
to the spellpower/haste toggle. Clicking the gear will take you to a screen where you can edit settings used in the
analysis of the encounter:

![Configuration Settings Screen](https://raw.githubusercontent.com/thewellnamed/shadow/main/docs/images/settings-screen.png)

The purpose of this new screen is two-fold. First, there are some data that just don't exist in the log file, for
example whether or not boomkins in your raid have improved moonkin form, or whether your shaman has placed a wrath
of air totem. Secondly, there are occasionally bugs where certain data is missing from the log, most notably gear
haste rating for the player. Updating configuration settings to match the real encounter, or to replace missing data
from the log can improve the accuracy of the analysis, particularly around GCD usage and spell haste.

Note that settings are saved per-player in local browser storage, and retained across logs. So if you set your gear rating
to fix one log, it will be remembered when analyzing a different log that's also missing data. Note also that saved
settings are not shared across different browsers or devices.

## Options

### Gear Haste Rating

By default, this is pulled from the log, and if present in the log then this field is disabled. If the info is missing,
however, you can edit this to enter your total haste rating from gear (without buffs). Note that one easy way to find
this number is just to check the settings page for a different encounter where the log is complete.

### Improved Mind Blast Talent Points

Specify the number of points you have talented. Defaults to 5. Used to determine time-off-cooldown between Mind Blast casts.

### Moonkin/Ret Aura

By default auras and procs are tracked from the log, including auras present at the start of the encounter. When this data
is available in the log, then this field is disabled. If the info is missing, enable this option to assume that either
Moonkin Aura or Retribution Aura were present at encounter start. Note that these are interchangeable if both are talented to
give 3% haste.

### Improved Moonkin Form

Specify whether to add 3% haste when Moonkin Aura is found on the player. Defaults to on.

### Swift Retribution

Specify whether to add 3% haste when Retribution Aura is found on the player. Defaults to on.

### Wrath of Air Totem

Unfortunately WCL can't track the presence or absence of this aura, almost _at all_. If you enable this settings,
and there is a shaman in your raid, then the analyzer will attempt to determine which casts should have the +5% haste buff,
by comparing your actual logged cast times and tick intervals to the expected haste given your buffs. If a large enough gap exists
between your actual and expected, wrath of air will be applied as a buff. Defaults to on.
