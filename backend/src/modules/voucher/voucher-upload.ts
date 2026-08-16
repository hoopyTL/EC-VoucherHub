import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { RequestHandler } from 'express'
import multer from 'multer'

import { AppError } from '~/utils/app-error'

export const voucherUploadDirectory = path.resolve(process.cwd(), 'uploads', 'vouchers')
const MAX_PARTNER_STORAGE_BYTES = 100 * 1024 * 1024
fs.mkdirSync(voucherUploadDirectory, { recursive: true })

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const prefix = `${req.user?.partnerId}-`
      const usedBytes = fs
        .readdirSync(voucherUploadDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.startsWith(prefix))
        .reduce((total, entry) => total + fs.statSync(path.join(voucherUploadDirectory, entry.name)).size, 0)
      if (usedBytes >= MAX_PARTNER_STORAGE_BYTES) {
        return callback(AppError.unprocessable('Đã đạt giới hạn lưu trữ ảnh voucher'), voucherUploadDirectory)
      }
      callback(null, voucherUploadDirectory)
    },
    filename: (req, file, callback) =>
      callback(null, `${req.user?.partnerId}-${randomUUID()}${extensions[file.mimetype] ?? ''}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) return callback(AppError.validation('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP'))
    callback(null, true)
  }
}).single('image')

export const voucherImageUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError)
      return next(AppError.validation('Ảnh voucher không hợp lệ hoặc vượt quá 2 MB'))
    next(error)
  })
}

export function hasValidImageSignature(file: Express.Multer.File): boolean {
  const bytes = fs.readFileSync(file.path)
  if (file.mimetype === 'image/jpeg') {
    return (
      bytes.length >= 4 &&
      bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) &&
      bytes.subarray(-2).equals(Buffer.from('ffd9', 'hex'))
    )
  }
  if (file.mimetype === 'image/png') {
    return (
      bytes.length >= 20 &&
      bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
      bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))
    )
  }
  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === 'WEBP' &&
    bytes.readUInt32LE(4) + 8 === bytes.length
  )
}

export function removeUploadedFile(file: Express.Multer.File): void {
  fs.rmSync(file.path, { force: true })
}

export function enforcePartnerStorageQuota(file: Express.Multer.File, partnerId: string): void {
  const prefix = `${partnerId}-`
  const usedBytes = fs
    .readdirSync(voucherUploadDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(prefix))
    .reduce((total, entry) => total + fs.statSync(path.join(voucherUploadDirectory, entry.name)).size, 0)
  if (usedBytes <= MAX_PARTNER_STORAGE_BYTES) return

  removeUploadedFile(file)
  throw AppError.unprocessable('Ảnh vượt quá giới hạn lưu trữ 100 MB của đối tác')
}
