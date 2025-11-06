'use server';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co/transaction/initialize';

interface InitializePaymentResponse {
    status: boolean;
    message: string;
    data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
    error?: string;
}

/**
 * Initializes a payment transaction with Paystack.
 * This function should only be called from the server-side.
 * @param email - The user's email address.
 * @param amount - The amount to be paid, in Naira.
 * @returns An object containing the transaction details or an error message.
 */
export async function initializePaystackTransaction(
    email: string,
    amount: number
): Promise<InitializePaymentResponse> {

    if (!PAYSTACK_SECRET_KEY) {
        console.error("Paystack secret key is not configured.");
        return { status: false, message: 'Payment gateway is not configured on the server.' };
    }

    // Paystack expects the amount in kobo, so we multiply by 100.
    const amountInKobo = Math.round(amount * 100);

    const callback_url = 'https://studio.firebase.google.com/u/6/god-is-able-ventures-06749090';

    const body = JSON.stringify({
        email,
        amount: amountInKobo,
        callback_url: callback_url
    });

    try {
        const response = await fetch(PAYSTACK_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: body,
            // We don't cache this request as each transaction is unique
            cache: 'no-store' 
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            console.error('Paystack API Error:', data);
            return { status: false, message: data.message || 'Failed to initialize payment.' };
        }

        return {
            status: true,
            message: data.message,
            data: data.data,
        };

    } catch (error) {
        console.error('Critical error in initializePaystackTransaction:', error);
        return { status: false, message: 'Could not connect to the payment gateway.' };
    }
}
