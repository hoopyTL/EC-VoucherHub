import { PrismaClient } from '@prisma/client'
import { signAccessToken } from './src/utils/jwt'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Đang chạy bộ siêu kịch bản End-to-End...')

    // 1. Tìm Customer bất kỳ
    let user = await prisma.user.findFirst({ where: { role: { name: 'CUSTOMER' } } })
    if (!user) {
        user = await prisma.user.findFirst()
    }
    if (!user) {
        console.log('❌ Lỗi: Database trống trơn!')
        return
    }

    // 2. Refresh Giỏ Hàng (Đảm bảo có hàng)
    let cart = await prisma.cart.findUnique({ where: { customerId: user.id }, include: { cartItems: true } })
    if (!cart) {
        cart = await prisma.cart.create({ data: { customerId: user.id }, include: { cartItems: true } })
    }

    const product = await prisma.voucherProduct.findFirst({ where: { status: 'ON_SALE' } })
    if (!product) return console.log('❌ Lỗi: Cần ít nhất 1 voucher ON_SALE trong database để test mua nhen!')

    if (cart.cartItems.length === 0) {
        await prisma.cartItem.create({ data: { cartId: cart.id, voucherProductId: product.id, quantity: 1 } })
    }

    // 3. Fake Môi trường & Token chuẩn chỉ
    const token = signAccessToken({ sub: user.id, role: 'CUSTOMER', ver: user.tokenVersion })
    const PORT = process.env.PORT || 4000
    const baseUrl = `http://localhost:${PORT}/api`

    // 4. API 1: Tạo Order qua HTTP (Test Routing)
    console.log(`➡️ (1/2) PING Tới API Tạo Đơn...`)
    const orderRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paymentMethod: 'STRIPE' })
    })

    const orderData = await orderRes.json()
    if (!orderRes.ok) {
        console.log('❌ Lỗi tạo Đơn hàng:', JSON.stringify(orderData, null, 2))
        return
    }
    console.log(`✅ Thành công! Sinh Đơn hàng có mã: ${orderData.data.id}`)

    // 5. API 2: Xin link Stripe qua HTTP (Test Webhook/Stripe SDK binding)
    console.log(`➡️ (2/2) PING Tới API Lấy Link Stripe...`)

    const stripeRes = await fetch(`${baseUrl}/orders/${orderData.data.id}/stripe`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })

    const stripeData = await stripeRes.json()
    if (!stripeRes.ok) {
        console.log('❌ Lỗi xin link Stripe:', JSON.stringify(stripeData, null, 2))
        return
    }

    console.log('\n================================================================')
    console.log('🎉 NHẬN HÀNG! LINK QUẸT THẺ CỦA BẠN ĐÂY. BẤM VÀO ĐỂ TỚI STRIPE MUA NÈ:')
    console.log()
    console.log(stripeData.data.url)
    console.log()
    console.log('================================================================\n')

}

main()
    .catch(console.error)
    .finally(() => {
        prisma.$disconnect()
        process.exit(0)
    })
