import { useEffect, useRef, useState, type CSSProperties } from 'react'
import QrScanner from 'qr-scanner'

import { Button, Modal } from '../ui'
import { colors, radius } from '../../theme/tokens'

export interface QrCameraScannerProps {
  open: boolean
  onClose: () => void
  onResult: (value: string) => void
}

function cameraErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/permission|notallowed|denied/i.test(message)) {
    return 'Bạn chưa cấp quyền sử dụng camera cho trình duyệt.'
  }
  if (/notfound|no camera/i.test(message)) {
    return 'Không tìm thấy camera trên thiết bị.'
  }
  if (/notreadable|trackstart|in use/i.test(message)) {
    return 'Camera đang được ứng dụng khác sử dụng.'
  }
  return message || 'Không thể mở camera.'
}

export function QrCameraScanner({ open, onClose, onResult }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const resultHandlerRef = useRef(onResult)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    resultHandlerRef.current = onResult
  }, [onResult])

  useEffect(() => {
    if (!open || !videoRef.current) return

    let active = true
    let handled = false
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (!active || handled) return
        const value = result.data.trim()
        if (!value) return

        handled = true
        scanner.stop()
        resultHandlerRef.current(value)
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 10
      }
    )

    const startCamera = async () => {
      try {
        setError(null)
        if (!(await QrScanner.hasCamera())) throw new Error('No camera found')
        await scanner.start()
      } catch (cameraError) {
        if (active) setError(cameraErrorMessage(cameraError))
      }
    }

    void startCamera()

    return () => {
      active = false
      scanner.stop()
      scanner.destroy()
    }
  }, [open])

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title='Quét QR voucher'
      size='md'
      footer={
        <Button type='button' variant='secondary' onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div style={contentStyle}>
        <video ref={videoRef} muted playsInline autoPlay style={videoStyle} aria-label='Camera quét mã QR voucher' />
        <p style={helpStyle}>Đưa mã QR vào giữa khung hình để hệ thống tự nhận diện.</p>
        {error && (
          <div role='alert' style={errorStyle} data-testid='qr-camera-error'>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

const contentStyle: CSSProperties = { display: 'grid', gap: 12 }
const videoStyle: CSSProperties = {
  width: '100%',
  minHeight: 300,
  maxHeight: '60vh',
  objectFit: 'cover',
  borderRadius: radius.lg,
  background: colors.ink
}
const helpStyle: CSSProperties = { margin: 0, color: colors.slate, lineHeight: 1.6 }
const errorStyle: CSSProperties = {
  padding: 12,
  borderRadius: radius.md,
  color: colors.danger,
  background: colors.dangerSurface
}
