"use client"

import { FoldersList } from "./folders-list"

interface BankProfile {
  id: number
  name: string
  cardNumber: string
  bank: string
  logo: string
  isActive: boolean
  limit?: string
  used: number
  conversion: string
  status: "working" | "not_working" | "warning"
  groupId?: number
}

interface ProfileGroup {
  id: number
  name: string
  profilesCount: number
  isExpanded: boolean
  profiles: BankProfile[]
}

const mockProfiles: BankProfile[] = [
  {
    id: 327192,
    name: "Верозуб В.В.",
    cardNumber: "ВТБ счет",
    bank: "VTB",
    logo: "/banks/vtb.svg",
    isActive: false,
    limit: "Не указано",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 283623,
    name: "Ермолин Я.Д.",
    cardNumber: "4125",
    bank: "VTB",
    logo: "/banks/vtb.svg",
    isActive: false,
    limit: "200k",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 240022,
    name: "Гияев М.З.",
    cardNumber: "9658",
    bank: "VTB",
    logo: "/banks/vtb.svg",
    isActive: false,
    limit: "1kk",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 305039,
    name: "Саларцорцян С.М.",
    cardNumber: "0174",
    bank: "Tinkoff",
    logo: "/banks/tinkoff.svg",
    isActive: false,
    limit: "Не указано",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 305014,
    name: "Саларцорцян П.М.",
    cardNumber: "9012",
    bank: "Tinkoff",
    logo: "/banks/tinkoff.svg",
    isActive: false,
    limit: "Не указано",
    used: 0,
    conversion: "0%",
    status: "not_working"
  }
]

const mockGroups: ProfileGroup[] = [
  {
    id: 6208,
    name: "Профили без группы",
    profilesCount: 30,
    isExpanded: true,
    profiles: mockProfiles
  }
]

export function FoldersMain() {
  return <FoldersList />
}