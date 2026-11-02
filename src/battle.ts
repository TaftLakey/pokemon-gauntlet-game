import { BattleStreams, Teams, Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

export interface BattleEvents {
  /** Public protocol lines, for the log and HP bars. */
  onLines(lines: string[]): void;
  /** The player must choose a move or switch. */
  onRequest(req: any): void;
  onError(msg: string): void;
  onEnd(playerWon: boolean): void;
}

export interface BattleOptions {
  playerTeam: PokemonSet[];
  foeTeam: PokemonSet[];
  foeName: string;
  seed?: number[];
  events: BattleEvents;
}

export class BattleRunner {
  private streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  private playerActive = '';
  private ended = false;

  constructor(private o: BattleOptions) {}

  start() {
    const { o } = this;
    const startOpts: any = { formatid: 'gen9customgame' };
    if (o.seed) startOpts.seed = o.seed;
    void this.streams.omniscient.write(
      `>start ${JSON.stringify(startOpts)}\n` +
      `>player p1 ${JSON.stringify({ name: 'You', team: Teams.pack(o.playerTeam) })}\n` +
      `>player p2 ${JSON.stringify({ name: o.foeName, team: Teams.pack(o.foeTeam) })}`
    );
    void this.readLog();
    void this.readPlayer();
    void this.readFoe();
  }

  choose(choice: string) {
    void this.streams.p1.write(choice);
  }

  private finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.o.events.onEnd(won);
  }

  private async readLog() {
    for await (const chunk of this.streams.omniscient) {
      const lines = chunk.split('\n');
      this.o.events.onLines(lines);
      for (const l of lines) {
        if (l.startsWith('|switch|p1a') || l.startsWith('|drag|p1a')) this.playerActive = l.split('|')[3].split(',')[0];
        if (l.startsWith('|win|')) this.finish(l.slice(5) === 'You');
        if (l === '|tie' || l.startsWith('|tie|')) this.finish(false);
      }
    }
  }

  private async readPlayer() {
    for await (const chunk of this.streams.p1) {
      for (const l of chunk.split('\n')) {
        if (l.startsWith('|request|')) {
          const body = l.slice(9);
          if (!body) continue;
          const req = JSON.parse(body);
          if (req.teamPreview) this.choose('default');
          else if (!req.wait) this.o.events.onRequest(req);
        } else if (l.startsWith('|error|')) this.o.events.onError(l.slice(7));
      }
    }
  }

  private async readFoe() {
    for await (const chunk of this.streams.p2) {
      for (const l of chunk.split('\n')) {
        if (!l.startsWith('|request|') || l.length < 10) continue;
        const req = JSON.parse(l.slice(9));
        if (req.wait) continue;
        void this.streams.p2.write(req.teamPreview ? 'default' : this.foeChoice(req));
      }
    }
  }

  /** Foe AI: best expected damage, switch to the first healthy mon when forced. */
  private foeChoice(req: any): string {
    const mons = req.side.pokemon as any[];
    if (req.forceSwitch) {
      const i = mons.findIndex((p) => !p.active && !p.condition.endsWith(' fnt'));
      return i >= 0 ? `switch ${i + 1}` : 'default';
    }
    const me = mons.find((p) => p.active);
    const myTypes = Dex.species.get(me.details.split(',')[0]).types;
    const foeTypes = this.playerActive ? Dex.species.get(this.playerActive).types : [];
    let best = 0, bestScore = -1;
    (req.active[0].moves as any[]).forEach((m, i) => {
      if (m.disabled) return;
      const mv = Dex.moves.get(m.id);
      let score = 20 + Math.random() * 10;
      if (mv.category !== 'Status') {
        const eff = Dex.getImmunity(mv.type, foeTypes) ? 2 ** Dex.getEffectiveness(mv.type, foeTypes) : 0;
        const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
        score = (mv.basePower || 60) * eff * (myTypes.includes(mv.type) ? 1.5 : 1) * acc;
      }
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return `move ${best + 1}`;
  }
}
