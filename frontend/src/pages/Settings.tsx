import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Bell, Lock, CreditCard, HelpCircle } from "lucide-react";

export default function Settings() {
  return (
    <AppLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Application Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingsSection 
            title="Profile" 
            description="Manage your personal information"
            icon={<User className="h-4 w-4" />}
            sections={[
              { name: "Personal Details", action: "Edit Profile" },
              { name: "Profile Picture", action: "Change Photo" }
            ]}
          />
          
          <SettingsSection 
            title="Notifications" 
            description="Control your notification preferences"
            icon={<Bell className="h-4 w-4" />}
            sections={[
              { name: "Email Notifications", action: "Manage" },
              { name: "Push Notifications", action: "Configure" }
            ]}
          />
          
          <SettingsSection 
            title="Security" 
            description="Protect your account"
            icon={<Lock className="h-4 w-4" />}
            sections={[
              { name: "Change Password", action: "Update" },
              { name: "Two-Factor Authentication", action: "Enable/Disable" }
            ]}
          />
          
          <SettingsSection 
            title="Billing" 
            description="Manage payment methods and subscription"
            icon={<CreditCard className="h-4 w-4" />}
            sections={[
              { name: "Payment Methods", action: "Manage" },
              { name: "Subscription Plan", action: "View Details" }
            ]}
          />
        </div>
        
        <div className="mt-8 flex items-center justify-center">
          <Card className="w-full max-w-xl card-gradient">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>We're here to assist you with any questions</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <HelpCircle className="h-6 w-6 text-primary" />
                <span>Contact Support</span>
              </div>
              <Button variant="outline">Get Help</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function SettingsSection({ 
  title, 
  description, 
  icon, 
  sections 
}: { 
  title: string, 
  description: string, 
  icon: React.ReactNode, 
  sections: { name: string, action: string }[] 
}) {
  return (
    <Card className="card-gradient">
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {sections.map((section, index) => (
          <div 
            key={section.name} 
            className={`flex justify-between items-center py-4 ${index < sections.length - 1 ? 'border-b' : ''}`}
          >
            <span>{section.name}</span>
            <Button size="sm" variant="outline">{section.action}</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
