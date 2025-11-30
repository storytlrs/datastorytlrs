import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, MessageCircle, Share2 } from "lucide-react";

export const ContentTab = () => {
  // Mock data - will be replaced with real data
  const contentData = [
    {
      id: 1,
      platform: "Instagram",
      type: "Reel",
      thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113",
      views: "125K",
      likes: "8.2K",
      comments: "342",
      shares: "89",
      er: 7.2,
      creator: "Creator A",
    },
    {
      id: 2,
      platform: "TikTok",
      type: "Video",
      thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0",
      views: "89K",
      likes: "5.1K",
      comments: "218",
      shares: "56",
      er: 6.1,
      creator: "Creator B",
    },
    {
      id: 3,
      platform: "YouTube",
      type: "Short",
      thumbnail: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb",
      views: "210K",
      likes: "12.5K",
      comments: "542",
      shares: "156",
      er: 6.8,
      creator: "Creator C",
    },
  ];

  const getERColor = (er: number) => {
    if (er > 6) return "bg-accent-green";
    if (er > 4) return "bg-accent";
    return "bg-accent-orange";
  };

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Content Performance</h2>
        <p className="text-muted-foreground">
          Post previews and performance metrics across all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentData.map((content) => (
          <Card 
            key={content.id} 
            className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow"
          >
            <div className="relative aspect-[9/16] bg-muted">
              <img
                src={content.thumbnail}
                alt={`${content.platform} ${content.type}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <Badge className="bg-card text-card-foreground border border-foreground">
                  {content.platform}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{content.creator}</span>
                <Badge className={getERColor(content.er)}>
                  {content.er}% ER
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{content.views}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span>{content.likes}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>{content.comments}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Share2 className="w-4 h-4" />
                  <span>{content.shares}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};
