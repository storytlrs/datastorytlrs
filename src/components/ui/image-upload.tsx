import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  folder: string;
  className?: string;
}

export const ImageUpload = ({ value, onChange, bucket, folder, className }: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative w-full aspect-video rounded-[35px] overflow-hidden border border-foreground bg-muted">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background border border-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "w-full aspect-video rounded-[35px] border-2 border-dashed border-foreground/50 flex flex-col items-center justify-center cursor-pointer transition-colors",
            isDragging && "border-primary bg-muted/50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Drag & drop an image or click to select
              </p>
            </>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
    </div>
  );
};
