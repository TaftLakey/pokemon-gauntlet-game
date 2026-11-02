import { hashString, mulberry32 } from './rng';

export interface TrainerBuild {
  name: string;
  theme: string;
  team: string; // Showdown paste format
  uncapturable?: readonly string[];
}

export interface Trainer {
  name: string;
  title: string;
  type: string;
  builds: readonly [TrainerBuild, TrainerBuild, TrainerBuild];
}

/** Deterministically pick a trainer's build based on the day's seed and trainer index */
export function dailyTrainerBuild(trainer: Trainer, key: string, trainerIndex: number): TrainerBuild {
  const rand = mulberry32(hashString(`trainer-build:${key}:${trainerIndex}`));
  return trainer.builds[Math.floor(rand() * trainer.builds.length)];
}

export function dailyTrainer(index: number, key: string): { trainer: Trainer; build: TrainerBuild } {
  const trainer = KANTO[index];
  return { trainer, build: dailyTrainerBuild(trainer, key, index) };
}

/** Kanto run: 8 gyms, Elite Four, Champion. Each trainer has 3 distinct competitive builds. */
export const KANTO: readonly Trainer[] = [
  // 1. Brock
  {
    name: 'Brock',
    title: 'Pewter Gym Leader',
    type: 'Rock',
    builds: [
      {
        name: 'Sand Offense',
        theme: 'Sand',
        uncapturable: ['Terrakion'],
        team: `
Tyranitar @ Choice Band
Ability: Sand Stream
Adamant Nature
- Stone Edge
- Crunch
- Earthquake
- Fire Punch

Rhyperior @ Leftovers
Ability: Solid Rock
Adamant Nature
- Earthquake
- Stone Edge
- Megahorn
- Swords Dance

Lycanroc-Dusk @ Life Orb
Ability: Tough Claws
Jolly Nature
- Accelerock
- Close Combat
- Crunch
- Stone Edge

Garganacl @ Leftovers
Ability: Purifying Salt
Careful Nature
- Salt Cure
- Recover
- Protect
- Body Press

Gigalith @ Assault Vest
Ability: Sand Stream
Adamant Nature
- Stone Edge
- Earthquake
- Heavy Slam
- Explosion

Terrakion @ Choice Band
Ability: Justified
Jolly Nature
- Close Combat
- Stone Edge
- Sacred Sword
- Earthquake
`
      },
      {
        name: 'Hazard Balance',
        theme: 'Entry hazards',
        team: `
Aerodactyl @ Focus Sash
Ability: Pressure
Jolly Nature
- Stealth Rock
- Taunt
- Stone Edge
- Dual Wingbeat

Glimmora @ Focus Sash
Ability: Toxic Debris
Timid Nature
- Mortal Spin
- Stealth Rock
- Sludge Wave
- Earth Power

Cradily @ Leftovers
Ability: Storm Drain
Calm Nature
- Giga Drain
- Recover
- Stealth Rock
- Earth Power

Kleavor @ Choice Scarf
Ability: Sharpness
Jolly Nature
- Stone Axe
- X-Scissor
- Close Combat
- U-turn

Coalossal @ Heavy-Duty Boots
Ability: Flame Body
Careful Nature
- Rapid Spin
- Spikes
- Flare Blitz
- Stone Edge

Tyrantrum @ Life Orb
Ability: Rock Head
Jolly Nature
- Head Smash
- Dragon Claw
- Earthquake
- Dragon Dance
`
      },
      {
        name: 'Trick Room',
        theme: 'Trick Room',
        team: `
Carbink @ Mental Herb
Ability: Sturdy
Relaxed Nature
- Trick Room
- Stealth Rock
- Body Press
- Moonblast

Rhyperior @ Choice Band
Ability: Solid Rock
Brave Nature
- Earthquake
- Stone Edge
- Megahorn
- Ice Punch

Gigalith @ Custap Berry
Ability: Sand Stream
Brave Nature
- Stone Edge
- Earthquake
- Heavy Slam
- Explosion

Minior @ White Herb
Ability: Shields Down
Brave Nature
- Shell Smash
- Acrobatics
- Stone Edge
- Earthquake

Omastar @ Life Orb
Ability: Weak Armor
Quiet Nature
- Hydro Pump
- Ice Beam
- Earth Power
- Ancient Power

Drednaw @ Life Orb
Ability: Strong Jaw
Brave Nature
- Liquidation
- Stone Edge
- Jaw Lock
- Superpower
`
      }
    ]
  },

  // 2. Misty
  {
    name: 'Misty',
    title: 'Cerulean Gym Leader',
    type: 'Water',
    builds: [
      {
        name: 'Rain Offense',
        theme: 'Rain',
        uncapturable: ['Manaphy'],
        team: `
Pelipper @ Damp Rock
Ability: Drizzle
Bold Nature
- Scald
- Hurricane
- U-turn
- Roost

Barraskewda @ Choice Band
Ability: Swift Swim
Jolly Nature
- Liquidation
- Close Combat
- Aqua Jet
- Crunch

Kingdra @ Choice Specs
Ability: Swift Swim
Modest Nature
- Hydro Pump
- Draco Meteor
- Surf
- Ice Beam

Basculegion @ Choice Scarf
Ability: Adaptability
Jolly Nature
- Wave Crash
- Last Respects
- Aqua Jet
- Head Smash

Floatzel @ Choice Band
Ability: Swift Swim
Jolly Nature
- Wave Crash
- Liquidation
- Ice Spinner
- Low Kick

Manaphy @ Leftovers
Ability: Hydration
Timid Nature
- Tail Glow
- Surf
- Energy Ball
- Ice Beam
`
      },
      {
        name: 'Bulky Waters',
        theme: 'Balance',
        uncapturable: ['Suicune'],
        team: `
Toxapex @ Black Sludge
Ability: Regenerator
Bold Nature
- Scald
- Recover
- Haze
- Toxic

Slowbro @ Heavy-Duty Boots
Ability: Regenerator
Bold Nature
- Scald
- Psyshock
- Slack Off
- Teleport

Gastrodon @ Leftovers
Ability: Storm Drain
Calm Nature
- Earth Power
- Ice Beam
- Recover
- Toxic

Rotom-Wash @ Leftovers
Ability: Levitate
Timid Nature
- Volt Switch
- Hydro Pump
- Will-O-Wisp
- Pain Split

Primarina @ Choice Specs
Ability: Torrent
Modest Nature
- Moonblast
- Hydro Pump
- Psychic
- Sparkling Aria

Suicune @ Leftovers
Ability: Pressure
Bold Nature
- Calm Mind
- Scald
- Rest
- Sleep Talk
`
      },
      {
        name: 'Rain Sweepers',
        theme: 'Rain',
        uncapturable: ['Urshifu-Rapid-Strike'],
        team: `
Politoed @ Damp Rock
Ability: Drizzle
Calm Nature
- Scald
- Ice Beam
- Encore
- Rest

Drednaw @ Life Orb
Ability: Swift Swim
Adamant Nature
- Swords Dance
- Liquidation
- Stone Edge
- Earthquake

Ludicolo @ Life Orb
Ability: Swift Swim
Modest Nature
- Hydro Pump
- Giga Drain
- Ice Beam
- Focus Blast

Swampert @ Leftovers
Ability: Damp
Relaxed Nature
- Flip Turn
- Earthquake
- Scald
- Stealth Rock

Greninja @ Life Orb
Ability: Protean
Timid Nature
- Hydro Pump
- Dark Pulse
- Ice Beam
- U-turn

Urshifu-Rapid-Strike @ Choice Band
Ability: Unseen Fist
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- U-turn
`
      }
    ]
  },

  // 3. Lt. Surge
  {
    name: 'Lt. Surge',
    title: 'Vermilion Gym Leader',
    type: 'Electric',
    builds: [
      {
        name: 'Electric Terrain',
        theme: 'Electric Terrain',
        uncapturable: ['Tapu Koko'],
        team: `
Tapu Koko @ Choice Specs
Ability: Electric Surge
Timid Nature
- Thunderbolt
- Dazzling Gleam
- Volt Switch
- Grass Knot

Iron Hands @ Booster Energy
Ability: Quark Drive
Adamant Nature
- Drain Punch
- Wild Charge
- Ice Punch
- Fake Out

Pawmot @ Choice Scarf
Ability: Natural Cure
Jolly Nature
- Double Shock
- Close Combat
- Ice Punch
- Revival Blessing

Kilowattrel @ Heavy-Duty Boots
Ability: Volt Absorb
Timid Nature
- Thunderbolt
- Hurricane
- Volt Switch
- Roost

Magnezone @ Choice Specs
Ability: Magnet Pull
Modest Nature
- Thunderbolt
- Flash Cannon
- Volt Switch
- Body Press

Heliolisk @ Life Orb
Ability: Dry Skin
Timid Nature
- Thunderbolt
- Hyper Voice
- Focus Blast
- Volt Switch
`
      },
      {
        name: 'VoltTurn',
        theme: 'Pivot offense',
        uncapturable: ['Raikou'],
        team: `
Rotom-Wash @ Choice Scarf
Ability: Levitate
Timid Nature
- Volt Switch
- Hydro Pump
- Trick
- Will-O-Wisp

Eelektross @ Assault Vest
Ability: Levitate
Quiet Nature
- Volt Switch
- Giga Drain
- Flamethrower
- Knock Off

Raikou @ Choice Specs
Ability: Inner Focus
Timid Nature
- Thunderbolt
- Volt Switch
- Scald
- Aura Sphere

Vikavolt @ Heavy-Duty Boots
Ability: Levitate
Modest Nature
- Volt Switch
- Bug Buzz
- Thunderbolt
- Energy Ball

Luxray @ Flame Orb
Ability: Guts
Adamant Nature
- Wild Charge
- Facade
- Crunch
- Volt Switch

Jolteon @ Heavy-Duty Boots
Ability: Volt Absorb
Timid Nature
- Thunderbolt
- Volt Switch
- Shadow Ball
- Hyper Voice
`
      },
      {
        name: 'Slow Control',
        theme: 'Bulky offense',
        uncapturable: ['Regieleki'],
        team: `
Ampharos @ Leftovers
Ability: Static
Modest Nature
- Thunderbolt
- Dragon Pulse
- Focus Blast
- Volt Switch

Bellibolt @ Leftovers
Ability: Electromorphosis
Bold Nature
- Parabolic Charge
- Muddy Water
- Toxic
- Slack Off

Eelektross @ Leftovers
Ability: Levitate
Careful Nature
- Coil
- Thunder Punch
- Drain Punch
- Knock Off

Magnezone @ Leftovers
Ability: Sturdy
Bold Nature
- Iron Defense
- Body Press
- Thunderbolt
- Substitute

Sandy Shocks @ Booster Energy
Ability: Protosynthesis
Timid Nature
- Earth Power
- Thunderbolt
- Stealth Rock
- Volt Switch

Regieleki @ Heavy-Duty Boots
Ability: Transistor
Timid Nature
- Thunderbolt
- Volt Switch
- Ancient Power
- Rapid Spin
`
      }
    ]
  },

  // 4. Erika
  {
    name: 'Erika',
    title: 'Celadon Gym Leader',
    type: 'Grass',
    builds: [
      {
        name: 'Sun Bloom',
        theme: 'Sun',
        uncapturable: ['Ogerpon-Hearthflame'],
        team: `
Whimsicott @ Heat Rock
Ability: Prankster
Timid Nature
- Sunny Day
- Moonblast
- U-turn
- Encore

Venusaur @ Life Orb
Ability: Chlorophyll
Modest Nature
- Sludge Bomb
- Giga Drain
- Weather Ball
- Growth

Lilligant-Hisui @ Life Orb
Ability: Chlorophyll
Jolly Nature
- Close Combat
- Solar Blade
- Victory Dance
- Ice Spinner

Sawsbuck @ Life Orb
Ability: Chlorophyll
Adamant Nature
- Double-Edge
- Horn Leech
- Jump Kick
- Swords Dance

Scovillain @ Choice Specs
Ability: Chlorophyll
Modest Nature
- Flamethrower
- Solar Beam
- Fire Blast
- Giga Drain

Ogerpon-Hearthflame @ Hearthflame Mask
Ability: Mold Breaker
Jolly Nature
- Ivy Cudgel
- Horn Leech
- Superpower
- Swords Dance
`
      },
      {
        name: 'Grassy Offense',
        theme: 'Grassy Terrain',
        uncapturable: ['Ogerpon-Wellspring'],
        team: `
Rillaboom @ Choice Band
Ability: Grassy Surge
Adamant Nature
- Grassy Glide
- Wood Hammer
- Knock Off
- U-turn

Breloom @ Focus Sash
Ability: Technician
Jolly Nature
- Spore
- Bullet Seed
- Mach Punch
- Swords Dance

Meowscarada @ Choice Band
Ability: Protean
Jolly Nature
- Flower Trick
- Knock Off
- U-turn
- Triple Axel

Serperior @ Leftovers
Ability: Contrary
Timid Nature
- Leaf Storm
- Dragon Pulse
- Glare
- Substitute

Brute Bonnet @ Booster Energy
Ability: Protosynthesis
Adamant Nature
- Bullet Seed
- Sucker Punch
- Close Combat
- Spore

Ogerpon-Wellspring @ Wellspring Mask
Ability: Water Absorb
Jolly Nature
- Ivy Cudgel
- Horn Leech
- Play Rough
- Swords Dance
`
      },
      {
        name: 'Regenerator Balance',
        theme: 'Bulky balance',
        team: `
Amoonguss @ Black Sludge
Ability: Regenerator
Bold Nature
- Spore
- Sludge Bomb
- Giga Drain
- Clear Smog

Ferrothorn @ Leftovers
Ability: Iron Barbs
Relaxed Nature
- Spikes
- Leech Seed
- Power Whip
- Gyro Ball

Hydrapple @ Assault Vest
Ability: Regenerator
Modest Nature
- Fickle Beam
- Giga Drain
- Earth Power
- Draco Meteor

Cradily @ Leftovers
Ability: Suction Cups
Careful Nature
- Recover
- Toxic
- Stealth Rock
- Seed Bomb

Appletun @ Leftovers
Ability: Ripen
Bold Nature
- Apple Acid
- Dragon Pulse
- Recover
- Leech Seed

Tangrowth @ Rocky Helmet
Ability: Regenerator
Relaxed Nature
- Giga Drain
- Knock Off
- Sludge Bomb
- Earthquake
`
      }
    ]
  },

  // 5. Koga
  {
    name: 'Koga',
    title: 'Fuchsia Gym Leader',
    type: 'Poison',
    builds: [
      {
        name: 'Hazard Stack',
        theme: 'Hazards and offense',
        team: `
Glimmora @ Focus Sash
Ability: Toxic Debris
Timid Nature
- Stealth Rock
- Mortal Spin
- Sludge Wave
- Earth Power

Gengar @ Focus Sash
Ability: Cursed Body
Timid Nature
- Shadow Ball
- Sludge Wave
- Focus Blast
- Destiny Bond

Sneasler @ Choice Band
Ability: Poison Touch
Jolly Nature
- Close Combat
- Dire Claw
- Gunk Shot
- U-turn

Toxtricity @ Choice Specs
Ability: Punk Rock
Modest Nature
- Boomburst
- Overdrive
- Sludge Wave
- Volt Switch

Iron Moth @ Booster Energy
Ability: Quark Drive
Timid Nature
- Fiery Dance
- Sludge Wave
- Energy Ball
- Psychic

Nidoking @ Life Orb
Ability: Sheer Force
Timid Nature
- Sludge Wave
- Earth Power
- Ice Beam
- Thunderbolt
`
      },
      {
        name: 'Toxic Control',
        theme: 'Status balance',
        team: `
Toxapex @ Black Sludge
Ability: Regenerator
Bold Nature
- Toxic
- Recover
- Baneful Bunker
- Haze

Clodsire @ Leftovers
Ability: Water Absorb
Careful Nature
- Earthquake
- Poison Jab
- Recover
- Toxic

Amoonguss @ Rocky Helmet
Ability: Regenerator
Bold Nature
- Spore
- Sludge Bomb
- Giga Drain
- Foul Play

Weezing-Galar @ Black Sludge
Ability: Neutralizing Gas
Bold Nature
- Strange Steam
- Sludge Bomb
- Will-O-Wisp
- Pain Split

Muk-Alola @ Assault Vest
Ability: Poison Touch
Adamant Nature
- Knock Off
- Poison Jab
- Crunch
- Shadow Sneak

Tentacruel @ Black Sludge
Ability: Liquid Ooze
Timid Nature
- Scald
- Sludge Bomb
- Rapid Spin
- Toxic Spikes
`
      },
      {
        name: 'Venom Rush',
        theme: 'Fast offense',
        team: `
Crobat @ Choice Band
Ability: Infiltrator
Jolly Nature
- Brave Bird
- Cross Poison
- U-turn
- Leech Life

Overqwil @ Life Orb
Ability: Swift Swim
Adamant Nature
- Barb Barrage
- Crunch
- Poison Jab
- Aqua Jet

Salazzle @ Heavy-Duty Boots
Ability: Corrosion
Timid Nature
- Flamethrower
- Sludge Wave
- Toxic
- Protect

Dragalge @ Choice Specs
Ability: Adaptability
Modest Nature
- Draco Meteor
- Sludge Wave
- Hydro Pump
- Focus Blast

Gengar @ Life Orb
Ability: Cursed Body
Timid Nature
- Shadow Ball
- Sludge Wave
- Nasty Plot
- Focus Blast

Sneasler @ White Herb
Ability: Unburden
Adamant Nature
- Close Combat
- Dire Claw
- Acrobatics
- Swords Dance
`
      }
    ]
  },

  // 6. Sabrina
  {
    name: 'Sabrina',
    title: 'Saffron Gym Leader',
    type: 'Psychic',
    builds: [
      {
        name: 'Psychic Terrain',
        theme: 'Psychic Terrain',
        uncapturable: ['Tapu Lele'],
        team: `
Indeedee-F @ Terrain Extender
Ability: Psychic Surge
Bold Nature
- Psychic
- Dazzling Gleam
- Hyper Voice
- Follow Me

Armarouge @ Choice Specs
Ability: Flash Fire
Modest Nature
- Expanding Force
- Armor Cannon
- Energy Ball
- Shadow Ball

Hatterene @ Leftovers
Ability: Magic Bounce
Quiet Nature
- Expanding Force
- Dazzling Gleam
- Mystical Fire
- Calm Mind

Gallade @ Life Orb
Ability: Sharpness
Jolly Nature
- Psycho Cut
- Sacred Sword
- Leaf Blade
- Swords Dance

Espathra @ Leftovers
Ability: Speed Boost
Modest Nature
- Stored Power
- Dazzling Gleam
- Protect
- Calm Mind

Tapu Lele @ Choice Specs
Ability: Psychic Surge
Timid Nature
- Psychic
- Moonblast
- Psyshock
- Focus Blast
`
      },
      {
        name: 'Trick Room',
        theme: 'Trick Room',
        team: `
Reuniclus @ Life Orb
Ability: Magic Guard
Quiet Nature
- Trick Room
- Psychic
- Focus Blast
- Shadow Ball

Bronzong @ Mental Herb
Ability: Levitate
Sassy Nature
- Trick Room
- Gyro Ball
- Earthquake
- Stealth Rock

Hatterene @ Life Orb
Ability: Magic Bounce
Quiet Nature
- Trick Room
- Psychic
- Dazzling Gleam
- Mystical Fire

Farigiraf @ Colbur Berry
Ability: Armor Tail
Quiet Nature
- Trick Room
- Hyper Voice
- Psychic
- Nasty Plot

Slowking-Galar @ Assault Vest
Ability: Regenerator
Quiet Nature
- Sludge Bomb
- Psychic
- Flamethrower
- Ice Beam

Iron Crown @ Booster Energy
Ability: Quark Drive
Modest Nature
- Tachyon Cutter
- Psychic
- Focus Blast
- Volt Switch
`
      },
      {
        name: 'Mind Games',
        theme: 'Setup offense',
        uncapturable: ['Latias'],
        team: `
Espeon @ Choice Specs
Ability: Magic Bounce
Timid Nature
- Psychic
- Dazzling Gleam
- Shadow Ball
- Trick

Gothitelle @ Choice Scarf
Ability: Shadow Tag
Timid Nature
- Psychic
- Trick
- Rest
- Energy Ball

Malamar @ Leftovers
Ability: Contrary
Careful Nature
- Superpower
- Knock Off
- Psycho Cut
- Rest

Alakazam @ Focus Sash
Ability: Magic Guard
Timid Nature
- Psychic
- Shadow Ball
- Focus Blast
- Nasty Plot

Latias @ Soul Dew
Ability: Levitate
Timid Nature
- Draco Meteor
- Mist Ball
- Calm Mind
- Recover

Scream Tail @ Leftovers
Ability: Protosynthesis
Jolly Nature
- Play Rough
- Psychic Fangs
- Stealth Rock
- Wish
`
      }
    ]
  },

  // 7. Blaine
  {
    name: 'Blaine',
    title: 'Cinnabar Gym Leader',
    type: 'Fire',
    builds: [
      {
        name: 'Sun Flare',
        theme: 'Sun',
        uncapturable: ['Chi-Yu'],
        team: `
Torkoal @ Heat Rock
Ability: Drought
Bold Nature
- Lava Plume
- Rapid Spin
- Stealth Rock
- Solar Beam

Cinderace @ Heavy-Duty Boots
Ability: Libero
Jolly Nature
- Pyro Ball
- High Jump Kick
- U-turn
- Gunk Shot

Chi-Yu @ Choice Specs
Ability: Beads of Ruin
Modest Nature
- Overheat
- Dark Pulse
- Flamethrower
- Psychic

Scovillain @ Life Orb
Ability: Chlorophyll
Modest Nature
- Fire Blast
- Solar Beam
- Giga Drain
- Growth

Volcarona @ Heavy-Duty Boots
Ability: Flame Body
Timid Nature
- Quiver Dance
- Flamethrower
- Bug Buzz
- Giga Drain

Gouging Fire @ Booster Energy
Ability: Protosynthesis
Jolly Nature
- Dragon Dance
- Flare Blitz
- Dragon Claw
- Earthquake
`
      },
      {
        name: 'Fire Balance',
        theme: 'Bulky offense',
        uncapturable: ['Heatran'],
        team: `
Heatran @ Leftovers
Ability: Flash Fire
Calm Nature
- Magma Storm
- Earth Power
- Flash Cannon
- Stealth Rock

Arcanine-Hisui @ Heavy-Duty Boots
Ability: Rock Head
Jolly Nature
- Flare Blitz
- Head Smash
- Extreme Speed
- Close Combat

Skeledirge @ Heavy-Duty Boots
Ability: Unaware
Bold Nature
- Torch Song
- Shadow Ball
- Slack Off
- Will-O-Wisp

Rotom-Heat @ Heavy-Duty Boots
Ability: Levitate
Timid Nature
- Volt Switch
- Overheat
- Will-O-Wisp
- Pain Split

Incineroar @ Heavy-Duty Boots
Ability: Intimidate
Careful Nature
- Knock Off
- Flare Blitz
- Parting Shot
- Will-O-Wisp

Ceruledge @ Focus Sash
Ability: Weak Armor
Jolly Nature
- Bitter Blade
- Shadow Sneak
- Close Combat
- Swords Dance
`
      },
      {
        name: 'Trick Room',
        theme: 'Trick Room',
        team: `
Torkoal @ Charcoal
Ability: Drought
Quiet Nature
- Eruption
- Solar Beam
- Earth Power
- Protect

Camerupt @ Life Orb
Ability: Solid Rock
Quiet Nature
- Eruption
- Earth Power
- Fire Blast
- Ancient Power

Coalossal @ Weakness Policy
Ability: Steam Engine
Modest Nature
- Heat Wave
- Power Gem
- Solar Beam
- Protect

Chandelure @ Life Orb
Ability: Flash Fire
Quiet Nature
- Shadow Ball
- Flamethrower
- Trick Room
- Energy Ball

Houndoom @ Life Orb
Ability: Flash Fire
Quiet Nature
- Dark Pulse
- Fire Blast
- Sludge Bomb
- Nasty Plot

Magmortar @ Assault Vest
Ability: Flame Body
Quiet Nature
- Fire Blast
- Thunderbolt
- Focus Blast
- Earth Power
`
      }
    ]
  },

  // 8. Giovanni
  {
    name: 'Giovanni',
    title: 'Viridian Gym Leader',
    type: 'Ground',
    builds: [
      {
        name: 'Desert Sand',
        theme: 'Sand',
        uncapturable: ['Ting-Lu'],
        team: `
Hippowdon @ Smooth Rock
Ability: Sand Stream
Impish Nature
- Earthquake
- Slack Off
- Stealth Rock
- Whirlwind

Garchomp @ Life Orb
Ability: Rough Skin
Jolly Nature
- Swords Dance
- Earthquake
- Scale Shot
- Stone Edge

Gliscor @ Toxic Orb
Ability: Poison Heal
Careful Nature
- Earthquake
- Toxic
- Protect
- Knock Off

Mamoswine @ Life Orb
Ability: Thick Fat
Jolly Nature
- Earthquake
- Icicle Crash
- Ice Shard
- Knock Off

Excadrill @ Life Orb
Ability: Sand Rush
Adamant Nature
- Earthquake
- Iron Head
- Rock Slide
- Swords Dance

Ting-Lu @ Leftovers
Ability: Vessel of Ruin
Careful Nature
- Stealth Rock
- Earthquake
- Ruination
- Whirlwind
`
      },
      {
        name: 'Trick Room',
        theme: 'Trick Room',
        uncapturable: ['Groudon'],
        team: `
Ursaluna @ Flame Orb
Ability: Guts
Brave Nature
- Facade
- Headlong Rush
- Fire Punch
- Swords Dance

Rhyperior @ Choice Band
Ability: Solid Rock
Brave Nature
- Earthquake
- Stone Edge
- Megahorn
- Ice Punch

Gastrodon @ Leftovers
Ability: Storm Drain
Quiet Nature
- Scald
- Earth Power
- Ice Beam
- Recover

Clodsire @ Black Sludge
Ability: Unaware
Sassy Nature
- Earthquake
- Poison Jab
- Recover
- Toxic

Runerigus @ Colbur Berry
Ability: Wandering Spirit
Relaxed Nature
- Trick Room
- Earthquake
- Poltergeist
- Stealth Rock

Groudon @ Life Orb
Ability: Drought
Brave Nature
- Precipice Blades
- Heat Crash
- Stone Edge
- Swords Dance
`
      },
      {
        name: 'Ground Assault',
        theme: 'Fast offense',
        uncapturable: ['Landorus-Therian'],
        team: `
Great Tusk @ Booster Energy
Ability: Protosynthesis
Jolly Nature
- Headlong Rush
- Close Combat
- Ice Spinner
- Rapid Spin

Krookodile @ Choice Scarf
Ability: Moxie
Jolly Nature
- Earthquake
- Knock Off
- Close Combat
- Stone Edge

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Jolly Nature
- Earthquake
- U-turn
- Stone Edge
- Knock Off

Garchomp @ Choice Band
Ability: Rough Skin
Jolly Nature
- Outrage
- Earthquake
- Stone Edge
- Liquidation

Mamoswine @ Choice Band
Ability: Thick Fat
Jolly Nature
- Icicle Crash
- Earthquake
- Ice Shard
- Superpower

Toedscruel @ Leftovers
Ability: Mycelium Might
Timid Nature
- Spore
- Earth Power
- Giga Drain
- Rapid Spin
`
      }
    ]
  },

  // 9. Lorelei
  {
    name: 'Lorelei',
    title: 'Elite Four',
    type: 'Ice',
    builds: [
      {
        name: 'Snow Sweep',
        theme: 'Snow',
        uncapturable: ['Chien-Pao'],
        team: `
Ninetales-Alola @ Icy Rock
Ability: Snow Warning
Timid Nature
- Blizzard
- Moonblast
- Aurora Veil
- Freeze-Dry

Baxcalibur @ Loaded Dice
Ability: Thermal Exchange
Jolly Nature
- Dragon Dance
- Glaive Rush
- Icicle Spear
- Earthquake

Weavile @ Choice Band
Ability: Pressure
Jolly Nature
- Triple Axel
- Knock Off
- Ice Shard
- Low Kick

Cetitan @ Life Orb
Ability: Slush Rush
Adamant Nature
- Belly Drum
- Icicle Crash
- Earthquake
- Ice Shard

Froslass @ Focus Sash
Ability: Cursed Body
Timid Nature
- Spikes
- Destiny Bond
- Ice Beam
- Shadow Ball

Chien-Pao @ Heavy-Duty Boots
Ability: Sword of Ruin
Jolly Nature
- Icicle Crash
- Crunch
- Sacred Sword
- Sucker Punch
`
      },
      {
        name: 'Frozen Trick Room',
        theme: 'Trick Room',
        uncapturable: ['Glastrier'],
        team: `
Jynx @ Focus Sash
Ability: Dry Skin
Quiet Nature
- Trick Room
- Ice Beam
- Psychic
- Lovely Kiss

Walrein @ Leftovers
Ability: Thick Fat
Relaxed Nature
- Surf
- Ice Beam
- Rest
- Sleep Talk

Abomasnow @ Focus Sash
Ability: Snow Warning
Quiet Nature
- Blizzard
- Wood Hammer
- Earthquake
- Ice Shard

Aurorus @ Choice Specs
Ability: Refrigerate
Quiet Nature
- Hyper Voice
- Earth Power
- Thunderbolt
- Freeze-Dry

Glastrier @ Leftovers
Ability: Chilling Neigh
Brave Nature
- Icicle Crash
- High Horsepower
- Close Combat
- Swords Dance

Cloyster @ Focus Sash
Ability: Skill Link
Adamant Nature
- Shell Smash
- Icicle Spear
- Rock Blast
- Ice Shard
`
      },
      {
        name: 'Ice Breakers',
        theme: 'Mixed offense',
        uncapturable: ['Kyurem'],
        team: `
Frosmoth @ Heavy-Duty Boots
Ability: Ice Scales
Timid Nature
- Quiver Dance
- Ice Beam
- Bug Buzz
- Giga Drain

Mamoswine @ Life Orb
Ability: Thick Fat
Jolly Nature
- Earthquake
- Icicle Crash
- Ice Shard
- Knock Off

Iron Bundle @ Booster Energy
Ability: Quark Drive
Timid Nature
- Freeze-Dry
- Hydro Pump
- Ice Beam
- Flip Turn

Weavile @ Life Orb
Ability: Pressure
Jolly Nature
- Swords Dance
- Knock Off
- Triple Axel
- Ice Shard

Cloyster @ Never-Melt Ice
Ability: Skill Link
Jolly Nature
- Shell Smash
- Icicle Spear
- Liquidation
- Rock Blast

Kyurem @ Choice Specs
Ability: Pressure
Timid Nature
- Draco Meteor
- Ice Beam
- Earth Power
- Freeze-Dry
`
      }
    ]
  },

  // 10. Bruno
  {
    name: 'Bruno',
    title: 'Elite Four',
    type: 'Fighting',
    builds: [
      {
        name: 'Sun Combat',
        theme: 'Sun',
        uncapturable: ['Koraidon'],
        team: `
Koraidon @ Choice Band
Ability: Orichalcum Pulse
Jolly Nature
- Collision Course
- Flare Blitz
- Outrage
- U-turn

Annihilape @ Leftovers
Ability: Defiant
Careful Nature
- Rage Fist
- Drain Punch
- Bulk Up
- Taunt

Pawmot @ Life Orb
Ability: Iron Fist
Jolly Nature
- Double Shock
- Mach Punch
- Close Combat
- Ice Punch

Great Tusk @ Choice Scarf
Ability: Protosynthesis
Jolly Nature
- Close Combat
- Headlong Rush
- Knock Off
- Rapid Spin

Blaziken @ Life Orb
Ability: Speed Boost
Adamant Nature
- Flare Blitz
- Close Combat
- Swords Dance
- Protect

Hawlucha @ White Herb
Ability: Unburden
Adamant Nature
- Acrobatics
- Close Combat
- Swords Dance
- Roost
`
      },
      {
        name: 'Bulk Up',
        theme: 'Setup balance',
        uncapturable: ['Zamazenta'],
        team: `
Iron Hands @ Assault Vest
Ability: Quark Drive
Adamant Nature
- Drain Punch
- Wild Charge
- Ice Punch
- Earthquake

Gallade @ Life Orb
Ability: Sharpness
Jolly Nature
- Sacred Sword
- Psycho Cut
- Leaf Blade
- Swords Dance

Lucario @ Life Orb
Ability: Inner Focus
Jolly Nature
- Close Combat
- Meteor Mash
- Extreme Speed
- Swords Dance

Conkeldurr @ Flame Orb
Ability: Guts
Adamant Nature
- Drain Punch
- Mach Punch
- Facade
- Knock Off

Kommo-o @ Leftovers
Ability: Bulletproof
Careful Nature
- Clangorous Soul
- Drain Punch
- Clanging Scales
- Flamethrower

Zamazenta @ Rusted Shield
Ability: Dauntless Shield
Jolly Nature
- Behemoth Bash
- Body Press
- Close Combat
- Crunch
`
      },
      {
        name: 'Priority Assault',
        theme: 'Hyper offense',
        uncapturable: ['Urshifu-Single-Strike'],
        team: `
Breloom @ Focus Sash
Ability: Technician
Jolly Nature
- Spore
- Bullet Seed
- Mach Punch
- Swords Dance

Sneasler @ Focus Sash
Ability: Unburden
Adamant Nature
- Close Combat
- Dire Claw
- Acrobatics
- Swords Dance

Iron Valiant @ Booster Energy
Ability: Quark Drive
Timid Nature
- Moonblast
- Close Combat
- Shadow Ball
- Thunderbolt

Mienshao @ Life Orb
Ability: Regenerator
Jolly Nature
- High Jump Kick
- Knock Off
- U-turn
- Fake Out

Hawlucha @ White Herb
Ability: Unburden
Adamant Nature
- Close Combat
- Acrobatics
- Swords Dance
- Stone Edge

Urshifu-Single-Strike @ Choice Band
Ability: Unseen Fist
Jolly Nature
- Wicked Blow
- Close Combat
- Sucker Punch
- U-turn
`
      }
    ]
  },

  // 11. Agatha
  {
    name: 'Agatha',
    title: 'Elite Four',
    type: 'Ghost',
    builds: [
      {
        name: 'Ghost Trick Room',
        theme: 'Trick Room',
        uncapturable: ['Giratina'],
        team: `
Dusknoir @ Leftovers
Ability: Pressure
Relaxed Nature
- Trick Room
- Poltergeist
- Earthquake
- Will-O-Wisp

Golurk @ Life Orb
Ability: No Guard
Brave Nature
- Earthquake
- Dynamic Punch
- Poltergeist
- Stone Edge

Jellicent @ Leftovers
Ability: Water Absorb
Quiet Nature
- Water Spout
- Shadow Ball
- Trick Room
- Recover

Mimikyu @ Life Orb
Ability: Disguise
Brave Nature
- Trick Room
- Play Rough
- Shadow Claw
- Shadow Sneak

Aegislash @ Weakness Policy
Ability: Stance Change
Quiet Nature
- Shadow Ball
- Flash Cannon
- Shadow Sneak
- King's Shield

Giratina @ Leftovers
Ability: Pressure
Relaxed Nature
- Shadow Ball
- Dragon Pulse
- Rest
- Sleep Talk
`
      },
      {
        name: 'Shadow Setup',
        theme: 'Special setup',
        uncapturable: ['Lunala'],
        team: `
Gengar @ Focus Sash
Ability: Cursed Body
Timid Nature
- Shadow Ball
- Sludge Wave
- Nasty Plot
- Focus Blast

Chandelure @ Choice Specs
Ability: Flash Fire
Modest Nature
- Shadow Ball
- Overheat
- Energy Ball
- Trick

Flutter Mane @ Booster Energy
Ability: Protosynthesis
Timid Nature
- Moonblast
- Shadow Ball
- Mystical Fire
- Power Gem

Dragapult @ Life Orb
Ability: Infiltrator
Timid Nature
- Shadow Ball
- Draco Meteor
- Flamethrower
- U-turn

Mismagius @ Life Orb
Ability: Levitate
Timid Nature
- Nasty Plot
- Shadow Ball
- Dazzling Gleam
- Mystical Fire

Lunala @ Heavy-Duty Boots
Ability: Shadow Shield
Timid Nature
- Moongeist Beam
- Psystrike
- Calm Mind
- Roost
`
      },
      {
        name: 'Haunted Status',
        theme: 'Status balance',
        team: `
Sableye @ Leftovers
Ability: Prankster
Calm Nature
- Will-O-Wisp
- Recover
- Knock Off
- Taunt

Cofagrigus @ Leftovers
Ability: Mummy
Bold Nature
- Shadow Ball
- Body Press
- Will-O-Wisp
- Pain Split

Jellicent @ Leftovers
Ability: Water Absorb
Calm Nature
- Scald
- Hex
- Will-O-Wisp
- Recover

Trevenant @ Sitrus Berry
Ability: Harvest
Careful Nature
- Horn Leech
- Poltergeist
- Will-O-Wisp
- Leech Seed

Spiritomb @ Leftovers
Ability: Infiltrator
Careful Nature
- Poltergeist
- Sucker Punch
- Will-O-Wisp
- Pain Split

Gholdengo @ Leftovers
Ability: Good as Gold
Bold Nature
- Make It Rain
- Shadow Ball
- Nasty Plot
- Recover
`
      }
    ]
  },

  // 12. Lance
  {
    name: 'Lance',
    title: 'Elite Four',
    type: 'Dragon',
    builds: [
      {
        name: 'Dragon Dance',
        theme: 'Setup offense',
        uncapturable: ['Rayquaza'],
        team: `
Dragonite @ Lum Berry
Ability: Multiscale
Adamant Nature
- Dragon Dance
- Outrage
- Earthquake
- Extreme Speed

Haxorus @ Loaded Dice
Ability: Mold Breaker
Jolly Nature
- Dragon Dance
- Scale Shot
- Close Combat
- Poison Jab

Salamence @ Life Orb
Ability: Moxie
Jolly Nature
- Dragon Dance
- Outrage
- Dual Wingbeat
- Earthquake

Kommo-o @ Leftovers
Ability: Overcoat
Jolly Nature
- Dragon Dance
- Outrage
- Close Combat
- Poison Jab

Roaring Moon @ Booster Energy
Ability: Protosynthesis
Jolly Nature
- Dragon Dance
- Knock Off
- Acrobatics
- Earthquake

Rayquaza @ Life Orb
Ability: Air Lock
Jolly Nature
- Dragon Dance
- Dragon Ascent
- Extreme Speed
- Earthquake
`
      },
      {
        name: 'Electric Flight',
        theme: 'Electric Terrain',
        uncapturable: ['Miraidon'],
        team: `
Miraidon @ Choice Specs
Ability: Hadron Engine
Timid Nature
- Electro Drift
- Draco Meteor
- Volt Switch
- Overheat

Dragapult @ Choice Specs
Ability: Infiltrator
Timid Nature
- Draco Meteor
- Shadow Ball
- Thunderbolt
- U-turn

Hydreigon @ Life Orb
Ability: Levitate
Timid Nature
- Dark Pulse
- Draco Meteor
- Flash Cannon
- Fire Blast

Archaludon @ Assault Vest
Ability: Stamina
Modest Nature
- Electro Shot
- Flash Cannon
- Draco Meteor
- Body Press

Cyclizar @ Heavy-Duty Boots
Ability: Regenerator
Jolly Nature
- Shed Tail
- Rapid Spin
- Knock Off
- U-turn

Dracozolt @ Life Orb
Ability: Hustle
Jolly Nature
- Bolt Beak
- Outrage
- Earthquake
- Fire Fang
`
      },
      {
        name: 'Dragon Bulwark',
        theme: 'Bulky balance',
        uncapturable: ['Zygarde'],
        team: `
Goodra @ Assault Vest
Ability: Sap Sipper
Modest Nature
- Draco Meteor
- Sludge Bomb
- Thunderbolt
- Flamethrower

Dragalge @ Choice Specs
Ability: Adaptability
Modest Nature
- Draco Meteor
- Sludge Wave
- Focus Blast
- Hydro Pump

Drampa @ Choice Specs
Ability: Berserk
Modest Nature
- Hyper Voice
- Draco Meteor
- Flamethrower
- Energy Ball

Duraludon @ Eviolite
Ability: Light Metal
Modest Nature
- Flash Cannon
- Draco Meteor
- Thunderbolt
- Stealth Rock

Hydrapple @ Assault Vest
Ability: Regenerator
Modest Nature
- Fickle Beam
- Giga Drain
- Earth Power
- Draco Meteor

Zygarde @ Leftovers
Ability: Aura Break
Careful Nature
- Thousand Arrows
- Coil
- Extreme Speed
- Rest
`
      }
    ]
  },

  // 13. Blue
  {
    name: 'Blue',
    title: 'Champion',
    type: 'Mixed',
    builds: [
      {
        name: 'Champion Sun',
        theme: 'Sun',
        uncapturable: ['Groudon'],
        team: `
Groudon @ Leftovers
Ability: Drought
Adamant Nature
- Precipice Blades
- Heat Crash
- Stone Edge
- Swords Dance

Venusaur @ Life Orb
Ability: Chlorophyll
Modest Nature
- Sludge Bomb
- Giga Drain
- Weather Ball
- Growth

Arcanine-Hisui @ Choice Band
Ability: Rock Head
Jolly Nature
- Flare Blitz
- Head Smash
- Extreme Speed
- Close Combat

Rhyperior @ Weakness Policy
Ability: Solid Rock
Adamant Nature
- Earthquake
- Stone Edge
- Megahorn
- Rock Polish

Blastoise @ White Herb
Ability: Torrent
Modest Nature
- Shell Smash
- Hydro Pump
- Ice Beam
- Aura Sphere

Charizard @ Choice Specs
Ability: Solar Power
Timid Nature
- Fire Blast
- Solar Beam
- Focus Blast
- Air Slash
`
      },
      {
        name: 'Champion Rain',
        theme: 'Rain',
        uncapturable: ['Zapdos'],
        team: `
Pelipper @ Damp Rock
Ability: Drizzle
Bold Nature
- Scald
- Hurricane
- U-turn
- Roost

Kingdra @ Choice Specs
Ability: Swift Swim
Modest Nature
- Hydro Pump
- Draco Meteor
- Surf
- Ice Beam

Gyarados @ Leftovers
Ability: Moxie
Jolly Nature
- Dragon Dance
- Waterfall
- Earthquake
- Stone Edge

Metagross @ Choice Band
Ability: Clear Body
Adamant Nature
- Meteor Mash
- Bullet Punch
- Earthquake
- Zen Headbutt

Serperior @ Leftovers
Ability: Contrary
Timid Nature
- Leaf Storm
- Dragon Pulse
- Glare
- Substitute

Zapdos @ Heavy-Duty Boots
Ability: Static
Timid Nature
- Hurricane
- Thunder
- Volt Switch
- Roost
`
      },
      {
        name: 'Ace Offense',
        theme: 'Setup offense',
        uncapturable: ['Mewtwo'],
        team: `
Pidgeot @ Choice Specs
Ability: Keen Eye
Timid Nature
- Hurricane
- Heat Wave
- U-turn
- Hyper Voice

Charizard @ Heavy-Duty Boots
Ability: Blaze
Timid Nature
- Flamethrower
- Air Slash
- Focus Blast
- Roost

Machamp @ Flame Orb
Ability: Guts
Adamant Nature
- Close Combat
- Knock Off
- Facade
- Bullet Punch

Arcanine-Hisui @ Heavy-Duty Boots
Ability: Intimidate
Jolly Nature
- Flare Blitz
- Extreme Speed
- Stone Edge
- Will-O-Wisp

Alakazam @ Focus Sash
Ability: Magic Guard
Timid Nature
- Psychic
- Shadow Ball
- Focus Blast
- Dazzling Gleam

Mewtwo @ Life Orb
Ability: Pressure
Timid Nature
- Psystrike
- Aura Sphere
- Ice Beam
- Shadow Ball
`
      }
    ]
  }
];
