// ========== GET /api/puzzlelist ============

// eslint-disable-next-line import/no-extraneous-dependencies
import qs from 'qs';
import type {ListPuzzleRequest, ListPuzzleResponse} from '@crosswithfriends/shared/types';
import {SERVER_URL} from './constants';

export async function fetchPuzzleList(query: ListPuzzleRequest): Promise<ListPuzzleResponse> {
  const url = `${SERVER_URL}/api/puzzle_list?${qs.stringify(query)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(
      `Failed to fetch puzzle list: ${resp.status} ${resp.statusText}${errorText ? ` - ${errorText}` : ''}`
    );
  }
  const data = await resp.json();
  // Ensure the response has the expected structure
  if (!data.puzzles) {
    throw new Error('Invalid response format: missing puzzles property');
  }
  return data;
}
