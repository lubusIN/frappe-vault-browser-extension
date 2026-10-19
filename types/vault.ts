export type SecretType =
  'Password' | 'API Key' | 'Note' | 'SSH Key' | 'Media' | 'Credit Card' | 'Database' | 'Other';

export interface VaultSecretSummary {
  name: string;
  title: string;
  secret_type: SecretType;
  folder?: string | null;
  folder_name?: string | null;
  folder_icon?: string | null;
  url?: string | null;
  username?: string | null;
  email?: string | null;
  is_bookmark?: number;
  password_strength?: string | null;
  last_accessed?: string | null;
  access_count?: number;
  modified?: string;
  has_password?: boolean;
  has_totp?: boolean;
  user_permission?: string;
}

export interface DecryptedData {
  password?: string;
  totp_secret?: string;
  api_secret?: string;
  ssh_private_key?: string;
  card_number?: string;
  card_cvv?: string;
  db_password?: string;
  [key: string]: any;
}

export interface VaultSecretDetail extends VaultSecretSummary {
  notes?: string | null;
  api_key?: string | null;
  card_holder?: string | null;
  card_expiry?: string | null;
  db_host?: string | null;
  db_port?: number | null;
  db_name?: string | null;
  ssh_private_key?: string | null;
  owner?: string;
  shared_by?: string | null;
  decrypted?: DecryptedData;
  expires_on?: string | null;
  has_api_secret?: boolean;
  has_card_number?: boolean;
  has_card_cvv?: boolean;
  has_db_password?: boolean;
}

export interface TotpResult {
  code: string | null;
  remaining_seconds: number;
  qr_svg?: string | null;
  error?: string | null;
}

export interface AuthInfo {
  instanceUrl: string;
  authType: 'password' | 'token';
  user: string;
  fullName?: string;
  apiKey?: string;
  apiSecret?: string;
  isConnected: boolean;
}

export interface ActiveTabInfo {
  url: string;
  title: string;
  domain: string;
  favIconUrl?: string;
}

export interface VaultFolder {
  name: string;
  folder_name: string;
  icon?: string;
  parent_folder?: string | null;
}
