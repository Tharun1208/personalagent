/**
 * Graph Debt Settlement & Simplification Algorithm (Min-Cash-Flow)
 * Transforms a network of bilateral debts (A owes B, B owes C, C owes A)
 * into the minimum number of net transactions required to settle all debts.
 * 
 * Time Complexity: O(V log V + E) where V = people, E = debts
 */

export interface Transaction {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface SimplifiedSettlement {
  originalTransactionsCount: number;
  simplifiedTransactionsCount: number;
  transactions: Transaction[];
  netBalances: { person: string; netAmount: number; currency: string }[];
}

export class DebtGraph {
  /**
   * Simplifies bilateral ledger debts into minimal transactions.
   */
  public static simplifyDebts(
    debts: { personName: string; type: 'give' | 'receive'; amount: number; currency: string }[],
    userName: string = 'You'
  ): SimplifiedSettlement {
    const originalCount = debts.length;
    if (originalCount === 0) {
      return {
        originalTransactionsCount: 0,
        simplifiedTransactionsCount: 0,
        transactions: [],
        netBalances: [],
      };
    }

    const currency = debts[0]?.currency || '$';

    // 1. Calculate Net Balance for each person
    // Positive balance = Net Creditor (needs to receive money)
    // Negative balance = Net Debtor (needs to pay money)
    const balances = new Map<string, number>();

    const updateBalance = (person: string, delta: number) => {
      balances.set(person, (balances.get(person) || 0) + delta);
    };

    for (const d of debts) {
      if (d.type === 'give') {
        // User owes person -> User (- amount), Person (+ amount)
        updateBalance(userName, -d.amount);
        updateBalance(d.personName, d.amount);
      } else {
        // Person owes user -> User (+ amount), Person (- amount)
        updateBalance(userName, d.amount);
        updateBalance(d.personName, -d.amount);
      }
    }

    // 2. Separate into Creditors and Debtors
    const creditors: { person: string; amount: number }[] = [];
    const debtors: { person: string; amount: number }[] = [];

    const netBalancesList: { person: string; netAmount: number; currency: string }[] = [];

    for (const [person, balance] of balances.entries()) {
      const rounded = Math.round(balance * 100) / 100;
      netBalancesList.push({ person, netAmount: rounded, currency });

      if (rounded > 0.01) {
        creditors.push({ person, amount: rounded });
      } else if (rounded < -0.01) {
        debtors.push({ person, amount: -rounded });
      }
    }

    // Sort descending by amount for greedy maximum reduction
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const simplifiedTransactions: Transaction[] = [];

    let cIdx = 0;
    let dIdx = 0;

    // 3. Greedy Min-Cash-Flow matching
    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const settleAmount = Math.min(creditor.amount, debtor.amount);
      const roundedSettle = Math.round(settleAmount * 100) / 100;

      if (roundedSettle > 0.01) {
        simplifiedTransactions.push({
          from: debtor.person,
          to: creditor.person,
          amount: roundedSettle,
          currency,
        });
      }

      creditor.amount -= settleAmount;
      debtor.amount -= settleAmount;

      if (creditor.amount <= 0.01) cIdx++;
      if (debtor.amount <= 0.01) dIdx++;
    }

    return {
      originalTransactionsCount: originalCount,
      simplifiedTransactionsCount: simplifiedTransactions.length,
      transactions: simplifiedTransactions,
      netBalances: netBalancesList,
    };
  }
}
