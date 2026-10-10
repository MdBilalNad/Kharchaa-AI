import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Wallet,
  LayoutDashboard,
  ReceiptText,
  ChartNoAxesCombined,
  Settings,
  Plus,
  ArrowDownRight,
  PiggyBank,
  CalendarDays,
  Trash2,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { createBudgetPlan } from './budgetEngine'

type Expense = {
  id: string
  title: string
  category: string
  amount: number
  date: string
}

type Budget = {
  allowance: number
  hostel: number
  mess: number
  otherFixed: number
}

type Page = 'Overview' | 'Expenses' | 'Insights' | 'Settings'

const initialBudget: Budget = {
  allowance: 10000,
  hostel: 3000,
  mess: 2500,
  otherFixed: 500,
}

const categories = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Other',
]

const chartColors = [
  '#247653',
  '#E6A23C',
  '#5984C5',
  '#9675B5',
  '#A3ACA5',
]

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

function todayString() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readStorage<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback

    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function isBudget(value: unknown): value is Budget {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>

  return ['allowance', 'hostel', 'mess', 'otherFixed'].every(
    (key) =>
      typeof item[key] === 'number' &&
      Number.isFinite(item[key]) &&
      (item[key] as number) >= 0,
  )
}

function isExpenseArray(value: unknown): value is Expense[] {
  if (!Array.isArray(value)) return false

  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      item.title.trim().length > 0 &&
      typeof item.category === 'string' &&
      categories.includes(item.category) &&
      typeof item.amount === 'number' &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      typeof item.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date),
  )
}

