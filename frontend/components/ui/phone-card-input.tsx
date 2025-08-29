"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Phone, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhoneCardInputProps {
  value: string
  onChange: (value: string, type: 'phone' | 'card') => void
  type: 'phone' | 'card'
  onTypeChange: (type: 'phone' | 'card') => void
  className?: string
}

export function PhoneCardInput({ 
  value, 
  onChange, 
  type, 
  onTypeChange,
  className 
}: PhoneCardInputProps) {
  const [cardNumber, setCardNumber] = useState(['', '', '', ''])

  useEffect(() => {
    if (type === 'card' && value) {
      const cleaned = value.replace(/\s/g, '')
      const chunks = cleaned.match(/.{1,4}/g) || ['', '', '', '']
      setCardNumber([
        chunks[0] || '',
        chunks[1] || '',
        chunks[2] || '',
        chunks[3] || ''
      ])
    }
  }, [type, value])

  const handleCardChange = (index: number, val: string) => {
    const newNumber = [...cardNumber]
    newNumber[index] = val.slice(0, 4)
    setCardNumber(newNumber)
    onChange(newNumber.join(''), 'card')
    
    // Auto focus next input
    if (val.length === 4 && index < 3) {
      const nextInput = document.getElementById(`card-input-${index + 1}`)
      if (nextInput) {
        (nextInput as HTMLInputElement).focus()
      }
    }
  }

  const handlePhoneChange = (val: string) => {
    // Remove all non-digit characters except +
    const cleaned = val.replace(/[^\d+]/g, '')
    onChange(cleaned, 'phone')
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className={cn("h-4 w-4", type === 'phone' ? "text-[#006039]" : "text-gray-400")} />
          <Label htmlFor="phone-switch">Телефон</Label>
        </div>
        <Switch
          id="type-switch"
          checked={type === 'card'}
          onCheckedChange={(checked) => onTypeChange(checked ? 'card' : 'phone')}
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="card-switch">Карта</Label>
          <CreditCard className={cn("h-4 w-4", type === 'card' ? "text-[#006039]" : "text-gray-400")} />
        </div>
      </div>

      {type === 'phone' ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">+</span>
          <Input
            type="tel"
            placeholder="7 900 123 45 67"
            value={value.replace(/^\+/, '')}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="pl-8"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-8 bg-yellow-400 rounded"></div>
                <div className="text-xs">VISA</div>
              </div>
              <div className="text-xs">Bank</div>
            </div>
            <div className="flex gap-4 justify-center text-xl font-mono mb-8">
              <span>{cardNumber[0] || '••••'}</span>
              <span>{cardNumber[1] || '••••'}</span>
              <span>{cardNumber[2] || '••••'}</span>
              <span>{cardNumber[3] || '••••'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <div>
                <div className="text-gray-400">Card Holder</div>
                <div>NAME SURNAME</div>
              </div>
              <div>
                <div className="text-gray-400">Expires</div>
                <div>MM/YY</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <Input
                key={index}
                id={`card-input-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="0000"
                value={cardNumber[index]}
                onChange={(e) => handleCardChange(index, e.target.value)}
                className="text-center font-mono"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}