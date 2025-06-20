import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ciphmeixukqdrzjdsmma.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcGhtZWl4dWtxZHJ6amRzbW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjI1NjUsImV4cCI6MjA2NDg5ODU2NX0.p3-CYZJ646JiViZz34vCSfOi6cFrGKzvu_vkc2sB10M';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

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
  console.log('Searching for tournament with invite code:', inviteCode);
  
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  if (error) {
    console.error('Error fetching tournament:', error);
    return null;
  }

  if (!data) {
    console.error('No tournament found with invite code:', inviteCode);
    return null;
  }

  // Converti i nomi delle colonne da snake_case a camelCase
  const formattedData: Tournament = {
    id: data.id,
    name: data.name,
    participantCount: data.participant_count,
    inviteCode: data.invite_code,
    status: data.status,
    createdAt: data.created_at,
    players: data.players || [],
    rounds: data.rounds || [],
    currentRound: data.current_round || 0
  };

  console.log('Found tournament:', formattedData);
  return formattedData;
};

export const createTournament = async (tournament: Omit<Tournament, 'id'>): Promise<Tournament | null> => {
  try {
    console.log('Attempting to create tournament in Supabase:', tournament);
    
    // Verifica che tutti i campi richiesti siano presenti
    if (!tournament.name || !tournament.inviteCode || !tournament.status) {
      console.error('Missing required fields:', {
        name: tournament.name,
        inviteCode: tournament.inviteCode,
        status: tournament.status
      });
      return null;
    }

    const tournamentData = {
      name: tournament.name,
      participant_count: tournament.participantCount,
      invite_code: tournament.inviteCode,
      status: tournament.status,
      created_at: tournament.createdAt,
      players: tournament.players || [],
      rounds: tournament.rounds || [],
      current_round: tournament.currentRound || 0
    };

    console.log('Formatted tournament data for Supabase:', tournamentData);

    const { data, error } = await supabase
      .from('tournaments')
      .insert([tournamentData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating tournament:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }

    if (!data) {
      console.error('No data returned from Supabase');
      return null;
    }

    // Converti i nomi delle colonne da snake_case a camelCase
    const formattedData: Tournament = {
      id: data.id,
      name: data.name,
      participantCount: data.participant_count,
      inviteCode: data.invite_code,
      status: data.status,
      createdAt: data.created_at,
      players: data.players || [],
      rounds: data.rounds || [],
      currentRound: data.current_round || 0
    };

    console.log('Successfully created tournament:', formattedData);
    return formattedData;
  } catch (error) {
    console.error('Unexpected error creating tournament:', error);
    return null;
  }
};

export const updateTournament = async (id: string, updates: Partial<Tournament>): Promise<Tournament | null> => {
  try {
    console.log('Updating tournament with ID:', id);
    console.log('Updates:', updates);

    // Converti i nomi delle colonne da camelCase a snake_case per l'aggiornamento
    const formattedUpdates: any = {};
    
    if (updates.name !== undefined) formattedUpdates.name = updates.name;
    if (updates.participantCount !== undefined) formattedUpdates.participant_count = updates.participantCount;
    if (updates.inviteCode !== undefined) formattedUpdates.invite_code = updates.inviteCode;
    if (updates.status !== undefined) formattedUpdates.status = updates.status;
    if (updates.createdAt !== undefined) formattedUpdates.created_at = updates.createdAt;
    if (updates.players !== undefined) formattedUpdates.players = updates.players;
    if (updates.rounds !== undefined) formattedUpdates.rounds = updates.rounds;
    if (updates.currentRound !== undefined) formattedUpdates.current_round = updates.currentRound;

    // Rimuovi i campi undefined
    Object.keys(formattedUpdates).forEach(key => {
      if (formattedUpdates[key] === undefined) {
        delete formattedUpdates[key];
      }
    });

    console.log('Formatted updates for Supabase:', formattedUpdates);

    // Verifica che ci siano aggiornamenti da fare
    if (Object.keys(formattedUpdates).length === 0) {
      console.error('No valid updates to apply');
      return null;
    }

    const { data, error } = await supabase
      .from('tournaments')
      .update(formattedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tournament:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }

    if (!data) {
      console.error('No data returned after update');
      return null;
    }

    // Converti i nomi delle colonne da snake_case a camelCase per il risultato
    const formattedData: Tournament = {
      id: data.id,
      name: data.name,
      participantCount: data.participant_count,
      inviteCode: data.invite_code,
      status: data.status,
      createdAt: data.created_at,
      players: data.players || [],
      rounds: data.rounds || [],
      currentRound: data.current_round || 0
    };

    console.log('Successfully updated tournament:', formattedData);
    return formattedData;
  } catch (error) {
    console.error('Unexpected error updating tournament:', error);
    return null;
  }
}; 