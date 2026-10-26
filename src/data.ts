/**
 * Daily player pool. Showdown paste format, any generation.
 * Level, EVs and IVs are forced in teams.ts (L100, 0 EV, 31 IV), so don't add them here.
 */
export const POOL_TEXT = `
Charizard @ Heavy-Duty Boots
Ability: Blaze
Timid Nature
- Flamethrower
- Air Slash
- Focus Blast
- Roost

Blastoise @ Leftovers
Ability: Torrent
Bold Nature
- Scald
- Rapid Spin
- Ice Beam
- Haze

Gengar @ Life Orb
Ability: Cursed Body
Timid Nature
- Shadow Ball
- Sludge Wave
- Focus Blast
- Nasty Plot

Alakazam @ Focus Sash
Ability: Magic Guard
Timid Nature
- Psychic
- Shadow Ball
- Focus Blast
- Energy Ball

Arcanine @ Heavy-Duty Boots
Ability: Intimidate
Jolly Nature
- Flare Blitz
- Extreme Speed
- Close Combat
- Morning Sun

Gyarados @ Leftovers
Ability: Intimidate
Jolly Nature
- Dragon Dance
- Waterfall
- Earthquake
- Stone Edge

Snorlax @ Leftovers
Ability: Thick Fat
Careful Nature
- Body Slam
- Curse
- Rest
- Earthquake

Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Outrage

Scizor @ Choice Band
Ability: Technician
Adamant Nature
- Bullet Punch
- U-turn
- Close Combat
- Knock Off

Tyranitar @ Leftovers
Ability: Sand Stream
Adamant Nature
- Stone Edge
- Crunch
- Earthquake
- Fire Punch

Blissey @ Heavy-Duty Boots
Ability: Natural Cure
Bold Nature
- Soft-Boiled
- Seismic Toss
- Stealth Rock
- Toxic

Swampert @ Leftovers
Ability: Torrent
Relaxed Nature
- Earthquake
- Waterfall
- Ice Punch
- Stealth Rock

Salamence @ Life Orb
Ability: Intimidate
Naive Nature
- Dragon Dance
- Outrage
- Earthquake
- Roost

Metagross @ Assault Vest
Ability: Clear Body
Jolly Nature
- Meteor Mash
- Zen Headbutt
- Earthquake
- Bullet Punch

Garchomp @ Life Orb
Ability: Rough Skin
Jolly Nature
- Earthquake
- Outrage
- Swords Dance
- Stone Edge

Lucario @ Life Orb
Ability: Inner Focus
Jolly Nature
- Close Combat
- Meteor Mash
- Extreme Speed
- Swords Dance

Infernape @ Life Orb
Ability: Blaze
Hasty Nature
- Flare Blitz
- Close Combat
- U-turn
- Mach Punch

Weavile @ Choice Band
Ability: Pressure
Jolly Nature
- Triple Axel
- Knock Off
- Ice Shard
- Low Kick

Gliscor @ Toxic Orb
Ability: Poison Heal
Impish Nature
- Earthquake
- Knock Off
- Protect
- Swords Dance

Excadrill @ Life Orb
Ability: Sand Rush
Jolly Nature
- Earthquake
- Iron Head
- Rock Slide
- Swords Dance

Volcarona @ Heavy-Duty Boots
Ability: Flame Body
Timid Nature
- Quiver Dance
- Fiery Dance
- Bug Buzz
- Giga Drain

Hydreigon @ Choice Specs
Ability: Levitate
Timid Nature
- Dark Pulse
- Draco Meteor
- Flash Cannon
- Fire Blast

Ferrothorn @ Leftovers
Ability: Iron Barbs
Relaxed Nature
- Stealth Rock
- Leech Seed
- Power Whip
- Gyro Ball

Greninja @ Life Orb
Ability: Protean
Timid Nature
- Hydro Pump
- Dark Pulse
- Ice Beam
- U-turn

Sylveon @ Leftovers
Ability: Pixilate
Modest Nature
- Hyper Voice
- Calm Mind
- Wish
- Protect

Toxapex @ Black Sludge
Ability: Regenerator
Bold Nature
- Scald
- Toxic
- Recover
- Haze

Mimikyu @ Life Orb
Ability: Disguise
Jolly Nature
- Play Rough
- Shadow Sneak
- Swords Dance
- Shadow Claw

Corviknight @ Leftovers
Ability: Pressure
Impish Nature
- Brave Bird
- Roost
- Defog
- Body Press

Dragapult @ Choice Specs
Ability: Clear Body
Timid Nature
- Draco Meteor
- Shadow Ball
- Flamethrower
- U-turn

Kingambit @ Leftovers
Ability: Defiant
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Swords Dance

Gholdengo @ Leftovers
Ability: Good as Gold
Timid Nature
- Make It Rain
- Shadow Ball
- Nasty Plot
- Recover

Great Tusk @ Heavy-Duty Boots
Ability: Protosynthesis
Jolly Nature
- Headlong Rush
- Close Combat
- Rapid Spin
- Ice Spinner
`;

