import { format } from "date-fns";
import { Plus, ArrowLeftRight, ChevronLeft, ChevronRight, SlidersHorizontal, Check, X, Building2, Shapes } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import EmptyState from "@/shared/components/EmptyState";
import PageLoader from "@/shared/components/PageLoader";
import BankLogo from "@/shared/components/BankLogo";
import TransactionFormModal from "../components/TransactionFormModal";
import TransactionRow, { TRANSACTIONS_GRID_COLS } from "../components/TransactionRow";
import SharedExpenseRow from "../components/SharedExpenseRow";
import GroupExpenseRow from "../components/GroupExpenseRow";
import { useTransactionsPageModel } from "./useTransactionsPageModel";
import { useT } from "@/shared/i18n";
import { useAuth } from "@/features/auth/AuthContext";
import { BANK_OPTIONS } from "@/shared/config/banks";
import { getCategoryById, tCategory } from "@/domain/categories";

export default function TransactionsPage() {
  const t = useT()
  const { user } = useAuth()
  const {
    currentDate,
    modalOpen,
    editingTx,
    editingSE,
    listItems,
    txSeMap,
    txGroupMap,
    seGroupMap,
    isLoading,
    accounts,
    accountsById,
    runningBalances,
    categoriesInMonth,
    filterAccountId,
    filterCategory,
    filterSource,
    setFilterAccountId,
    setFilterCategory,
    setFilterSource,
    prevMonth,
    nextMonth,
    openCreateModal,
    handleEdit,
    handleEditSE,
    handleClose,
    handleDelete,
    handleDeleteSE,
    handleReopen,
  } = useTransactionsPageModel();

  const activeFilterCount =
    (filterAccountId !== null ? 1 : 0) +
    (filterCategory  !== null ? 1 : 0) +
    (filterSource    !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setFilterAccountId(null)
    setFilterCategory(null)
    setFilterSource('all')
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('transactions.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(currentDate, "MMMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            {t('transactions.addTransaction')}
          </Button>
        </div>
      </div>

      {/* Month navigation + Filter */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        {/* Month navigator */}
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

        {/* Filter popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
              size="sm"
              className="gap-2 h-9 px-3"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm">{t('transactions.filters')}</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[min(340px,_calc(100vw-1.5rem))] p-0 overflow-hidden"
          >
            {/* Popover header */}
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">{t('transactions.filters')}</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('transactions.clearFilters')}
                </button>
              )}
            </div>

            <Separator />

            {/* Source section */}
            <div className="pt-3 pb-3">
              <p className="pb-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Source
              </p>
              <div className="flex gap-2 px-4">
                {(['all', 'bank', 'shared'] as const).map(src => {
                  const label = src === 'all'    ? t('sharedExpenses.filterAll')
                              : src === 'bank'   ? t('sharedExpenses.filterBank')
                              : t('sharedExpenses.filterLabel')
                  return (
                    <button
                      key={src}
                      onClick={() => setFilterSource(src)}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors text-center ${
                        filterSource === src ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Account section */}
            <div className="pt-3 pb-1">
              <p className="pb-1 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('transactions.colAccount')}
              </p>
              <div className="relative">
                <div className="max-h-44 overflow-y-auto">
                  <button
                    onClick={() => setFilterAccountId(null)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{t('transactions.allAccounts')}</span>
                    {filterAccountId === null && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>

                  {accounts.map(acc => {
                    const bank = acc.bankCode ? BANK_OPTIONS.find(b => b.code === acc.bankCode) : undefined
                    const isSelected = filterAccountId === acc.id
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setFilterAccountId(acc.id!)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${isSelected ? 'bg-accent' : ''}`}
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {bank ? (
                            <BankLogo
                              domain={bank.logoDomain}
                              name={bank.name}
                              accountType={acc.type}
                              imgClassName="h-5 w-5 object-contain"
                              iconClassName="h-4 w-4 text-muted-foreground"
                            />
                          ) : (
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{acc.name}</p>
                          {bank && <p className="text-xs text-muted-foreground truncate">{bank.name}</p>}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
                <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-popover to-transparent" />
              </div>
            </div>

            <Separator />

            {/* Category section */}
            <div className="pt-3 pb-1">
              <p className="pb-1 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('transactions.colCategory')}
              </p>
              <div className="relative">
                <div className="max-h-44 overflow-y-auto">
                  <button
                    onClick={() => setFilterCategory(null)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Shapes className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{t('transactions.allCategories')}</span>
                    {filterCategory === null && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>

                  {categoriesInMonth.map(catId => {
                    const cat = getCategoryById(catId)
                    const isSelected = filterCategory === catId
                    const CatIcon = cat.icon
                    return (
                      <button
                        key={catId}
                        onClick={() => setFilterCategory(catId)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${isSelected ? 'bg-accent' : ''}`}
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <CatIcon className="h-4 w-4" style={{ color: cat.color }} />
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">{tCategory(cat.id, t)}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    )
                  })}

                  {categoriesInMonth.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">{t('common.noData')}</p>
                  )}
                </div>
                <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-popover to-transparent" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <PageLoader message={t('transactions.loading')} />
      ) : listItems.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={t('transactions.noTransactions')}
          description={t('transactions.noTransactionsDesc')}
          action={
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              {t('transactions.addFirst')}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div
            className={`hidden md:grid ${TRANSACTIONS_GRID_COLS} gap-x-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border`}
          >
            <span>{t('transactions.colDate')}</span>
            <span>{t('transactions.colDescription')}</span>
            <span>{t('transactions.colAccount')}</span>
            <span>{t('transactions.colCategory')}</span>
            <span className="text-right">{t('transactions.colAmount')}</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {listItems.map(item =>
              item.kind === 'tx' ? (
                <TransactionRow
                  key={`tx-${item.data.id}`}
                  tx={item.data}
                  accountsById={accountsById}
                  runningBalances={runningBalances}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  linkedSE={item.data.id != null ? txSeMap[item.data.id] : undefined}
                  linkedGroup={item.data.id != null ? txGroupMap[item.data.id] : undefined}
                  onReopenSE={handleReopen}
                  currentUserId={user?.id}
                />
              ) : item.kind === 'se' ? (
                <SharedExpenseRow
                  key={`se-${item.data.id}`}
                  se={item.data}
                  onEdit={handleEditSE}
                  onDelete={handleDeleteSE}
                  onReopen={handleReopen}
                  linkedGroup={item.data.id != null ? seGroupMap[item.data.id] : undefined}
                />
              ) : (
                <GroupExpenseRow
                  key={`ge-${item.data.entryId}`}
                  item={item.data}
                />
              )
            )}
          </div>
        </div>
      )}

      <TransactionFormModal
        open={modalOpen}
        onClose={handleClose}
        transaction={editingTx}
        sharedExpense={editingSE}
        defaultAccountId={!editingTx && !editingSE && filterAccountId != null ? String(filterAccountId) : undefined}
      />
    </div>
  );
}
