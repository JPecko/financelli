import { format } from "date-fns";
import { Plus, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import EmptyState from "@/shared/components/EmptyState";
import PageLoader from "@/shared/components/PageLoader";
import TransactionFormModal from "../components/TransactionFormModal";
import TransactionRow, { TRANSACTIONS_GRID_COLS } from "../components/TransactionRow";
import { useTransactionsPageModel } from "./useTransactionsPageModel";

export default function TransactionsPage() {
  const {
    currentDate,
    modalOpen,
    editing,
    transactions,
    isLoading,
    accountMap,
    runningBalances,
    prevMonth,
    nextMonth,
    openCreateModal,
    handleEdit,
    handleClose,
    handleDelete,
  } = useTransactionsPageModel();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(currentDate, "MMMM yyyy")}</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">
            {format(currentDate, "MMM yyyy")}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <PageLoader message="Loading transactions..." />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions this month"
          description="Start adding your income and expenses to track your monthly spending."
          action={
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add first transaction
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Desktop column headers */}
          <div
            className={`hidden md:grid ${TRANSACTIONS_GRID_COLS} gap-x-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border`}
          >
            <span>Date</span>
            <span>Description</span>
            <span>Account</span>
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                accountMap={accountMap}
                runningBalances={runningBalances}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <TransactionFormModal open={modalOpen} onClose={handleClose} transaction={editing} />
    </div>
  );
}
