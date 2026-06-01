import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import DEFAULT_STRATEGIES from "@/constants/defaultStrategies";

export interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  order: number;
}

export interface StrategyPhase {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: ChecklistItem[];
}

export interface TriggerInfo {
  id: string;
  name: string;
  priority: number;
  description: string;
  steps: string[];
}

export interface ReferenceSection {
  title: string;
  items: string[];
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  phases: StrategyPhase[];
  triggers: TriggerInfo[];
  reference: ReferenceSection[];
  goldenRules: string[];
}

export interface Trade {
  id: string;
  date: string;
  pair: string;
  direction: "BUY" | "SELL";
  strategyId: string;
  triggerId: string;
  entry: string;
  exit: string;
  sl: string;
  tp: string;
  lot: string;
  rr: string;
  pnl: string;
  result: "WIN" | "LOSS" | "BE";
  errors: string[];
  emotion: string;
  notes: string;
  imageUrls: string[];
  videoUris: string[];
  boxId?: string;
}

export interface TradingBox {
  id: string;
  name: string;
  size: number;
  createdAt: string;
}

export interface EducationalNote {
  id: string;
  title: string;
  content: string;
  type: "note" | "video" | "rule" | "tip";
  link: string;
  videoUri: string;
  createdAt: string;
}

export interface AppSettings {
  language: "fa" | "en";
  bgColor: string;
  fontScale: number;
  selectedStrategyId: string;
  selectedTriggerId: string;
  tradeDirection: "BUY" | "SELL";
  activeBoxId: string;
  hiddenTabs: string[];
  checklistNeedsReset: boolean;
}

export interface CheckState {
  [itemId: string]: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: "fa",
  bgColor: "#080e1c",
  fontScale: 1,
  selectedStrategyId: "major",
  selectedTriggerId: "",
  tradeDirection: "BUY",
  activeBoxId: "",
  hiddenTabs: [],
  checklistNeedsReset: false,
};

