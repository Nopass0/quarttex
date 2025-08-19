"use client"

import { cn } from "@/lib/utils"

interface BankCardProps {
  number: string
  bankType?: string
  holderName?: string
  size?: "sm" | "md" | "lg"
  className?: string
  expiryDate?: string
}

// BIN (Bank Identification Number) ranges for Russian banks
const binRanges: { start: string; end: string; bank: string }[] = [
  { start: "427600", end: "427699", bank: "SBERBANK" },
  { start: "427683", end: "427683", bank: "SBERBANK" },
  { start: "427901", end: "427902", bank: "SBERBANK" },
  { start: "427922", end: "427922", bank: "SBERBANK" },
  { start: "427631", end: "427631", bank: "SBERBANK" },
  { start: "548999", end: "548999", bank: "SBERBANK" },
  { start: "676195", end: "676196", bank: "SBERBANK" },
  { start: "639002", end: "639002", bank: "SBERBANK" },
  { start: "521324", end: "521324", bank: "TBANK" },
  { start: "437773", end: "437773", bank: "TBANK" },
  { start: "553691", end: "553691", bank: "TBANK" },
  { start: "415428", end: "415428", bank: "ALFABANK" },
  { start: "415482", end: "415482", bank: "ALFABANK" },
  { start: "479004", end: "479004", bank: "ALFABANK" },
  { start: "447377", end: "447377", bank: "ALFABANK" },
  { start: "427838", end: "427838", bank: "VTB" },
  { start: "446916", end: "446916", bank: "VTB" },
  { start: "427229", end: "427229", bank: "VTB" },
  { start: "527883", end: "527883", bank: "VTB" },
  { start: "427903", end: "427903", bank: "RAIFFEISEN" },
  { start: "462730", end: "462730", bank: "RAIFFEISEN" },
  { start: "516943", end: "516943", bank: "RAIFFEISEN" },
  { start: "404279", end: "404279", bank: "GAZPROMBANK" },
  { start: "437769", end: "437769", bank: "GAZPROMBANK" },
  { start: "522223", end: "522223", bank: "GAZPROMBANK" },
  { start: "405817", end: "405817", bank: "POCHTABANK" },
  { start: "418894", end: "418894", bank: "POCHTABANK" },
  { start: "486324", end: "486324", bank: "POCHTABANK" },
]

const bankColors: Record<string, { bg: string; text: string; logo: string }> = {
  SBERBANK: { bg: "bg-gradient-to-br from-green-600 to-green-700", text: "text-white", logo: "💚" },
  TBANK: { bg: "bg-gradient-to-br from-yellow-400 to-yellow-500", text: "text-black", logo: "⚡" },
  ALFABANK: { bg: "bg-gradient-to-br from-red-600 to-red-700", text: "text-white", logo: "🅰️" },
  VTB: { bg: "bg-gradient-to-br from-blue-600 to-blue-700", text: "text-white", logo: "🔷" },
  RAIFFEISEN: { bg: "bg-gradient-to-br from-yellow-500 to-yellow-600", text: "text-black", logo: "🟡" },
  GAZPROMBANK: { bg: "bg-gradient-to-br from-blue-700 to-blue-800", text: "text-white", logo: "🔵" },
  POCHTABANK: { bg: "bg-gradient-to-br from-purple-600 to-purple-700", text: "text-white", logo: "📮" },
  DEFAULT: { bg: "bg-gradient-to-br from-gray-700 to-gray-800", text: "text-white", logo: "💳" }
}

// Function to determine bank from card number
function getBankFromCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '')
  const bin = cleanNumber.substring(0, 6)
  
  for (const range of binRanges) {
    if (bin >= range.start && bin <= range.end) {
      return range.bank
    }
  }
  
  return "DEFAULT"
}

// Function to determine payment system
function getPaymentSystem(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '')
  const firstDigit = cleanNumber.charAt(0)
  const firstTwo = cleanNumber.substring(0, 2)
  const firstFour = cleanNumber.substring(0, 4)
  
  if (firstDigit === '2') return 'MIR'
  if (firstDigit === '4') return 'VISA'
  if (firstTwo >= '51' && firstTwo <= '55') return 'MASTERCARD'
  if (firstTwo === '50' || (firstTwo >= '56' && firstTwo <= '69')) return 'MAESTRO'
  if (firstFour === '3528' || firstFour === '3589') return 'JCB'
  if (firstTwo === '62') return 'UNIONPAY'
  
  return 'UNKNOWN'
}

export function BankCard({ 
  number, 
  bankType, 
  holderName = "",
  size = "md",
  className,
  expiryDate = "12/28"
}: BankCardProps) {
  // Auto-detect bank if not provided
  const detectedBank = bankType || getBankFromCardNumber(number)
  const colors = bankColors[detectedBank] || bankColors.DEFAULT
  const paymentSystem = getPaymentSystem(number)
  
  // Proper credit card aspect ratio (1.586:1)
  const sizeClasses = {
    sm: "w-64 h-[161px] text-xs",
    md: "w-80 h-[201px] text-sm",
    lg: "w-96 h-[241px] text-base"
  }
  
  const formatCardNumber = (num: string) => {
    const cleaned = num.replace(/\s/g, '')
    const isFullNumber = cleaned.length === 16
    
    if (isFullNumber) {
      return cleaned.match(/.{1,4}/g)?.join(' ') || num
    }
    
    // For masked numbers like "4276 **** **** 1234"
    return num
  }

  return (
    <div 
      className={cn(
        "relative rounded-xl shadow-lg p-6 flex flex-col justify-between",
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {/* Card Chip */}
      <div className="flex justify-between items-start">
        <div className={cn(
          "rounded",
          size === "sm" ? "w-8 h-6" : size === "md" ? "w-10 h-8" : "w-12 h-10",
          "bg-gradient-to-br from-yellow-300 to-yellow-500"
        )} />
        <div className="text-right">
          <span className={cn(
            size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl"
          )}>{colors.logo}</span>
          <div className={cn(
            "text-xs opacity-70 mt-1",
            colors.text
          )}>{paymentSystem}</div>
        </div>
      </div>

      {/* Card Number */}
      <div className={cn(
        "font-mono tracking-wider",
        size === "sm" ? "text-sm" : size === "md" ? "text-lg" : "text-xl"
      )}>
        {formatCardNumber(number)}
      </div>

      {/* Card Details */}
      <div className="flex justify-between items-end">
        <div>
          {holderName && (
            <div className={cn(
              "uppercase tracking-wide",
              size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
            )}>
              {holderName}
            </div>
          )}
        </div>
        <div className={cn(
          "text-right",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        )}>
          <div className="opacity-70">VALID</div>
          <div>{expiryDate}</div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-white/5" />
      </div>
    </div>
  )
}