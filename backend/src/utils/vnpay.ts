import crypto from 'crypto'
import qs from 'qs'
import { format } from 'date-fns'

export const VNP_TMNCODE = process.env.VNP_TMNCODE || 'YOUR_TMNCODE';
export const VNP_HASHSECRET = process.env.VNP_HASHSECRET || 'YOUR_SECRET';
export const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
export const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:5173/payment-result';

export function createVNPayUrl(ipAddr: string, orderId: string, amount: number, orderInfo: string) {
    const date = new Date();
    const createDate = format(date, 'yyyyMMddHHmmss');

    let vnp_Params: Record<string, string | number> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNP_TMNCODE,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Amount: amount * 100, // VNPay requires amount * 100
        vnp_ReturnUrl: VNP_RETURN_URL,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNP_HASHSECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    const url = VNP_URL + '?' + qs.stringify(vnp_Params, { encode: false });
    return url;
}

export function verifyVNPayReturn(vnp_Params: any): boolean {
    let secureHash = vnp_Params['vnp_SecureHash'];
    let vnp_Params_Clone = { ...vnp_Params };

    delete vnp_Params_Clone['vnp_SecureHash'];
    delete vnp_Params_Clone['vnp_SecureHashType'];

    vnp_Params_Clone = sortObject(vnp_Params_Clone);

    const signData = qs.stringify(vnp_Params_Clone, { encode: false });
    const hmac = crypto.createHmac('sha512', VNP_HASHSECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
}

function sortObject(obj: any) {
    let sorted: any = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}
