# Server

Fastify-based HTTP and WebSocket server for the crosswithfriends application.

## Architecture

### Main Website

- **Production**: Statically hosted via `serve`, host = downforacross.com
- **Development**: localhost:3020

### HTTP Server

- **Production**: api.foracross.com
- **Staging**: api-staging.foracross.com
- **Local Development**: localhost:3021 (when running `yarn devbackend`)

### WebSocket Server

- **Production**: TBD (probably downforacross.com/ws, separate process)
- **Development**: localhost:3020 (using [CRA proxy](https://create-react-app.dev/docs/proxying-api-requests-in-development/))
- **Responsibilities**:
  - MVP: Handle pub/sub for game events

### Client Configuration

- **Production build** (`yarn build`): `SERVER_URL = "https://api.foracross.com"`
- **Development build** (`yarn start`): `SERVER_URL = "https://api-staging.foracross.com"`
- **Local development** (`yarn devfrontend`): `SERVER_URL = "localhost:3021"` (requires `process.env.REACT_APP_USE_LOCAL_SERVER=1`)

## API Schema

All endpoints are prefixed with `/api`.

### Game Endpoints

#### `POST /api/game`

Create a new game.

**Request Body:**

```typescript
{
  gid: string; // Game ID
  pid: string; // Puzzle ID
}
```

**Response:**

```typescript
{
  gid: string;
}
```

#### `GET /api/game/:gid`

Get game information by game ID.

**Parameters:**

- `gid` (path): Game ID

**Response:**

```typescript
{
  gid: string;
  title: string;
  author: string;
  duration: number; // Time taken to solve (in seconds)
  size: string; // Puzzle size (e.g., "Mini", "Standard")
}
```

**Errors:**

- `404`: Game not found

### Puzzle Endpoints

#### `POST /api/puzzle`

Add a new puzzle.

**Request Body:**

```typescript
{
  puzzle: PuzzleJson;  // Puzzle data (see types below)
  pid?: string;        // Optional puzzle ID (if not provided, backend generates one)
  isPublic: boolean;
}
```

**Response:**

```typescript
{
  pid: string; // Puzzle ID
}
```

#### `GET /api/puzzle_list`

List puzzles with pagination and filtering.

**Query Parameters:**

- `page` (string): Page number (0-indexed)
- `pageSize` (string): Number of puzzles per page
- `filter` (object): Filter object with:
  - `sizeFilter.Mini` (string): "true" or "false"
  - `sizeFilter.Standard` (string): "true" or "false"
  - `nameOrTitleFilter` (string): Search term

**Response:**

```typescript
{
  puzzles: Array<{
    pid: string;
    content: PuzzleJson;
    stats: {
      numSolves: number;
    };
  }>;
}
```

**Errors:**

- `400`: Invalid page or pageSize parameters

### Record Solve Endpoints

#### `POST /api/record_solve/:pid`

Record a puzzle solve.

**Parameters:**

- `pid` (path): Puzzle ID

**Request Body:**

```typescript
{
  gid: string;
  time_to_solve: number; // Time in seconds
}
```

**Response:**

```typescript
{
}
```

### Stats Endpoints

#### `POST /api/stats`

Get statistics for multiple games.

**Request Body:**

```typescript
{
  gids: string[];  // Array of game IDs
}
```

**Response:**

```typescript
{
  stats: Array<{
    size: string;
    nPuzzlesSolved: number;
    avgSolveTime: number;
    bestSolveTime: number;
    bestSolveTimeGameId: string;
    avgCheckedSquareCount: number;
    avgRevealedSquareCount: number;
  }>;
  history: Array<{
    puzzleId: string;
    gameId: string;
    title: string;
    size: string;
    dateSolved: string; // Format: "YYYY-MM-DD"
    solveTime: number;
    checkedSquareCount: number;
    revealedSquareCount: number;
  }>;
}
```

**Errors:**

- `400`: Invalid gids array

### Counter Endpoints

#### `POST /api/counters/gid`

Increment and get a new game ID.

**Request Body:**

```typescript
{
}
```

**Response:**

```typescript
{
  gid: string;
}
```

#### `POST /api/counters/pid`

Increment and get a new puzzle ID.

**Request Body:**

```typescript
{
}
```

**Response:**

```typescript
{
  pid: string;
}
```

### Link Preview Endpoints

#### `GET /api/link_preview`

Generate Open Graph metadata for game or puzzle links.

**Query Parameters:**

- `url` (string): URL to generate preview for (must be a game or puzzle URL)

**Response:**

- HTML with Open Graph meta tags
- Redirects if not a link expander bot

**Errors:**

- `400`: Invalid URL or URL path
- `404`: Game or puzzle not found

#### `GET /api/oembed`

OEmbed endpoint for link previews.

**Query Parameters:**

- `author` (string): Author name

**Response:**

```typescript
{
  type: 'link';
  version: '1.0';
  author_name: string;
}
```

### Type Definitions

#### `PuzzleJson`

```typescript
{
  grid: string[][];
  solution: string[][];
  info: InfoJson;
  circles: string[];
  shades: string[];
  clues: CluesJson;
  private?: boolean;
}
```

#### `InfoJson`

```typescript
{
  type?: string;
  title: string;
  author: string;
  copyright: string;
  description: string;
}
```

#### `CluesJson`

```typescript
{
  across: string[];
  down: string[];
}
```

## Database

All game events are stored in PostgreSQL.

### Schema

```sql
CREATE DATABASE dfac;

\c dfac;

CREATE TABLE game_events(
  gid text,
  uid text,
  ts timestamp without time zone,
  event_type text,
  event_payload json
);
```

## Getting Started

> **Note**: If you aren't making changes to `server/server.ts`, you don't need to run the backend locally. In this case, just run `yarn start`.

### Prerequisites

1. Install PostgreSQL
   - macOS: `brew install postgresql`
2. Start PostgreSQL
   - macOS: `brew services start postgresql`

### Setup

1. **Create the database:**

   ```bash
   psql -c 'create database dfac'
   ```

   (Use `createdb dfac` if the above fails)

2. **Initialize the database schema:**

   ```bash
   ./create_fresh_dbs.sh
   ```

   Or manually:

   ```bash
   psql dfac < sql/create_game_events.sql
   ```

3. **Configure environment variables:**

   Copy `.envrc.template` to `.envrc` and set the following variables:
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`

   Make sure you have [DirEnv](https://direnv.net/) installed to automatically load these variables.

### Running the Server

#### Backend Server

```bash
yarn devbackend
```

This runs the backend server on `localhost:3021` and expects PostgreSQL environment variables to be set.

#### Frontend Server

```bash
yarn devfrontend
```

This runs the frontend server on `localhost:3020`, which communicates with the backend server on `localhost:3021`.

### Testing

1. Create a game by clicking a puzzle on the homepage at `localhost:3020/`
2. Check the backend process logs for a stream of events
3. Inspect the database manually using `psql` or pgAdmin
