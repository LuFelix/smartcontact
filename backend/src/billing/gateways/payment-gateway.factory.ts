import { Injectable } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway.interface';
import { StripeGateway } from './stripe/stripe.gateway';
import { MercadoPagoGateway } from './mercadopago/mercadopago.gateway';

@Injectable()
export class PaymentGatewayFactory {
  create(): PaymentGateway {
    const provider = process.env.PAYMENT_PROVIDER?.toLowerCase();
    switch (provider) {
      case 'stripe':
        return new StripeGateway();
      case 'mercadopago':
        return new MercadoPagoGateway();
      default:
        throw new Error(
          `PAYMENT_PROVIDER inválido ou não configurado: "${provider}". Use "stripe" ou "mercadopago".`,
        );
    }
  }
}