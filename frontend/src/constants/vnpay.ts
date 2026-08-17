export const VNPayMessageMap: Record<string, string> = {
    '00': 'Giao dịch thành công!',
    '24': 'Bạn đã chủ động hủy thanh toán giao dịch.',
    '11': 'Đã hết thời gian chờ thanh toán. Vui lòng đặt lại đơn mới.',
    '13': 'Giao dịch thất bại do nhập sai mật khẩu xác thực (OTP).',
    '51': 'Giao dịch thất bại do tài khoản của bạn không đủ số dư.',
    '65': 'Tài khoản của bạn đã vượt hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì. Vui lòng thử lại sau.',
    '99': 'Giao dịch thất bại do lỗi hệ thống không xác định.',
    'DEFAULT': 'Giao dịch thất bại (Mã lỗi: {code}). Vui lòng liên hệ hỗ trợ.'
};
