import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showSuccessToast = (message: string, options?: ToastOptions) => {
  return toast.success(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    icon: <CheckCircle className="h-5 w-5" />,
    action: options?.action,
  });
};

export const showErrorToast = (message: string, options?: ToastOptions) => {
  return toast.error(message, {
    description: options?.description,
    duration: options?.duration || 5000,
    icon: <XCircle className="h-5 w-5" />,
    action: options?.action,
  });
};

export const showWarningToast = (message: string, options?: ToastOptions) => {
  return toast.warning(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    icon: <AlertTriangle className="h-5 w-5" />,
    action: options?.action,
  });
};

export const showInfoToast = (message: string, options?: ToastOptions) => {
  return toast.info(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    icon: <Info className="h-5 w-5" />,
    action: options?.action,
  });
};

export const showLoadingToast = (
  message: string,
  options?: Omit<ToastOptions, "action">,
) => {
  return toast.loading(message, {
    description: options?.description,
    duration: options?.duration || Infinity,
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
  });
};

export const showPromiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  },
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};

export const showImportSuccessToast = (
  successCount: number,
  totalRecords: number,
  options?: { onViewDetails?: () => void },
) => {
  return showSuccessToast(
    `Import thành công ${successCount}/${totalRecords} bản ghi`,
    {
      description: `Hoàn tất xử lý dữ liệu lương`,
      action: options?.onViewDetails
        ? {
            label: "Xem chi tiết",
            onClick: options.onViewDetails,
          }
        : undefined,
    },
  );
};

export const showImportErrorToast = (
  errorCount: number,
  totalRecords: number,
  options?: { onViewErrors?: () => void },
) => {
  return showErrorToast(
    `Import thất bại ${errorCount}/${totalRecords} bản ghi`,
    {
      description: `Có lỗi xảy ra trong quá trình xử lý`,
      action: options?.onViewErrors
        ? {
            label: "Xem lỗi",
            onClick: options.onViewErrors,
          }
        : undefined,
    },
  );
};

export const showSignatureSuccessToast = (employeeName?: string) => {
  return showSuccessToast("Ký nhận lương thành công", {
    description: employeeName
      ? `${employeeName} đã ký nhận lương`
      : "Chữ ký đã được lưu vào hệ thống",
  });
};

export const showBulkSignatureSuccessToast = (
  signedCount: number,
  totalCount: number,
  options?: { onViewDetails?: () => void },
) => {
  return showSuccessToast(
    `Ký hàng loạt thành công ${signedCount}/${totalCount} nhân viên`,
    {
      description: `Đã hoàn tất ký nhận lương`,
      action: options?.onViewDetails
        ? {
            label: "Xem chi tiết",
            onClick: options.onViewDetails,
          }
        : undefined,
    },
  );
};

export const showDeleteSuccessToast = (
  itemName: string,
  itemType: string = "mục",
) => {
  return showSuccessToast(`Xóa ${itemType} thành công`, {
    description: `${itemName} đã được xóa khỏi hệ thống`,
  });
};

export const showUpdateSuccessToast = (itemName: string) => {
  return showSuccessToast("Cập nhật thành công", {
    description: `${itemName} đã được cập nhật`,
  });
};

export const showNetworkErrorToast = () => {
  return showErrorToast("Lỗi kết nối", {
    description:
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
  });
};

export const showAuthErrorToast = () => {
  return showErrorToast("Phiên đăng nhập hết hạn", {
    description: "Vui lòng đăng nhập lại để tiếp tục",
  });
};
