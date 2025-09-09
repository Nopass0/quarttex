"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Search, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Bank {
  code: string
  name: string
  logo: string
  bgColor?: string
}

const banks: Bank[] = [
  { code: 'SBERBANK', name: 'Сбербанк', logo: '💚', bgColor: 'bg-green-50' },
  { code: 'TBANK', name: 'Т-Банк', logo: '⚡', bgColor: 'bg-yellow-50' },
  { code: 'ALFABANK', name: 'Альфа-Банк', logo: '🅰️', bgColor: 'bg-red-50' },
  { code: 'VTB', name: 'ВТБ', logo: '🔷', bgColor: 'bg-blue-50' },
  { code: 'RAIFFEISEN', name: 'Райффайзенбанк', logo: '🟡', bgColor: 'bg-yellow-50' },
  { code: 'GAZPROMBANK', name: 'Газпромбанк', logo: '🔵', bgColor: 'bg-blue-50' },
  { code: 'POCHTABANK', name: 'Почта Банк', logo: '📮', bgColor: 'bg-purple-50' },
  { code: 'ROSSELKHOZBANK', name: 'Россельхозбанк', logo: '🌾', bgColor: 'bg-green-50' },
  { code: 'URALSIB', name: 'Уралсиб', logo: '💎', bgColor: 'bg-blue-50' },
  { code: 'LOKOBANK', name: 'Локо-Банк', logo: '🚂', bgColor: 'bg-red-50' },
  { code: 'AKBARS', name: 'Ак Барс Банк', logo: '🐆', bgColor: 'bg-green-50' },
  { code: 'MKB', name: 'МКБ', logo: '🏦', bgColor: 'bg-red-50' },
  { code: 'SPBBANK', name: 'Банк Санкт-Петербург', logo: '⚓', bgColor: 'bg-blue-50' },
  { code: 'MTSBANK', name: 'МТС Банк', logo: '📱', bgColor: 'bg-red-50' },
  { code: 'PROMSVYAZBANK', name: 'Промсвязьбанк', logo: '🔗', bgColor: 'bg-orange-50' },
  { code: 'OZONBANK', name: 'Озон Банк', logo: '🛒', bgColor: 'bg-purple-50' },
  { code: 'RENAISSANCE', name: 'Ренессанс Кредит', logo: '🎭', bgColor: 'bg-orange-50' },
  { code: 'OTPBANK', name: 'ОТП Банк', logo: '🏛️', bgColor: 'bg-green-50' },
  { code: 'AVANGARD', name: 'Авангард', logo: '🛡️', bgColor: 'bg-red-50' },
  { code: 'VLADBUSINESSBANK', name: 'Владбизнесбанк', logo: '🏢', bgColor: 'bg-blue-50' },
  { code: 'TAVRICHESKIY', name: 'Таврический', logo: '🏔️', bgColor: 'bg-green-50' },
  { code: 'FORABANK', name: 'Фора-Банк', logo: '🎯', bgColor: 'bg-yellow-50' },
  { code: 'BCSBANK', name: 'БКС Банк', logo: '📈', bgColor: 'bg-blue-50' },
  { code: 'HOMECREDIT', name: 'Хоум Кредит', logo: '🏠', bgColor: 'bg-red-50' },
  { code: 'BBRBANK', name: 'ББР Банк', logo: '🌟', bgColor: 'bg-green-50' },
  { code: 'CREDITEUROPE', name: 'Кредит Европа Банк', logo: '🇪🇺', bgColor: 'bg-red-50' },
  { code: 'RNKB', name: 'РНКБ', logo: '🏛️', bgColor: 'bg-blue-50' },
  { code: 'UBRIR', name: 'УБРиР', logo: '🏔️', bgColor: 'bg-yellow-50' },
  { code: 'GENBANK', name: 'Генбанк', logo: '🧬', bgColor: 'bg-red-50' },
  { code: 'SINARA', name: 'Синара', logo: '🚄', bgColor: 'bg-green-50' },
  { code: 'ABSOLUTBANK', name: 'Абсолют Банк', logo: '💯', bgColor: 'bg-red-50' },
  { code: 'MTSMONEY', name: 'МТС Деньги', logo: '📱', bgColor: 'bg-red-50' },
  { code: 'SVOYBANK', name: 'Свой Банк', logo: '🏘️', bgColor: 'bg-purple-50' },
  { code: 'TRANSKAPITALBANK', name: 'Транскапиталбанк', logo: '💸', bgColor: 'bg-blue-50' },
  { code: 'DOLINSK', name: 'Долинск', logo: '🏞️', bgColor: 'bg-green-50' },
  { code: 'SOVCOMBANK', name: 'Совкомбанк', logo: '🎪', bgColor: 'bg-red-50' },
  { code: 'ROSBANK', name: 'Росбанк', logo: '🌹', bgColor: 'bg-green-50' },
  { code: 'UNICREDIT', name: 'ЮниКредит Банк', logo: '🦄', bgColor: 'bg-red-50' },
  { code: 'CITIBANK', name: 'Ситибанк', logo: '🌃', bgColor: 'bg-blue-50' },
  { code: 'RUSSIANSTANDARD', name: 'Русский Стандарт', logo: '🦅', bgColor: 'bg-red-50' },
]

interface BankSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function BankSelector({ value, onChange, className }: BankSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedBank = banks.find(bank => bank.code === value)
  const filteredBanks = banks.filter(bank => 
    bank.name.toLowerCase().includes(search.toLowerCase()) ||
    bank.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedBank ? (
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-lg",
                selectedBank.bgColor
              )}>
                {selectedBank.logo}
              </div>
              <span className="text-left">{selectedBank.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Выберите банк</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск банка..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredBanks.length > 0 ? (
            <div className="p-1">
              {filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  onClick={() => {
                    onChange(bank.code)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left",
                    value === bank.code && "bg-accent"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-md flex items-center justify-center text-xl flex-shrink-0",
                    bank.bgColor
                  )}>
                    {bank.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{bank.name}</div>
                    <div className="text-xs text-muted-foreground">{bank.code}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-8 text-center">
              <div className="text-muted-foreground text-sm">Банк не найден</div>
              <div className="text-xs text-muted-foreground mt-1">
                Попробуйте изменить поисковый запрос
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}