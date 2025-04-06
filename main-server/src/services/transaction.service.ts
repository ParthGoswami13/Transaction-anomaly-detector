import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    fraudTypes,
  TransactionBlock,
  TransactionModel,
} from 'src/schemas/transaction.schema';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel('TransactionBlock')
    private transactionModel: Model<TransactionBlock>,
    @InjectModel('User') private readonly userModel: Model<User>,
  ) {}

  // Fetch transactions with sorting & pagination
  async getTransactions(page: number, limit: number) {
    const transactions = await this.transactionModel
      .find()
      .sort({ Date: -1, Time: -1 }) // Sorting by latest transactions
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const total = await this.transactionModel.countDocuments();

    return { transactions, total };
  }

  // Fetch transactions where the user is the sender
  async getTransactionsBySender(bankAccount: number) {
    return this.transactionModel.find({ 'transactions.senderAccount': bankAccount }).exec();
  }

  // Fetch transactions where the user is the receiver
  async getTransactionsByReceiver(bankAccount: number) {
    return this.transactionModel.find({ 'transactions.recieverAccount': bankAccount }).exec();
  }

  // Create a new transaction
  async createTransaction(transactionData: any) {
    console.log(transactionData);

    const { Sender_account, Receiver_account, Amount } = transactionData;

    // Find sender and receiver
    console.log('Sender_account Type:', typeof Sender_account, Sender_account);
    console.log(
      'Receiver_account Type:',
      typeof Receiver_account,
      Receiver_account,
    );
    console.log('Amount Type:', typeof Amount, Amount);

    // Convert to Number (Mongoose does not support Long directly)
    const senderBankAcc = Sender_account;
    const receiverBankAcc = Receiver_account;

    console.log(
      'Converted Sender_account Type:',
      typeof senderBankAcc,
      senderBankAcc,
    );
    console.log(
      'Converted Receiver_account Type:',
      typeof receiverBankAcc,
      receiverBankAcc,
    );

    // Find sender and receiver
    const sender = await this.userModel.findOne({
      bankAccount: senderBankAcc, // Use Number
    });

    const receiver = await this.userModel.findOne({
      bankAccount: receiverBankAcc, // Use Number
    });

    if (!sender) {
      console.error('❌ Sender not found:', senderBankAcc);
    }
    if (!receiver) {
      console.error('❌ Receiver not found:', receiverBankAcc);
    }

    // Check sender balance
    if (sender.balance < Amount) {
      throw new Error('Insufficient balance.');
    }

    // Modify balances
    sender.balance -= Amount;
    receiver.balance += Amount;

    // Save updated balances
    await sender.save();
    await receiver.save();

    // Create and save transaction
    const newTransaction = new this.transactionModel({
      ...transactionData,
    });

    console.log(newTransaction);

    return newTransaction.save();
  }

  // Get only transactions flagged as laundering
  async getLaunderingTransactions() {
    return await this.transactionModel.find({ 'transactions.riskScore': {$gte: 0.5} }).exec();
  }

  // Categorize transactions based on Laundering_type
  async categorizeLaunderingTransactions() {
    const launderingTransactions = await this.getLaunderingTransactions();
    // console.log(launderingTransactions);
    if(!launderingTransactions) return {};

    const categories = launderingTransactions.reduce((acc, txn) => {
        console.log(txn);
      const category = txn.transactions?.fraudType ?? fraudTypes.NOFRAUD;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(txn);
      return acc;
    }, {});

    return categories;
  }

  async searchTransactions(filters: any) {
    const query: any = {transactions: {}};

    if (filters.transactionId) {
      query.hash = filters.transactionId;
    }

    if (filters.date) query.transactions.date = filters.date;
    if (filters.senderAccount) query.transactions.Sender_account = filters.senderAccount;
    if (filters.receiverAccount)
      query.transactions.Receiver_account = filters.receiverAccount;
    if (filters.amountMin) query.transactions.amount = { $gte: filters.amountMin };
    if (filters.amountMax)
      query.transactions.amount = { ...query.transactions.amount, $lte: filters.amountMax };
    if (filters.paymentType) query.transactions.Payment_type = filters.paymentType;
    if (filters.isLaundering !== undefined)
      query.transactions.fraudType = filters.fraudType;

    const transactions = await this.transactionModel.find(query).exec();

    // If transactionId is provided but doesn't match filters, still include it in the response
    if (filters.transactionId) {
      const transactionById = await this.transactionModel
        .findOne({ hash: filters.transactionId })
        .exec();
      if (
        transactionById &&
        !transactions.some((t) => t.hash === filters.transactionId)
      ) {
        transactions.push(transactionById);
      }
    }

    return transactions;
  }

  async getFlaggedUsers() {
    const launderingTransactions = await this.getLaunderingTransactions();

    const userMap = new Map<number, TransactionBlock[]>();

    launderingTransactions.forEach((txn) => {
      if (!userMap.has(txn.transactions.senderAccount)) {
        userMap.set(txn.transactions.senderAccount, []);
      }
      userMap.get(txn.transactions.senderAccount)?.push(txn);
    });

    return Array.from(userMap.entries()).map(([user, transactions]) => ({
      user,
      transactions,
      riskLevel: this.calculateRiskLevel(transactions.length),
    }));
  }

  private calculateRiskLevel(count: number) {
    if (count > 5) return 'High';
    if (count > 2) return 'Medium';
    return 'Low';
  }
}