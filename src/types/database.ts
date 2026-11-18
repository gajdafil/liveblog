export type UserRole = 'admin' | 'journalist';
export type BroadcastStatus = 'upcoming' | 'live' | 'paused' | 'ended';
export type PostStatus = 'draft' | 'published' | 'unpublished';
export type PostPriority = 'normal' | 'important' | 'breaking';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BroadcastDisplaySettings {
  show_authors: boolean;
  show_timestamps: boolean;
  timezone: string;
}

export interface Broadcast {
  id: string;
  slug: string;
  title: string;
  description: string;
  intro_text: string;
  scheduled_at: string | null;
  status: BroadcastStatus;
  is_archived: boolean;
  is_restricted: boolean;
  display_settings: BroadcastDisplaySettings;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  broadcast_id: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  caption: string | null;
  sort_order: number;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Post {
  id: string;
  broadcast_id: string;
  author_id: string;
  updated_by: string | null;
  title: string | null;
  content_html: string;
  priority: PostPriority;
  status: PostStatus;
  is_pinned: boolean;
  external_url: string | null;
  external_url_title: string | null;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PostWithDetails extends Post {
  author?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  media: PostMedia[];
}

export interface PostRevision {
  id: string;
  post_id: string;
  broadcast_id: string;
  changed_by: string | null;
  action: 'INSERT' | 'UPDATE' | 'SOFT_DELETE';
  version: number;
  snapshot: Record<string, unknown>;
  created_at: string;
  editor?: Pick<Profile, 'full_name' | 'email'> | null;
}
