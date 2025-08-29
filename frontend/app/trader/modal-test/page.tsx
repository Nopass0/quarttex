"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NavigableDialog,
  NavigableDialogContent,
  NavigableDialogDescription,
  NavigableDialogFooter,
  NavigableDialogHeader,
  NavigableDialogTitle,
} from "@/components/ui/navigable-dialog"
import { useModalNavigation } from "@/hooks/use-modal-navigation"
import { ArrowRight, Settings, UserPlus, FileText } from "lucide-react"

function ModalTestContent() {
  const [formData, setFormData] = useState({ name: "", email: "" })
  
  // Different modals with their own URL state
  const settingsModal = useModalNavigation({
    modalName: "settings",
    onClose: () => console.log("Settings modal closed")
  })
  
  const profileModal = useModalNavigation({
    modalName: "profile",
    onClose: () => {
      // Reset form when closing
      setFormData({ name: "", email: "" })
    }
  })
  
  const documentModal = useModalNavigation({
    modalName: "document"
  })

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 dark:text-[#eeeeee]">
        Modal Navigation Test
      </h1>
      
      <Card className="p-6 mb-6 dark:bg-[#29382f] dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 dark:text-[#eeeeee]">
          Test Modal URL Navigation
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Click any button below to open a modal. Notice how the URL changes to include the modal parameter.
          You can use the browser back button or the modal's back button to close it.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => settingsModal.open()}
            className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
          >
            <Settings className="h-4 w-4 mr-2" />
            Open Settings Modal
          </Button>
          
          <Button 
            onClick={() => profileModal.open()}
            variant="outline"
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Open Profile Modal
          </Button>
          
          <Button 
            onClick={() => documentModal.open()}
            variant="secondary"
          >
            <FileText className="h-4 w-4 mr-2" />
            Open Document Modal
          </Button>
        </div>
      </Card>

      {/* Settings Modal */}
      <NavigableDialog open={settingsModal.isOpen} onOpenChange={settingsModal.setOpen}>
        <NavigableDialogContent className="dark:bg-[#29382f] dark:border-gray-700">
          <NavigableDialogHeader>
            <NavigableDialogTitle className="dark:text-[#eeeeee]">
              Settings
            </NavigableDialogTitle>
            <NavigableDialogDescription className="dark:text-gray-400">
              Adjust your preferences and configuration
            </NavigableDialogDescription>
          </NavigableDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="dark:text-[#eeeeee]">Enable notifications</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="dark:text-[#eeeeee]">Dark mode</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label className="dark:text-[#eeeeee]">Auto-save</Label>
              <Switch defaultChecked />
            </div>
          </div>
          
          <NavigableDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => settingsModal.close()}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log("Settings saved")
                settingsModal.close()
              }}
              className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
            >
              Save Settings
            </Button>
          </NavigableDialogFooter>
        </NavigableDialogContent>
      </NavigableDialog>

      {/* Profile Modal */}
      <NavigableDialog open={profileModal.isOpen} onOpenChange={profileModal.setOpen}>
        <NavigableDialogContent className="dark:bg-[#29382f] dark:border-gray-700">
          <NavigableDialogHeader>
            <NavigableDialogTitle className="dark:text-[#eeeeee]">
              Create Profile
            </NavigableDialogTitle>
            <NavigableDialogDescription className="dark:text-gray-400">
              Fill in your profile information
            </NavigableDialogDescription>
          </NavigableDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="dark:text-[#eeeeee]">Name</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee] dark:placeholder-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="email" className="dark:text-[#eeeeee]">Email</Label>
              <Input 
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee] dark:placeholder-gray-500"
              />
            </div>
          </div>
          
          <NavigableDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => profileModal.close()}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log("Profile created:", formData)
                profileModal.close()
              }}
              className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
            >
              Create Profile
            </Button>
          </NavigableDialogFooter>
        </NavigableDialogContent>
      </NavigableDialog>

      {/* Document Modal with nested navigation */}
      <NavigableDialog open={documentModal.isOpen} onOpenChange={documentModal.setOpen}>
        <NavigableDialogContent className="dark:bg-[#29382f] dark:border-gray-700">
          <NavigableDialogHeader>
            <NavigableDialogTitle className="dark:text-[#eeeeee]">
              Document Viewer
            </NavigableDialogTitle>
            <NavigableDialogDescription className="dark:text-gray-400">
              View and manage your documents
            </NavigableDialogDescription>
          </NavigableDialogHeader>
          
          <div className="space-y-4 py-4">
            <Card className="p-4 dark:bg-[#0f0f0f] dark:border-gray-700">
              <h3 className="font-semibold mb-2 dark:text-[#eeeeee]">Important Notice</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This modal demonstrates how the navigation system works. 
                Try using the browser back button or the modal's back arrow!
              </p>
            </Card>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
                onClick={() => console.log("Opening document 1")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Document 1.pdf
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
                onClick={() => console.log("Opening document 2")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Document 2.pdf
              </Button>
            </div>
          </div>
          
          <NavigableDialogFooter>
            <Button 
              onClick={() => documentModal.close()}
              className="w-full bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
            >
              Close
            </Button>
          </NavigableDialogFooter>
        </NavigableDialogContent>
      </NavigableDialog>

      {/* Instructions */}
      <Card className="p-6 dark:bg-[#29382f] dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3 dark:text-[#eeeeee]">
          How it works:
        </h3>
        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-[#006039] dark:text-[#2d6a42]" />
            <span>Opening a modal adds <code className="text-sm bg-gray-100 dark:bg-[#0f0f0f] px-1 rounded">?modal=modalName</code> to the URL</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-[#006039] dark:text-[#2d6a42]" />
            <span>You can use the browser back button to close the modal</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-[#006039] dark:text-[#2d6a42]" />
            <span>The modal's back button (← Назад) also navigates back</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-[#006039] dark:text-[#2d6a42]" />
            <span>Sharing a URL with modal parameter opens that modal directly</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-[#006039] dark:text-[#2d6a42]" />
            <span>Each modal maintains its own state in the URL history</span>
          </li>
        </ul>
      </Card>
    </div>
  )
}

export default function ModalTestPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <ModalTestContent />
      </AuthLayout>
    </ProtectedRoute>
  )
}