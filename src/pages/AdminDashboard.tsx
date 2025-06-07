import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Trophy, Users, Share2, Play, ArrowLeft, Crown, Copy, RefreshCw } from 'lucide-react';
import { supabase, updateTournament } from '@/lib/supabase';

interface Player {
  id: string;
  nickname: string;
  totalPoints: number;
  mvpVotes: number;
  positions: number[];
}

interface Round {
  id: number;
  positions: { [playerId: string]: number };
  mvpVotes: { [playerId: string]: string };
  completed: boolean;
}

interface TournamentData {
  id: string;
  name: string;
  participantCount: number;
  inviteCode: string;
  players: Player[];
  rounds: Round[];
  currentRound: number;
  status: 'waiting' | 'active' | 'completed' | 'deleted';
  createdAt: string;
}

const AdminDashboard = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTournament = async () => {
    if (!tournamentId) return;
    
    try {
      // Carica i dati aggiornati da Supabase
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error) {
        console.error('Error loading tournament:', error);
        toast({
          title: "Errore nel caricamento del torneo",
          description: "Non è stato possibile caricare i dati del torneo. Riprova più tardi.",
          variant: "destructive"
        });
        return;
      }

      if (!data) {
        console.error('No tournament found with ID:', tournamentId);
        navigate('/');
        return;
      }

      // Converti i nomi delle colonne da snake_case a camelCase
      const formattedData: TournamentData = {
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

      console.log('Loaded tournament data:', formattedData);
      setTournament(formattedData);
      
      // Salva i dati nel localStorage
      localStorage.setItem(`tournament_${tournamentId}`, JSON.stringify(formattedData));
    } catch (error) {
      console.error('Error loading tournament:', error);
      toast({
        title: "Errore nel caricamento del torneo",
        description: "Si è verificato un errore imprevisto. Riprova più tardi.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadTournament();

    // Imposta un intervallo per aggiornare i dati ogni 3 secondi
    const interval = setInterval(() => {
      loadTournament();
      setRefreshKey(prev => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [tournamentId, navigate]);

  const copyInviteLink = () => {
    if (tournament) {
      const baseUrl = window.location.origin;
      const fullInviteLink = `${baseUrl}/join/${tournament.inviteCode}`;
      
      navigator.clipboard.writeText(fullInviteLink);
      toast({
        title: "Link di invito copiato!",
        description: "Condividi questo link con i giocatori per unirsi al torneo.",
      });
    }
  };

  const startTournament = async () => {
    if (!tournament) return;
    
    if (tournament.players.length < 1) {
      toast({
        title: "Not enough players",
        description: "You need at least 1 player to start the tournament.",
        variant: "destructive"
      });
      return;
    }

    // Create the first round
    const firstRound: Round = {
      id: 0,
      positions: {},
      mvpVotes: {},
      completed: false
    };

    const updatedTournament = { 
      ...tournament, 
      status: 'active' as const,
      rounds: [firstRound],
      currentRound: 0
    };

    try {
      // Aggiorna il torneo in Supabase
      const result = await updateTournament(tournament.id, updatedTournament);
      
      if (result) {
        setTournament(updatedTournament);
        localStorage.setItem(`tournament_${tournament.id}`, JSON.stringify(updatedTournament));
        
        toast({
          title: "Tournament started!",
          description: "Round 1 has begun. Players can now submit their race results.",
        });
      } else {
        throw new Error('Failed to update tournament');
      }
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast({
        title: "Error starting tournament",
        description: "There was an error starting the tournament. Please try again.",
        variant: "destructive"
      });
    }
  };

  const endCurrentRound = async () => {
    if (!tournament) return;

    const currentRound = tournament.rounds[tournament.currentRound];
    if (!currentRound) return;

    try {
      // Calcola i punti per ogni giocatore
      const updatedPlayers = tournament.players.map(player => {
        const playerPosition = currentRound.positions[player.id];
        const points = playerPosition ? calculatePoints(playerPosition, tournament.players.length) : 0;
        
        // Calcola i voti MVP
        const mvpVotes = Object.values(currentRound.mvpVotes || {}).filter(v => v === player.id).length;
        const mvpBonus = mvpVotes > 0 ? 1 : 0;

        return {
          ...player,
          totalPoints: player.totalPoints + points + mvpBonus,
          positions: [...player.positions, playerPosition || 0],
          mvpVotes: player.mvpVotes + mvpVotes
        };
      });

      // Crea il nuovo round
      const newRound: Round = {
        id: tournament.currentRound + 1,
        positions: {},
        mvpVotes: {},
        completed: false
      };

      const updatedTournament = {
        ...tournament,
        players: updatedPlayers,
        rounds: [...tournament.rounds, newRound],
        currentRound: tournament.currentRound + 1
      };

      const result = await updateTournament(tournament.id, updatedTournament);
      
      if (result) {
        setTournament(result);
        toast({
          title: "Round ended!",
          description: "Points have been calculated and a new round has started.",
        });
      }
    } catch (error) {
      console.error('Error ending round:', error);
      toast({
        title: "Error ending round",
        description: "There was an error ending the round. Please try again.",
        variant: "destructive"
      });
    }
  };

  const closeTournament = async () => {
    if (!tournament) return;

    try {
      const updatedTournament = {
        ...tournament,
        status: 'completed' as const
      };

      const result = await updateTournament(tournament.id, updatedTournament);
      
      if (result) {
        setTournament(result);
        toast({
          title: "Tournament completed!",
          description: "The tournament has been closed and the final results are now available.",
        });
      }
    } catch (error) {
      console.error('Error closing tournament:', error);
      toast({
        title: "Error closing tournament",
        description: "There was an error closing the tournament. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteTournament = () => {
    if (!tournament) return;

    // Mark tournament as deleted
    const deletedTournament = { ...tournament, status: 'deleted' as const };
    localStorage.setItem(`tournament_${tournament.id}`, JSON.stringify(deletedTournament));
    
    toast({
      title: "Tournament deleted",
      description: "All players have been notified that the tournament was closed.",
    });
    
    // Navigate back to home after a short delay
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const calculatePoints = (position: number, totalPlayers: number): number => {
    const maxPoints = totalPlayers * 2;
    return Math.max(1, maxPoints - (position - 1) * 2);
  };

  const getSortedLeaderboard = () => {
    if (!tournament) return [];
    
    return [...tournament.players].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.mvpVotes - a.mvpVotes;
    });
  };

  const getCurrentRoundStatus = () => {
    if (!tournament || tournament.rounds.length === 0) return "No rounds yet";
    
    const currentRound = tournament.rounds[tournament.currentRound];
    if (!currentRound) return "No active round";
    
    const submittedCount = Object.keys(currentRound.positions).length;
    return `${submittedCount}/${tournament.players.length} positions submitted`;
  };

  // Funzione per ottenere il vincitore MVP del round corrente
  const getCurrentRoundMVP = () => {
    if (!tournament) return null;
    const currentRound = tournament.rounds[tournament.currentRound];
    if (!currentRound || !currentRound.mvpVotes) return null;

    const voteCount: { [key: string]: number } = {};
    Object.values(currentRound.mvpVotes).forEach(vote => {
      voteCount[vote] = (voteCount[vote] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(voteCount));
    const winners = Object.entries(voteCount)
      .filter(([_, count]) => count === maxVotes)
      .map(([playerId]) => playerId);

    if (winners.length === 0) return null;
    return tournament.players.find(p => p.id === winners[0]);
  };

  if (!tournament) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => navigate('/')}
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{tournament.name}</h1>
                <p className="text-purple-200">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={loadTournament}
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Badge 
                variant={tournament.status === 'active' ? 'default' : 'secondary'}
                className={
                  tournament.status === 'active' 
                    ? 'bg-green-600 text-white' 
                    : tournament.status === 'completed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/20 text-white'
                }
              >
                {tournament.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle>Tournament Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-white/70">Players</p>
                  <p className="text-lg font-semibold">{tournament.players.length}/{tournament.participantCount}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Status</p>
                  <p className="text-lg font-semibold capitalize">{tournament.status}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Current Round</p>
                  <p className="text-lg font-semibold">
                    {tournament.status === 'waiting' ? 'Not Started' : 
                     tournament.status === 'completed' ? 'Tournament Completed' :
                     `Round ${tournament.currentRound + 1}`}
                  </p>
                </div>
                {tournament.status === 'active' && (
                  <div>
                    <p className="text-sm text-white/70">Round Status</p>
                    <p className="text-sm">{getCurrentRoundStatus()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invite Link */}
            {tournament.status !== 'completed' && tournament.status !== 'deleted' && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Share2 className="h-5 w-5 mr-2" />
                    Invite Players
                  </CardTitle>
                  <CardDescription className="text-purple-200">
                    Share this link for players to join
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input 
                      value={tournament.inviteCode}
                      readOnly
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                    <Button 
                      onClick={copyInviteLink}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tournament Controls */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tournament.status === 'waiting' && (
                  <Button 
                    onClick={startTournament}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={tournament.players.length < 1}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Tournament
                  </Button>
                )}
                
                {tournament.status === 'active' && (
                  <>
                    <Button 
                      onClick={endCurrentRound}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      disabled={Object.keys(tournament.rounds[tournament.currentRound]?.positions || {}).length === 0}
                    >
                      End Current Round
                    </Button>
                    <Button 
                      onClick={closeTournament}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Close Tournament
                    </Button>
                  </>
                )}

                {tournament.status === 'completed' && (
                  <div className="text-center py-4">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                    <p className="text-green-300 font-medium">Tournament Completed!</p>
                    <p className="text-sm text-white/70">Final leaderboard is shown to all players</p>
                  </div>
                )}

                {(tournament.status === 'waiting' || tournament.status === 'active' || tournament.status === 'completed') && (
                  <Button 
                    onClick={deleteTournament}
                    variant="destructive"
                    className="w-full"
                  >
                    Delete Tournament
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Players */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Registered Players ({tournament.players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.players.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No players registered yet</p>
                  <p className="text-sm">Share the invite link to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tournament.players.map((player, index) => (
                    <div 
                      key={player.id}
                      className="p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{player.nickname}</span>
                        <div className="text-sm text-white/70">
                          Joined #{index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Leaderboard */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.players.length === 0 || tournament.status === 'waiting' ? (
                <div className="text-center py-8 text-white/60">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Leaderboard will appear once tournament starts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getSortedLeaderboard().map((player, index) => (
                    <div 
                      key={player.id}
                      className={`p-3 rounded-lg border ${
                        index === 0 
                          ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30' 
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-white/20 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">{player.nickname}</span>
                              {index === 0 && <Crown className="h-4 w-4 ml-1 text-yellow-500" />}
                            </div>
                            <div className="text-xs text-white/70">
                              {player.mvpVotes} MVP votes
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{player.totalPoints}</div>
                          <div className="text-xs text-white/70">points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Round Status */}
        {tournament.status === 'active' && (
          <Card className="mt-8 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <CardTitle>Current Round</CardTitle>
              <CardDescription className="text-purple-200">
                Round {tournament.currentRound + 1}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-white/70">Positions Submitted</p>
                <p className="text-lg font-semibold">
                  {Object.keys(tournament.rounds[tournament.currentRound]?.positions || {}).length}/{tournament.players.length}
                </p>
              </div>

              {/* MVP Winner Display */}
              {getCurrentRoundMVP() && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-center">
                    <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-lg font-medium text-yellow-500">
                      Round MVP: {getCurrentRoundMVP()?.nickname}
                    </p>
                  </div>
                </div>
              )}

              <Button 
                onClick={endCurrentRound}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                disabled={Object.keys(tournament.rounds[tournament.currentRound]?.positions || {}).length === 0}
              >
                End Current Round
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Round Leaderboard */}
        {tournament.status === 'active' && (
          <Card className="mt-8 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <CardTitle>Current Round Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tournament.players
                  .sort((a, b) => {
                    const aPos = tournament.rounds[tournament.currentRound]?.positions[a.id];
                    const bPos = tournament.rounds[tournament.currentRound]?.positions[b.id];
                    if (aPos === undefined && bPos === undefined) return 0;
                    if (aPos === undefined) return 1;
                    if (bPos === undefined) return -1;
                    return aPos - bPos;
                  })
                  .map((player, index) => {
                    const position = tournament.rounds[tournament.currentRound]?.positions[player.id];
                    const mvpVotes = tournament.rounds[tournament.currentRound]?.mvpVotes || {};
                    const voteCount = Object.values(mvpVotes).filter(v => v === player.id).length;

                    return (
                      <div 
                        key={player.id}
                        className="p-4 rounded-lg bg-white/5"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-medium">
                              {position !== undefined ? position : '?'}
                            </span>
                            <span>{player.nickname}</span>
                          </div>
                          {voteCount > 0 && (
                            <Badge className="bg-yellow-600">
                              {voteCount} MVP {voteCount === 1 ? 'vote' : 'votes'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
