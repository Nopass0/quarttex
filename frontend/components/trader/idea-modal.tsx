"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";

interface IdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdeaModal({ open, onOpenChange }: IdeaModalProps) {
  const [idea, setIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!idea.trim()) {
      toast.error("Пожалуйста, введите вашу идею");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trader/ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea: idea.trim() }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при отправке идеи");
      }

      toast.success("Спасибо за вашу идею! Мы обязательно её рассмотрим.");
      setIdea("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Произошла ошибка при отправке идеи");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Предложить идею
          </DialogTitle>
          <DialogDescription>
            Поделитесь вашими идеями по улучшению платформы. Мы ценим каждое предложение!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idea">Ваша идея</Label>
            <Textarea
              id="idea"
              placeholder="Опишите вашу идею..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {idea.length}/1000
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !idea.trim()}
              className="flex-1 bg-[#530FAD] hover:bg-[#005030]"
            >
              {isSubmitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}