import EventEmitter from './EventEmitter';
import _ from 'lodash';
import {db, type DatabaseReference} from './firebase';
import {ref, onValue, off, get, set, push, remove, runTransaction} from 'firebase/database';
// eslint-disable-next-line import/no-cycle
import actions from '../actions';

import powerupData from '@crosswithfriends/shared/lib/powerups';
import GridObject from '@crosswithfriends/shared/lib/wrappers/GridWrapper';
// eslint-disable-next-line import/no-cycle
import {PuzzleModel} from '.';

const STARTING_POWERUPS = 1;
const NUM_PICKUPS = 10;
const MAX_ON_BOARD = 3;
const VALUE_LISTENERS = ['games', 'powerups', 'startedAt', 'players', 'winner', 'pickups'];

export default class Battle extends EventEmitter {
  path: string;
  ref: DatabaseReference;
  gids?: string[];

  constructor(path: string) {
    super();
    this.path = path;
    this.ref = ref(db, path);
  }

  attach(): void {
    VALUE_LISTENERS.forEach((subpath) => {
      const subRef = ref(db, `${this.path}/${subpath}`);
      onValue(subRef, (snapshot) => {
        this.emit(subpath, snapshot.val());
      });
    });
  }

  detach(): void {
    VALUE_LISTENERS.forEach((subpath) => {
      const subRef = ref(db, `${this.path}/${subpath}`);
      off(subRef);
    });
  }

  start(): void {
    set(ref(db, `${this.path}/startedAt`), Date.now());
  }

  setSolved(team: number): void {
    // Use transaction to atomically check and set winner
    runTransaction(ref(db, `${this.path}/winner`), (current) => {
      // If winner already exists, don't overwrite
      if (current) {
        return current;
      }
      // Atomically set winner
      return {
        team,
        completedAt: Date.now(),
      };
    });
  }

  addPlayer(name: string, team: number): void {
    push(ref(db, `${this.path}/players`), {name, team});
  }

  removePlayer(name: string, team: number): void {
    get(ref(db, `${this.path}/players`)).then((snapshot) => {
      const players = snapshot.val();
      const playerToRemove = _.findKey(players, {name, team});
      if (playerToRemove) {
        remove(ref(db, `${this.path}/players/${playerToRemove}`));
      }
    });
  }

  usePowerup(type: string, team: number): void {
    get(ref(db, `${this.path}/powerups`)).then((snapshot) => {
      const allPowerups = snapshot.val();
      const ownPowerups = allPowerups[team];
      const toUse = _.find(ownPowerups, (powerup: any) => powerup.type === type && !powerup.used);
      if (toUse) {
        this.emit('usePowerup', toUse);
        toUse.used = Date.now();
        toUse.target = 1 - team; // For now use on other team.
        set(ref(db, `${this.path}/powerups`), allPowerups);
      }
    });
  }

  checkPickups(r: number, c: number, game: any, team: number): void {
    const {grid, solution} = game;
    const gridObj = new GridObject(grid);

    // Use transactions to atomically update both pickups and powerups
    // First, get the current state to determine what needs to be updated
    Promise.all([get(ref(db, `${this.path}/pickups`)), get(ref(db, `${this.path}/powerups`))]).then(
      ([pickupsSnapshot, powerupsSnapshot]) => {
        const pickups = pickupsSnapshot.val() || {};
        const powerups = powerupsSnapshot.val() || {[team]: []};

        const {across, down} = gridObj.getCrossingWords(r, c);
        const cellsToCheck = [...across, ...down];

        // Determine which pickups should be collected
        const pickupsToMark: string[] = [];
        const powerupsToAdd: any[] = [];

        cellsToCheck.forEach(({i, j}: {i: number; j: number}) => {
          if (grid[i][j].value !== solution[i][j]) return;

          _.forEach(pickups, (pickup: any, key: string) => {
            if (pickup.pickedUp) return;
            if (pickup.i === i && pickup.j === j) {
              pickupsToMark.push(key);
              powerupsToAdd.push({type: pickup.type});
            }
          });
        });

        // If no pickups to collect, return early
        if (pickupsToMark.length === 0) return;

        // Atomically update pickups
        runTransaction(ref(db, `${this.path}/pickups`), (currentPickups) => {
          const updated = {...(currentPickups || {})};
          pickupsToMark.forEach((key) => {
            if (updated[key] && !updated[key].pickedUp) {
              updated[key] = {...updated[key], pickedUp: true};
            }
          });
          return updated;
        });

        // Atomically update powerups
        runTransaction(ref(db, `${this.path}/powerups`), (currentPowerups) => {
          const updated = {...(currentPowerups || {})};
          if (!updated[team]) {
            updated[team] = [];
          }
          // Only add powerups that weren't already added
          powerupsToAdd.forEach((powerup) => {
            updated[team] = [...updated[team], powerup];
          });
          return updated;
        });
      }
    );
  }

  countLivePickups(cbk: (count: number) => void): void {
    get(ref(db, `${this.path}/pickups`)).then((snapshot) => {
      const pickups = snapshot.val();
      const live = _.filter(pickups, (p: any) => !p.pickedUp);
      cbk(live.length);
    });
  }

  spawnPowerups(n: number, games: any[], cbk?: () => void): void {
    const possibleLocationsPerGrid = _.map(games, (game) => {
      const {grid, solution} = game;
      const gridObj = new GridObject(grid);
      return gridObj.getPossiblePickupLocations(solution);
    });

    this.countLivePickups((currentNum) => {
      if (currentNum > MAX_ON_BOARD) return;
      const possibleLocations = _.intersectionWith(...possibleLocationsPerGrid, _.isEqual);

      const locations = _.sampleSize(possibleLocations, n);

      const powerupTypes = _.keys(powerupData);
      const pickups = _.map(locations, ({i, j}: {i: number; j: number}) => ({
        i,
        j,
        type: _.sample(powerupTypes),
      }));

      Promise.all(
        pickups.map((pickup: any) => {
          return push(ref(db, `${this.path}/pickups`), pickup).then(() => {});
        })
      ).then(() => {
        if (cbk) cbk();
      });
    });
  }

  initialize(pid: number, bid: number, teams: number = 2): void {
    const args = _.map(_.range(teams), (team) => ({
      pid,
      battleData: {bid, team},
    }));

    const powerupTypes = _.keys(powerupData);
    const powerups = _.map(_.range(teams), () =>
      _.map(_.sampleSize(powerupTypes, STARTING_POWERUPS), (type) => ({type}))
    );

    const puzzle = new PuzzleModel(`/puzzle/${pid}`);
    puzzle.attach();
    puzzle.once('ready', () => {
      const rawGame = puzzle.toGame();
      puzzle.detach();

      // Need to wait for all of these to finish otherwise the redirect on emit(ready) kills things.
      Promise.all(
        args.map((arg) => {
          return new Promise<string>((resolve) => {
            actions.createGameForBattle(arg, (gid: string) => {
              resolve(gid);
            });
          });
        })
      ).then((gids: string[]) => {
        this.gids = gids;
        set(ref(db, `${this.path}/games`), gids).then(() => {
          set(ref(db, `${this.path}/powerups`), powerups).then(() => {
            this.spawnPowerups(NUM_PICKUPS, [rawGame], () => {
              this.emit('ready');
            });
          });
        });
      });
    });
  }
}
