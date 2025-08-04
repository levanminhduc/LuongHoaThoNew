"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  CheckCircle, 
  PenTool, 
  Shield,
  Clock,
  User,
  Calendar,
  FileText
} from "lucide-react"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: "default" | "destructive" | "warning"
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false
}: ConfirmationDialogProps) {
  const getVariantConfig = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          confirmButtonVariant: "destructive" as const,
          iconBg: "bg-red-100"
        }
      case "warning":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          confirmButtonVariant: "default" as const,
          iconBg: "bg-yellow-100"
        }
      default:
        return {
          icon: <CheckCircle className="h-5 w-5 text-blue-600" />,
          confirmButtonVariant: "default" as const,
          iconBg: "bg-blue-100"
        }
    }
  }

  const config = getVariantConfig()

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.iconBg}`}>
              {config.icon}
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SignatureConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signatureData: {
    month: string
    signatureType: 'giam_doc' | 'ke_toan' | 'nguoi_lap_bieu'
    signerName: string
    signerRole: string
    department: string
  }
  onConfirm: (notes?: string) => void
  loading?: boolean
}

const SIGNATURE_TYPE_LABELS = {
  giam_doc: 'Giám Đốc',
  ke_toan: 'Kế Toán',
  nguoi_lap_bieu: 'Người Lập Biểu'
}

export function SignatureConfirmationDialog({
  open,
  onOpenChange,
  signatureData,
  onConfirm,
  loading = false
}: SignatureConfirmationDialogProps) {
  const [notes, setNotes] = useState("")
  const [agreed, setAgreed] = useState(false)

  const handleConfirm = () => {
    if (agreed) {
      onConfirm(notes.trim() || undefined)
    }
  }

  const handleCancel = () => {
    setNotes("")
    setAgreed(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <PenTool className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle>Xác nhận ký {SIGNATURE_TYPE_LABELS[signatureData.signatureType]}</DialogTitle>
          </div>
          <DialogDescription>
            Vui lòng xác nhận thông tin trước khi ký xác nhận lương tháng.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">Tháng lương:</span>
              </div>
              <Badge variant="outline">{signatureData.month}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">Loại ký:</span>
              </div>
              <Badge>{SIGNATURE_TYPE_LABELS[signatureData.signatureType]}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">Người ký:</span>
              </div>
              <p className="text-sm">{signatureData.signerName}</p>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm font-medium">Phòng ban:</span>
              <p className="text-sm">{signatureData.department}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature-notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ghi chú (tùy chọn)
            </Label>
            <Textarea
              id="signature-notes"
              placeholder="Nhập ghi chú cho việc ký xác nhận..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500">
              {notes.length}/500 ký tự
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <p className="font-medium">Cam kết trước khi ký:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Tôi đã kiểm tra và xác nhận tính chính xác của dữ liệu lương tháng {signatureData.month}</li>
                  <li>Tôi hiểu rằng chữ ký này có giá trị pháp lý và không thể hoàn tác</li>
                  <li>Tôi có đầy đủ thẩm quyền để thực hiện việc ký xác nhận này</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="agreement"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="agreement" className="text-sm">
              Tôi đồng ý với các cam kết trên và xác nhận thực hiện ký
            </Label>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!agreed || loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Đang ký...
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-2" />
                Ký Xác Nhận
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface LogoutConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  userName?: string
}

export function LogoutConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  userName
}: LogoutConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Xác nhận đăng xuất"
      description={
        userName 
          ? `Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ${userName}?`
          : "Bạn có chắc chắn muốn đăng xuất?"
      }
      confirmLabel="Đăng xuất"
      cancelLabel="Hủy"
      onConfirm={onConfirm}
      variant="warning"
    />
  )
}

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName: string
  itemType?: string
  loading?: boolean
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType = "mục",
  loading = false
}: DeleteConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const expectedText = "XÁC NHẬN XÓA"

  const handleConfirm = () => {
    if (confirmText === expectedText) {
      onConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-red-800">Xác nhận xóa</DialogTitle>
          </div>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa {itemType} <strong>{itemName}</strong>? 
            Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Cảnh báo:</strong> Dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Nhập <strong>{expectedText}</strong> để xác nhận:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedText}
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== expectedText || loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
