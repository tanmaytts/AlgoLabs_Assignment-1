import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Compare from './pages/Compare';
import Sectors from './pages/Sectors';
import Heatmap from './pages/Heatmap';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/heatmap" element={<Heatmap />} />
        </Routes>
      </div>
    </div>
  );
}
