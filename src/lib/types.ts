export interface Player {
  id: string;
  name: string;
  positions: { [round: number]: number };
  mvpVotes: { [round: number]: string };
  points: number;
}

export interface Round {
  id: number;
  positions: { [playerId: string]: number };
  mvpVotes: { [playerId: string]: string };
  completed: boolean;
}

export interface TournamentData {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'deleted';
  inviteCode: string;
  currentRound: number;
  players: Player[];
  rounds: Round[];
  createdAt: string;
  updatedAt: string;
} 