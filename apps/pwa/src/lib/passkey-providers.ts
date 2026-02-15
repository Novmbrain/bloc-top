/**
 * AAGUID → Passkey 提供商映射表
 * 数据来源: https://github.com/passkeydeveloper/passkey-authenticator-aaguids
 */

interface PasskeyProvider {
  name: string
  icon: string
}

const PASSKEY_PROVIDERS: Record<string, PasskeyProvider> = {
  // Apple
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': { name: 'Apple Passwords', icon: '🍎' },
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': { name: 'iCloud Keychain', icon: '🍎' },

  // Google
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': { name: 'Google Password Manager', icon: '🤖' },

  // Windows
  '08987058-cadc-4b81-b6e1-30de50dcbe96': { name: 'Windows Hello', icon: '🪟' },
  '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': { name: 'Windows Hello', icon: '🪟' },
  '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': { name: 'Windows Hello', icon: '🪟' },

  // Browser-based
  'adce0002-35bc-c60a-648b-0b25f1f05503': { name: 'Chrome on Mac', icon: '🌐' },
  '771b48fd-d3d4-4f74-9232-fc157ab0507a': { name: 'Edge on Mac', icon: '🌐' },
  'b5397666-4885-aa6b-cebf-e52262a439a2': { name: 'Chromium Browser', icon: '🌐' },

  // Samsung
  '53414d53-554e-4700-0000-000000000000': { name: 'Samsung Pass', icon: '📱' },

  // Password managers
  'bada5566-a7aa-401f-bd96-45619a55120d': { name: '1Password', icon: '🔐' },
  'd548826e-79b4-db40-a3d8-11116f7e8349': { name: 'Bitwarden', icon: '🔐' },
  '531126d6-e717-415c-9320-3d9aa6981239': { name: 'Dashlane', icon: '🔐' },
  'b84e4048-15dc-4dd0-8640-f4f60813c8af': { name: 'NordPass', icon: '🔐' },
  '0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6': { name: 'Keeper', icon: '🔐' },
  'f3809540-7f14-49c1-a8b3-8f813b225541': { name: 'Enpass', icon: '🔐' },
}

const ZERO_AAGUID = '00000000-0000-0000-0000-000000000000'

export function getPasskeyProvider(aaguid?: string | null): PasskeyProvider {
  if (!aaguid || aaguid === ZERO_AAGUID) {
    return { name: 'Passkey', icon: '🔑' }
  }

  const provider = PASSKEY_PROVIDERS[aaguid]
  if (provider) return provider

  return { name: aaguid.slice(0, 8), icon: '🔑' }
}
