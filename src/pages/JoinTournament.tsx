import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Trophy, Users, ArrowRight, RefreshCw } from 'lucide-react';
import { getTournamentByInviteCode, updateTournament, Tournament } from '@/lib/supabase';

interface Player {
  id: string;
  nickname: string;
  totalPoints: number;
  mvpVotes: number;
  positions: number[];
}

const JoinTournament = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const loadTournament = async () => {
    console.log('Looking for tournament with invite code:', inviteCode);
    
    if (!inviteCode) {
      setError('No invite code provided.');
      return;
    }

    try {
      const foundTournament = await getTournamentByInviteCode(inviteCode);
      
      if (foundTournament) {
        console.log('Found tournament:', foundTournament);
        setTournament(foundTournament);
        setError('');
      } else {
        console.log('No tournament found with invite code:', inviteCode);
        setError('Tournament not found or invite link is invalid.');
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Error loading tournament. Please try again.');
    }
  };

  useEffect(() => {
    loadTournament();
  }, [inviteCode]);

  const joinTournament = async () => {
    if (!tournament || !nickname.trim()) return;

    setIsJoining(true);

    try {
      // Check if nickname is already taken
      const nicknameExists = tournament.players.some(
        player => player.nickname.toLowerCase() === nickname.toLowerCase()
      );

      if (nicknameExists) {
        toast({
          title: "Nickname già in uso",
          description: "Scegli un nickname diverso.",
          variant: "destructive"
        });
        setIsJoining(false);
        return;
      }

      // Check if tournament is full
      if (tournament.players.length >= tournament.participantCount) {
        toast({
          title: "Torneo pieno",
          description: "Questo torneo ha raggiunto il numero massimo di partecipanti.",
          variant: "destructive"
        });
        setIsJoining(false);
        return;
      }

      // Check if tournament has already started
      if (tournament.status !== 'waiting') {
        toast({
          title: "Torneo già iniziato",
          description: "Non puoi unirti a un torneo che è già iniziato.",
          variant: "destructive"
        });
        setIsJoining(false);
        return;
      }

      const newPlayer: Player = {
        id: Math.random().toString(36).substring(2, 15),
        nickname: nickname.trim(),
        totalPoints: 0,
        mvpVotes: 0,
        positions: []
      };

      console.log('Adding new player:', newPlayer);
      console.log('Current tournament:', tournament);

      const updatedTournament = {
        ...tournament,
        players: [...tournament.players, newPlayer]
      };

      console.log('Updated tournament data:', updatedTournament);

      const result = await updateTournament(tournament.id, updatedTournament);
      
      if (result) {
        // Store player ID for this tournament
        localStorage.setItem(`player_${tournament.id}`, newPlayer.id);

        toast({
          title: "Unito con successo!",
          description: `Benvenuto in ${tournament.name}, ${nickname}!`,
        });

        // Navigate to player dashboard
        navigate(`/player/${tournament.id}`);
      } else {
        console.error('Failed to update tournament with new player');
        toast({
          title: "Errore nell'unione al torneo",
          description: "Si è verificato un errore. Riprova più tardi.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({
        title: "Errore nell'unione al torneo",
        description: "Si è verificato un errore imprevisto. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="p-4 bg-red-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-xl">Tournament Not Found</CardTitle>
            <CardDescription className="text-red-200">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={loadTournament}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Join Tournament</CardTitle>
          <CardDescription className="text-purple-200">
            {tournament.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 text-sm text-white/70">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {tournament.players.length}/{tournament.participantCount} players
              </div>
              <div className="capitalize">
                Status: {tournament.status}
              </div>
            </div>
          </div>

          {tournament.status !== 'waiting' ? (
            <div className="text-center py-4">
              <p className="text-red-300 mb-4">This tournament has already started and is no longer accepting new players.</p>
              <div className="space-y-3">
                <Button 
                  onClick={loadTournament}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Go Home
                </Button>
              </div>
            </div>
          ) : tournament.players.length >= tournament.participantCount ? (
            <div className="text-center py-4">
              <p className="text-red-300 mb-4">This tournament is full and is no longer accepting new players.</p>
              <div className="space-y-3">
                <Button 
                  onClick={loadTournament}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Go Home
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nickname" className="text-white">Choose Your Nickname</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your racing nickname"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  maxLength={20}
                />
                <p className="text-xs text-white/60 mt-1">
                  This will be your display name in the tournament
                </p>
              </div>

              <Button 
                onClick={joinTournament}
                disabled={!nickname.trim() || isJoining}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isJoining ? 'Joining...' : 'Join Tournament'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {tournament.players.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Current Players:</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {tournament.players.map((player, index) => (
                  <div key={player.id} className="text-sm text-white/70 py-1">
                    {index + 1}. {player.nickname}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinTournament;
