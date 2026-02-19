// apps/editor/src/hooks/use-face-upload.ts
import { useState, useRef, useCallback, useEffect } from 'react'
import { useToast } from '@bloctop/ui/components/toast'

export function useFaceUpload() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [clearTopoOnUpload, setClearTopoOnUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const { showToast } = useToast()

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error')
      return
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setUploadedFile(file)
    setPreviewUrl(url)
  }, [showToast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clearFile = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setUploadedFile(null)
    setPreviewUrl(null)
  }, [])

  const doUpload = useCallback(async (params: {
    cragId: string
    faceId: string
    area: string
    onSuccess: (url: string) => void
  }) => {
    if (!uploadedFile) return
    const { cragId, faceId, area, onSuccess } = params

    setIsUploading(true)
    try {
      let fileToUpload: File = uploadedFile
      if (fileToUpload.size > 5 * 1024 * 1024) {
        setCompressionProgress(0)
        const { default: imageCompression } = await import('browser-image-compression')
        fileToUpload = await imageCompression(fileToUpload, {
          maxSizeMB: 4,
          maxWidthOrHeight: 4096,
          useWebWorker: true,
          onProgress: (p: number) => setCompressionProgress(Math.round(p)),
        })
      }
      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('cragId', cragId)
      formData.append('faceId', faceId)
      formData.append('area', area)
      if (clearTopoOnUpload) formData.append('clearTopoLines', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')

      onSuccess(data.url)
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      setUploadedFile(null)
      setPreviewUrl(null)
      setClearTopoOnUpload(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : '上传失败'
      showToast(msg, 'error', 4000)
    } finally {
      setIsUploading(false)
      setCompressionProgress(null)
    }
  }, [uploadedFile, clearTopoOnUpload, showToast])

  const checkAndUpload = useCallback(async (params: {
    cragId: string
    faceId: string
    area: string
    onDirectUpload: () => void
  }) => {
    const { cragId, faceId, area, onDirectUpload } = params
    try {
      const checkFormData = new FormData()
      checkFormData.append('cragId', cragId)
      checkFormData.append('faceId', faceId)
      if (area) checkFormData.append('area', area)
      checkFormData.append('checkOnly', 'true')

      const checkRes = await fetch('/api/upload', { method: 'POST', body: checkFormData })
      const checkData = await checkRes.json()
      if (checkData.exists) {
        setShowOverwriteConfirm(true)
        return
      }
    } catch {
      // 检查失败时直接上传
    }
    onDirectUpload()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  return {
    uploadedFile,
    previewUrl,
    isDragging,
    isUploading,
    compressionProgress,
    showOverwriteConfirm,
    setShowOverwriteConfirm,
    clearTopoOnUpload,
    setClearTopoOnUpload,
    fileInputRef,
    handleFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    clearFile,
    doUpload,
    checkAndUpload,
  }
}
