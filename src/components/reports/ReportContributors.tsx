import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Contributor {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface ReportContributorsProps {
  contributors: Contributor[];
  maxVisible?: number;
}

export const ReportContributors = ({
  contributors,
  maxVisible = 3,
}: ReportContributorsProps) => {
  if (contributors.length === 0) return null;

  const visibleContributors = contributors.slice(0, maxVisible);
  const remainingCount = contributors.length - maxVisible;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visibleContributors.map((contributor, index) => (
            <Tooltip key={contributor.user_id}>
              <TooltipTrigger asChild>
                <Avatar
                  className="h-6 w-6 border-2 border-background cursor-pointer"
                  style={{ zIndex: visibleContributors.length - index }}
                >
                  <AvatarImage
                    src={contributor.avatar_url || undefined}
                    alt={contributor.full_name || contributor.email}
                  />
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(contributor.full_name, contributor.email)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{contributor.full_name || contributor.email}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background cursor-pointer">
                  <AvatarFallback className="text-xs bg-muted">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {contributors
                    .slice(maxVisible)
                    .map((c) => c.full_name || c.email)
                    .join(", ")}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="ml-2 text-sm">
          {contributors.length} contributor{contributors.length !== 1 ? "s" : ""}
        </span>
      </div>
    </TooltipProvider>
  );
};
