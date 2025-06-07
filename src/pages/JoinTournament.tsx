import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Trophy, Users, ArrowRight, RefreshCw } from 'lucide-react';

interface Player {
  id: string;
  nickname: string;
  totalPoints: number;
  mvpVotes: number;
  positions: number[];
}

interface TournamentData {
  id: string;
  name: string;
  participantCount: number;
  inviteLink: string;
  inviteCode: string;
  players: Player[];
  rounds: any[];
  currentRound: number;
  status: 'waiting' | 'active' | 'completed';
}

const JoinTournament = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const loadTournament = () => {
    console.log('Looking for tournament with invite code:', inviteCode);
    
    if (!inviteCode) {
      setError('No invite code provided.');
      return;
    }
    
    // Find tournament by invite code
    const tournaments = localStorage.getItem('tournaments');
    if (tournaments) {
      try {
        const tournamentList = JSON.parse(tournaments);
        console.log('Available tournaments:', tournamentList);
        
        const foundTournament = tournamentList.find((t: any) => 
          t.inviteCode === inviteCode
        );
        
        console.log('Found tournament:', foundTournament);
        
        if (foundTournament) {
          const tournamentData = localStorage.getItem(`tournament_${foundTournament.id}`);
          if (tournamentData) {
            try {
              const parsedTournament = JSON.parse(tournamentData);
              console.log('Tournament data:', parsedTournament);
              setTournament(parsedTournament);
              setError(''); // Clear any previous errors
            } catch (parseError) {
              console.error('Error parsing tournament data:', parseError);
              setError('Tournament data is corrupted.');
            }
          } else {
            console.log('No tournament data found for ID:', foundTournament.id);
            setError('Tournament data not found.');
          }
        } else {
          console.log('No tournament found with invite code:', inviteCode);
          setError('Tournament not found or invite link is invalid.');
        }
      } catch (parseError) {
        console.error('Error parsing tournaments list:', parseError);
        setError('Error loading tournaments.');
      }
    } else {
      console.log('No tournaments found in localStorage');
      setError('Tournament not found or invite link is invalid.');
    }
  };

  useEffect(() => {
    loadTournament();
  }, [inviteCode]);

  const joinTournament = async () => {
    if (!tournament || !nickname.trim()) return;

    setIsJoining(true);

    // Check if nickname is already taken
    const nicknameExists = tournament.players.some(
      player => player.nickname.toLowerCase() === nickname.toLowerCase()
    );

    if (nicknameExists) {
      toast({
        title: "Nickname already taken",
        description: "Please choose a different nickname.",
        variant: "destructive"
      });
      setIsJoining(false);
      return;
    }

    // Check if tournament is full
    if (tournament.players.length >= tournament.participantCount) {
      toast({
        title: "Tournament is full",
        description: "This tournament has reached its maximum number of participants.",
        variant: "destructive"
      });
      setIsJoining(false);
      return;
    }

    // Check if tournament has already started
    if (tournament.status !== 'waiting') {
      toast({
        title: "Tournament already started",
        description: "You cannot join a tournament that has already begun.",
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

    const updatedTournament = {
      ...tournament,
      players: [...tournament.players, newPlayer]
    };

    localStorage.setItem(`tournament_${tournament.id}`, JSON.stringify(updatedTournament));
    
    // Store player ID for this tournament
    localStorage.setItem(`player_${tournament.id}`, newPlayer.id);

    toast({
      title: "Successfully joined!",
      description: `Welcome to ${tournament.name}, ${nickname}!`,
    });

    // Navigate to player dashboard
    navigate(`/player/${tournament.id}`);
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
