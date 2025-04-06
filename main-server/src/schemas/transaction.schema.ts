import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, model } from 'mongoose';

export interface TransactionBlock extends Document {
    timestamp: Date;
    transactions: Transaction;
    previousHash: string;
    hash: string;
    validator: string;
    signature: string;
    nonce: number;
}

export enum fraudTypes{
    NOFRAUD="VALID TRANSACTION",
    CFRAUD="C/D CARD FRAUD PROBABLE",
    RP="RISKY PROFILE",
    SMURFING="PROBABLE SMURFING",
    ML="PROBABLE MONEY LAUNDERING"
}

export interface Transaction {
    userId: string,
    recieverId: string,
    amount: number,
    userMacAdd: string,
    userLocation: any,
    recieverLocation: any,
    fraudType?: fraudTypes,
    riskScore: number,
    cardNum?: number, 
    merchant: string, 
    gender: "M"| "F", 
    payment_currency?: string, 
    city_pop: number, 
    timestamp: Date, 
    senderAccount: number, 
    recieverAccount: number
}

@Schema()
export class TransactionBlock extends Document {
  @Prop({ type: Date, default: Date.now }) // Default to the current timestamp
  timestamp: Date;

  @Prop({ type: Object, required: true }) // Ensuring it's an array
  transactions: Transaction;

  @Prop({ required: true })
  previousHash: string;

  @Prop({ required: true })
  hash: string;

  @Prop({ required: true })
  validator: string;

  @Prop({ type: String, default: null })
  signature: string | null;

  @Prop({ required: true })
  nonce: number;
}

export const TransactionSchema = SchemaFactory.createForClass(TransactionBlock);

export const TransactionModel = model("TransactionBlock", TransactionSchema);