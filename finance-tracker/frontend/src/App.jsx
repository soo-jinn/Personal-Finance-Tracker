import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  LayoutDashboard,
  Wallet,
  Tag,
  Target,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Plus,
  Edit2,
  Trash2,
  X,
  LogIn,
  UserPlus,
  LogOut,
  Landmark,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from "lucide-react";

// --- Global Configuration ---
const API_URL = "http://127.0.0.1:5000";
const AppName = "Personal Finance Tracker";

// --- Color Palette ---
const COLORS = {
  mapuaRed: "#BA0C2F",
  mapuaGold: "#FDB913",
  expense: "#FA5A7D", // Light red
  income: "#00C49F", // Light green
};

const CATEGORY_PIE_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF1975",
];

// --- 1. Theme Context ---
// Provides dark/light mode state to the whole app
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check local storage for saved preference
    const savedTheme = localStorage.getItem("finance-theme");
    // Check for system preference
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return savedTheme || (systemPrefersDark ? "dark" : "light");
  });

  // Apply theme to <html> tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Save preference to local storage
    localStorage.setItem("finance-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- 2. Auth Context ---
// Manages user authentication state
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    // Check session storage for existing session
    const userId = sessionStorage.getItem("finance-user-id");
    const username = sessionStorage.getItem("finance-username");
    if (userId && username) {
      return { isAuthenticated: true, userId: parseInt(userId), username };
    }
    return { isAuthenticated: false, userId: null, username: null };
  });

  // Login function
  const login = (userId, username) => {
    sessionStorage.setItem("finance-user-id", userId);
    sessionStorage.setItem("finance-username", username);
    setAuth({ isAuthenticated: true, userId, username });
  };

  // Logout function
  const logout = () => {
    sessionStorage.removeItem("finance-user-id");
    sessionStorage.removeItem("finance-username");
    setAuth({ isAuthenticated: false, userId: null, username: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- 3. API & Data Context ---
// Manages all data fetching and state (transactions, goals, categories)
const DataContext = createContext();

const DataProvider = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState({
    transactions: [],
    categories: [],
    goals: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper for authenticated API calls
  const fetchWithAuth = useCallback(
    async (endpoint, options = {}) => {
      if (!auth.userId) throw new Error("Not authenticated");

      const headers = {
        "Content-Type": "application/json",
        "X-User-ID": auth.userId,
        ...options.headers,
      };

      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "An API error occurred");
        }
        return response.json();
      } catch (err) {
        console.error("API Call Error:", endpoint, err);
        setError(err.message);
        throw err;
      }
    },
    [auth.userId]
  );

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!auth.userId) return;
    setLoading(true);
    setError(null);
    try {
      const allData = await fetchWithAuth("/api/data");
      setData({
        transactions: allData.transactions || [],
        categories: allData.categories || [],
        goals: allData.goals || [],
      });
    } catch (err) {
      // Error is already set by fetchWithAuth
    } finally {
      setLoading(false);
    }
  }, [auth.userId, fetchWithAuth]);

  // Effect to fetch data on login
  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchAllData();
    } else {
      // Clear data on logout
      setData({ transactions: [], categories: [], goals: [] });
    }
  }, [auth.isAuthenticated, fetchAllData]);

  // CRUD Operations
  const api = useMemo(
    () => ({
      // Transactions
      addTransaction: async (txData) => {
        const newTx = await fetchWithAuth("/api/transactions", {
          method: "POST",
          body: JSON.stringify(txData),
        });
        setData((d) => ({
          ...d,
          transactions: [...d.transactions, newTx],
        }));
      },
      updateTransaction: async (id, txData) => {
        const updatedTx = await fetchWithAuth(`/api/transactions/${id}`, {
          method: "PUT",
          body: JSON.stringify(txData),
        });
        setData((d) => ({
          ...d,
          transactions: d.transactions.map((tx) =>
            tx.id === id ? updatedTx : tx
          ),
        }));
      },
      deleteTransaction: async (id) => {
        await fetchWithAuth(`/api/transactions/${id}`, { method: "DELETE" });
        setData((d) => ({
          ...d,
          transactions: d.transactions.filter((tx) => tx.id !== id),
        }));
      },

      // Categories
      addCategory: async (catData) => {
        const newCat = await fetchWithAuth("/api/categories", {
          method: "POST",
          body: JSON.stringify(catData),
        });
        setData((d) => ({ ...d, categories: [...d.categories, newCat] }));
      },
      updateCategory: async (id, catData) => {
        const updatedCat = await fetchWithAuth(`/api/categories/${id}`, {
          method: "PUT",
          body: JSON.stringify(catData),
        });
        setData((d) => ({
          ...d,
          categories: d.categories.map((c) => (c.id === id ? updatedCat : c)),
        }));
      },
      deleteCategory: async (id) => {
        await fetchWithAuth(`/api/categories/${id}`, { method: "DELETE" });
        setData((d) => ({
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
        }));
      },

      // Goals
      addGoal: async (goalData) => {
        const newGoal = await fetchWithAuth("/api/goals", {
          method: "POST",
          body: JSON.stringify(goalData),
        });
        setData((d) => ({ ...d, goals: [...d.goals, newGoal] }));
      },
      updateGoal: async (id, goalData) => {
        const updatedGoal = await fetchWithAuth(`/api/goals/${id}`, {
          method: "PUT",
          body: JSON.stringify(goalData),
        });
        setData((d) => ({
          ...d,
          goals: d.goals.map((g) => (g.id === id ? updatedGoal : g)),
        }));
      },
      deleteGoal: async (id) => {
        await fetchWithAuth(`/api/goals/${id}`, { method: "DELETE" });
        setData((d) => ({
          ...d,
          goals: d.goals.filter((g) => g.id !== id),
        }));
      },
    }),
    [fetchWithAuth]
  );

  const value = {
    ...data,
    loading,
    error,
    api,
    refreshData: fetchAllData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// --- 4. Helper & Utility Components ---

/**
 * Utility: Formats a number into PHP currency.
 * @param {number} value - The number to format
 */
const formatCurrency = (value) => {
  // Ensure we always have a numeric value
  if (typeof value !== "number" || Number.isNaN(value)) {
    value = 0;
  }

  // Use narrowSymbol to get the native peso sign (₱) in most environments
  // and force two decimal places for consistency in charts/tooltips.
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Formatter for Y-axis ticks to keep labels compact and ensure the peso sign is visible.
const formatYAxisTick = (value) => {
  const num = typeof value === 'number' ? value : Number(value) || 0;
  // Show thousands as '₱1k' to avoid label overflow on the chart
  if (Math.abs(num) >= 1000) {
    return `₱${(num / 1000).toFixed(0)}k`;
  }
  return `₱${num.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
};

/**
 * Component: PageTitle
 * A standardized header for each page.
 */
const PageTitle = ({ title, children }) => (
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
      {title}
    </h1>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

/**
 * Component: Card
 * A wrapper for all card-like elements.
 */
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-light-card dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);

/**
 * Component: Button
 * A standardized, animated button.
 */
const Button = ({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  icon: Icon,
  ...props
}) => {
  const baseStyle =
    "px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-mapua-red text-white hover:opacity-90 shadow-lg shadow-mapua-red/30",
    secondary:
      "bg-mapua-gold text-dark-bg hover:opacity-90 shadow-lg shadow-mapua-gold/30",
    outline:
      "bg-transparent border-2 border-mapua-red text-mapua-red hover:bg-mapua-red hover:text-white dark:text-mapua-red dark:hover:text-white",
    ghost:
      "bg-transparent text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

/**
 * Component: Input
 * A standardized, styled input field.
 */
const Input = React.forwardRef(({ label, id, type = "text", ...props }, ref) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1 text-light-text-secondary dark:text-dark-text-secondary"
      >
        {label}
      </label>
    )}
    <input
      type={type}
      id={id}
      ref={ref}
      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-border border border-gray-300 dark:border-dark-border rounded-lg text-light-text dark:text-dark-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mapua-red focus:border-mapua-red transition"
      {...props}
    />
  </div>
));

/**
 * Component: Select
 * A standardized, styled select dropdown.
 */
const Select = React.forwardRef(
  ({ label, id, children, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium mb-1 text-light-text-secondary dark:text-dark-text-secondary"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className="w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-mapua-red focus:border-mapua-red transition"
        {...props}
      >
        {children}
      </select>
    </div>
  )
);

/**
 * Component: Modal
 * A modal container for forms and confirmations.
 */
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-light-card dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 border border-gray-200 dark:border-dark-border animate-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal on content click
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-light-text dark:text-dark-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-mapua-red dark:hover:text-mapua-red transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

/**
 * Component: LoadingSpinner
 * A simple loading indicator.
 */
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="w-12 h-12 border-4 border-t-mapua-gold border-gray-200 dark:border-dark-border rounded-full animate-spin"></div>
  </div>
);

/**
 * Component: ErrorMessage
 * Displays an error.
 */
const ErrorMessage = ({ message }) => (
  <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 flex items-center gap-3">
    <AlertCircle className="flex-shrink-0" />
    <span className="font-medium">{message || "An error occurred."}</span>
  </div>
);

// --- 5. Main Application Layout Components ---

/**
 * Component: Sidebar
 * The main collapsible navigation menu.
 */
const Sidebar = ({ currentPage, onNavigate, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { auth } = useContext(AuthContext);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: Wallet },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "goals", label: "Savings Goals", icon: Target },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={`flex flex-col h-screen p-4 bg-light-card dark:bg-dark-card border-r border-gray-200 dark:border-dark-border shadow-lg transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div
          className={`flex items-center gap-2 overflow-hidden ${
            isCollapsed ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
        >
          <Landmark
            size={30}
            className="text-mapua-red flex-shrink-0"
          />
          <span className="text-xl font-bold text-light-text dark:text-dark-text whitespace-nowrap">
            {AppName}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-grow">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={currentPage === item.id}
              isCollapsed={isCollapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto">
        <ThemeToggle isCollapsed={isCollapsed} />
        <div className="border-t border-gray-200 dark:border-dark-border mt-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mapua-gold flex items-center justify-center text-dark-bg font-bold text-lg">
              {auth.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div
              className={`flex-grow overflow-hidden ${
                isCollapsed ? "opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
            >
              <div className="font-semibold text-light-text dark:text-dark-text truncate">
                {auth.username}
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-red-500 hover:underline flex items-center gap-1"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

/**
 * Component: SidebarItem
 * An individual item in the sidebar.
 */
const SidebarItem = ({ item, isActive, isCollapsed, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center gap-3 h-12 px-3 rounded-lg transition-all duration-300 group ${
        isActive
          ? "bg-mapua-red text-white shadow-md"
          : "text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border hover:text-light-text dark:hover:text-dark-text"
      }`}
      title={isCollapsed ? item.label : undefined}
    >
      <item.icon
        size={22}
        className={`transition-all ${
          isActive
            ? "text-white"
            : "text-light-text-secondary dark:text-dark-text-secondary group-hover:text-mapua-red"
        }`}
      />
      <span
        className={`font-medium whitespace-nowrap overflow-hidden ${
          isCollapsed
            ? "opacity-0 w-0"
            : "opacity-100 w-full"
        } transition-all duration-300`}
      >
        {item.label}
      </span>
    </a>
  </li>
);

/**
 * Component: ThemeToggle
 * The light/dark mode switch.
 */
const ThemeToggle = ({ isCollapsed }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-3 w-full h-12 px-3 rounded-lg text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border hover:text-light-text dark:hover:text-dark-text transition-all ${
        isCollapsed ? "justify-center" : ""
      }`}
      title={isCollapsed ? "Toggle Theme" : undefined}
    >
      {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
      <span
        className={`font-medium whitespace-nowrap overflow-hidden ${
          isCollapsed
            ? "opacity-0 w-0"
            : "opacity-100 w-full"
        } transition-all duration-300`}
      >
        {theme === "light" ? "Dark Mode" : "Light Mode"}
      </span>
    </button>
  );
};

// --- 6. Page Components ---

/**
 * Page: Dashboard
 */
const Dashboard = () => {
  const { transactions, goals, loading } = useContext(DataContext);
  const { auth } = useContext(AuthContext);

  // Calculate dashboard summaries
  const summaries = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let categorySpending = {};

    transactions.forEach((tx) => {
      if (tx.type === "Income") {
        totalIncome += tx.amount;
      } else {
        totalExpenses += tx.amount;
        categorySpending[tx.category_name] =
          (categorySpending[tx.category_name] || 0) + tx.amount;
      }
    });

    const balance = totalIncome - totalExpenses;

    const categoryData = Object.entries(categorySpending)
      .map(([name, value], index) => ({
        name,
        value,
        fill: CATEGORY_PIE_COLORS[index % CATEGORY_PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    // Get last 5 transactions
    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return { totalIncome, totalExpenses, balance, categoryData, recentTransactions };
  }, [transactions]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in space-y-6">
      <PageTitle title={`Welcome back, ${auth.username}!`}></PageTitle>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Income"
          value={summaries.totalIncome}
          icon={TrendingUp}
          color="text-income"
        />
        <SummaryCard
          title="Total Expenses"
          value={summaries.totalExpenses}
          icon={TrendingDown}
          color="text-expense"
        />
        <SummaryCard
          title="Current Balance"
          value={summaries.balance}
          icon={Wallet}
          color={
            summaries.balance >= 0
              ? "text-blue-500"
              : "text-expense"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Spending */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">
            Expense Categories
          </h3>
          {summaries.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summaries.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {summaries.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
              No expense data for this period.
            </div>
          )}
        </Card>

        {/* Savings Goals */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">
            Savings Goals
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {goals.length > 0 ? (
              goals.map((goal) => <GoalProgress key={goal.id} goal={goal} />)
            ) : (
              <div className="h-full flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
                No savings goals added yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6">
         <h3 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">
            Recent Transactions
          </h3>
          <div className="space-y-2">
            {summaries.recentTransactions.length > 0 ? (
              summaries.recentTransactions.map(tx => (
                <TransactionItem key={tx.id} tx={tx} />
              ))
            ) : (
               <div className="h-full flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
                No transactions yet.
              </div>
            )}
          </div>
      </Card>
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color }) => (
  <Card className="p-6 flex items-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
    <div
      className={`p-3 rounded-full bg-opacity-10 ${
        color === "text-income"
          ? "bg-income"
          : color === "text-expense"
          ? "bg-expense"
          : "bg-blue-500"
      }`}
    >
      <Icon size={28} className={color} />
    </div>
    <div>
      <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
        {title}
      </h3>
      <p
        className={`text-3xl font-bold text-light-text dark:text-dark-text ${color}`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  </Card>
);

const GoalProgress = ({ goal }) => {
  const progress = Math.min(
    100,
    (goal.current_savings / goal.target_amount) * 100
  );
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-semibold text-light-text dark:text-dark-text">
          {goal.name}
        </span>
        <span className="text-sm font-medium text-mapua-gold">
          {progress.toFixed(0)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2.5">
        <div
          className="bg-mapua-gold h-2.5 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1 text-right">
        {formatCurrency(goal.current_savings)} /{" "}
        {formatCurrency(goal.target_amount)}
      </p>
    </div>
  );
};

/**
 * Page: Transactions
 */
const Transactions = () => {
  const { transactions, categories, api, loading } = useContext(DataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  
  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSort, setFilterSort] = useState("date-desc");

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(tx => {
        if (filterType && tx.type !== filterType) return false;
        if (filterCategory && tx.category_id !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => {
        switch (filterSort) {
          case "date-asc": return new Date(a.date) - new Date(b.date);
          case "amount-desc": return b.amount - a.amount;
          case "amount-asc": return a.amount - b.amount;
          default: return new Date(b.date) - new Date(a.date); // date-desc
        }
      });
  }, [transactions, filterType, filterCategory, filterSort]);


  const handleOpenModal = (tx = null) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingTx(null);
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      api.deleteTransaction(id).catch(err => alert(err.message));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageTitle title="Transactions">
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => handleOpenModal(null)}
        >
          Add Transaction
        </Button>
      </PageTitle>

      {/* Filter Bar */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select label="Filter by Type" value={filterType} onChange={e => setFilterType(e.target.value)}>
             <option value="">All Types</option>
             <option value="Income">Income</option>
             <option value="Expense">Expense</option>
          </Select>
          <Select label="Filter by Category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
             <option value="">All Categories</option>
             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Sort By" value={filterSort} onChange={e => setFilterSort(e.target.value)}>
             <option value="date-desc">Date (Newest)</option>
             <option value="date-asc">Date (Oldest)</option>
             <option value="amount-desc">Amount (High-Low)</option>
             <option value="amount-asc">Amount (Low-High)</option>
          </Select>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-light-bg dark:bg-dark-bg">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-light-card dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
              {filteredTransactions.length > 0 ? (
                 filteredTransactions.map((tx) => (
                  <TransactionRow 
                    key={tx.id} 
                    tx={tx} 
                    onEdit={handleOpenModal} 
                    onDelete={handleDelete} 
                  />
                 ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-light-text-secondary dark:text-dark-text-secondary">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transaction={editingTx}
      />
    </div>
  );
};

const TransactionRow = ({ tx, onEdit, onDelete }) => (
  <tr className="hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors duration-200">
    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">{tx.date}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tx.category_color }}></span>
        {tx.category_name}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        tx.type === 'Income' 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {tx.type}
      </span>
    </td>
    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${tx.type === 'Income' ? 'text-income' : 'text-expense'}`}>
      {tx.type === 'Expense' && '-'}{formatCurrency(tx.amount)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
      <button onClick={() => onEdit(tx)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="Edit">
        <Edit2 size={18} />
      </button>
      <button onClick={() => onDelete(tx.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete">
        <Trash2 size={18} />
      </button>
    </td>
  </tr>
);

const TransactionItem = ({ tx }) => (
  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${tx.type === 'Income' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
        {tx.type === 'Income' ? 
          <TrendingUp size={20} className="text-income" /> : 
          <TrendingDown size={20} className="text-expense" />
        }
      </div>
      <div>
        <div className="font-semibold text-light-text dark:text-dark-text">{tx.category_name}</div>
        <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{tx.date}</div>
      </div>
    </div>
    <div className={`font-semibold ${tx.type === 'Income' ? 'text-income' : 'text-expense'}`}>
      {tx.type === 'Expense' && '-'}{formatCurrency(tx.amount)}
    </div>
  </div>
);


/**
 * Page: Categories
 */
const Categories = () => {
  const { categories, api, loading } = useContext(DataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const handleOpenModal = (category = null) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCategory(null);
    setIsModalOpen(false);
  };

   const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this category? (This won't delete associated transactions)")) {
      api.deleteCategory(id).catch(err => alert(err.message));
    }
  };
  
  return (
     <div className="animate-fade-in">
      <PageTitle title="Categories">
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => handleOpenModal(null)}
        >
          Add Category
        </Button>
      </PageTitle>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length > 0 ? categories.map(cat => (
             <Card key={cat.id} className="p-4 flex items-center justify-between hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border-2 border-white dark:border-dark-card shadow-sm" style={{ backgroundColor: cat.color }}></span>
                  <span className="font-medium text-light-text dark:text-dark-text">{cat.name}</span>
                </div>
                 <div className="flex space-x-2">
                  <button onClick={() => handleOpenModal(cat)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
             </Card>
          )) : (
            <p className="md:col-span-3 text-center text-light-text-secondary dark:text-dark-text-secondary">
              No categories created yet.
            </p>
          )}
        </div>
      )}

      <CategoryFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        category={editingCategory}
      />
    </div>
  );
};

/**
 * Page: SavingsGoals
 */
const SavingsGoals = () => {
   const { goals, api, loading } = useContext(DataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const handleOpenModal = (goal = null) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingGoal(null);
    setIsModalOpen(false);
  };

   const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this savings goal?")) {
      api.deleteGoal(id).catch(err => alert(err.message));
    }
  };

  return (
    <div className="animate-fade-in">
       <PageTitle title="Savings Goals">
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => handleOpenModal(null)}
        >
          Add Goal
        </Button>
      </PageTitle>

      {loading ? (
        <LoadingSpinner />
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.length > 0 ? goals.map(goal => (
              <Card key={goal.id} className="p-6 relative hover:shadow-xl transition-shadow">
                <div className="absolute top-4 right-4 flex space-x-2">
                   <button onClick={() => handleOpenModal(goal)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col h-full">
                  <PiggyBank size={40} className="text-mapua-gold mb-3" />
                  <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">{goal.name}</h3>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    Target Date: {goal.deadline || 'N/A'}
                  </p>
                  
                  <div className="mt-auto">
                    <GoalProgress goal={goal} />
                  </div>
                </div>
              </Card>
            )) : (
              <p className="md:col-span-3 text-center text-light-text-secondary dark:text-dark-text-secondary">
                No savings goals created yet.
              </p>
            )}
         </div>
      )}

      <GoalFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        goal={editingGoal}
      />
    </div>
  );
};

/**
 * Page: Reports
 */
const Reports = () => {
  const { transactions, loading } = useContext(DataContext);
  
  // Process data for charts
  const reportData = useMemo(() => {
    const monthlySummary = {}; // 'YYYY-MM' => { income: 0, expense: 0 }
    
    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7); // 'YYYY-MM'
      if (!monthlySummary[month]) {
        monthlySummary[month] = { income: 0, expense: 0 };
      }
      if (tx.type === 'Income') {
        monthlySummary[month].income += tx.amount;
      } else {
        monthlySummary[month].expense += tx.amount;
      }
    });

    const sortedMonths = Object.keys(monthlySummary).sort();
    
    const barChartData = sortedMonths.map(month => ({
      name: month,
      Income: monthlySummary[month].income,
      Expense: monthlySummary[month].expense,
    }));
    
    let cumulativeBalance = 0;
    const lineChartData = sortedMonths.map(month => {
      cumulativeBalance += (monthlySummary[month].income - monthlySummary[month].expense);
      return {
        name: month,
        Balance: cumulativeBalance
      };
    });

    return { barChartData, lineChartData };
  }, [transactions]);

  if (loading) return <LoadingSpinner />;

  return (
     <div className="animate-fade-in space-y-8">
       <PageTitle title="Reports" />
       
       <Card className="p-6">
         <h3 className="text-xl font-semibold mb-6 text-light-text dark:text-dark-text">
           Monthly Income vs. Expense
         </h3>
         {reportData.barChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={reportData.barChartData}>
              <XAxis dataKey="name" stroke={useContext(ThemeContext).theme === 'dark' ? '#ADB5BD' : '#6C757D'} />
              <YAxis stroke={useContext(ThemeContext).theme === 'dark' ? '#ADB5BD' : '#6C757D'} tickFormatter={formatYAxisTick} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="Income" fill={COLORS.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill={COLORS.expense} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
         ) : (
           <div className="h-[400px] flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
              No data to display.
           </div>
         )}
       </Card>

      <Card className="p-6">
         <h3 className="text-xl font-semibold mb-6 text-light-text dark:text-dark-text">
           Balance Over Time
         </h3>
         {reportData.lineChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={reportData.lineChartData}>
              <XAxis dataKey="name" stroke={useContext(ThemeContext).theme === 'dark' ? '#ADB5BD' : '#6C757D'} />
              <YAxis stroke={useContext(ThemeContext).theme === 'dark' ? '#ADB5BD' : '#6C757D'} tickFormatter={formatYAxisTick} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Line type="monotone" dataKey="Balance" stroke={COLORS.mapuaGold} strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
         ) : (
           <div className="h-[400px] flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
              No data to display.
           </div>
         )}
       </Card>
    </div>
  );
};

/**
 * Page: Settings
 */
const SettingsPage = () => {
  return (
    <div className="animate-fade-in">
       <PageTitle title="Settings" />
       
       <Card className="p-6 max-w-lg">
          <h3 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">
            Profile
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            User profile settings (e.g., password change) would go here.
            This feature is not yet implemented in the backend.
          </p>
          {/* Example:
          <div className="mt-4 space-y-4">
             <Input label="Username" id="username" value={auth.username} disabled />
             <Input label="Change Password" id="password" type="password" />
             <Button variant="primary">Update Profile</Button>
          </div>
          */}

          <h3 className="text-xl font-semibold mt-8 mb-4 text-light-text dark:text-dark-text">
            Theme
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
            You can also toggle the theme from the switch in the sidebar.
          </p>
          <ThemeToggle isCollapsed={false} />
       </Card>
    </div>
  );
};

// --- 7. Modal Forms ---

/**
 * Form: TransactionFormModal
 */
const TransactionFormModal = ({ isOpen, onClose, transaction }) => {
  const { categories, api } = useContext(DataContext);
  const [error, setError] = useState(null);
  
  // Separate categories for income/expense
  const [type, setType] = useState(transaction?.type || 'Expense');
  const availableCategories = useMemo(() => {
    // This is a simple filter. You might want to make this more robust.
    if (type === 'Income') {
      return categories.filter(c => c.name.toLowerCase() === 'salary');
    }
    return categories.filter(c => c.name.toLowerCase() !== 'salary');
  }, [categories, type]);

  // Set default form values
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
    } else {
      setType('Expense');
    }
  }, [transaction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target);
    const data = {
      type: formData.get("type"),
      amount: parseFloat(formData.get("amount")),
      category_id: formData.get("category_id"),
      date: formData.get("date"),
    };

    if (data.amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    
    try {
      if (transaction) {
        await api.updateTransaction(transaction.id, data);
      } else {
        await api.addTransaction(data);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? "Edit Transaction" : "Add Transaction"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} />}
        
        <Select 
          label="Type" 
          id="type" 
          name="type" 
          value={type}
          onChange={e => setType(e.target.value)}
          defaultValue={transaction?.type || 'Expense'} 
          required
        >
          <option value="Expense">Expense</option>
          <option value="Income">Income</option>
        </Select>

        <Select 
          label="Category" 
          id="category_id" 
          name="category_id"
          defaultValue={transaction?.category_id || availableCategories[0]?.id} 
          required
        >
          {availableCategories.length > 0 ? (
            availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
          ) : (
            <option value="" disabled>No {type.toLowerCase()} categories found</option>
          )}
        </Select>

        <Input
          label="Amount"
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          defaultValue={transaction?.amount || ""}
          required
        />

        <Input
          label="Date"
          id="date"
          name="date"
          type="date"
          defaultValue={transaction?.date || new Date().toISOString().split("T")[0]}
          required
        />
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {transaction ? "Update" : "Save"} Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Form: CategoryFormModal
 */
const CategoryFormModal = ({ isOpen, onClose, category }) => {
  const { api } = useContext(DataContext);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target);
    const data = {
      // Create a unique ID if new, based on user-id (handled by backend)
      // For frontend, we just need name and color
      id: category?.id || `new-${Date.now()}`, // Backend will generate a proper ID
      name: formData.get("name"),
      color: formData.get("color"),
    };

    try {
      if (category) {
        await api.updateCategory(category.id, data);
      } else {
        await api.addCategory(data);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? "Edit Category" : "Add Category"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <Input
          label="Category Name"
          id="name"
          name="name"
          type="text"
          defaultValue={category?.name || ""}
          required
        />

        <Input
          label="Color"
          id="color"
          name="color"
          type="color"
          defaultValue={category?.color || '#FDB913'}
          className="w-full h-12"
          required
        />
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {category ? "Update" : "Save"} Category
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Form: GoalFormModal
 */
const GoalFormModal = ({ isOpen, onClose, goal }) => {
  const { api } = useContext(DataContext);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      target_amount: parseFloat(formData.get("target_amount")),
      current_savings: parseFloat(formData.get("current_savings")),
      deadline: formData.get("deadline") || null,
    };

     if (data.target_amount <= 0) {
      setError("Target Amount must be greater than zero.");
      return;
    }
     if (data.current_savings < 0) {
      setError("Current Savings cannot be negative.");
      return;
    }
     if (data.current_savings > data.target_amount) {
      setError("Current Savings cannot be more than the Target Amount.");
      return;
    }

    try {
      if (goal) {
        await api.updateGoal(goal.id, data);
      } else {
        await api.addGoal(data);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
     <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={goal ? "Edit Savings Goal" : "Add Savings Goal"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <Input
          label="Goal Name"
          id="name"
          name="name"
          type="text"
          defaultValue={goal?.name || ""}
          placeholder="e.g., New Laptop"
          required
        />

        <Input
          label="Target Amount"
          id="target_amount"
          name="target_amount"
          type="number"
          step="1"
          defaultValue={goal?.target_amount || ""}
          required
        />

        <Input
          label="Current Savings"
          id="current_savings"
          name="current_savings"
          type="number"
          step="0.01"
          defaultValue={goal?.current_savings || 0}
          required
        />

        <Input
          label="Target Date (Optional)"
          id="deadline"
          name="deadline"
          type="date"
          defaultValue={goal?.deadline || ""}
        />
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {goal ? "Update" : "Save"} Goal
          </Button>
        </div>
      </form>
    </Modal>
  );
};


// --- 8. Authentication Page ---

/**
 * Page: AuthPage
 * The login/registration screen.
 */
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isLogin ? "/login" : "/register";
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      // If registration is successful, log them in
      if (isLogin) {
        login(data.userId, data.username);
      } else {
        // After register, auto-login
        const loginResponse = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) throw new Error("Registration succeeded but login failed.");
        login(loginData.userId, loginData.username);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-light-bg dark:bg-dark-bg p-4 font-inter">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <Landmark size={48} className="mx-auto text-mapua-red" />
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mt-4">
            {AppName}
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
            {isLogin ? "Welcome back! Please log in." : "Create your account."}
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <Input
            label="Username"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full text-lg"
            disabled={loading}
            icon={isLogin ? LogIn : UserPlus}
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </Button>
        </form>

        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary mt-8">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="font-semibold text-mapua-red hover:underline ml-2"
          >
            {isLogin ? "Register here" : "Login here"}
          </button>
        </p>
      </Card>
    </div>
  );
};

// --- 9. Main App Component ---

/**
 * Component: MainApp
 * The main application wrapper, shown after login.
 */
const MainApp = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { logout } = useContext(AuthContext);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <Transactions />;
      case "categories":
        return <Categories />;
      case "goals":
        return <SavingsGoals />;
      case "reports":
        return <Reports />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DataProvider>
      <div className="flex h-screen w-full bg-light-bg dark:bg-dark-bg font-inter">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onLogout={logout}
        />
        <main className="flex-grow h-screen overflow-y-auto p-6 lg:p-10">
          {renderPage()}
        </main>
      </div>
    </DataProvider>
  );
};

/**
 * Component: App
 * The root component that switches between Auth and MainApp.
 */
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
};

const Root = () => {
  const { auth } = useContext(AuthContext);

  return (
    <div className="text-light-text dark:text-dark-text">
      {auth.isAuthenticated ? <MainApp /> : <AuthPage />}
    </div>
  );
};

export default App;