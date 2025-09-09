"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Plus, Loader2, ChevronRight, Mail, User, Settings, LogOut, File, Edit, Share, Trash, Download, Copy, Globe, Lock, Unlock, Star, Heart, Zap, Cloud, Sun, Moon, Sparkles as SparklesIcon, CreditCard, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/components/ui/menubar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Marquee } from "@/components/magicui/marquee"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { Sparkles } from "@/components/magicui/sparkles"
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid"
import { Logo } from "@/components/ui/logo"
import BankCard from "@/components/BankCard"
import { Smartphone } from "@/components/Smartphone"
import { ConnectionError } from "@/components/ConnectionError"

const frameworks = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
]

export default function ElementsTestPage() {
  const [date, setDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [progress, setProgress] = useState(33)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [sliderValue, setSliderValue] = useState([50])
  const [rangeValue, setRangeValue] = useState([25, 75])
  const [loading, setLoading] = useState(false)

  return (
    <TooltipProvider>
      <div className="container mx-auto p-8 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-text">Shadcn/UI Components Showcase</h1>
          <AnimatedGradientText>
            <SparklesIcon className="mr-2 h-4 w-4" />
            Liquid Glass Design System
          </AnimatedGradientText>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Accordion */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Accordion</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is it accessible?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Is it styled?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It comes with beautiful liquid glass styles.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Alert */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Alert>
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  You can add components to your app.
                </AlertDescription>
              </Alert>
              <Alert className="border-green-500">
                <Check className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  Your changes have been saved.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Avatar */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Avatar className="h-12 w-12">
                <AvatarFallback>LG</AvatarFallback>
              </Avatar>
            </CardContent>
          </Card>

          {/* Badge */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge className="badge-glow">Glow</Badge>
              <Badge className="badge-glass">Glass</Badge>
              <Badge className="badge-outline-glow">Outline Glow</Badge>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">Gradient</Badge>
            </CardContent>
          </Card>

          {/* Buttons */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button className="btn-glow">Glow Effect</Button>
                <Button className="btn-outline-glow">Outline Glow</Button>
                <Button className="btn-ghost-glow">Ghost Glow</Button>
                <Button className="btn-glass">Glass</Button>
                <Button className="bg-gradient-to-r from-[#006039] to-[#00a060] text-white hover:from-[#00a060] hover:to-[#006039] transition-all duration-500">Gradient</Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button className="rounded-full">Rounded</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Disabled</Button>
                <Button disabled={loading} onClick={() => {
                  setLoading(true)
                  setTimeout(() => setLoading(false), 2000)
                }}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Click me
                </Button>
                <ShimmerButton>
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  Shimmer Button
                </ShimmerButton>
              </div>
            </CardContent>
          </Card>

          {/* Logo Component */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Logo Component</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-4 block">Full Variant</Label>
                <div className="flex flex-col gap-4">
                  <Logo size="xs" />
                  <Logo size="sm" />
                  <Logo size="md" />
                  <Logo size="lg" />
                  <Logo size="xl" />
                </div>
              </div>
              <Separator />
              <div>
                <Label className="mb-4 block">Uppercase Variant</Label>
                <div className="flex flex-col gap-4">
                  <Logo variant="uppercase" size="xs" />
                  <Logo variant="uppercase" size="sm" />
                  <Logo variant="uppercase" size="md" />
                  <Logo variant="uppercase" size="lg" />
                  <Logo variant="uppercase" size="xl" />
                </div>
              </div>
              <Separator />
              <div>
                <Label className="mb-4 block">Mini Variant</Label>
                <div className="flex items-center gap-4">
                  <Logo variant="mini" size="xs" />
                  <Logo variant="mini" size="sm" />
                  <Logo variant="mini" size="md" />
                  <Logo variant="mini" size="lg" />
                  <Logo variant="mini" size="xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Cards */}
          <Card className="glass-card col-span-full">
            <CardHeader>
              <CardTitle>Bank Card Component</CardTitle>
              <CardDescription>
                Dynamic bank card display with automatic bank detection, validation, and theming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="mb-4 block text-lg">Russian Bank Cards - Complete Collection</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Major Banks */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Сбер (Visa)</Label>
                    <BankCard cardNumber="4276 8380 5837 5435" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Т-Банк (Mastercard)</Label>
                    <BankCard cardNumber="5536 9138 5948 7849" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">ВТБ (Visa)</Label>
                    <BankCard cardNumber="4272 2900 1170 9012" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Альфа-Банк (Visa)</Label>
                    <BankCard cardNumber="4154 2810 0969 8449" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Райффайзен (Mastercard)</Label>
                    <BankCard cardNumber="5101 2691 5259 4183" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Газпромбанк (Visa)</Label>
                    <BankCard cardNumber="4276 9800 1170 9012" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Росбанк (Visa)</Label>
                    <BankCard cardNumber="4276 4400 1065 8108" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Открытие (Visa)</Label>
                    <BankCard cardNumber="4341 4600 1173 9012" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Почта Банк (MIR)</Label>
                    <BankCard cardNumber="2200 7417 0588 7370" />
                  </div>
                  
                  {/* Additional Banks */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">МКБ (Visa)</Label>
                    <BankCard cardNumber="4267 4000 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Совкомбанк (Visa)</Label>
                    <BankCard cardNumber="4469 1600 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Хоум Кредит (Visa)</Label>
                    <BankCard cardNumber="4063 2000 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Уралсиб (Visa)</Label>
                    <BankCard cardNumber="4026 4300 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">ПСБ (Visa)</Label>
                    <BankCard cardNumber="4152 4000 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Ак Барс (Visa)</Label>
                    <BankCard cardNumber="4156 6900 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Банк СПб (Visa)</Label>
                    <BankCard cardNumber="4278 3300 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Русский Стандарт (Mastercard)</Label>
                    <BankCard cardNumber="5106 2100 1234 5678" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-4 block text-lg">International Cards</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">American Express</Label>
                    <BankCard cardNumber="3782 822463 10005" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">UnionPay</Label>
                    <BankCard cardNumber="6221 2345 6789 0123" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Chase Sapphire (Visa)</Label>
                    <BankCard cardNumber="4111 1111 1111 1111" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Capital One (Mastercard)</Label>
                    <BankCard cardNumber="5425 2334 3010 9903" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-4 block text-lg">Card Variations</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Without Scheme Logo</Label>
                    <BankCard cardNumber="4276 8380 5837 5435" showScheme={false} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Т-Банк Black</Label>
                    <BankCard cardNumber="5213 2438 5948 7841" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Почта Банк (Visa)</Label>
                    <BankCard cardNumber="4859 4500 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Custom Theme</Label>
                    <BankCard cardNumber="5425 2334 3010 9903" themeSeed="premium" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-4 block text-lg">Invalid Cards (Luhn Check Failed)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Invalid Visa</Label>
                    <BankCard cardNumber="4276 3800 5847 1235" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Invalid Mastercard</Label>
                    <BankCard cardNumber="5536 9100 1234 5679" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Incomplete Number</Label>
                    <BankCard cardNumber="4276 3800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Random Numbers</Label>
                    <BankCard cardNumber="1234 5678 9012 3456" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-4 block text-lg">Special Cases</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Empty Card</Label>
                    <BankCard cardNumber="" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Spaces Only</Label>
                    <BankCard cardNumber="    " />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mixed Format</Label>
                    <BankCard cardNumber="4276-3800-5847-1234" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">No Spaces</Label>
                    <BankCard cardNumber="4276380058471234" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-4 block text-lg">Custom Props Examples</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Custom Card Holder</Label>
                    <BankCard 
                      cardNumber="4276 8380 5837 5435" 
                      cardHolderName="SERGEY IVANOV"
                      validThru="08/26"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">No Card Holder</Label>
                    <BankCard 
                      cardNumber="5536 9138 5948 7849" 
                      showCardHolder={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">No Valid Thru</Label>
                    <BankCard 
                      cardNumber="2200 7417 0588 7370" 
                      showValidThru={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Minimal Info</Label>
                    <BankCard 
                      cardNumber="5486 7376 0969 8449" 
                      showCardHolder={false}
                      showValidThru={false}
                      showScheme={false}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-4 block text-lg">Miniature Cards</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mini Сбер</Label>
                    <BankCard 
                      cardNumber="4276 8380 5837 5435" 
                      miniature={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mini Т-Банк</Label>
                    <BankCard 
                      cardNumber="5536 9138 5948 7849" 
                      miniature={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mini ВТБ</Label>
                    <BankCard 
                      cardNumber="2200 7417 0588 7370" 
                      miniature={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mini Альфа-Банк</Label>
                    <BankCard 
                      cardNumber="5486 7376 0969 8449" 
                      miniature={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mini Visa</Label>
                    <BankCard 
                      cardNumber="4111 1111 1111 1111" 
                      miniature={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mini Mastercard</Label>
                    <BankCard 
                      cardNumber="5425 2334 3010 9903" 
                      miniature={true}
                    />
                  </div>
                </div>
              </div>

              <Alert className="border-blue-500">
                <CreditCard className="h-4 w-4" />
                <AlertTitle>About BankCard Component</AlertTitle>
                <AlertDescription>
                  This component automatically detects the payment system (Visa, Mastercard, MIR, UnionPay, Amex),
                  validates card numbers using Luhn algorithm, fetches bank information via BIN lookup,
                  and displays official bank logos. Supports custom card holder name, valid thru date, miniature mode,
                  and ability to hide various elements. Text color automatically adjusts based on background.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Calendars */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Calendar Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Single Date</Label>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </div>
              <Separator />
              <div>
                <Label>Date Range</Label>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                  className="rounded-md border"
                />
              </div>
            </CardContent>
          </Card>

          {/* Checkbox */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Checkbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <label htmlFor="terms" className="text-sm font-medium">
                  Accept terms and conditions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="marketing" defaultChecked />
                <label htmlFor="marketing" className="text-sm font-medium">
                  Receive marketing emails
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disabled" disabled />
                <label htmlFor="disabled" className="text-sm font-medium opacity-50">
                  Disabled option
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Radio Group */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Radio Group</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup defaultValue="option-one" className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="option-one" id="option-one" />
                  <Label htmlFor="option-one" className="font-medium">Option One</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="option-two" id="option-two" />
                  <Label htmlFor="option-two" className="font-medium">Option Two</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="option-three" id="option-three" />
                  <Label htmlFor="option-three" className="font-medium">Option Three</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Inputs */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Input Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input type="email" id="email" placeholder="name@example.com" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input type="password" id="password" placeholder="••••••••" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Number</Label>
                  <Input type="number" id="number" placeholder="0" min="0" max="100" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Phone</Label>
                  <Input type="tel" id="tel" placeholder="+1 (555) 000-0000" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" id="date" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input type="time" id="time" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datetime">Date & Time</Label>
                  <Input type="datetime-local" id="datetime" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input type="search" id="search" placeholder="Search..." className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input type="url" id="url" placeholder="https://example.com" className="glow-on-hover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color Picker</Label>
                  <Input type="color" id="color" defaultValue="#006039" className="w-full" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="file">File Upload</Label>
                  <Input type="file" id="file" className="w-full" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="range">Range Slider</Label>
                  <Input type="range" id="range" min="0" max="100" defaultValue="50" className="w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled-input">Disabled</Label>
                <Input id="disabled-input" disabled placeholder="Disabled input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="readonly-input">Read Only</Label>
                <Input id="readonly-input" readOnly value="Read only value" />
              </div>
            </CardContent>
          </Card>

          {/* Dialog */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Dialog</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent className="glass-card">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" placeholder="@johndoe" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="w-full" />
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => setProgress(Math.max(0, progress - 10))}
                >
                  -10
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setProgress(Math.min(100, progress + 10))}
                >
                  +10
                </Button>
              </div>
              <Progress value={75} className="w-full h-2" />
              <Progress value={50} className="w-full h-3" />
            </CardContent>
          </Card>

          {/* Sliders */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Slider Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Basic Slider: {sliderValue[0]}</Label>
                <Slider 
                  value={sliderValue} 
                  onValueChange={setSliderValue}
                  max={100} 
                  step={1} 
                />
              </div>
              <div>
                <Label>Range Slider: {rangeValue[0]} - {rangeValue[1]}</Label>
                <Slider 
                  value={rangeValue} 
                  onValueChange={setRangeValue}
                  max={100} 
                  step={5}
                  minStepsBetweenThumbs={5}
                />
              </div>
              <div>
                <Label>Stepped Slider with Marks</Label>
                <div className="relative pt-2">
                  <Slider 
                    defaultValue={[50]} 
                    max={100} 
                    step={25}
                    className="slider-marks"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Custom Colored Slider</Label>
                <Slider 
                  defaultValue={[30]} 
                  max={100} 
                  step={1}
                  className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-green-500 [&_[role=slider]]:to-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Select */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Select</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apple">🍎 Apple</SelectItem>
                  <SelectItem value="banana">🍌 Banana</SelectItem>
                  <SelectItem value="orange">🍊 Orange</SelectItem>
                  <SelectItem value="grape">🍇 Grape</SelectItem>
                  <SelectItem value="watermelon">🍉 Watermelon</SelectItem>
                </SelectContent>
              </Select>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Disabled select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Option 1</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Switch */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Switch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
                <Switch id="airplane-mode" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notifications</Label>
                <Switch id="notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="disabled-switch" className="opacity-50">Disabled</Label>
                <Switch id="disabled-switch" disabled />
              </div>
            </CardContent>
          </Card>

          {/* Textarea */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Textarea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder="Type your message here..." />
              <Textarea 
                placeholder="Resizable textarea..." 
                className="min-h-[100px]"
              />
              <Textarea 
                placeholder="Disabled textarea..." 
                disabled
              />
            </CardContent>
          </Card>

          {/* Toast */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Toast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => {
                  toast("Event has been created", {
                    description: "Sunday, December 03, 2023 at 9:00 AM",
                  })
                }}
              >
                Show Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  toast.success("Success!", {
                    description: "Your changes have been saved.",
                  })
                }}
              >
                Success Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  toast.error("Error!", {
                    description: "Something went wrong.",
                  })
                }}
              >
                Error Toast
              </Button>
            </CardContent>
          </Card>

          {/* Toggle */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Toggle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle>Toggle me</Toggle>
              <ToggleGroup type="multiple" className="justify-start">
                <ToggleGroupItem value="a">A</ToggleGroupItem>
                <ToggleGroupItem value="b">B</ToggleGroupItem>
                <ToggleGroupItem value="c">C</ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup type="single" defaultValue="center" className="justify-start">
                <ToggleGroupItem value="left">Left</ToggleGroupItem>
                <ToggleGroupItem value="center">Center</ToggleGroupItem>
                <ToggleGroupItem value="right">Right</ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>

          {/* Tooltip */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Tooltip</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a tooltip</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add new item</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          {/* Skeleton */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Skeleton</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Separator */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Separator</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm">Above separator</p>
                <Separator className="my-4" />
                <p className="text-sm">Below separator</p>
                <Separator orientation="vertical" className="h-20 mx-auto my-4" />
                <p className="text-sm text-center">After vertical</p>
              </div>
            </CardContent>
          </Card>

          {/* Breadcrumb */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Breadcrumb</CardTitle>
            </CardHeader>
            <CardContent>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>UI Elements</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </CardContent>
          </Card>

          {/* Input OTP */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Input OTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>6-digit code</Label>
                <InputOTP maxLength={6}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div>
                <Label>4-digit PIN</Label>
                <InputOTP maxLength={4}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </CardContent>
          </Card>

          {/* Popover */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Popover</CardTitle>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Open popover</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Dimensions</h4>
                      <p className="text-sm text-muted-foreground">
                        Set the dimensions for the layer.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Width</Label>
                        <Input
                          id="width"
                          defaultValue="100%"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          defaultValue="25px"
                          className="col-span-2 h-8"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Command */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Command</CardTitle>
            </CardHeader>
            <CardContent>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>
                      <Calendar className="mr-2 h-4 w-4" />
                      Calendar
                    </CommandItem>
                    <CommandItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Search Emails
                    </CommandItem>
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading="Actions">
                    <CommandItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </CommandItem>
                    <CommandItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">INV001</TableCell>
                    <TableCell>
                      <Badge className="badge-glass">Paid</Badge>
                    </TableCell>
                    <TableCell>Credit Card</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">INV002</TableCell>
                    <TableCell>
                      <Badge variant="outline">Pending</Badge>
                    </TableCell>
                    <TableCell>PayPal</TableCell>
                    <TableCell className="text-right">$150.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">INV003</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Draft</Badge>
                    </TableCell>
                    <TableCell>Bank Transfer</TableCell>
                    <TableCell className="text-right">$350.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Tabs</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="account" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent value="account" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Name</Label>
                    <Input id="account-name" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email</Label>
                    <Input id="account-email" type="email" placeholder="john@example.com" />
                  </div>
                </TabsContent>
                <TabsContent value="password" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current">Current password</Label>
                    <Input id="current" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">New password</Label>
                    <Input id="new" type="password" />
                  </div>
                </TabsContent>
                <TabsContent value="notifications" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="marketing">Marketing emails</Label>
                    <Switch id="marketing" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="security">Security alerts</Label>
                    <Switch id="security" defaultChecked />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Alert Dialog */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Alert Dialog</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Context Menu */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Context Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <ContextMenu>
                <ContextMenuTrigger className="flex h-[150px] w-full items-center justify-center rounded-md border border-dashed text-sm">
                  Right click here
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem inset>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                    <ContextMenuShortcut>⌘P</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem inset>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                    <ContextMenuShortcut>⌘E</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem inset>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                    <ContextMenuShortcut>⌘S</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuSub>
                    <ContextMenuSubTrigger inset>
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48">
                      <ContextMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </ContextMenuItem>
                      <ContextMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem>
                        <Globe className="mr-2 h-4 w-4" />
                        Social Media
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuItem inset>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                    <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                    <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </CardContent>
          </Card>

          {/* Dropdown Menu */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Dropdown Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Open Menu <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          {/* Hover Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Hover Card</CardTitle>
            </CardHeader>
            <CardContent>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="link">@nextjs</Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="flex justify-between space-x-4">
                    <Avatar>
                      <AvatarImage src="https://github.com/vercel.png" />
                      <AvatarFallback>VC</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">@nextjs</h4>
                      <p className="text-sm">
                        The React Framework – created and maintained by @vercel.
                      </p>
                      <div className="flex items-center pt-2">
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        <span className="text-xs text-muted-foreground">
                          Joined December 2021
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardContent>
          </Card>

          {/* Aspect Ratio */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Aspect Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <AspectRatio ratio={16 / 9} className="bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
                  alt="Photo"
                  className="rounded-md object-cover w-full h-full"
                />
              </AspectRatio>
            </CardContent>
          </Card>

          {/* Collapsible */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Collapsible</CardTitle>
            </CardHeader>
            <CardContent>
              <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="w-full space-y-2"
              >
                <div className="flex items-center justify-between space-x-4">
                  <h4 className="text-sm font-semibold">
                    @peduarte starred 3 repositories
                  </h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <div className="rounded-md border px-4 py-2 font-mono text-sm shadow-sm">
                  @radix-ui/primitives
                </div>
                <CollapsibleContent className="space-y-2">
                  <div className="rounded-md border px-4 py-2 font-mono text-sm shadow-sm">
                    @radix-ui/colors
                  </div>
                  <div className="rounded-md border px-4 py-2 font-mono text-sm shadow-sm">
                    @stitches/react
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Drawer */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Drawer</CardTitle>
            </CardHeader>
            <CardContent>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button>Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Edit Profile</DrawerTitle>
                    <DrawerDescription>
                      Make changes to your profile here.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="drawer-name">Name</Label>
                      <Input id="drawer-name" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drawer-email">Email</Label>
                      <Input id="drawer-email" type="email" placeholder="john@example.com" />
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button>Submit</Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </CardContent>
          </Card>

          {/* Sheet */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button>Open Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>
                      Make changes to your profile here. Click save when you're done.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="sheet-name" className="text-right">
                        Name
                      </Label>
                      <Input id="sheet-name" value="Pedro Duarte" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="sheet-username" className="text-right">
                        Username
                      </Label>
                      <Input id="sheet-username" value="@peduarte" className="col-span-3" />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          {/* Scroll Area */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Scroll Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <h4 className="text-sm font-medium">Item {i + 1}</h4>
                      <p className="text-sm text-muted-foreground">
                        Description for item {i + 1}. This is a longer description
                        to demonstrate scrolling behavior.
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Menubar */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Menubar</CardTitle>
            </CardHeader>
            <CardContent>
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>File</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      New Tab <MenubarShortcut>⌘T</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      New Window <MenubarShortcut>⌘N</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem disabled>New Incognito Window</MenubarItem>
                    <MenubarSeparator />
                    <MenubarSub>
                      <MenubarSubTrigger>Share</MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarItem>Email link</MenubarItem>
                        <MenubarItem>Messages</MenubarItem>
                        <MenubarItem>Notes</MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSeparator />
                    <MenubarItem>
                      Print... <MenubarShortcut>⌘P</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>Edit</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Cut</MenubarItem>
                    <MenubarItem>Copy</MenubarItem>
                    <MenubarItem>Paste</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>View</MenubarTrigger>
                  <MenubarContent>
                    <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
                    <MenubarCheckboxItem checked>
                      Always Show Full URLs
                    </MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarRadioGroup value="comfortable">
                      <MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem>
                      <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
                    </MenubarRadioGroup>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </CardContent>
          </Card>

          {/* Navigation Menu */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                        <li className="row-span-3">
                          <NavigationMenuLink asChild>
                            <a
                              className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                              href="/"
                            >
                              <div className="mb-2 mt-4 text-lg font-medium">
                                shadcn/ui
                              </div>
                              <p className="text-sm leading-tight text-muted-foreground">
                                Beautifully designed components.
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink href="/docs">
                            Introduction
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink href="/docs/installation">
                            Installation
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink href="/docs/primitives/typography">
                            Typography
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Components</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {frameworks.map((framework) => (
                          <li key={framework.value}>
                            <NavigationMenuLink href="#">
                              {framework.label}
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </CardContent>
          </Card>

          {/* Pagination */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Pagination</CardTitle>
            </CardHeader>
            <CardContent>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      2
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">67</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">68</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardContent>
          </Card>

          {/* Carousel */}
          <Card className="glass-card col-span-2">
            <CardHeader>
              <CardTitle>Carousel</CardTitle>
            </CardHeader>
            <CardContent>
              <Carousel className="w-full max-w-xs mx-auto">
                <CarouselContent>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card className="glass-card">
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            <span className="text-4xl font-semibold">{index + 1}</span>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </CardContent>
          </Card>

          {/* Resizable */}
          <Card className="glass-card col-span-full">
            <CardHeader>
              <CardTitle>Resizable Panels</CardTitle>
            </CardHeader>
            <CardContent>
              <ResizablePanelGroup direction="horizontal" className="max-w-full rounded-lg border">
                <ResizablePanel defaultSize={25}>
                  <div className="flex h-[200px] items-center justify-center p-6">
                    <span className="font-semibold">Panel 1</span>
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={75}>
                  <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={50}>
                      <div className="flex h-full items-center justify-center p-6">
                        <span className="font-semibold">Panel 2</span>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50}>
                      <div className="flex h-full items-center justify-center p-6">
                        <span className="font-semibold">Panel 3</span>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </CardContent>
          </Card>

          {/* Magic UI Section */}
          <div className="col-span-full mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 gradient-text">Magic UI Components</h2>
              <Sparkles sparkleCount={30}>
                <AnimatedGradientText>
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  Enhanced with animations and effects
                </AnimatedGradientText>
              </Sparkles>
            </div>

            <BentoGrid className="mb-8">
              <BentoGridItem
                title="Analytics"
                description="Track your website analytics with beautiful charts"
                header={
                  <div className="h-32 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 magic-float" />
                }
                icon={<Zap className="h-4 w-4 text-primary" />}
              />
              <BentoGridItem
                title="Cloud Storage"
                description="Store your files securely in the cloud"
                header={
                  <div className="h-32 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center">
                    <Cloud className="h-16 w-16 text-white magic-float" />
                  </div>
                }
                icon={<Cloud className="h-4 w-4 text-primary" />}
              />
              <BentoGridItem
                title="Dark Mode"
                description="Beautiful dark mode support out of the box"
                header={
                  <div className="h-32 rounded-lg bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                    <div className="flex gap-4">
                      <Sun className="h-8 w-8 text-yellow-200" />
                      <Moon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                }
                icon={<Moon className="h-4 w-4 text-primary" />}
              />
              <BentoGridItem
                title="Security"
                description="Enterprise-grade security for your data"
                header={
                  <div className="h-32 rounded-lg bg-gradient-to-br from-red-400 to-orange-600 flex items-center justify-center">
                    <div className="relative">
                      <Lock className="h-12 w-12 text-white" />
                      <Unlock className="h-12 w-12 text-white absolute inset-0 opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                }
                icon={<Lock className="h-4 w-4 text-primary" />}
                className="md:col-span-2"
              />
              <BentoGridItem
                title="Performance"
                description="Lightning fast performance with edge computing"
                header={
                  <div className="h-32 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center">
                    <Zap className="h-16 w-16 text-white magic-pulse" />
                  </div>
                }
                icon={<Zap className="h-4 w-4 text-primary" />}
              />
            </BentoGrid>

            {/* Magic Buttons Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Magic Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <ShimmerButton>
                    <Star className="mr-2 h-4 w-4" />
                    Star on GitHub
                  </ShimmerButton>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
                    <Heart className="mr-2 h-4 w-4" />
                    Gradient Love
                  </Button>
                  <Button className="magic-pulse bg-primary hover:bg-primary/90">
                    <SparklesIcon className="mr-2 h-4 w-4" />
                    Pulse Effect
                  </Button>
                  <Button variant="outline" className="magic-float">
                    <Cloud className="mr-2 h-4 w-4" />
                    Floating Cloud
                  </Button>
                </div>
                
                <Separator />
                
                <div className="flex flex-wrap gap-4">
                  <div className="p-4 rounded-lg glass-card magic-float">
                    <h3 className="font-semibold mb-2">Floating Card</h3>
                    <p className="text-sm text-muted-foreground">This card floats up and down</p>
                  </div>
                  <div className="p-4 rounded-lg glass-card magic-rotate">
                    <h3 className="font-semibold mb-2 gradient-text">Rotating Text</h3>
                    <p className="text-sm text-muted-foreground">With gradient effect</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Smartphone Component */}
          <Card className="glass-card col-span-full">
            <CardHeader>
              <CardTitle>Smartphone Component</CardTitle>
              <CardDescription>
                Realistic smartphone frame with customizable status bar and content area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {/* Default State - Connection Error */}
                <div className="space-y-4">
                  <Label>Ошибка подключения (как на скриншоте)</Label>
                  <Smartphone 
                    networkType="none"
                    signalStrength={0}
                    batteryLevel={65}
                    time="12:52"
                  >
                    <ConnectionError 
                      onRetry={() => toast("Повторная попытка подключения...")}
                    />
                  </Smartphone>
                </div>

                {/* With 4G Connection */}
                <div className="space-y-4">
                  <Label>С 4G подключением</Label>
                  <Smartphone 
                    networkType="4G"
                    signalStrength={3}
                    batteryLevel={85}
                    time="14:30"
                  >
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50">
                      <div className="text-center p-8">
                        <Logo className="h-24 w-auto mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900">Chase App</h3>
                        <p className="text-gray-600 mt-2">Добро пожаловать!</p>
                      </div>
                    </div>
                  </Smartphone>
                </div>

                {/* With WiFi and Low Battery */}
                <div className="space-y-4">
                  <Label>WiFi с низким зарядом</Label>
                  <Smartphone 
                    networkType="wifi"
                    batteryLevel={15}
                    time="23:45"
                    screenBackground="#f3f4f6"
                  >
                    <div className="p-6">
                      <Card className="mb-4">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Баланс</span>
                            <span className="text-2xl font-bold">₽125,430</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Alert className="border-red-500">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Внимание</AlertTitle>
                        <AlertDescription>
                          Низкий заряд батареи. Подключите зарядное устройство.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </Smartphone>
                </div>

                {/* Dark Theme with 5G */}
                <div className="space-y-4">
                  <Label>Темная тема с 5G</Label>
                  <Smartphone 
                    networkType="5G"
                    signalStrength={4}
                    batteryLevel={100}
                    time="09:00"
                    screenBackground="#000000"
                  >
                    <div className="h-full bg-black text-white p-6">
                      <h2 className="text-3xl font-bold mb-4">Транзакции</h2>
                      <div className="space-y-3">
                        <div className="flex justify-between py-3 border-b border-gray-800">
                          <div>
                            <p className="font-medium">Магазин "Пятерочка"</p>
                            <p className="text-sm text-gray-400">Сегодня, 08:45</p>
                          </div>
                          <span className="text-xl">-₽543</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-800">
                          <div>
                            <p className="font-medium">Зарплата</p>
                            <p className="text-sm text-gray-400">Вчера, 15:00</p>
                          </div>
                          <span className="text-xl text-green-400">+₽85,000</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-gray-800">
                          <div>
                            <p className="font-medium">Яндекс.Такси</p>
                            <p className="text-sm text-gray-400">Вчера, 22:30</p>
                          </div>
                          <span className="text-xl">-₽780</span>
                        </div>
                      </div>
                    </div>
                  </Smartphone>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Different Network States */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Различные состояния сети</h3>
                <div className="flex flex-wrap gap-6">
                  <div className="text-center">
                    <Smartphone 
                      networkType="none"
                      signalStrength={0}
                      batteryLevel={50}
                      time="12:00"
                      className="scale-75"
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Нет сети</p>
                      </div>
                    </Smartphone>
                    <Label className="text-xs mt-2">Нет данных</Label>
                  </div>

                  <div className="text-center">
                    <Smartphone 
                      networkType="2G"
                      signalStrength={2}
                      batteryLevel={60}
                      time="12:00"
                      className="scale-75"
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">2G Сеть</p>
                      </div>
                    </Smartphone>
                    <Label className="text-xs mt-2">2G</Label>
                  </div>

                  <div className="text-center">
                    <Smartphone 
                      networkType="3G"
                      signalStrength={3}
                      batteryLevel={70}
                      time="12:00"
                      className="scale-75"
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">3G Сеть</p>
                      </div>
                    </Smartphone>
                    <Label className="text-xs mt-2">3G</Label>
                  </div>

                  <div className="text-center">
                    <Smartphone 
                      networkType="4G"
                      signalStrength={4}
                      batteryLevel={80}
                      time="12:00"
                      className="scale-75"
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">4G LTE</p>
                      </div>
                    </Smartphone>
                    <Label className="text-xs mt-2">4G</Label>
                  </div>

                  <div className="text-center">
                    <Smartphone 
                      networkType="5G"
                      signalStrength={4}
                      batteryLevel={90}
                      time="12:00"
                      className="scale-75"
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">5G Сеть</p>
                      </div>
                    </Smartphone>
                    <Label className="text-xs mt-2">5G</Label>
                  </div>

                  <div className="text-center">
                    <Smartphone 
                      networkType="wifi"
                      batteryLevel={100}
                      time="12:00"
                      className="scale-75"
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Wi-Fi</p>
                      </div>
                    </Smartphone>
                    <Label className="text-xs mt-2">Wi-Fi</Label>
                  </div>
                </div>
              </div>

              {/* Custom Content Example */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Пример с банковской картой</h3>
                <Smartphone 
                  networkType="4G"
                  signalStrength={4}
                  batteryLevel={75}
                  time="16:20"
                  screenBackground="#f9fafb"
                >
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Мои карты</h2>
                    <div className="space-y-4">
                      <BankCard 
                        cardNumber="4276 8380 5837 5435"
                        cardHolderName="IVAN PETROV"
                        validThru="12/26"
                        miniature={true}
                      />
                      <div className="flex justify-between mt-4">
                        <Button variant="outline" size="sm">Заблокировать</Button>
                        <Button size="sm">Пополнить</Button>
                      </div>
                    </div>
                  </div>
                </Smartphone>
              </div>

              {/* Different Phone Types */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Разные типы устройств</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* iPhone */}
                  <div className="space-y-2">
                    <Label>iPhone (Dynamic Island)</Label>
                    <Smartphone 
                      deviceType="iphone"
                      networkType="5G"
                      signalStrength={4}
                      batteryLevel={90}
                      time="09:41"
                      screenBackground="#000000"
                      statusBarStyle="light"
                    >
                      <div className="h-full bg-black text-white p-6 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[22px] mx-auto mb-4" />
                          <h3 className="text-xl font-semibold">iPhone 15 Pro</h3>
                          <p className="text-gray-400 text-sm mt-1">Dynamic Island</p>
                        </div>
                      </div>
                    </Smartphone>
                  </div>

                  {/* Android */}
                  <div className="space-y-2">
                    <Label>Android (Punch-hole)</Label>
                    <Smartphone 
                      deviceType="android"
                      networkType="4G"
                      signalStrength={3}
                      batteryLevel={75}
                      time="14:30"
                      frameColor="#2a2a2a"
                    >
                      <div className="h-full bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-white text-3xl font-bold">A</span>
                          </div>
                          <h3 className="text-xl font-semibold">Android 14</h3>
                          <p className="text-gray-600 text-sm mt-1">Material You</p>
                        </div>
                      </div>
                    </Smartphone>
                  </div>

                  {/* Custom Colors */}
                  <div className="space-y-2">
                    <Label>Кастомные цвета</Label>
                    <Smartphone 
                      deviceType="iphone"
                      networkType="wifi"
                      batteryLevel={100}
                      time="20:00"
                      frameColor="#ff6b6b"
                      screenBackground="#ffe0e0"
                    >
                      <div className="h-full p-6 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-red-500 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                            <Heart className="w-12 h-12 text-white" />
                          </div>
                          <h3 className="text-xl font-semibold text-red-800">Custom Edition</h3>
                          <p className="text-red-600 text-sm mt-1">Special Design</p>
                        </div>
                      </div>
                    </Smartphone>
                  </div>

                  {/* Minimal */}
                  <div className="space-y-2">
                    <Label>Минимальный (без камеры)</Label>
                    <Smartphone 
                      deviceType="minimal"
                      networkType="4G"
                      signalStrength={4}
                      batteryLevel={95}
                      time="11:11"
                      frameColor="#000000"
                      screenBackground="#ffffff"
                    >
                      <div className="h-full p-6">
                        <div className="h-full flex flex-col items-center justify-center">
                          <Logo className="h-16 w-auto mb-6" />
                          <h3 className="text-2xl font-semibold mb-2">Минималистичный дизайн</h3>
                          <p className="text-gray-600 text-center">
                            Без динамического острова<br/>
                            Без отверстий для камеры<br/>
                            Чистый экран
                          </p>
                        </div>
                      </div>
                    </Smartphone>
                  </div>

                  {/* White Android */}
                  <div className="space-y-2">
                    <Label>Android (белая рамка)</Label>
                    <Smartphone 
                      deviceType="android"
                      networkType="5G"
                      signalStrength={4}
                      batteryLevel={88}
                      time="15:45"
                      frameColor="#ffffff"
                      screenBackground="#f8f9fa"
                      statusBarStyle="dark"
                    >
                      <div className="h-full p-6">
                        <Card className="h-full shadow-lg">
                          <CardContent className="h-full flex items-center justify-center p-6">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Smartphone className="w-8 h-8 text-white" />
                              </div>
                              <h3 className="text-lg font-semibold">Samsung Galaxy</h3>
                              <p className="text-gray-600 text-sm mt-1">One UI 6.0</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </Smartphone>
                  </div>

                  {/* Minimal Dark */}
                  <div className="space-y-2">
                    <Label>Минимальный (темный)</Label>
                    <Smartphone 
                      deviceType="minimal"
                      networkType="wifi"
                      batteryLevel={100}
                      time="00:00"
                      frameColor="#1a1a1a"
                      screenBackground="#000000"
                      statusBarStyle="light"
                    >
                      <div className="h-full bg-black text-white p-6 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 border-4 border-white/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <span className="text-6xl">🌙</span>
                          </div>
                          <h3 className="text-xl font-light tracking-wider">Night Mode</h3>
                          <p className="text-gray-500 text-sm mt-2">Pure Experience</p>
                        </div>
                      </div>
                    </Smartphone>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}