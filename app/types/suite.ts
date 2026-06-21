export interface SuiteApp {
  id: string
  name: string
  description: string
  url: string
  icon: string
  color: string
  enabled: boolean
  order: number
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  neutralColor: string
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  username: string
  birthday: string
  isAdmin: boolean
  isDisabled?: boolean
  createdAt?: any
  updatedAt?: any
}
