import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

// Khởi tạo Stripe SDK với Secret Key lấy từ biến môi trường
// Nếu chưa có trong .env, sẽ fallback tạm để không bị sập lúc khởi động app
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_development_only'

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true
})

export default stripe
