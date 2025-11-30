import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { CreateSpaceDialog } from "@/components/spaces/CreateSpaceDialog";
interface Space {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  created_at: string;
}
const Spaces = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    checkAuth();
    fetchSpaces();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };
  const fetchSpaces = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("spaces").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      toast.error("Failed to load spaces");
    } finally {
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const filteredSpaces = spaces.filter(space => space.name.toLowerCase().includes(searchQuery.toLowerCase()));
  return <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Story TLRS</h1>
            <p className="text-muted-foreground">Your client spaces</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="rounded-[35px] border-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Search and Create */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search spaces..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 rounded-[35px] border-foreground h-12" />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-[35px] h-12 px-6 text-primary bg-accent-green">
            <Plus className="w-5 h-5 mr-2" />
            New Space
          </Button>
        </div>

        {/* Spaces Grid */}
        {loading ? <div className="text-center py-12">Loading spaces...</div> : filteredSpaces.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No spaces found" : "No spaces yet"}
            </p>
            {!searchQuery && <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-[35px] bg-accent-green text-primary">
                Create your first space
              </Button>}
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpaces.map(space => <SpaceCard key={space.id} space={space} onUpdate={fetchSpaces} />)}
          </div>}
      </div>

      <CreateSpaceDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={fetchSpaces} />
    </div>;
};
export default Spaces;