function App() {
  const [budget, setBudget] = useState<Budget>(() =>
    readStorage('kharchaa-budget', initialBudget, isBudget),
  )

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    readStorage('kharchaa-expenses', [], isExpenseArray),
  )

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [date, setDate] = useState(todayString())
  const [showForm, setShowForm] = useState(false)
  const [activePage, setActivePage] = useState<Page>('Overview')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem('kharchaa-budget', JSON.stringify(budget))
    } catch (error) {
      console.error('Could not save Kharchaa budget:', error)
    }
  }, [budget])

  useEffect(() => {
    try {
      localStorage.setItem('kharchaa-expenses', JSON.stringify(expenses))
    } catch (error) {
      console.error('Could not save Kharchaa expenses:', error)
    }
  }, [expenses])

  const fixedExpenses =
    budget.hostel + budget.mess + budget.otherFixed

  const spent = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  )

  const remaining = budget.allowance - fixedExpenses - spent

  const today = todayString()

  const todaySpent = expenses
    .filter((expense) => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0)

  const now = new Date()

  const daysLeft = Math.max(
    1,
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
      now.getDate() +
      1,
  )

  

  // Do not allocate money that has already been spent.
  const availableAfterExpenses = Math.max(0, remaining)

  const savings = availableAfterExpenses * 0.2
  const emergencyFund = availableAfterExpenses * 0.1
  const miscellaneous = availableAfterExpenses * 0.1

  const dailySpending = Math.max(
    0,
    availableAfterExpenses - savings - emergencyFund - miscellaneous,
  )

  const dailyLimit = dailySpending / daysLeft
  const todayRemaining = Math.max(0, dailyLimit - todaySpent)

  const chartData = useMemo(
    () =>
      categories
        .map((name) => ({
          name,
          value: expenses
            .filter((expense) => expense.category === name)
            .reduce((sum, expense) => sum + expense.amount, 0),
        }))
        .filter((item) => item.value > 0),
    [expenses],
  )

  const monthlyExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const expenseDate = new Date(`${expense.date}T12:00:00`)
        const currentDate = new Date()

        return (
          expenseDate.getFullYear() === currentDate.getFullYear() &&
          expenseDate.getMonth() === currentDate.getMonth()
        )
      }),
    [expenses],
  )

  function updateBudget(field: keyof Budget, value: string) {
    const parsed = Number(value)

    if (!Number.isFinite(parsed) || parsed < 0) return

    setBudget((current) => ({
      ...current,
      [field]: parsed,
    }))
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const parsedAmount = Number(amount)

    if (!title.trim()) {
      setFormError('Enter an expense name.')
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }

    if (!categories.includes(category)) {
      setFormError('Select a valid category.')
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError('Select a valid date.')
      return
    }

    setExpenses((current) => [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        category,
        amount: parsedAmount,
        date,
      },
      ...current,
    ])

    setTitle('')
    setAmount('')
    setCategory('Food')
    setDate(todayString())
    setShowForm(false)
  }

  function removeExpense(id: string) {
    setExpenses((current) =>
      current.filter((expense) => expense.id !== id),
    )
  }

  const navigation = [
    { label: 'Overview' as const, icon: LayoutDashboard },
    { label: 'Expenses' as const, icon: ReceiptText },
    { label: 'Insights' as const, icon: ChartNoAxesCombined },
    { label: 'Settings' as const, icon: Settings },
  ]

  const visibleExpenses =
    activePage === 'Insights' ? monthlyExpenses : expenses

  return (
    <div className="min-h-screen bg-[#f6f8f5] md:flex">
      <aside className="flex w-full flex-col border-b border-[#e3e9e2] bg-white p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#153e2c] text-white">
            <Wallet size={21} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Kharchaa
            </h1>
            <p className="text-xs text-gray-500">
              Your money, in balance.
            </p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Workspace
        </p>

        <nav className="flex flex-wrap gap-2 md:flex-col">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setActivePage(label)
                setShowForm(false)
                setFormError('')
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                activePage === label
                  ? 'bg-[#eaf3ec] text-[#1c6541]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-8 rounded-xl border border-[#e3e9e2] bg-[#f7faf6] p-4 md:mt-auto">
          <PiggyBank className="mb-3 text-[#247653]" size={22} />
          <p className="text-sm font-semibold">Small steps add up.</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Track your spending today to make better decisions tomorrow.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8 lg:p-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-gray-500">
              Your student finances
            </p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {activePage === 'Overview'
                ? 'Money overview'
                : activePage}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              A clear picture of where your money stands.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm((current) => !current)
              setFormError('')
            }}
            className="flex items-center gap-2 rounded-lg bg-[#1c6541] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164e32]"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? 'Close form' : 'Add expense'}
          </button>
        </header>

        {remaining < 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Your fixed costs and recorded expenses exceed your allowance by{' '}
            {money(-remaining)}. Consider adjusting your budget.
          </div>
        )}

        {showForm && (
          <form
            onSubmit={addExpense}
            className="mb-6 rounded-xl border border-[#e3e9e2] bg-white p-5"
          >
            <h3 className="mb-4 font-semibold">Record an expense</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <input
                required
                maxLength={100}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Expense name"
                className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#247653]"
              />

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount in ₹"
                className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#247653]"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            {formError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {formError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-[#1c6541] px-4 py-2 text-sm font-semibold text-white"
              >
                Save expense
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormError('')
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {activePage === 'Settings' && (
          <section className="mb-6 rounded-xl border border-[#e3e9e2] bg-white p-5">
            <h3 className="mb-4 font-semibold">Monthly budget settings</h3>
            <p className="mb-4 text-sm text-gray-500">
              Update your allowance and fixed monthly costs.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ['allowance', 'Monthly allowance'],
                ['hostel', 'Hostel / PG'],
                ['mess', 'Mess fees'],
                ['otherFixed', 'Other fixed costs'],
              ] as const).map(([field, label]) => (
                <label key={field} className="text-sm text-gray-600">
                  {label}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budget[field]}
                    onChange={(event) =>
                      updateBudget(field, event.target.value)
                    }
                    className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        {activePage === 'Insights' && (
          <section className="mb-6 rounded-xl border border-[#e3e9e2] bg-white p-5">
            <h3 className="font-semibold">Monthly insights</h3>
            <p className="mt-2 text-sm text-gray-500">
              You have recorded {monthlyExpenses.length} expenses this month,
              totalling{' '}
              {money(
                monthlyExpenses.reduce(
                  (sum, expense) => sum + expense.amount,
                  0,
                ),
              )}.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              These figures are based on expenses you have manually entered.
            </p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Available balance"
            value={money(remaining)}
            note="After fixed costs and logged expenses"
            icon={<Wallet size={19} />}
            highlight
          />

          <Metric
            label="Daily spending limit"
            value={money(dailyLimit)}
            note={`${daysLeft} days remaining this month`}
            icon={<CalendarDays size={19} />}
          />

          <Metric
            label="Today's limit remaining"
            value={money(todayRemaining)}
            note={`${money(todaySpent)} spent today`}
            icon={<ArrowDownRight size={19} />}
          />

          <Metric
            label="Total spent"
            value={money(fixedExpenses + spent)}
            note={`${money(spent)} in logged expenses`}
            icon={<PiggyBank size={19} />}
          />
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Your money plan</h3>
            <p className="mt-1 text-sm text-gray-500">
              Suggested allocations based on your remaining budget.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Daily spending',
                value: dailySpending,
                description: `${money(dailyLimit)} per day`,
              },
              {
                label: 'Savings',
                value: savings,
                description: '20% of remaining funds',
              },
              {
                label: 'Emergency fund',
                value: emergencyFund,
                description: '10% of remaining funds',
              },
              {
                label: 'Miscellaneous',
                value: miscellaneous,
                description: '10% of remaining funds',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#e3e9e2] bg-white p-5"
              >
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-3 text-2xl font-bold">
                  {money(item.value)}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-[#e3e9e2] bg-white p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Monthly budget</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your allowance, allocated at a glance.
                </p>
              </div>

              <button
                onClick={() => {
                  setActivePage('Settings')
                  setShowForm(false)
                }}
                className="text-sm font-medium text-[#247653] hover:underline"
              >
                Edit budget
              </button>
            </div>

            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-500">Budget used</span>
              <span className="font-semibold">
                {budget.allowance > 0
                  ? Math.round(
                      ((fixedExpenses + spent) / budget.allowance) * 100,
                    )
                  : 0}
                %
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${
                  remaining < 0 ? 'bg-red-500' : 'bg-[#247653]'
                }`}
                style={{
                  width: `${
                    budget.allowance > 0
                      ? Math.min(
                          100,
                          ((fixedExpenses + spent) / budget.allowance) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="mt-6 divide-y divide-gray-100">
              {[
                ['Hostel / PG', budget.hostel],
                ['Mess fees', budget.mess],
                ['Other fixed costs', budget.otherFixed],
                ['Logged expenses', spent],
                ['Remaining balance', remaining],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-3 py-3 text-sm"
                >
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">
                    {money(Number(value))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#e3e9e2] bg-white p-5 md:p-6">
            <h3 className="font-semibold">Spending breakdown</h3>
            <p className="mt-1 text-sm text-gray-500">
              Based on your manually logged expenses.
            </p>

            {chartData.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <ChartNoAxesCombined
                  size={30}
                  className="mb-3 text-gray-300"
                />
                <p className="text-sm font-medium text-gray-600">
                  Your chart starts with your first expense.
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Add a transaction to see where your money goes.
                </p>
              </div>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {chartData.map((item) => (
                          <Cell
                            key={item.name}
                            fill={
                              chartColors[categories.indexOf(item.name)]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => money(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {chartData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background:
                              chartColors[categories.indexOf(item.name)],
                          }}
                        />
                        {item.name}
                      </span>
                      <span className="font-medium">
                        {money(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-[#e3e9e2] bg-white p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">
                {activePage === 'Insights'
                  ? 'This month’s expenses'
                  : 'Recent expenses'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Your recorded transactions.
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {visibleExpenses.length} records
            </span>
          </div>

          {visibleExpenses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
              <ReceiptText
                size={28}
                className="mx-auto mb-3 text-gray-300"
              />
              <p className="text-sm font-medium">No expenses yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Record your first purchase to start tracking your money.
              </p>
              <button
                onClick={() => {
                  setShowForm(true)
                  setActivePage('Overview')
                }}
                className="mt-4 text-sm font-semibold text-[#247653] hover:underline"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Expense</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                    <th className="pb-3 text-right font-medium">Remove</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-4 font-medium">{expense.title}</td>
                      <td className="py-4 text-gray-500">
                        {expense.category}
                      </td>
                      <td className="py-4 text-gray-500">{expense.date}</td>
                      <td className="py-4 text-right font-semibold">
                        {money(expense.amount)}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          aria-label={`Remove ${expense.title}`}
                          onClick={() => removeExpense(expense.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 pb-4 text-center text-xs text-gray-400">
          Kharchaa · Built for student life.
        </footer>
      </main>
    </div>
  )
}

function Metric({
  label,
  value,
  note,
  icon,
  highlight = false,
}: {
  label: string
  value: string
  note: string
  icon: ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? 'border-[#1c6541] bg-[#153e2c] text-white'
          : 'border-[#e3e9e2] bg-white'
      }`}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <p
          className={`text-sm ${
            highlight ? 'text-white/75' : 'text-gray-500'
          }`}
        >
          {label}
        </p>
        <span
          className={highlight ? 'text-[#b9dfc5]' : 'text-[#247653]'}
        >
          {icon}
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p
        className={`mt-2 text-xs ${
          highlight ? 'text-white/70' : 'text-gray-400'
        }`}
      >
        {note}
      </p>
    </div>
  )
}

export default App
