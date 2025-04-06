import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionService } from './services/transaction.service';
import { TransactionBlock, TransactionSchema } from 'src/schemas/transaction.schema';
import { UserSchema } from 'src/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransactionBlock.name, schema: TransactionSchema },
      { name: "User", schema: UserSchema },
    ]),
  ],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
