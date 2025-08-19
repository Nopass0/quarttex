"use client";

import { useEffect, useState } from "react";
import { merchantApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Staff {
  id: string;
  name: string;
  token: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function MerchantStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStaff = async () => {
    try {
      const res = await merchantApi.getStaff();
      setStaff(res.staff || []);
    } catch (e) {
      console.error("Failed to load staff", e);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const createStaff = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await merchantApi.createStaff({ name });
      setStaff([...staff, res]);
      setName("");
      toast.success("Сотрудник создан");
    } catch (e) {
      console.error("Failed to create staff", e);
      toast.error("Ошибка создания");
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async (id: string) => {
    try {
      const res = await merchantApi.regenerateStaffToken(id);
      setStaff(staff.map(s => s.id === id ? { ...s, token: res.token } : s));
      toast.success("Токен обновлен");
    } catch (e) {
      console.error("Failed to regenerate token", e);
      toast.error("Ошибка обновления");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя сотрудника"
        />
        <Button onClick={createStaff} disabled={loading}>
          Создать
        </Button>
      </div>
      <div className="space-y-2">
        {staff.map((s) => (
          <div
            key={s.id}
            className="border rounded-md p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm break-all">{s.token}</p>
            </div>
            <Button variant="outline" onClick={() => regenerateToken(s.id)}>
              Перегенерировать
            </Button>
          </div>
        ))}
        {staff.length === 0 && (
          <p className="text-sm text-muted-foreground">Сотрудники не найдены</p>
        )}
      </div>
    </div>
  );
}
