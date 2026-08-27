import { join } from 'node:path'

export const FILE_PATHS = {
  ALLOWED_CHATS: join(process.cwd(), 'allowed_chats.json'),
  DATA_DIR: join(process.cwd(), 'data'),
} as const

export type FilePath = (typeof FILE_PATHS)[keyof typeof FILE_PATHS]
