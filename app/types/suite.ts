import type { Timestamp } from 'firebase/firestore'

export type SuiteEventType =
  | 'task.created'
  | 'task.completed'
  | 'project.created'
  | 'project.completed'
  | 'timer.stopped'
  | 'note.created'

export interface ActivityEvent {
  id: string
  type: SuiteEventType
  source: 'pm' | 'hub'
  summary: string
  data: Record<string, unknown>
  createdAt: Timestamp
}

export interface SuiteNotification {
  id: string
  type: SuiteEventType
  source: 'pm' | 'hub'
  title: string
  body: string
  data: Record<string, unknown>
  read: boolean
  createdAt: Timestamp
}

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