interface AppContextType {
  trades: Trade[];
  strategies: Strategy[];
  tradingBoxes: TradingBox[];
  educationalNotes: EducationalNote[];
  settings: AppSettings;
  checkState: CheckState;
  addTrade: (trade: Omit<Trade, "id" | "date">) => void;
  updateTrade: (id: string, trade: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  addStrategy: (strategy: Omit<Strategy, "id">) => void;
  updateStrategy: (id: string, strategy: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;
  addTradingBox: (box: Omit<TradingBox, "id" | "createdAt">) => void;
  deleteTradingBox: (id: string) => void;
  addEducationalNote: (note: Omit<EducationalNote, "id" | "createdAt">) => void;
  updateEducationalNote: (id: string, note: Partial<EducationalNote>) => void;
  deleteEducationalNote: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleCheck: (itemId: string) => void;
  resetChecklist: () => void;
  getStrategy: (id: string) => Strategy | undefined;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  trades: "tp_trades",
  strategies: "tp_strategies",
  settings: "tp_settings",
  checkState: "tp_checks",
  boxes: "tp_boxes",
  notes: "tp_edu_notes",
};

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES);
  const [tradingBoxes, setTradingBoxes] = useState<TradingBox[]>([]);
  const [educationalNotes, setEducationalNotes] = useState<EducationalNote[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [checkState, setCheckState] = useState<CheckState>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, s, st, c, b, en] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.trades),
          AsyncStorage.getItem(STORAGE_KEYS.strategies),
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.checkState),
          AsyncStorage.getItem(STORAGE_KEYS.boxes),
          AsyncStorage.getItem(STORAGE_KEYS.notes),
        ]);
        if (t) setTrades(JSON.parse(t));
        if (s) {
          const parsed = JSON.parse(s) as Strategy[];
          if (parsed.length > 0) setStrategies(parsed);
        }
        if (st) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(st) });
        if (c) setCheckState(JSON.parse(c));
        if (b) setTradingBoxes(JSON.parse(b));
        if (en) setEducationalNotes(JSON.parse(en));
      } catch (_) {}
      setIsLoaded(true);
    })();
  }, []);

  const persistTrades = useCallback(async (t: Trade[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(t));
  }, []);

  const persistStrategies = useCallback(async (s: Strategy[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.strategies, JSON.stringify(s));
  }, []);

  const persistSettings = useCallback(async (s: AppSettings) => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s));
  }, []);

  const persistChecks = useCallback(async (c: CheckState) => {
    await AsyncStorage.setItem(STORAGE_KEYS.checkState, JSON.stringify(c));
  }, []);

  const persistBoxes = useCallback(async (b: TradingBox[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.boxes, JSON.stringify(b));
  }, []);

  const persistNotes = useCallback(async (n: EducationalNote[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(n));
  }, []);

  const addTrade = useCallback(
    (trade: Omit<Trade, "id" | "date">) => {
      const newTrade: Trade = {
        ...trade,
        id: genId(),
        date: new Date().toISOString(),
      };
      setTrades((prev) => {
        const next = [newTrade, ...prev];
        persistTrades(next);
        return next;
      });
    },
    [persistTrades]
  );

  const updateTrade = useCallback(
    (id: string, trade: Partial<Trade>) => {
      setTrades((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...trade } : t));
        persistTrades(next);
        return next;
      });
    },
    [persistTrades]
  );

  const deleteTrade = useCallback(
    (id: string) => {
      setTrades((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persistTrades(next);
        return next;
      });
    },
    [persistTrades]
  );

  const addStrategy = useCallback(
    (strategy: Omit<Strategy, "id">) => {
      const newStrategy: Strategy = { ...strategy, id: genId() };
      setStrategies((prev) => {
        const next = [...prev, newStrategy];
        persistStrategies(next);
        return next;
      });
    },
    [persistStrategies]
  );

  const updateStrategy = useCallback(
    (id: string, strategy: Partial<Strategy>) => {
      setStrategies((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, ...strategy } : s
        );
        persistStrategies(next);
        return next;
      });
    },
    [persistStrategies]
  );

  const deleteStrategy = useCallback(
    (id: string) => {
      setStrategies((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persistStrategies(next);
        return next;
      });
    },
    [persistStrategies]
  );

  const addTradingBox = useCallback(
    (box: Omit<TradingBox, "id" | "createdAt">) => {
      const newBox: TradingBox = {
        ...box,
        id: genId(),
        createdAt: new Date().toISOString(),
      };
      setTradingBoxes((prev) => {
        const next = [...prev, newBox];
        persistBoxes(next);
        return next;
      });
    },
    [persistBoxes]
  );

  const deleteTradingBox = useCallback(
    (id: string) => {
      setTradingBoxes((prev) => {
        const next = prev.filter((b) => b.id !== id);
        persistBoxes(next);
        return next;
      });
    },
    [persistBoxes]
  );

  const addEducationalNote = useCallback(
    (note: Omit<EducationalNote, "id" | "createdAt">) => {
      const newNote: EducationalNote = {
        ...note,
        id: genId(),
        createdAt: new Date().toISOString(),
      };
      setEducationalNotes((prev) => {
        const next = [newNote, ...prev];
        persistNotes(next);
        return next;
      });
    },
    [persistNotes]
  );

  const updateEducationalNote = useCallback(
    (id: string, note: Partial<EducationalNote>) => {
      setEducationalNotes((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, ...note } : n));
        persistNotes(next);
        return next;
      });
    },
    [persistNotes]
  );

  const deleteEducationalNote = useCallback(
    (id: string) => {
      setEducationalNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        persistNotes(next);
        return next;
      });
    },
    [persistNotes]
  );

  const updateSettings = useCallback(
    (s: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...s };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const toggleCheck = useCallback(
    (itemId: string) => {
      setCheckState((prev) => {
        const next = { ...prev, [itemId]: !prev[itemId] };
        persistChecks(next);
        return next;
      });
    },
    [persistChecks]
  );

  const resetChecklist = useCallback(() => {
    setCheckState({});
    persistChecks({});
  }, [persistChecks]);

  const getStrategy = useCallback(
    (id: string) => strategies.find((s) => s.id === id),
    [strategies]
  );

  return (
    <AppContext.Provider
      value={{
        trades,
        strategies,
        tradingBoxes,
        educationalNotes,
        settings,
        checkState,
        addTrade,
        updateTrade,
        deleteTrade,
        addStrategy,
        updateStrategy,
        deleteStrategy,
        addTradingBox,
        deleteTradingBox,
        addEducationalNote,
        updateEducationalNote,
        deleteEducationalNote,
        updateSettings,
        toggleCheck,
        resetChecklist,
        getStrategy,
        isLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useT() {
  const { settings } = useApp();
  const { t } = require("@/constants/i18n");
  return (key: Parameters<typeof t>[1]) => t(settings.language, key);
}
