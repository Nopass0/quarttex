'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { useAgentAuth } from '@/stores/agent-auth'
import { toast } from 'sonner'
import { Mail, Lock } from 'lucide-react'

export default function AgentLoginPage() {
  const router = useRouter()
  const { login } = useAgentAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast.error('Заполните все поля')
      return
    }

    setIsLoading(true)
    
    try {
      await login(formData.email, formData.password)
      toast.success('Успешный вход')
      router.push('/agent')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f0f] px-4">
      <Card className="w-full max-w-md bg-white dark:bg-[#29382f] border-gray-200 dark:border-[#29382f]">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <div>
            <CardTitle className="text-2xl text-center text-gray-900 dark:text-[#eeeeee]">Вход для агентов</CardTitle>
            <CardDescription className="text-center mt-2 text-gray-600 dark:text-gray-400">
              Введите ваш email и пароль для входа в личный кабинет
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#006039] hover:bg-[#004d2e] dark:bg-[#2d6a42] dark:hover:bg-[#236035]"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}