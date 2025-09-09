"use client";

import { useEffect, useState } from "react";
import { traderApi } from "@/services/api";

interface MerchantMethodRate {
  inPercentFrom: number;
  inPercentTo: number;
  outPercentFrom: number;
  outPercentTo: number;
  amountFrom: number;
  amountTo: number;
  actualRate: number;
  baseRate: number;
}

interface MerchantMethod {
  method: string;
  methodName: string;
  rates: MerchantMethodRate[];
}

export default function TestMethodsPage() {
  const [methods, setMethods] = useState<MerchantMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const response = await traderApi.getMerchantMethods();
      console.log("API Response:", response);
      setMethods(response || []);
    } catch (err) {
      console.error("Error fetching methods:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Тест методов мерчантов</h1>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Тест методов мерчантов</h1>
        <div className="text-red-600">Ошибка: {error}</div>
        <button 
          onClick={fetchMethods}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Тест методов мерчантов</h1>
      
      <div className="mb-4">
        <strong>Количество методов:</strong> {methods.length}
      </div>

      {methods.length === 0 ? (
        <div className="text-gray-500">Нет данных по методам</div>
      ) : (
        <div className="space-y-4">
          {methods.map((method, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-700 mb-2">
                {method.methodName?.toLowerCase().includes("c2c")
                  ? "C2C"
                  : method.methodName?.toLowerCase().includes("sbp")
                  ? "СБП"
                  : method.methodName}
              </h2>
              
              <div className="text-sm text-gray-600 mb-2">
                <strong>Код метода:</strong> {method.method}
              </div>

              {method.rates.map((rate, rateIndex) => (
                <div key={rateIndex} className="bg-gray-50 p-3 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Вход:</strong> {rate.inPercentFrom === rate.inPercentTo 
                        ? `${rate.inPercentFrom}%` 
                        : `${rate.inPercentFrom}% - ${rate.inPercentTo}%`}
                    </div>
                    <div>
                      <strong>Выход:</strong> {rate.outPercentFrom === rate.outPercentTo 
                        ? `${rate.outPercentFrom}%` 
                        : `${rate.outPercentFrom}% - ${rate.outPercentTo}%`}
                    </div>
                    <div>
                      <strong>Сумма:</strong> {rate.amountFrom.toLocaleString()} ₽ - {rate.amountTo.toLocaleString()} ₽
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      <strong>Фактический курс:</strong> {rate.actualRate} ₽/USDT
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      <strong>Базовый курс:</strong> {rate.baseRate} ₽/USDT
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <button 
          onClick={fetchMethods}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Обновить данные
        </button>
      </div>
    </div>
  );
}