export interface Trainer {
  name: string;
  title: string;
  type: string;
  /** Showdown paste text. Leave empty until the roster is picked. */
  team: string;
}

/** Kanto run: 8 gyms, Elite Four, Champion. Fill `team` as rosters are chosen. */
export const KANTO: Trainer[] = [
  { name: 'Brock', title: 'Pewter Gym Leader', type: 'Rock', team: `
Golem @ Leftovers
Ability: Sturdy
Adamant Nature
- Stone Edge
- Earthquake
- Sucker Punch
- Explosion

Aerodactyl @ Life Orb
Ability: Unnerve
Jolly Nature
- Stone Edge
- Earthquake
- Aerial Ace
- Roost

Rhyperior @ Weakness Policy
Ability: Solid Rock
Adamant Nature
- Stone Edge
- Earthquake
- Megahorn
- Rock Polish

Tyranitar @ Choice Band
Ability: Sand Stream
Adamant Nature
- Stone Edge
- Crunch
- Earthquake
- Ice Punch

Gigalith @ Leftovers
Ability: Sand Stream
Adamant Nature
- Stone Edge
- Earthquake
- Stealth Rock
- Zen Headbutt

Terrakion @ Life Orb
Ability: Justified
Jolly Nature
- Stone Edge
- Close Combat
- Earthquake
- Swords Dance
` },
  { name: 'Misty', title: 'Cerulean Gym Leader', type: 'Water', team: `
Starmie @ Leftovers
Ability: Natural Cure
Timid Nature
- Hydro Pump
- Psychic
- Ice Beam
- Rapid Spin

Vaporeon @ Leftovers
Ability: Water Absorb
Bold Nature
- Scald
- Wish
- Protect
- Ice Beam

Kingdra @ Life Orb
Ability: Swift Swim
Adamant Nature
- Dragon Dance
- Waterfall
- Outrage
- Aqua Tail

Milotic @ Leftovers
Ability: Marvel Scale
Bold Nature
- Scald
- Recover
- Ice Beam
- Toxic

Gyarados @ Leftovers
Ability: Intimidate
Jolly Nature
- Dragon Dance
- Waterfall
- Earthquake
- Ice Fang

Swampert @ Leftovers
Ability: Torrent
Relaxed Nature
- Earthquake
- Waterfall
- Ice Punch
- Stealth Rock
` },
  { name: 'Lt. Surge', title: 'Vermilion Gym Leader', type: 'Electric', team: '' },
  { name: 'Erika', title: 'Celadon Gym Leader', type: 'Grass', team: '' },
  { name: 'Koga', title: 'Fuchsia Gym Leader', type: 'Poison', team: '' },
  { name: 'Sabrina', title: 'Saffron Gym Leader', type: 'Psychic', team: '' },
  { name: 'Blaine', title: 'Cinnabar Gym Leader', type: 'Fire', team: '' },
  { name: 'Giovanni', title: 'Viridian Gym Leader', type: 'Ground', team: '' },
  { name: 'Lorelei', title: 'Elite Four', type: 'Ice', team: '' },
  { name: 'Bruno', title: 'Elite Four', type: 'Fighting', team: '' },
  { name: 'Agatha', title: 'Elite Four', type: 'Ghost', team: '' },
  { name: 'Lance', title: 'Elite Four', type: 'Dragon', team: '' },
  { name: 'Blue', title: 'Champion', type: 'Mixed', team: '' },
];
