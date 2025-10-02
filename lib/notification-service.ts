import { toast } from "sonner";

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class NotificationService {
  static success(message: string, options?: NotificationOptions) {
    return toast.success(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  }

  static error(message: string, options?: NotificationOptions) {
    return toast.error(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 6000,
      action: options?.action,
    });
  }

  static warning(message: string, options?: NotificationOptions) {
    return toast.warning(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action,
    });
  }

  static info(message: string, options?: NotificationOptions) {
    return toast.info(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  }

  static loading(message: string, options?: NotificationOptions) {
    return toast.loading(options?.title || message, {
      description: options?.description,
    });
  }

  static dismiss(toastId?: string | number) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  static signatureSuccess(signatureType: string, signerName: string) {
    const typeLabels = {
      giam_doc: "Giám Đốc",
      ke_toan: "Kế Toán",
      nguoi_lap_bieu: "Người Lập Biểu",
    };

    return this.success("Ký xác nhận thành công!", {
      description: `${typeLabels[signatureType as keyof typeof typeLabels]} ${signerName} đã ký xác nhận`,
    });
  }

  static employeeProgressUpdate(newCount: number, totalCount: number) {
    return this.info("Cập nhật tiến độ", {
      description: `${newCount}/${totalCount} nhân viên đã ký lương`,
    });
  }

  static completionAchieved() {
    return this.success("🎉 Hoàn thành 100%!", {
      description:
        "Tất cả nhân viên đã ký lương. Có thể tiến hành ký xác nhận management.",
    });
  }

  static allSignaturesComplete() {
    return this.success("🎊 Hoàn thành tất cả!", {
      description: "Tất cả management đã ký xác nhận. Quy trình hoàn tất!",
    });
  }

  static authenticationError() {
    return this.error("Phiên đăng nhập hết hạn", {
      description: "Vui lòng đăng nhập lại để tiếp tục",
      action: {
        label: "Đăng nhập",
        onClick: () => {
          window.location.href = "/admin/login";
        },
      },
    });
  }

  static networkError() {
    return this.error("Lỗi kết nối", {
      description:
        "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.",
    });
  }

  static validationError(message: string) {
    return this.warning("Dữ liệu không hợp lệ", {
      description: message,
    });
  }

  static permissionDenied() {
    return this.error("Không có quyền", {
      description: "Bạn không có quyền thực hiện hành động này",
    });
  }

  static dataRefreshed() {
    return this.info("Dữ liệu đã được cập nhật", {
      duration: 2000,
    });
  }

  static autoRefreshEnabled(interval: number) {
    const minutes = Math.floor(interval / 60000);
    const seconds = Math.floor((interval % 60000) / 1000);

    return this.info("Tự động cập nhật", {
      description: `Dữ liệu sẽ được cập nhật mỗi ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`,
      duration: 3000,
    });
  }

  static autoRefreshDisabled() {
    return this.info("Đã tắt tự động cập nhật", {
      duration: 2000,
    });
  }

  static exportStarted() {
    return this.loading("Đang xuất dữ liệu...", {
      description: "Vui lòng đợi trong giây lát",
    });
  }

  static exportCompleted(filename: string) {
    return this.success("Xuất dữ liệu thành công", {
      description: `File ${filename} đã được tải xuống`,
    });
  }

  static importStarted() {
    return this.loading("Đang nhập dữ liệu...", {
      description: "Vui lòng đợi trong giây lát",
    });
  }

  static importCompleted(recordCount: number) {
    return this.success("Nhập dữ liệu thành công", {
      description: `Đã nhập ${recordCount} bản ghi`,
    });
  }

  static confirmAction(
    message: string,
    onConfirm: () => void,
    options?: {
      confirmLabel?: string;
      cancelLabel?: string;
      description?: string;
    },
  ) {
    return toast(message, {
      description: options?.description,
      action: {
        label: options?.confirmLabel || "Xác nhận",
        onClick: onConfirm,
      },
      cancel: {
        label: options?.cancelLabel || "Hủy",
        onClick: () => {},
      },
    });
  }

  static progressUpdate(current: number, total: number, message?: string) {
    const percentage = Math.round((current / total) * 100);
    return this.info(message || "Đang xử lý...", {
      description: `${current}/${total} (${percentage}%)`,
    });
  }

  static batchOperation(
    operation: string,
    successCount: number,
    errorCount: number,
    totalCount: number,
  ) {
    if (errorCount === 0) {
      return this.success(`${operation} hoàn thành`, {
        description: `Đã xử lý thành công ${successCount}/${totalCount} mục`,
      });
    } else {
      return this.warning(`${operation} hoàn thành với lỗi`, {
        description: `Thành công: ${successCount}, Lỗi: ${errorCount}, Tổng: ${totalCount}`,
      });
    }
  }
}

export const notify = NotificationService;
