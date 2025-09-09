"use client"

import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import BankCard from "@/components/BankCard"
import { Separator } from "@/components/ui/separator"

const bankCards = [
  // Major Banks
  { name: "Сбер", number: "4276 8380 5837 5435", category: "major" },
  { name: "Т-Банк", number: "5536 9138 5948 7849", category: "major" },
  { name: "ВТБ", number: "2200 7417 0588 7370", category: "major" },
  { name: "Альфа-Банк", number: "5486 7376 0969 8449", category: "major" },
  { name: "Газпромбанк", number: "4276 9800 1170 9012", category: "major" },
  
  // Federal Banks
  { name: "Райффайзен", number: "5101 2691 5259 4183", category: "federal" },
  { name: "Росбанк", number: "4276 4400 1065 8108", category: "federal" },
  { name: "Открытие", number: "4341 4600 1173 9012", category: "federal" },
  { name: "Почта Банк", number: "4859 4500 1234 5678", category: "federal" },
  { name: "ПСБ", number: "4318 7600 1234 5678", category: "federal" },
  
  // Commercial Banks
  { name: "МКБ", number: "5469 3800 1234 5678", category: "commercial" },
  { name: "Совкомбанк", number: "4274 3200 1234 5678", category: "commercial" },
  { name: "Хоум Кредит", number: "4555 4700 1234 5678", category: "commercial" },
  { name: "Уралсиб", number: "5484 7900 1234 5678", category: "commercial" },
  { name: "Ак Барс", number: "4620 0400 1234 5678", category: "commercial" },
  { name: "Банк СПб", number: "4276 5500 1234 5678", category: "commercial" },
  { name: "Русский Стандарт", number: "5191 0100 1234 5678", category: "commercial" },
]

export default function RussianBanksDemoPage() {
  const majorBanks = bankCards.filter(b => b.category === "major")
  const federalBanks = bankCards.filter(b => b.category === "federal")
  const commercialBanks = bankCards.filter(b => b.category === "commercial")

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Российские Банковские Карты</h1>
        <p className="text-muted-foreground">
          Демонстрация компонента BankCard с поддержкой всех основных российских банков
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Системно значимые банки</CardTitle>
          <CardDescription>
            Крупнейшие банки России с государственным участием
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {majorBanks.map((bank) => (
              <div key={bank.name} className="space-y-2">
                <Label className="text-sm text-muted-foreground">{bank.name}</Label>
                <BankCard cardNumber={bank.number} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Федеральные банки</CardTitle>
          <CardDescription>
            Банки с широкой сетью отделений по всей России
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {federalBanks.map((bank) => (
              <div key={bank.name} className="space-y-2">
                <Label className="text-sm text-muted-foreground">{bank.name}</Label>
                <BankCard cardNumber={bank.number} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Коммерческие банки</CardTitle>
          <CardDescription>
            Частные и региональные банки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {commercialBanks.map((bank) => (
              <div key={bank.name} className="space-y-2">
                <Label className="text-sm text-muted-foreground">{bank.name}</Label>
                <BankCard cardNumber={bank.number} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Миниатюрные карты</CardTitle>
          <CardDescription>
            Компактное отображение для списков и превью
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {bankCards.slice(0, 10).map((bank) => (
              <div key={`mini-${bank.name}`} className="space-y-2">
                <Label className="text-xs text-muted-foreground">{bank.name}</Label>
                <BankCard 
                  cardNumber={bank.number} 
                  miniature={true}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Кастомизация карт</CardTitle>
          <CardDescription>
            Примеры с различными настройками отображения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Сбер - Иван Иванов</Label>
              <BankCard 
                cardNumber="4276 8380 5837 5435"
                cardHolderName="IVAN IVANOV"
                validThru="12/25"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Т-Банк - без платёжной системы</Label>
              <BankCard 
                cardNumber="5536 9138 5948 7849"
                showScheme={false}
                cardHolderName="SERGEY PETROV"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">ВТБ - минимальная информация</Label>
              <BankCard 
                cardNumber="2200 7417 0588 7370"
                showCardHolder={false}
                showValidThru={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}