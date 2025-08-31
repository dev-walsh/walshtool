import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Save, Eye, EyeOff, Bell, Shield, User, Palette } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserSettings {
  profile: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    timezone: string;
    language: string;
    profilePicture: string;
  };
  preferences: {
    theme: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
    dashboardRefreshRate: number;
    defaultLeverage: number;
    riskPercentage: number;
  };
  notifications: {
    emailAlerts: boolean;
    telegramAlerts: boolean;
    pushNotifications: boolean;
    tradeExecutions: boolean;
    riskWarnings: boolean;
    systemAlerts: boolean;
    marketNews: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
    ipWhitelist: string[];
  };
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/user/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  const [formData, setFormData] = useState<UserSettings>(() => {
    // Initialize with localStorage values or defaults
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedCurrency = localStorage.getItem('currency') || 'USD';

    return settings || {
      profile: {
        username: user?.username || "",
        email: user?.email || "",
        firstName: "",
        lastName: "",
        timezone: "UTC",
        language: "en",
        profilePicture: "",
      },
      preferences: {
        theme: savedTheme,
        currency: savedCurrency,
        dateFormat: "YYYY-MM-DD",
        timeFormat: "24h",
        dashboardRefreshRate: 5,
        defaultLeverage: 100,
        riskPercentage: 2,
      },
      notifications: {
        emailAlerts: true,
        telegramAlerts: false,
        pushNotifications: true,
        tradeExecutions: true,
        riskWarnings: true,
        systemAlerts: true,
        marketNews: false,
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        loginAlerts: true,
        ipWhitelist: [],
      },
    };
  });

  // Update formData when settings are loaded from server
  useEffect(() => {
    if (settings) {
      const savedTheme = localStorage.getItem('theme') || settings.preferences.theme;
      const savedCurrency = localStorage.getItem('currency') || settings.preferences.currency;

      setFormData({
        ...settings,
        preferences: {
          ...settings.preferences,
          theme: savedTheme,
          currency: savedCurrency,
        }
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: UserSettings) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: typeof passwordForm) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        throw new Error("Failed to change password");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await fetch("/api/user/profile-picture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload profile picture");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been uploaded successfully.",
      });
      setFormData(prev => ({
        ...prev,
        profile: { ...prev.profile, profilePicture: data.url }
      }));
      setProfilePictureFile(null);
      setProfilePicturePreview("");
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile picture.",
        variant: "destructive",
      });
    },
  });

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Profile picture must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply theme changes immediately
  useEffect(() => {
    const root = window.document.documentElement;

    if (formData.preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (formData.preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Cleanup listener when component unmounts or theme changes
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Store theme preference
    localStorage.setItem('theme', formData.preferences.theme);
  }, [formData.preferences.theme]);

  // Apply currency changes - store for global use
  useEffect(() => {
    localStorage.setItem('currency', formData.preferences.currency);
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('currencyChanged', { 
      detail: { currency: formData.preferences.currency } 
    }));
  }, [formData.preferences.currency]);

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Settings" description="Manage your account settings and preferences" />

      <div className="container mx-auto p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={profilePicturePreview || formData.profile.profilePicture} 
                      alt="Profile picture" 
                    />
                    <AvatarFallback>
                      {formData.profile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="profilePicture">Profile Picture</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="profilePicture"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById("profilePicture")?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                      {profilePictureFile && (
                        <Button
                          onClick={() => uploadProfilePictureMutation.mutate(profilePictureFile)}
                          disabled={uploadProfilePictureMutation.isPending}
                        >
                          {uploadProfilePictureMutation.isPending ? "Uploading..." : "Upload"}
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Max 5MB, JPG/PNG only</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.profile.firstName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        profile: { ...prev.profile, firstName: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.profile.lastName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        profile: { ...prev.profile, lastName: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.profile.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, email: e.target.value }
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.profile.timezone}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        profile: { ...prev.profile, timezone: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Frankfurt">Frankfurt</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        <SelectItem value="Asia/Hong_Kong">Hong Kong</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={formData.profile.language}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        profile: { ...prev.profile, language: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={formData.preferences.theme}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, theme: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select
                      value={formData.preferences.currency}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, currency: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select
                      value={formData.preferences.dateFormat}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, dateFormat: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeFormat">Time Format</Label>
                    <Select
                      value={formData.preferences.timeFormat}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, timeFormat: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 Hour</SelectItem>
                        <SelectItem value="12h">12 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refreshRate">Dashboard Refresh Rate (seconds)</Label>
                  <Select
                    value={formData.preferences.dashboardRefreshRate.toString()}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, dashboardRefreshRate: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 second</SelectItem>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultLeverage">Default Leverage (1:{formData.preferences.defaultLeverage})</Label>
                  <Input
                    id="defaultLeverage"
                    type="range"
                    min="1"
                    max="500"
                    value={formData.preferences.defaultLeverage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, defaultLeverage: parseInt(e.target.value) }
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1:1</span>
                    <span>1:500</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskPercentage">Default Risk Per Trade ({formData.preferences.riskPercentage}%)</Label>
                  <Input
                    id="riskPercentage"
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={formData.preferences.riskPercentage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, riskPercentage: parseFloat(e.target.value) }
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0.1%</span>
                    <span>10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Alerts</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={formData.notifications.emailAlerts}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, emailAlerts: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Telegram Alerts</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via Telegram bot</p>
                    </div>
                    <Switch
                      checked={formData.notifications.telegramAlerts}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, telegramAlerts: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch
                      checked={formData.notifications.pushNotifications}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, pushNotifications: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Trade Executions</Label>
                      <p className="text-sm text-muted-foreground">Notifications for order fills and trade completions</p>
                    </div>
                    <Switch
                      checked={formData.notifications.tradeExecutions}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, tradeExecutions: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Risk Warnings</Label>
                      <p className="text-sm text-muted-foreground">Alerts for risk limit breaches and drawdown warnings</p>
                    </div>
                    <Switch
                      checked={formData.notifications.riskWarnings}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, riskWarnings: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>System Alerts</Label>
                      <p className="text-sm text-muted-foreground">System status and maintenance notifications</p>
                    </div>
                    <Switch
                      checked={formData.notifications.systemAlerts}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, systemAlerts: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Market News</Label>
                      <p className="text-sm text-muted-foreground">Updates on market events and news</p>
                    </div>
                    <Switch
                      checked={formData.notifications.marketNews}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, marketNews: checked }
                      }))}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Notification Testing</h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/notifications/test", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
                              },
                              body: JSON.stringify({
                                type: "alerts",
                                message: "Test notification from settings page"
                              })
                            });

                            if (response.ok) {
                              alert("Test notification sent! Check your Telegram if connected.");
                            } else {
                              alert("Failed to send test notification");
                            }
                          } catch (error) {
                            console.error("Failed to send test notification:", error);
                            alert("Failed to send test notification");
                          }
                        }}
                      >
                        Send Test Notification
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    checked={formData.security.twoFactorEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      security: { ...prev.security, twoFactorEnabled: checked }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Select
                    value={formData.security.sessionTimeout.toString()}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Login Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
                  </div>
                  <Switch
                    checked={formData.security.loginAlerts}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      security: { ...prev.security, loginAlerts: checked }
                    }))}
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    For enhanced security, consider enabling two-factor authentication and regularly updating your password.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            className="px-8"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}