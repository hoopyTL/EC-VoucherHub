import prisma from '../../configs/prisma'

/**
 * Bắt đầu background worker dọn dẹp các đơn hàng quá hạn (chạy mỗi 1 phút).
 * Nếu tìm thấy đơn hàng `PENDING_PAYMENT` có `expiresAt < now()`,
 * hệ thống sẽ chuyển trạng thái sang `CANCELLED` và hoàn lại tồn kho (+ quantity).
 */
export const startOrderCleanupCron = () => {
  const ONE_MINUTE = 60 * 1000

  setInterval(async () => {
    try {
      const now = new Date()

      // 1. Tìm các đơn bị quá hạn
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING_PAYMENT',
          expiresAt: {
            lt: now
          }
        },
        include: {
          orderItems: true
        }
      })

      if (expiredOrders.length === 0) {
        return
      }

      console.log(`[OrderCron] Found ${expiredOrders.length} expired orders. Canceling...`)

      // 2. Hủy từng đơn và hoàn tồn kho trong transaction độc lập
      for (const order of expiredOrders) {
        try {
          await prisma.$transaction(async (tx) => {
            // Đổi trạng thái đơn hàng
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED'
              }
            })

            // Hoàn lại tồn kho cho từng sản phẩm
            for (const item of order.orderItems) {
              await tx.voucherProduct.update({
                where: { id: item.voucherProductId },
                data: {
                  remainingQuantity: {
                    increment: item.quantity
                  }
                }
              })
            }
          })
          console.log(`[OrderCron] Cancelled order ${order.id} successfully.`)
        } catch (txError) {
          console.error(`[OrderCron] Failed to cancel order ${order.id}:`, txError)
        }
      }
    } catch (error) {
      console.error('[OrderCron] Error running cleanup cron:', error)
    }
  }, ONE_MINUTE)

  console.log('[OrderCron] Order cleanup cron job started.')
}
