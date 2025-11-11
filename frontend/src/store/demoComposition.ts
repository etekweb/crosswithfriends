import _ from 'lodash';
import {SERVER_TIME} from './firebase';
import Composition, {CURRENT_VERSION} from './composition';

export default class DemoComposition extends Composition {
  attach(): void {
    super.attach();
    const {
      info = {
        title: 'Untitled',
        author: 'Anonymous',
      },
      grid = _.range(5).map(() =>
        _.range(5).map(() => ({
          value: '',
        }))
      ),
      clues = [],
      circles = [],
      chat = {messages: []},
      cursor = {},
    } = {};

    // Validate required fields
    if (!info || typeof info !== 'object') {
      throw new Error('Invalid composition: info is required');
    }
    if (!grid || !Array.isArray(grid) || grid.length === 0) {
      throw new Error('Invalid composition: grid must be a non-empty array');
    }
    if (!clues || !Array.isArray(clues)) {
      throw new Error('Invalid composition: clues must be an array');
    }

    const composition = {
      info,
      grid,
      clues,
      circles,
      chat,
      cursor,
    };

    const version = CURRENT_VERSION;
    this.events.push({
      timestamp: SERVER_TIME,
      type: 'create',
      params: {
        version,
        composition,
      },
    });
  }
}
