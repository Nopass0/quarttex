'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Save, Edit2, Check, X } from 'lucide-react'
import { adminApi } from '@/services/api'
import { toast } from 'sonner'

interface WellbitSettings {
  apiKeyPublic: string | null
  apiKeyPrivate: string | null
  wellbitCallbackUrl: string | null
}

interface BankMapping {
  id: number
  wellbitBankCode: string
  wellbitBankName: string
  ourBankName: string
  createdAt: Date
  updatedAt: Date
}

interface BankMappingsResponse {
  mappings: BankMapping[]
  availableBankTypes: string[]
}

export default function WellbitKeysPage() {
  const [settings, setSettings] = useState<WellbitSettings | null>(null)
  const [bankMappings, setBankMappings] = useState<BankMappingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [editingMappings, setEditingMappings] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})

  // Form state for settings
  const [formData, setFormData] = useState<WellbitSettings>({
    apiKeyPublic: '',
    apiKeyPrivate: '',
    wellbitCallbackUrl: ''
  })

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const [settingsData, mappingsData] = await Promise.all([
        adminApi.getWellbitSettings(),
        adminApi.getWellbitBankMappings()
      ])
      
      setSettings(settingsData)
      setFormData({
        apiKeyPublic: settingsData.apiKeyPublic || '',
        apiKeyPrivate: settingsData.apiKeyPrivate || '',
        wellbitCallbackUrl: settingsData.wellbitCallbackUrl || ''
      })
      setBankMappings(mappingsData)
    } catch (error) {
      toast.error('Не удалось загрузить настройки')
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const regenerateKeys = async () => {
    setRegenerating(true)
    try {
      const data = await adminApi.regenerateWellbitKeys()
      setSettings(prev => ({
        ...prev!,
        apiKeyPublic: data.apiKeyPublic,
        apiKeyPrivate: data.apiKeyPrivate
      }))
      setFormData(prev => ({
        ...prev,
        apiKeyPublic: data.apiKeyPublic,
        apiKeyPrivate: data.apiKeyPrivate
      }))
      toast.success('Ключи успешно обновлены')
    } catch (error) {
      toast.error('Не удалось обновить ключи')
      console.error('Error regenerating keys:', error)
    } finally {
      setRegenerating(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const updatedSettings = await adminApi.updateWellbitSettings({
        apiKeyPublic: formData.apiKeyPublic || undefined,
        apiKeyPrivate: formData.apiKeyPrivate || undefined,
        wellbitCallbackUrl: formData.wellbitCallbackUrl || undefined
      })
      
      setSettings(updatedSettings)
      toast.success('Настройки успешно сохранены')
    } catch (error) {
      toast.error('Не удалось сохранить настройки')
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const startEditingMapping = (bankCode: string, currentValue: string) => {
    setEditMode(prev => ({ ...prev, [bankCode]: true }))
    setEditingMappings(prev => ({ ...prev, [bankCode]: currentValue }))
  }

  const cancelEditingMapping = (bankCode: string) => {
    setEditMode(prev => ({ ...prev, [bankCode]: false }))
    setEditingMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[bankCode]
      return newMappings
    })
  }

  const saveMapping = async (bankCode: string) => {
    try {
      await adminApi.updateWellbitBankMapping(bankCode, {
        ourBankName: editingMappings[bankCode]
      })
      
      // Update local state
      setBankMappings(prev => ({
        ...prev!,
        mappings: prev!.mappings.map(m => 
          m.wellbitBankCode === bankCode 
            ? { ...m, ourBankName: editingMappings[bankCode] }
            : m
        )
      }))
      
      setEditMode(prev => ({ ...prev, [bankCode]: false }))
      setEditingMappings(prev => {
        const newMappings = { ...prev }
        delete newMappings[bankCode]
        return newMappings
      })
      
      toast.success('Маппинг успешно обновлен')
    } catch (error) {
      toast.error('Не удалось обновить маппинг')
      console.error('Error updating mapping:', error)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex items-center justify-center min-h-[200px]">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-gray-900">Настройки Wellbit</h1>
          
          {/* API Keys and Callback URL */}
          <Card>
            <CardHeader>
              <CardTitle>API настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apiKeyPublic">Публичный ключ</Label>
                <Input
                  id="apiKeyPublic"
                  value={formData.apiKeyPublic || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKeyPublic: e.target.value }))}
                  placeholder="Введите публичный ключ"
                  className="font-mono text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="apiKeyPrivate">Приватный ключ</Label>
                <Input
                  id="apiKeyPrivate"
                  value={formData.apiKeyPrivate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKeyPrivate: e.target.value }))}
                  placeholder="Введите приватный ключ"
                  type="password"
                  className="font-mono text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="callbackUrl">Callback URL</Label>
                <Input
                  id="callbackUrl"
                  value={formData.wellbitCallbackUrl || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, wellbitCallbackUrl: e.target.value }))}
                  placeholder="https://example.com/callback"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Сохранить настройки
                </Button>
                
                <Button onClick={regenerateKeys} disabled={regenerating} variant="outline">
                  {regenerating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                  Перегенерировать ключи
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Bank Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>Маппинг банков</CardTitle>
            </CardHeader>
            <CardContent>
              {bankMappings && bankMappings.mappings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Код Wellbit</TableHead>
                        <TableHead>Банк Wellbit</TableHead>
                        <TableHead className="w-[250px]">Наш банк</TableHead>
                        <TableHead className="w-[100px]">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankMappings.mappings.map((mapping) => (
                        <TableRow key={mapping.wellbitBankCode}>
                          <TableCell className="font-mono text-sm">
                            {mapping.wellbitBankCode}
                          </TableCell>
                          <TableCell>{mapping.wellbitBankName}</TableCell>
                          <TableCell>
                            {editMode[mapping.wellbitBankCode] ? (
                              <Select
                                value={editingMappings[mapping.wellbitBankCode]}
                                onValueChange={(value) => 
                                  setEditingMappings(prev => ({
                                    ...prev,
                                    [mapping.wellbitBankCode]: value
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {bankMappings.availableBankTypes.map((bank) => (
                                    <SelectItem key={bank} value={bank}>
                                      {bank}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="font-medium">{mapping.ourBankName || '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editMode[mapping.wellbitBankCode] ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => saveMapping(mapping.wellbitBankCode)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelEditingMapping(mapping.wellbitBankCode)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => 
                                  startEditingMapping(mapping.wellbitBankCode, mapping.ourBankName)
                                }
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Нет доступных маппингов банков
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}
