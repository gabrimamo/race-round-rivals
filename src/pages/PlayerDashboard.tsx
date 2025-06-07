import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Trophy, Flag, Crown, Users, Timer, Target, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTournamentByInviteCode, updateTournament } from '@/lib/supabase';

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
  players: Player[];
  rounds: Round[];
  currentRound: number;
  status: 'waiting' | 'active' | 'completed' | 'deleted';
}

const PlayerDashboard = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedMVP, setSelectedMVP] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingMVP, setIsSubmittingMVP] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasVotedMVP, setHasVotedMVP] = useState(false);

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
      
      // Check if player has already submitted for current round
      if (formattedData.rounds.length > 0) {
        const currentRound = formattedData.rounds[formattedData.currentRound];
        if (currentRound) {
          const savedPlayerId = localStorage.getItem(`player_${tournamentId}`);
          if (savedPlayerId) {
            setSelectedPosition(currentRound.positions[savedPlayerId]?.toString() || '');
            setSelectedMVP(currentRound.mvpVotes[savedPlayerId] || '');
          }
        }
      }
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
    if (!tournamentId) return;
    
    const savedPlayerId = localStorage.getItem(`player_${tournamentId}`);
    if (!savedPlayerId) {
      navigate('/');
      return;
    }
    
    setPlayerId(savedPlayerId);
    loadTournament();

    // Imposta un intervallo per aggiornare i dati ogni 3 secondi
    const interval = setInterval(() => {
      loadTournament();
      setRefreshKey(prev => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [tournamentId, navigate]);

  // Funzione per ottenere le posizioni disponibili
  const getAvailablePositions = () => {
    if (!tournament) return [];
    const currentRound = tournament.rounds[tournament.currentRound];
    if (!currentRound) return [];

    const takenPositions = Object.values(currentRound.positions);
    return Array.from({ length: tournament.players.length }, (_, i) => i + 1)
      .filter(pos => !takenPositions.includes(pos));
  };

  // Funzione per ottenere i giocatori disponibili per il voto MVP
  const getAvailableMVPPlayers = () => {
    if (!tournament || !playerId) return [];
    return tournament.players.filter(p => p.id !== playerId);
  };

  const handleSubmitPosition = async () => {
    if (!selectedPosition || !tournament || !playerId) return;

    try {
      console.log('Submitting position:', {
        tournamentId: tournament.id,
        currentRound: tournament.currentRound,
        selectedPosition,
        userId: playerId
      });

      const currentRound = tournament.rounds[tournament.currentRound];
      if (!currentRound) {
        throw new Error('Current round not found');
      }

      // Aggiorna il round con la posizione del giocatore
      const updatedRound = {
        ...currentRound,
        positions: {
          ...currentRound.positions,
          [playerId]: parseInt(selectedPosition)
        }
      };

      // Prepara l'aggiornamento del torneo
      const tournamentUpdate: Partial<TournamentData> = {
        rounds: tournament.rounds.map((round, index) =>
          index === tournament.currentRound ? updatedRound : round
        )
      };

      console.log('Updating tournament with:', tournamentUpdate);
      const updated = await updateTournament(tournament.id, tournamentUpdate);
      
      if (updated) {
        setTournament(updated);
        setSelectedPosition('');
        toast({
          title: "Success",
          description: "Position submitted successfully! You can now vote for the MVP (optional).",
        });
      }
    } catch (error) {
      console.error('Error submitting position:', error);
      toast({
        title: "Error",
        description: "Error submitting position. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitMVP = async () => {
    if (!tournament || !playerId) return;

    try {
      const currentRound = tournament.rounds[tournament.currentRound];
      if (!currentRound) {
        throw new Error('Current round not found');
      }

      // Aggiorna il round con il voto MVP (se selezionato)
      const updatedRound = {
        ...currentRound,
        mvpVotes: {
          ...currentRound.mvpVotes,
          ...(selectedMVP ? { [playerId]: selectedMVP } : {})
        }
      };

      // Prepara l'aggiornamento del torneo
      const tournamentUpdate: Partial<TournamentData> = {
        rounds: tournament.rounds.map((round, index) =>
          index === tournament.currentRound ? updatedRound : round
        )
      };

      const updated = await updateTournament(tournament.id, tournamentUpdate);
      
      if (updated) {
        setTournament(updated);
        setSelectedMVP('');
        setHasVotedMVP(true);
        toast({
          title: "Success",
          description: selectedMVP ? "MVP vote submitted successfully!" : "Skipped MVP vote.",
        });
      }
    } catch (error) {
      console.error('Error submitting MVP vote:', error);
      toast({
        title: "Error",
        description: "Error submitting MVP vote. Please try again.",
        variant: "destructive"
      });
    }
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

  const calculatePoints = (position: number, totalPlayers: number): number => {
    const maxPoints = totalPlayers * 2;
    return Math.max(1, maxPoints - (position - 1) * 2);
  };

  const getOrdinal = (n: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  const getSortedLeaderboard = () => {
    if (!tournament) return [];
    
    return [...tournament.players].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.mvpVotes - a.mvpVotes;
    });
  };

  const getCurrentPlayer = () => {
    return tournament?.players.find(p => p.id === playerId);
  };

  const getCurrentRound = () => {
    if (!tournament || tournament.rounds.length === 0) return null;
    return tournament.rounds[tournament.currentRound];
  };

  const getCurrentRoundStatus = () => {
    if (!tournament) return "No current round information available";
    const currentRound = tournament.rounds[tournament.currentRound];
    if (!currentRound) return "No current round information available";
    return `Round ${tournament.currentRound + 1} is active. Submit your race position.`;
  };

  if (!tournament) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>;
  }

  // Handle deleted tournament
  if (tournament.status === 'deleted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white text-center max-w-md mx-4">
          <CardHeader>
            <div className="p-4 bg-red-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle>Tournament Closed</CardTitle>
            <CardDescription className="text-red-200">
              This tournament has been closed by the administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 mb-6">
              Please request a new invitation link to join another tournament.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer();
  const currentRound = getCurrentRound();
  const leaderboard = getSortedLeaderboard();
  const playerRank = leaderboard.findIndex(p => p.id === playerId) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-4 mb-2">
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
              <Button 
                onClick={loadTournament}
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-purple-200">Welcome, {currentPlayer?.nickname}!</p>
            {tournament.status === 'active' && (
              <Badge className="mt-2 bg-green-600 text-white">
                Round {tournament.currentRound + 1} Active
              </Badge>
            )}
            {tournament.status === 'completed' && (
              <Badge className="mt-2 bg-blue-600 text-white">
                Tournament Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {tournament.status === 'waiting' ? (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <div className="p-4 bg-blue-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Timer className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle>Waiting for Tournament to Start</CardTitle>
              <CardDescription className="text-purple-200">
                The admin will start the tournament once ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div>
                  <p className="text-lg">
                    <Users className="inline h-5 w-5 mr-2" />
                    {tournament.players.length}/{tournament.participantCount} players joined
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {tournament.players.map((player, index) => (
                    <div 
                      key={player.id}
                      className={`p-2 rounded-lg text-sm ${
                        player.id === playerId 
                          ? 'bg-purple-600/30 border border-purple-400' 
                          : 'bg-white/10'
                      }`}
                    >
                      {player.nickname}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : tournament.status === 'active' ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Current Round */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle>Round {tournament.currentRound + 1}</CardTitle>
                <CardDescription className="text-purple-200">
                  Submit your race position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="position" className="text-white">Your Position</Label>
                  <select
                    id="position"
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full mt-1 bg-white/10 border-white/20 text-white rounded-md"
                    disabled={isSubmitting || currentPlayer?.positions[tournament.currentRound] !== undefined}
                  >
                    <option value="">Select your position</option>
                    {getAvailablePositions().map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={handleSubmitPosition}
                  disabled={!selectedPosition || isSubmitting || currentPlayer?.positions[tournament.currentRound] !== undefined}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Position'}
                </Button>

                {/* MVP Vote Section */}
                {currentPlayer?.positions[tournament.currentRound] !== undefined && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <Label htmlFor="mvp" className="text-white">Vote for MVP (Optional)</Label>
                    <select
                      id="mvp"
                      value={selectedMVP}
                      onChange={(e) => setSelectedMVP(e.target.value)}
                      className="w-full mt-1 bg-white/10 border-white/20 text-white rounded-md"
                      disabled={isSubmittingMVP || currentPlayer?.mvpVotes[tournament.currentRound] !== undefined}
                    >
                      <option value="">Select MVP</option>
                      {getAvailableMVPPlayers().map(player => (
                        <option key={player.id} value={player.id}>{player.nickname}</option>
                      ))}
                    </select>
                    <Button 
                      onClick={handleSubmitMVP}
                      disabled={!selectedMVP || isSubmittingMVP || currentPlayer?.mvpVotes[tournament.currentRound] !== undefined}
                      className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {isSubmittingMVP ? 'Submitting...' : 'Submit MVP Vote'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle>Current Round Leaderboard</CardTitle>
                <CardDescription className="text-purple-200">
                  {getCurrentRoundStatus()}
                </CardDescription>
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
                      const isCurrentPlayer = player.id === playerId;
                      const mvpVotes = tournament.rounds[tournament.currentRound]?.mvpVotes || {};
                      const voteCount = Object.values(mvpVotes).filter(v => v === player.id).length;

                      return (
                        <div 
                          key={player.id}
                          className={`p-4 rounded-lg ${
                            isCurrentPlayer 
                              ? 'bg-purple-600/30 border border-purple-400' 
                              : 'bg-white/5'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-medium">
                                {position !== undefined ? position : '?'}
                              </span>
                              <span>{player.nickname}</span>
                              {isCurrentPlayer && (
                                <Badge className="bg-purple-600">You</Badge>
                              )}
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

                {/* MVP Winner Display */}
                {getCurrentRoundMVP() && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="text-center">
                      <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <p className="text-lg font-medium text-yellow-500">
                        Round MVP: {getCurrentRoundMVP()?.nickname}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : tournament.status === 'completed' ? (
          /* Final Leaderboard View */
          <div className="text-center mb-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <div className="p-4 bg-yellow-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                </div>
                <CardTitle>Tournament Complete!</CardTitle>
                <CardDescription className="text-purple-200">
                  Final results are shown below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.map((player, index) => (
                    <div 
                      key={player.id}
                      className={`p-4 rounded-lg border ${
                        player.id === playerId 
                          ? 'bg-purple-600/30 border-purple-400' :
                        index === 0 
                          ? 'bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border-yellow-500/50' 
                          : 'bg-white/10 border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-white/30 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-semibold text-lg">{player.nickname}</span>
                              {index === 0 && <Crown className="h-5 w-5 ml-2 text-yellow-500" />}
                              {player.id === playerId && <span className="text-sm ml-2 text-purple-300">(You)</span>}
                            </div>
                            <div className="text-sm text-white/70">
                              {player.mvpVotes} MVP votes
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xl">{player.totalPoints}</div>
                          <div className="text-sm text-white/70">final points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Race Results */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Flag className="h-5 w-5 mr-2" />
                  Round {tournament.currentRound + 1} Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isSubmitting && currentRound && !isSubmittingMVP && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Your Finishing Position</Label>
                      <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select your position" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailablePositions().map(position => (
                            <SelectItem key={position} value={position.toString()}>
                              {getOrdinal(position)} place ({calculatePoints(position, tournament.players.length)} pts)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSubmitPosition}
                      disabled={!selectedPosition}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Submit Position
                    </Button>
                  </div>
                )}

                {isSubmitting && (
                  <div className="text-center py-4">
                    <div className="p-4 bg-green-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Target className="h-8 w-8 text-green-400" />
                    </div>
                    <p className="text-green-300 font-medium">Position submitted!</p>
                    <p className="text-sm text-white/70">Waiting for other players...</p>
                  </div>
                )}

                {isSubmittingMVP && (
                  <div className="text-center py-4 border-t border-white/20">
                    <div className="p-4 bg-purple-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Crown className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-purple-300 font-medium">MVP vote submitted!</p>
                    <p className="text-sm text-white/70">Round complete. Waiting for next round...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Middle Column - Player Stats */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{playerRank}</div>
                    <div className="text-sm text-white/70">Current Rank</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{currentPlayer?.totalPoints || 0}</div>
                    <div className="text-sm text-white/70">Total Points</div>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{currentPlayer?.mvpVotes || 0}</div>
                  <div className="text-sm text-white/70">MVP Votes Received</div>
                </div>

                {currentPlayer && currentPlayer.positions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-white/80 mb-2">Race History:</h3>
                    <div className="space-y-1">
                      {currentPlayer.positions.map((position, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>Round {index + 1}</span>
                          <span className={
                            position === 1 ? 'text-yellow-400' :
                            position === 2 ? 'text-gray-300' :
                            position === 3 ? 'text-amber-600' :
                            'text-white/70'
                          }>
                            {getOrdinal(position)} place
                          </span>
                        </div>
                      ))}
                    </div>
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
                <div className="space-y-2">
                  {leaderboard.map((player, index) => (
                    <div 
                      key={player.id}
                      className={`p-3 rounded-lg border ${
                        player.id === playerId 
                          ? 'bg-purple-600/20 border-purple-400' :
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
                              {player.id === playerId && <span className="text-xs ml-2 text-purple-300">(You)</span>}
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;
