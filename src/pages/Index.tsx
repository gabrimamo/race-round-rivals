import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createTournament, Tournament, supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [participantCount, setParticipantCount] = useState(8);

  useEffect(() => {
    // Load tournaments from Supabase
    const loadTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .order('createdAt', { ascending: false });

        if (error) {
          console.error('Error loading tournaments:', error);
          return;
        }

        setTournaments(data || []);
      } catch (error) {
        console.error('Error loading tournaments:', error);
      }
    };

    loadTournaments();
  }, []);

  const handleCreateTournament = async () => {
    if (!tournamentName.trim()) {
      toast({
        title: "Nome torneo mancante",
        description: "Inserisci un nome per il torneo.",
        variant: "destructive"
      });
      return;
    }

    const inviteCode = Math.random().toString(36).substring(2, 15);
    const newTournament: Omit<Tournament, 'id'> = {
      name: tournamentName,
      participantCount,
      createdAt: new Date().toISOString(),
      inviteCode: inviteCode,
      status: 'waiting',
      players: [],
      rounds: [],
      currentRound: 0
    };

    try {
      console.log('Creating tournament with data:', newTournament);
      const result = await createTournament(newTournament);
      console.log('Create tournament result:', result);
      
      if (result) {
        setTournaments(prev => [...prev, result]);
        setTournamentName('');
        setShowCreateForm(false);
        navigate(`/admin/${result.id}`);
      } else {
        console.error('Failed to create tournament: No result returned');
        toast({
          title: "Errore nella creazione del torneo",
          description: "Si è verificato un errore durante la creazione del torneo. Controlla la console per maggiori dettagli.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Errore nella creazione del torneo",
        description: "Si è verificato un errore imprevisto. Controlla la console per maggiori dettagli.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-full">
                <Trophy className="h-12 w-12 text-yellow-400" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              RaceTracker Pro
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">
              The ultimate tournament management platform for racing competitions
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <Users className="h-4 w-4 mr-1" />
                Up to 50 Players
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <Zap className="h-4 w-4 mr-1" />
                Real-time Updates
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <Trophy className="h-4 w-4 mr-1" />
                MVP Voting
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create Tournament */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Create Tournament</CardTitle>
              <CardDescription className="text-purple-200">
                Start a new racing tournament and invite players
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateForm ? (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                  size="lg"
                >
                  Create New Tournament
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tournamentName" className="text-white">Tournament Name</Label>
                    <Input
                      id="tournamentName"
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      placeholder="Enter tournament name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="participantCount" className="text-white">Number of Participants</Label>
                    <Input
                      id="participantCount"
                      type="number"
                      min="2"
                      max="50"
                      value={participantCount}
                      onChange={(e) => setParticipantCount(parseInt(e.target.value) || 8)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateTournament}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      disabled={!tournamentName.trim()}
                    >
                      Create
                    </Button>
                    <Button 
                      onClick={() => setShowCreateForm(false)}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tournaments */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Recent Tournaments</CardTitle>
              <CardDescription className="text-purple-200">
                Manage your active and completed tournaments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tournaments yet. Create your first one!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tournaments.slice(-5).reverse().map((tournament) => (
                    <div 
                      key={tournament.id}
                      className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/${tournament.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-white">{tournament.name}</h3>
                          <p className="text-sm text-white/60">
                            {tournament.participantCount} participants • {new Date(tournament.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          variant={tournament.status === 'active' ? 'default' : 'secondary'}
                          className={
                            tournament.status === 'active' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white/20 text-white'
                          }
                        >
                          {tournament.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Everything You Need for Tournament Management
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Easy Registration</h3>
              <p className="text-white/70">Players join with a simple invite link. No accounts needed.</p>
            </div>
            <div className="text-center">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real-time Scoring</h3>
              <p className="text-white/70">Automatic point calculation and live leaderboard updates.</p>
            </div>
            <div className="text-center">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">MVP Voting</h3>
              <p className="text-white/70">Players vote for MVP each round for bonus points.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
