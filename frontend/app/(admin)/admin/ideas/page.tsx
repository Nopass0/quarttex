"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Eye, CheckCircle, Clock, XCircle, MessageSquare } from "lucide-react";
import { useAdminAuth } from "@/stores/auth";

interface Idea {
  id: string;
  title: string;
  content: string;
  status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED";
  adminNotes?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

const statusConfig = {
  PENDING: { label: "Ожидает", color: "bg-yellow-500", icon: Clock },
  REVIEWING: { label: "На рассмотрении", color: "bg-blue-500", icon: Eye },
  APPROVED: { label: "Одобрено", color: "bg-purple-500", icon: CheckCircle },
  REJECTED: { label: "Отклонено", color: "bg-red-500", icon: XCircle },
};

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { token } = useAdminAuth();

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const response = await fetch("/api/admin/ideas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch ideas");

      const data = await response.json();
      setIdeas(data);
    } catch (error) {
      toast.error("Ошибка при загрузке идей");
    } finally {
      setLoading(false);
    }
  };

  const updateIdeaStatus = async (ideaId: string, status: string, notes?: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/ideas/${ideaId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, adminNotes: notes }),
      });

      if (!response.ok) throw new Error("Failed to update idea");

      toast.success("Статус идеи обновлен");
      fetchIdeas();
      setSelectedIdea(null);
      setAdminNotes("");
    } catch (error) {
      toast.error("Ошибка при обновлении статуса");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = 
      idea.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.user.name && idea.user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || idea.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Идеи пользователей</h1>
        <p className="text-muted-foreground">
          Просмотр и управление предложениями от пользователей
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Поиск по содержанию или пользователю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status">Статус</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="PENDING">Ожидает</SelectItem>
                  <SelectItem value="REVIEWING">На рассмотрении</SelectItem>
                  <SelectItem value="APPROVED">Одобрено</SelectItem>
                  <SelectItem value="REJECTED">Отклонено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : filteredIdeas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Идеи не найдены
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Идея</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIdeas.map((idea) => {
                    const StatusIcon = statusConfig[idea.status].icon;
                    return (
                      <TableRow key={idea.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {idea.user.name || idea.user.email}
                            </div>
                            {idea.user.name && (
                              <div className="text-sm text-muted-foreground">
                                {idea.user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="line-clamp-2">{idea.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={`${statusConfig[idea.status].color} text-white`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[idea.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(idea.createdAt), "d MMM yyyy", {
                            locale: ru,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIdea(idea);
                              setAdminNotes(idea.adminNotes || "");
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Просмотр
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedIdea} onOpenChange={() => setSelectedIdea(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали идеи</DialogTitle>
            <DialogDescription>
              Просмотр и управление предложением пользователя
            </DialogDescription>
          </DialogHeader>
          {selectedIdea && (
            <div className="space-y-4">
              <div>
                <Label>Пользователь</Label>
                <p className="text-sm">
                  {selectedIdea.user.name || selectedIdea.user.email}
                  {selectedIdea.user.name && (
                    <span className="text-muted-foreground ml-2">
                      ({selectedIdea.user.email})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label>Дата создания</Label>
                <p className="text-sm">
                  {format(new Date(selectedIdea.createdAt), "d MMMM yyyy, HH:mm", {
                    locale: ru,
                  })}
                </p>
              </div>
              <div>
                <Label>Содержание идеи</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedIdea.content}</p>
                </div>
              </div>
              <div>
                <Label>Текущий статус</Label>
                <div className="mt-1">
                  <Badge 
                    variant="secondary"
                    className={`${statusConfig[selectedIdea.status].color} text-white`}
                  >
                    {statusConfig[selectedIdea.status].label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label htmlFor="admin-notes">Заметки администратора</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Добавьте заметки или комментарии..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                {selectedIdea.status !== "APPROVED" && (
                  <Button
                    onClick={() => updateIdeaStatus(selectedIdea.id, "APPROVED", adminNotes)}
                    disabled={updatingStatus}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Одобрить
                  </Button>
                )}
                {selectedIdea.status !== "REVIEWING" && (
                  <Button
                    onClick={() => updateIdeaStatus(selectedIdea.id, "REVIEWING", adminNotes)}
                    disabled={updatingStatus}
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    На рассмотрение
                  </Button>
                )}
                {selectedIdea.status !== "REJECTED" && (
                  <Button
                    onClick={() => updateIdeaStatus(selectedIdea.id, "REJECTED", adminNotes)}
                    disabled={updatingStatus}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Отклонить
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}