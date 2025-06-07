import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Tournament {
  id: string;
  name: string;
  participantCount: number;
  inviteCode: string;
  status: 'waiting' | 'active' | 'completed' | 'deleted';
  createdAt: string;
  players: any[];
  rounds: any[];
  currentRound: number;
}

export const getTournamentByInviteCode = async (inviteCode: string): Promise<Tournament | null> => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('inviteCode', inviteCode)
    .single();

  if (error) {
    console.error('Error fetching tournament:', error);
    return null;
  }

  return data;
};

export const createTournament = async (tournament: Omit<Tournament, 'id'>): Promise<Tournament | null> => {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([tournament])
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament:', error);
    return null;
  }

  return data;
};

export const updateTournament = async (id: string, updates: Partial<Tournament>): Promise<Tournament | null> => {
  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating tournament:', error);
    return null;
  }

  return data;
}; 