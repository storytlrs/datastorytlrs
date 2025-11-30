import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface Space {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  created_at: string;
}

interface SpaceCardProps {
  space: Space;
  onUpdate: () => void;
}

export const SpaceCard = ({ space }: SpaceCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      className="p-6 cursor-pointer transition-all hover:shadow-lg border-foreground rounded-[35px]"
      onClick={() => navigate(`/spaces/${space.id}`)}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-[35px] bg-accent flex items-center justify-center flex-shrink-0">
          {space.profile_image_url ? (
            <img
              src={space.profile_image_url}
              alt={space.name}
              className="w-full h-full object-cover rounded-[35px]"
            />
          ) : (
            <Building2 className="w-8 h-8" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl mb-2 truncate">{space.name}</h3>
          {space.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {space.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
