import Dexie from 'dexie';
import { GameCartridge } from 'ts-gb';

export class Database extends Dexie {
  public gameSaves!: Dexie.Table<IGameSave, string>;

  public constructor() {
    super('TSGBDatabase');
    this.version(1).stores({
      gameSaves: 'gameName,data'
    });
  }

  public saveGame(gameName: string, data: Uint8Array) {
    return this.transaction('rw', this.gameSaves, async () => {
      const previousSave = await this.gameSaves.where({ gameName }).first();

      if (previousSave) {
        await this.gameSaves.update(gameName, { data });
      } else {
        await this.gameSaves.add({ gameName, data });
      }
    });
  }

  public loadGameSave(gameName: string, cartridge: GameCartridge) {
    return this.transaction('r', this.gameSaves, async () => {
      const previousSave = await this.gameSaves.where({ gameName }).first();

      if (previousSave) {
        cartridge.loadRamContent(previousSave.data);
      }
    });
  }
}

export interface IGameSave {
  gameName: string;
  data: Uint8Array;
}
