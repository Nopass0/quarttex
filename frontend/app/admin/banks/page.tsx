'use client';

import { useEffect, useState } from 'react';
import { adminApiInstance } from '@/services/api';

interface Bank {
  code: string;
  name: string;
}

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [pattern, setPattern] = useState('');
  const [customPatterns, setCustomPatterns] = useState<Record<string, string[]>>({});

  useEffect(() => {
    adminApiInstance
      .get('/banks')
      .then((res) => setBanks(res.data.banks || []))
      .catch(() => setBanks([]));
  }, []);

  const addPattern = () => {
    if (!selectedBank || !pattern) return;
    setCustomPatterns((prev) => ({
      ...prev,
      [selectedBank]: [...(prev[selectedBank] || []), pattern],
    }));
    setPattern('');
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Банки</h1>
      <ul className="space-y-2">
        {banks.map((bank) => (
          <li key={bank.code}>
            <span className="font-medium">{bank.name}</span>
            {customPatterns[bank.code]?.map((p, i) => (
              <div key={i} className="text-sm text-gray-600">
                {p}
              </div>
            ))}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <select
          className="border p-2"
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
        >
          <option value="">Выберите банк</option>
          {banks.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
        <input
          className="border p-2 w-full"
          placeholder="Регулярное выражение"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-500 text-white"
          onClick={addPattern}
        >
          Добавить
        </button>
      </div>
    </div>
  );
}
