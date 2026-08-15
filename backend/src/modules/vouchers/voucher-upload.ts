import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'vouchers')
fs.mkdirSync(uploadDirectory, { recursive: true })

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

export const voucherImageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] ?? ''}`)
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) {
      callback(new Error('Only JPEG, PNG and WebP images are allowed'))
      return
    }
    callback(null, true)
  }
})
